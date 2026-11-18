import 'dotenv/config';
import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { query,pool,migrate } from '../server/db.js';
import { AuthService } from '../server/core/auth.service.js';
import { WorkService } from '../server/core/work.service.js';
import { PlanningController } from '../server/planning/planning.module.js';

test('wiki and time permissions, concurrency and approval on real PostgreSQL',async t=>{
 const schema=`planning_test_${Date.now()}`,admin=new pg.Pool({connectionString:process.env.DATABASE_URL});await admin.query(`CREATE SCHEMA ${schema}`);pool.options.options=`-c search_path=${schema},public`;
 try{
  await migrate();const auth=new AuthService(),work=new WorkService(auth),planning=new PlanningController(auth);let sid='';const res={cookie(_k:string,v:string){sid=v;}} as any;const req:any={headers:{},cookies:{}};
  const actor=await auth.setup({name:'Test owner',email:'planning@example.test',password:'long-test-password'},req,res);req.cookies.sid=sid;
  const project=await work.createProject(actor,{name:'Planning',key:'PLAN'}),other=await work.createProject(actor,{name:'Other',key:'OTHER'});
  let page:any;
  await t.test('wiki revisions preserved and concurrent stale write rejected',async()=>{
   page=await planning.createPage(req,project.id,{title:'Runbook',body:'Original'});
   const results=await Promise.allSettled(['Changed A','Changed B'].map(body=>planning.updatePage(req,page.id,{title:'Runbook',body,version:1})));
   assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await planning.versions(req,page.id)).length,2);
   const restored=await planning.restore(req,page.id,{version:1});assert.equal(restored.body,'Original');assert.equal(restored.version,3);
  });
  await t.test('cross-project parent references are rejected',async()=>{const parent=await planning.createPage(req,other.id,{title:'Private'});await assert.rejects(planning.createPage(req,project.id,{title:'Child',parent_id:parent.id}));});
  await t.test('foreign task in time entry is rejected',async()=>{const task=await work.createTask(actor,other.id,{title:'Other task'});await assert.rejects(planning.logTime(req,project.id,{task_id:task.id,entry_date:'2026-11-18',minutes:20}));});
  await t.test('approval locks only authorized project day and rejects late entries',async()=>{
   const entry=await planning.logTime(req,project.id,{entry_date:'2026-11-18',minutes:20});
   const otherEntry=await planning.logTime(req,other.id,{entry_date:'2026-11-18',minutes:10});
   await planning.approveTime(req,entry.id);
   assert.equal((await query('SELECT approved FROM time_entries WHERE id=$1',[otherEntry.id])).rows[0].approved,false);
   await assert.rejects(planning.logTime(req,project.id,{entry_date:'2026-11-18',minutes:5}));
  });
  await t.test('closed sprint report is frozen when completed task is reopened and reestimated',async()=>{
   const project=await work.createProject(actor,{name:'Historical reports',key:'HIST'});
   const sprint=await work.createSprint(actor,project.id,{name:'Frozen sprint'});
   let task=await work.createTask(actor,project.id,{title:'Sprint work',story_points:5,estimate_minutes:120,sprint_id:sprint.id});
   await work.sprintAction(actor,sprint.id,'start');
   await planning.logTime(req,project.id,{task_id:task.id,entry_date:new Date().toISOString().slice(0,10),minutes:40});
   for(const status of ['ready','in_progress','review','done'])task=await work.updateTask(actor,task.id,{version:task.version,status});
   await work.sprintAction(actor,sprint.id,'close');
   const before=await planning.reports(req,project.id,sprint.id);assert.equal(before.completed_count,1);assert.equal(before.completed_points,5);assert.equal(before.estimated_minutes,120);assert.equal(before.actual_minutes,40);
   task=await work.updateTask(actor,task.id,{version:task.version,status:'in_progress',story_points:13,estimate_minutes:900});
   await planning.logTime(req,project.id,{task_id:task.id,entry_date:new Date().toISOString().slice(0,10),minutes:10});
   const after=await planning.reports(req,project.id,sprint.id);assert.equal(after.completed_count,1);assert.equal(after.completed_points,5);assert.equal(after.predictability,100);assert.equal(after.estimated_minutes,120);assert.equal(after.actual_minutes,40);
  });
 }finally{await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
});
