import 'dotenv/config';
import pg from 'pg';
import {randomBytes,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:3002';
const database=new URL(process.env.E2E_DATABASE_URL||process.env.DATABASE_URL);
if(!process.env.E2E_DATABASE_URL)database.pathname='/forgeboard_e2e';
const schema='bench_'+randomUUID().replaceAll('-',''),admin=new pg.Pool({connectionString:database.toString()});
await admin.query(`CREATE SCHEMA ${schema}`);database.searchParams.set('options',`-c search_path=${schema},public`);
const server=spawn(process.execPath,['dist/server/main.js'],{env:{...process.env,DATABASE_URL:database.toString(),PORT:'3002',HOST:'127.0.0.1',PUBLIC_URL:base,DISABLE_JOB_WORKER:'true'},stdio:['ignore','pipe','pipe'],windowsHide:true});
let output='';server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function request(path,method='GET',body,cookie){const start=performance.now();const r=await fetch(base+'/api/v1'+path,{method,headers:{Origin:base,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw new Error(`HTTP ${r.status} ${path}: ${data.message}`);return {data,cookie:r.headers.get('set-cookie')?.split(';')[0],ms:performance.now()-start};}
try{
 let ready=false;for(let i=0;i<120;i++){try{if((await fetch(base+'/api/v1/ready')).ok){ready=true;break;}}catch{}await pause(250);}if(!ready)throw new Error('Benchmark API did not start: '+output);
 const password=randomBytes(24).toString('hex');
 const owner=await request('/auth/setup','POST',{name:'Benchmark owner',email:'bench-owner@example.test',password});
 const project=(await request('/projects','POST',{name:'Benchmark',key:'BENCH'},owner.cookie)).data;
 const users=[owner];
 for(let i=1;i<5;i++){const invitation=(await request('/auth/invitations','POST',{email:`bench-${i}@example.test`,role:'member',project_id:project.id},owner.cookie)).data;users.push(await request('/auth/invitations/accept','POST',{token:invitation.token,name:`Benchmark ${i}`,password}));}
 const tasks=[];for(let i=0;i<100;i++)tasks.push((await request(`/projects/${project.id}/tasks`,'POST',{title:'Load task '+i,story_points:i%5,assignee_id:users[i%5].data.id},owner.cookie)).data);
 const before=(await request('/admin/runtime','GET',undefined,owner.cookie)).data;
 const results={list:[],reports:[],update:[]};
 const start=performance.now();
 await Promise.all(users.map(async(user,i)=>{let task=tasks[i];for(let j=0;j<10;j++){
  results.list.push((await request(`/projects/${project.id}/tasks?limit=100`,'GET',undefined,user.cookie)).ms);
  results.reports.push((await request(`/projects/${project.id}/reports`,'GET',undefined,user.cookie)).ms);
  const update=await request(`/tasks/${task.id}`,'PATCH',{version:task.version,title:`Updated ${i}/${j}`},user.cookie);results.update.push(update.ms);task=update.data;
 }}));
 const after=(await request('/admin/runtime','GET',undefined,owner.cookie)).data;
 const stats=Object.fromEntries(Object.entries(results).map(([k,values])=>{values.sort((a,b)=>a-b);return [k,{requests:values.length,median_ms:values[Math.floor(values.length*.5)],p95_ms:values[Math.floor(values.length*.95)],max_ms:values.at(-1)}];}));
 const report={measured_at:new Date().toISOString(),environment:{platform:process.platform,architecture:process.arch,node:process.version,concurrent_users:5,tasks:100,real_database:'PostgreSQL 15',worker:'disabled to isolate request benchmark',build:'compiled production JavaScript, NODE_ENV='+process.env.NODE_ENV},duration_ms:performance.now()-start,requests:150,latencies:stats,api_memory_before:before.memory,api_memory_after:after.memory,api_cpu_microseconds_before:before.cpu_microseconds,api_cpu_microseconds_after:after.cpu_microseconds};
 await mkdir('.runtime',{recursive:true});await writeFile('.runtime/benchmark.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{
 server.kill('SIGTERM');await new Promise(resolve=>{server.once('close',resolve);setTimeout(()=>{server.kill('SIGKILL');resolve();},5000).unref();});
 await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();
}
