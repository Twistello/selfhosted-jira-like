import 'dotenv/config';
import pg from 'pg';
import {spawn} from 'node:child_process';
import {resolve,join} from 'node:path';
import {existsSync} from 'node:fs';
const [mode,filename]=process.argv.slice(2);
if(!['backup','restore'].includes(mode)||!filename||!process.env.DATABASE_URL){console.error('Usage: DATABASE_URL=... node ops/database.mjs backup|restore file.dump');process.exit(1);}
const url=new URL(process.env.DATABASE_URL);
if(url.search)throw new Error('Backup/restore requires a database URL without query options');
const env={...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:url.pathname.slice(1)};
if(mode==='restore'){
 if(!existsSync(filename))throw new Error('Dump does not exist');
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
 try{const count=await pool.query("SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')");if(Number(count.rows[0].count))throw new Error('Restore target must be an empty database; existing tables found');}finally{await pool.end();}
}
const program=mode==='backup'?'pg_dump':'pg_restore';
const executable=process.env.PG_BIN?join(process.env.PG_BIN,program+(process.platform==='win32'?'.exe':'')):program;
const args=mode==='backup'?['--format=custom','--no-owner','--no-acl','--file',resolve(filename)]:['--exit-on-error','--single-transaction','--no-owner','--no-acl','--dbname',env.PGDATABASE,resolve(filename)];
const code=await new Promise((done,reject)=>{const child=spawn(executable,args,{env,stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('close',done);});
if(code!==0)process.exit(Number(code)||1);
console.log(mode==='backup'?'Database backup complete. Keep APP_ENCRYPTION_KEY in a separate secure backup.':'Restore complete. Configure the original APP_ENCRYPTION_KEY before starting the application.');
