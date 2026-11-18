import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { query, pool,migrate } from '../server/db.js';
import pg from 'pg';
import { IntegrationsService } from '../server/integrations/integrations.service.js';
import { encryptSecret, digest } from '../server/integrations/gitlab.js';
import { createServer } from 'node:http';
import { WorkService } from '../server/core/work.service.js';
const fixtureSchema=`gitlab_test_${Date.now()}`;
const fixtureAdmin=new pg.Pool({connectionString:process.env.DATABASE_URL});
test.before(async()=>{await fixtureAdmin.query(`CREATE SCHEMA ${fixtureSchema}`);pool.options.options=`-c search_path=${fixtureSchema},public`;await migrate();});

test('webhooks authenticate, deduplicate atomically, bind projects, and ignore older MR events', {skip:!process.env.DATABASE_URL},async()=>{
 const user=(await query("INSERT INTO users(email,name,password_hash) VALUES($1,'Fixture','unused') RETURNING id",[`gitlab-${Date.now()}@fixture.invalid`])).rows[0];
 const project=(await query("INSERT INTO projects(name,key,owner_id) VALUES('Fixture',$1,$2) RETURNING id",[`G${Date.now().toString().slice(-8)}`,user.id])).rows[0];
 const task=(await query("INSERT INTO tasks(project_id,key,title,author_id) VALUES($1,'FIX-123','Fixture',$2) RETURNING id",[project.id,user.id])).rows[0];
 const integration=(await query("INSERT INTO integrations(project_id,name,base_url,secret_encrypted,webhook_secret_hash,config) VALUES($1,'GitLab','https://gitlab.fixture',$2,$3,$4) RETURNING id",[project.id,encryptSecret('fixture'),digest('hook-token'),{gitlab_project_id:44}])).rows[0];
 const service=new IntegrationsService({} as any);
 const payload=(state:string,date:string)=>({object_kind:'merge_request',project:{id:44},object_attributes:{id:7,iid:1,title:'FIX-123 fix',state,updated_at:date,url:'https://gitlab.fixture/mr/1'}});
 try{
  await assert.rejects(()=>service.receive(integration.id,'bad','id1',payload('merged','2026-02-01')),/token/i);
  await assert.rejects(()=>service.receive(integration.id,'hook-token','wrong',{...payload('merged','2026-02-01'),project:{id:999}}),/project/i);
  const outcomes=await Promise.all([service.receive(integration.id,'hook-token','id1',payload('merged','2026-02-01')),service.receive(integration.id,'hook-token','id1',payload('merged','2026-02-01'))]);
  assert.equal(outcomes.filter(o=>o.duplicate).length,1);
  const jobs=await query("SELECT * FROM jobs WHERE payload->>'integration_id'=$1",[integration.id]);assert.equal(jobs.rowCount,1);
  await service.processWebhook(integration.id,payload('merged','2026-02-01'));
  await service.processWebhook(integration.id,payload('opened','2026-01-01'));
  const links=await query('SELECT * FROM development_links WHERE integration_id=$1',[integration.id]);assert.equal(links.rowCount,1);assert.equal(links.rows[0].state,'merged');assert.equal(links.rows[0].task_id,task.id);
  const memberView=new IntegrationsService({actor:async()=>({role:'member'}),requireProject:async()=>{}} as any);
  assert.deepEqual(await memberView.development({} as any,task.id),[]);
  const events=new WorkService({requireProject:async()=>{}} as any);
  const member={id:user.id,email:'fixture@example.invalid',name:'Member',role:'member',mfa_enabled:false};
  assert.deepEqual(await events.events(member,project.id),[]);
  assert.equal((await query('SELECT data FROM events WHERE task_id=$1',[task.id])).rows[0].data.integration_id,integration.id);
  await query("UPDATE integrations SET config=config || '{\"visibility\":\"project\"}'::jsonb WHERE id=$1",[integration.id]);assert.equal((await memberView.development({} as any,task.id)).length,1);
 }finally{
  await query("DELETE FROM jobs WHERE payload->>'integration_id'=$1",[integration.id]);await query('DELETE FROM development_links WHERE integration_id=$1',[integration.id]);await query('DELETE FROM webhook_receipts WHERE integration_id=$1',[integration.id]);await query('DELETE FROM integrations WHERE id=$1',[integration.id]);await query('DELETE FROM events WHERE project_id=$1',[project.id]);await query('DELETE FROM tasks WHERE project_id=$1',[project.id]);await query('DELETE FROM projects WHERE id=$1',[project.id]);await query('DELETE FROM users WHERE id=$1',[user.id]);
 }
});
test.after(async()=>{await pool.end();await fixtureAdmin.query(`DROP SCHEMA ${fixtureSchema} CASCADE`);await fixtureAdmin.end();});

