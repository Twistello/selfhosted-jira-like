import 'dotenv/config';
import pg from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
export const pool = new pg.Pool({connectionString:process.env.DATABASE_URL,max:12});
export async function query<T extends pg.QueryResultRow = any>(text:string, values?:any[]):Promise<pg.QueryResult<T>> { return pool.query<T>(text,values); }
export async function transaction<T>(fn:(client:pg.PoolClient)=>Promise<T>):Promise<T>{
  const client=await pool.connect(); try { await client.query('BEGIN'); const value=await fn(client); await client.query('COMMIT'); return value; } catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
export async function migrate(){await transaction(async c=>{
  await c.query("SELECT pg_advisory_xact_lock(82176291)");
  await c.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const folder=fileURLToPath(new URL('./migrations/',import.meta.url));
  for(const name of (await readdir(folder)).filter(n=>n.endsWith('.sql')).sort()){
    if((await c.query('SELECT 1 FROM schema_migrations WHERE name=$1',[name])).rowCount)continue;
    await c.query(await readFile(`${folder}/${name}`,'utf8'));await c.query('INSERT INTO schema_migrations(name) VALUES($1)',[name]);
  }
});}
