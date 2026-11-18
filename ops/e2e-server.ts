import 'dotenv/config';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
// Each E2E run uses a fresh schema in the explicitly selected test database.
const url=new URL(process.env.DATABASE_URL!);
const schema='e2e_'+randomUUID().replaceAll('-','');
const admin=new pg.Pool({connectionString:url.toString()});
await admin.query(`CREATE SCHEMA ${schema}`);await admin.end();
url.searchParams.set('options',`-c search_path=${schema},public`);
process.env.DATABASE_URL=url.toString();
await import('../server/main.js');
