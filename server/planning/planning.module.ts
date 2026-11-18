import { Module, Controller, Get, Post, Patch, Param, Query, Body, Req, Res, Inject, BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import type { Request,Response } from 'express';
import { z } from 'zod';
import { query,transaction } from '../db.js';
import { AuthService } from '../core/auth.service.js';
import { CoreModule } from '../core/core.module.js';
import { computeMetrics,csvCell } from './metrics.js';

const pageInput=z.object({title:z.string().trim().min(1).max(300),body:z.string().max(500000).default(''),parent_id:z.uuid().nullable().optional()});
function parse<T>(schema:z.ZodType<T>,data:unknown):T{const r=schema.safeParse(data);if(!r.success)throw new BadRequestException(r.error.issues.map(i=>i.message).join('; '));return r.data;}

@Controller()
export class PlanningController {
 constructor(@Inject(AuthService) private auth:AuthService){}
 async access(req:Request,projectId:string,write=false){const actor=await this.auth.actor(req);await this.auth.requireProject(actor,projectId,write);return actor;}
 @Get('projects/:id/pages') async pages(@Req() req:Request,@Param('id') id:string){await this.access(req,id);return (await query('SELECT * FROM pages WHERE project_id=$1 ORDER BY title',[id])).rows;}
 @Post('projects/:id/pages') async createPage(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){
  const actor=await this.access(req,id,true),data=parse(pageInput,body);
  return transaction(async c=>{
   if(data.parent_id&&!(await c.query('SELECT 1 FROM pages WHERE id=$1 AND project_id=$2',[data.parent_id,id])).rowCount)throw new BadRequestException('Parent page belongs to another project');
   const page=(await c.query('INSERT INTO pages(project_id,parent_id,title,body,author_id) VALUES($1,$2,$3,$4,$5) RETURNING *',[id,data.parent_id||null,data.title,data.body,actor.id])).rows[0];
   await c.query('INSERT INTO page_versions(page_id,version,title,body,author_id) VALUES($1,1,$2,$3,$4)',[page.id,page.title,page.body,actor.id]);return page;
  });
 }
 async getPage(req:Request,id:string,write=false){const page=(await query('SELECT * FROM pages WHERE id=$1',[id])).rows[0];if(!page)throw new NotFoundException();const actor=await this.access(req,page.project_id,write);return {page,actor};}
 @Patch('pages/:id') async updatePage(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){
  const {page,actor}=await this.getPage(req,id,true);const data=parse(pageInput.extend({version:z.number().int().positive()}),body);
  return transaction(async c=>{
   if(data.parent_id===id)throw new BadRequestException('Page cannot parent itself');
   if(data.parent_id&&!(await c.query('SELECT 1 FROM pages WHERE id=$1 AND project_id=$2',[data.parent_id,page.project_id])).rowCount)throw new BadRequestException('Invalid parent');
   const updated=(await c.query('UPDATE pages SET title=$2,body=$3,version=version+1,author_id=$4,updated_at=now() WHERE id=$1 AND version=$5 RETURNING *',[id,data.title,data.body,actor.id,data.version])).rows[0];
   if(!updated)throw new ConflictException('Page was edited by another user. Reload before saving.');
   await c.query('INSERT INTO page_versions(page_id,version,title,body,author_id) VALUES($1,$2,$3,$4,$5)',[id,updated.version,updated.title,updated.body,actor.id]);return updated;
  });
 }
 @Get('pages/:id/versions') async versions(@Req() req:Request,@Param('id') id:string){await this.getPage(req,id);return(await query('SELECT * FROM page_versions WHERE page_id=$1 ORDER BY version DESC',[id])).rows;}
 @Post('pages/:id/restore') async restore(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){const {page}=await this.getPage(req,id,true);const data=parse(z.object({version:z.number().int().positive()}),body);const old=(await query('SELECT * FROM page_versions WHERE page_id=$1 AND version=$2',[id,data.version])).rows[0];if(!old)throw new NotFoundException();return this.updatePage(req,id,{title:old.title,body:old.body,version:page.version});}
 @Get('projects/:id/time') async time(@Req() req:Request,@Param('id') id:string){await this.access(req,id);return(await query('SELECT t.*,u.name as user_name,k.key as task_key FROM time_entries t JOIN users u ON u.id=t.user_id LEFT JOIN tasks k ON k.id=t.task_id WHERE t.project_id=$1 ORDER BY entry_date DESC LIMIT 500',[id])).rows;}
 @Post('projects/:id/time') async logTime(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){
  const actor=await this.access(req,id,true);const data=parse(z.object({task_id:z.uuid().nullable().optional(),minutes:z.number().int().min(1).max(1440),entry_date:z.iso.date(),description:z.string().max(4000).default('')}),body);
  return transaction(async c=>{
   await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[actor.id+data.entry_date]);
   if(data.task_id&&!(await c.query('SELECT 1 FROM tasks WHERE id=$1 AND project_id=$2 AND deleted_at IS NULL',[data.task_id,id])).rowCount)throw new BadRequestException('Task not in this project');
   if((await c.query('SELECT 1 FROM time_entries WHERE user_id=$1 AND entry_date=$2 AND project_id=$3 AND approved=true',[actor.id,data.entry_date,id])).rowCount)throw new ConflictException('Approved day is locked');
   const total=Number((await c.query('SELECT COALESCE(sum(minutes),0) AS total FROM time_entries WHERE user_id=$1 AND entry_date=$2',[actor.id,data.entry_date])).rows[0].total);
   if(total+data.minutes>1440)throw new BadRequestException('Daily total exceeds 24 hours');
   return(await c.query('INSERT INTO time_entries(project_id,task_id,user_id,minutes,entry_date,description) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[id,data.task_id||null,actor.id,data.minutes,data.entry_date,data.description])).rows[0];
  });
 }
 @Post('time/:id/approve') async approveTime(@Req() req:Request,@Param('id') id:string){const entry=(await query('SELECT * FROM time_entries WHERE id=$1',[id])).rows[0];if(!entry)throw new NotFoundException();const actor=await this.access(req,entry.project_id,true);if(!['owner','admin'].includes(actor.role)&&(await query('SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2',[entry.project_id,actor.id])).rows[0]?.role!=='manager')throw new ForbiddenException('Manager required');return transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[entry.user_id+entry.entry_date.toISOString().slice(0,10)]);return(await c.query('UPDATE time_entries SET approved=true WHERE user_id=$1 AND entry_date=$2 AND project_id=$3 RETURNING *',[entry.user_id,entry.entry_date,entry.project_id])).rows;});}
 @Get('projects/:id/reports') async reports(@Req() req:Request,@Param('id') id:string,@Query('sprint_id') sprintId?:string){
  await this.access(req,id);if(sprintId&&!z.uuid().safeParse(sprintId).success)throw new BadRequestException('Invalid sprint');
  const tasks=(await query('SELECT * FROM tasks WHERE project_id=$1 AND deleted_at IS NULL AND ($2::uuid IS NULL OR sprint_id=$2)',[id,sprintId||null])).rows;
  let events=(await query('SELECT * FROM events WHERE project_id=$1 AND ($2::uuid IS NULL OR sprint_id=$2) ORDER BY created_at,id',[id,sprintId||null])).rows;
  const sprints=(await query('SELECT * FROM sprints WHERE project_id=$1 ORDER BY created_at',[id])).rows;
  const sprint=sprintId?sprints.find(s=>s.id===sprintId):null;
  if(sprintId&&!sprint)throw new NotFoundException('Sprint not in this project');
  let baseline=sprint?.baseline||[];
  // Closed sprint rows and estimates come from the closure event, never mutable tasks.
  let metricTasks=tasks;
  let frozenMinutes:number|null|undefined;
  if(sprintId&&sprint?.state==='closed'){
   const closure=events.find(e=>e.kind==='sprint_closed');
   if(!closure?.data.snapshot)throw new ConflictException('Historical snapshot unavailable for this legacy sprint');
   metricTasks=closure.data.snapshot.tasks;
   baseline=closure.data.snapshot.baseline;
   frozenMinutes=Array.isArray(closure.data.snapshot.time_entries)?closure.data.snapshot.time_entries.reduce((n:number,e:any)=>n+Number(e.minutes),0):null;
   events=events.filter(e=>BigInt(e.id)<=BigInt(closure.id));
  }
  const metrics=computeMetrics(metricTasks,events,baseline,sprint?.closed_at?new Date(sprint.closed_at):new Date());
  const minutes=frozenMinutes!==undefined?frozenMinutes:Number((await query('SELECT COALESCE(sum(minutes),0) AS total FROM time_entries WHERE project_id=$1 AND ($2::uuid[] IS NULL OR task_id=ANY($2::uuid[])) AND ($3::date IS NULL OR entry_date >= $3::date)',[id,sprint?metricTasks.map(t=>t.id):null,sprint?(sprint.start_date||sprint.started_at||null):null])).rows[0].total);
  return {...metrics,actual_minutes:minutes,estimated_minutes:metricTasks.reduce((n,t)=>n+(Number(t.estimate_minutes)||0),0),sprints:sprints.map(s=>({id:s.id,name:s.name,state:s.state,baseline:s.baseline})),formula_version:1};
 }
 @Get('projects/:id/export') async export(@Req() req:Request,@Res() res:Response,@Param('id') id:string,@Query('format') format='json'){
  await this.access(req,id);if(!['csv','json'].includes(format))throw new BadRequestException('Use csv or json');
  const rows=(await query('SELECT key,title,type,status,priority,story_points,estimate_minutes,due_date,created_at FROM tasks WHERE project_id=$1 AND deleted_at IS NULL ORDER BY key',[id])).rows;
  res.setHeader('Content-Disposition',`attachment; filename="tasks.${format}"`);res.setHeader('Cache-Control','no-store');
  if(format==='json')return res.json(rows);const columns=['key','title','type','status','priority','story_points','estimate_minutes','due_date','created_at'];return res.type('text/csv').send('\uFEFF'+[columns.map(csvCell).join(','),...rows.map(row=>columns.map(k=>csvCell(row[k])).join(','))].join('\r\n'));
 }
 @Get('projects/:id/calendar.ics') async calendar(@Req() req:Request,@Res() res:Response,@Param('id') id:string){await this.access(req,id);const rows=(await query('SELECT id,title,due_date FROM tasks WHERE project_id=$1 AND due_date IS NOT NULL AND deleted_at IS NULL',[id])).rows;const escape=(s:string)=>s.replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(',','\\,').replaceAll(';','\\;').replaceAll('\r','');const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Forgeboard//EN',...rows.flatMap(t=>['BEGIN:VEVENT',`UID:${t.id}@forgeboard`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').split('.')[0]}Z`,`DTSTART;VALUE=DATE:${new Date(t.due_date).toISOString().slice(0,10).replaceAll('-','')}`,`SUMMARY:${escape(t.title)}`,'END:VEVENT']),'END:VCALENDAR'];return res.type('text/calendar').send(lines.join('\r\n')+'\r\n');}
}
@Module({imports:[CoreModule],controllers:[PlanningController]})
export class PlanningModule{}
