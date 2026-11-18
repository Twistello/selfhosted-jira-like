import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
test('migrations are idempotent and backup restores representative rows into empty database',async()=>{
 const url=new URL(process.env.DATABASE_URL!),admin=new pg.Pool({connectionString:url.toString()});
 const suffix=Date.now(),source=`backup_src_${suffix}`,target=`backup_dst_${suffix}`;
 const folder=await mkdtemp(join(tmpdir(),'forgeboard-backup-'));
 try{
  await admin.query(`CREATE DATABASE ${source}`);await admin.query(`CREATE DATABASE ${target}`);
  const srcUrl=new URL(url);srcUrl.pathname='/'+source;const dstUrl=new URL(url);dstUrl.pathname='/'+target;
  const bin=process.env.PG_BIN||(process.platform==='win32'?'C:/Program Files/PostgreSQL/15/bin':undefined);
  const env={...process.env,DATABASE_URL:srcUrl.toString(),...(bin?{PG_BIN:bin}:{})};
  await exec(process.execPath,['node_modules/tsx/dist/cli.mjs','--tsconfig','tsconfig.server.json','server/migrate.ts'],{env,windowsHide:true});
  await exec(process.execPath,['node_modules/tsx/dist/cli.mjs','--tsconfig','tsconfig.server.json','server/migrate.ts'],{env,windowsHide:true});
  const src=new pg.Pool({connectionString:srcUrl.toString()});
  let ownerId:string;
  try{assert.equal((await src.query('SELECT count(*) FROM schema_migrations')).rows[0].count,'1');
   ownerId=(await src.query("INSERT INTO users(email,name,password_hash,role) VALUES('backup@example.test','Backup test','not-a-usable-hash','owner') RETURNING id")).rows[0].id;
   const project=(await src.query("INSERT INTO projects(name,key,owner_id) VALUES('Backup','BACK',$1) RETURNING id",[ownerId])).rows[0].id;
   await src.query("INSERT INTO tasks(project_id,key,title,author_id,version) VALUES($1,'BACK-1','Must survive restore',$2,7)",[project,ownerId]);
   await src.query("INSERT INTO events(project_id,actor_id,kind,data) VALUES($1,$2,'backup_test','{\"original\":true}')",[project,ownerId]);
  }finally{await src.end();}
  const dump=join(folder,'database.dump');
  await exec(process.execPath,['ops/database.mjs','backup',dump],{env,windowsHide:true});assert.ok((await readFile(dump)).length>1000);
  await exec(process.execPath,['ops/database.mjs','restore',dump],{env:{...env,DATABASE_URL:dstUrl.toString()},windowsHide:true});
  const dst=new pg.Pool({connectionString:dstUrl.toString()});try{
   assert.equal((await dst.query("SELECT version FROM tasks WHERE key='BACK-1'")).rows[0].version,7);
   assert.equal((await dst.query('SELECT id FROM users')).rows[0].id,ownerId!);
   assert.deepEqual((await dst.query("SELECT data FROM events WHERE kind='backup_test'")).rows[0].data,{original:true});
   await assert.rejects(exec(process.execPath,['ops/database.mjs','restore',dump],{env:{...env,DATABASE_URL:dstUrl.toString()},windowsHide:true}));
  }finally{await dst.end();}
 }finally{await admin.query(`DROP DATABASE IF EXISTS ${source} WITH (FORCE)`);await admin.query(`DROP DATABASE IF EXISTS ${target} WITH (FORCE)`);await admin.end();await rm(folder,{recursive:true,force:true});}
});