test('GitLab CE issue import is idempotent and durable outbound sync retries after outage', {skip:!process.env.DATABASE_URL},async()=>{
 let unavailable=false,putCount=0;let lastPut:any;
 const issue={id:99,iid:1,title:'Remote issue',description:'Fixture body',labels:['backend'],state:'opened',updated_at:'2026-01-01T00:00:00Z',web_url:''};
 const server=createServer(async(req,res)=>{assert.equal(req.headers['private-token'],'fixture-token');res.setHeader('content-type','application/json');if(unavailable){res.statusCode=503;res.end('{}');return;}if(req.method==='PUT'){putCount++;const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(chunk);lastPut=JSON.parse(Buffer.concat(chunks).toString());res.end(JSON.stringify({...issue,...lastPut,labels:lastPut.labels.split(','),state:lastPut.state_event==='close'?'closed':'opened',updated_at:'2026-03-01T00:00:00Z'}));}else res.end(JSON.stringify([issue]));});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${(server.address() as any).port}`;process.env.INTEGRATION_ALLOWED_ORIGINS=origin;issue.web_url=`${origin}/-/issues/1`;
 const user=(await query("INSERT INTO users(email,name,password_hash,role) VALUES($1,'Fixture','unused','admin') RETURNING *",[`sync-${Date.now()}@fixture.invalid`])).rows[0];
 const project=(await query("INSERT INTO projects(name,key,owner_id) VALUES('Fixture',$1,$2) RETURNING id",[`S${Date.now().toString().slice(-8)}`,user.id])).rows[0];
 const integration=(await query("INSERT INTO integrations(project_id,name,base_url,secret_encrypted,config,last_sync_at) VALUES($1,'Fixture',$2,$3,$4,now()) RETURNING id",[project.id,origin,encryptSecret('fixture-token'),{gitlab_project_id:44}])).rows[0];
 const auth={actor:async()=>user,requireProject:async()=>{},requireAdmin:()=>{}};
 const service=new IntegrationsService(auth as any);const req={} as any;
 try{
 await assert.rejects(()=>service.importIssues(req,integration.id,{}),/visibility|sharing|share/i);
 await query("UPDATE integrations SET config=config || '{\"visibility\":\"project\"}'::jsonb WHERE id=$1",[integration.id]);
 await service.processWebhook(integration.id,{object_kind:'issue',project:{id:44},object_attributes:{...issue,url:issue.web_url}});
 const first=await service.importIssues(req,integration.id,{});
 assert.equal((await query("SELECT data FROM development_links WHERE integration_id=$1 AND kind='issue'",[integration.id])).rows[0].data.issue_sync,true);
 await query("UPDATE development_links SET data=data-'issue_sync' WHERE integration_id=$1",[integration.id]);
 const second=await service.importIssues(req,integration.id,{});assert.deepEqual(first.task_ids,second.task_ids);assert.equal(first.imported,1);
 assert.equal((await query("SELECT data FROM development_links WHERE integration_id=$1 AND kind='issue'",[integration.id])).rows[0].data.issue_sync,true);
 await query("UPDATE tasks SET title='Locally changed',description='Local body',status='review' WHERE id=$1",[first.task_ids[0]]);
 await service.pushIssue(req,first.task_ids[0],{integration_id:integration.id});unavailable=true;await service.tick();
 let job=(await query("SELECT * FROM jobs WHERE kind='gitlab.issue.push' AND payload->>'integration_id'=$1",[integration.id])).rows[0];assert.equal(job.state,'pending');assert.equal(job.attempts,1);assert.ok(new Date(job.run_at)>new Date(job.created_at));assert.equal(putCount,0);
 unavailable=false;await query('UPDATE jobs SET run_at=now() WHERE id=$1',[job.id]);await Promise.all([service.tick(),new IntegrationsService(auth as any).tick()]);
 job=(await query('SELECT * FROM jobs WHERE id=$1',[job.id])).rows[0];assert.equal(job.state,'done');assert.equal(putCount,1);assert.equal(lastPut.title,'Locally changed');assert.equal(lastPut.state_event,'reopen');
 await service.processWebhook(integration.id,{object_kind:'issue',project:{id:44},object_attributes:{...issue,title:'Closed remotely',state:'closed',updated_at:'2026-03-15T00:00:00Z'}});
 await service.processWebhook(integration.id,{object_kind:'issue',project:{id:44},object_attributes:{...issue,title:'Reopened remotely',state:'opened',labels:['frontend'],updated_at:'2026-04-01T00:00:00Z'}});
 const synced=(await query('SELECT * FROM tasks WHERE id=$1',[first.task_ids[0]])).rows[0];assert.equal(synced.title,'Reopened remotely');assert.equal(synced.status,'in_progress');assert.deepEqual(synced.labels,['frontend']);
 const transitions=(await query("SELECT data FROM events WHERE task_id=$1 AND kind='status_changed' ORDER BY id",[first.task_ids[0]])).rows;assert.deepEqual(transitions.map(e=>[e.data.from,e.data.to]),[['review','done'],['done','in_progress']]);
 await service.processWebhook(integration.id,{object_kind:'issue',project:{id:44},object_attributes:{...issue,state:'closed',updated_at:'2026-05-01T00:00:00Z'}});
 assert.equal((await query('SELECT status FROM tasks WHERE id=$1',[first.task_ids[0]])).rows[0].status,'in_progress');assert.equal((await query("SELECT 1 FROM events WHERE task_id=$1 AND kind='gitlab.sync_conflict'",[first.task_ids[0]])).rowCount,1);
 await query("UPDATE integrations SET config=config || '{\"visibility\":\"administrators\"}'::jsonb WHERE id=$1",[integration.id]);
 await service.processWebhook(integration.id,{object_kind:'issue',project:{id:44},object_attributes:{...issue,title:'Restricted update',state:'opened',updated_at:'2026-06-01T00:00:00Z'}});
 assert.equal((await query('SELECT title FROM tasks WHERE id=$1',[first.task_ids[0]])).rows[0].title,'Reopened remotely');
 }finally{
 await new Promise<void>(r=>server.close(()=>r()));await query("DELETE FROM jobs WHERE payload->>'integration_id'=$1",[integration.id]);await query('DELETE FROM development_links WHERE integration_id=$1',[integration.id]);await query('DELETE FROM integrations WHERE id=$1',[integration.id]);await query('DELETE FROM events WHERE project_id=$1',[project.id]);await query('DELETE FROM tasks WHERE project_id=$1',[project.id]);await query('DELETE FROM projects WHERE id=$1',[project.id]);await query('DELETE FROM users WHERE id=$1',[user.id]);
 }
});
