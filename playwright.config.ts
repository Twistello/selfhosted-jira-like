import 'dotenv/config';
import { defineConfig } from '@playwright/test';
const db=new URL(process.env.E2E_DATABASE_URL||process.env.DATABASE_URL||'postgresql://forgeboard@127.0.0.1:55432/forgeboard');
if(!process.env.E2E_DATABASE_URL)db.pathname='/forgeboard_e2e';
export default defineConfig({testDir:'tests',testMatch:'*.e2e.ts',workers:1,fullyParallel:false,retries:0,timeout:60000,reporter:[['list'],['html',{open:'never'}]],use:{baseURL:'http://127.0.0.1:3001',headless:true,screenshot:'only-on-failure',trace:'retain-on-failure'},webServer:{command:'tsx --tsconfig tsconfig.server.json ops/e2e-server.ts',url:'http://127.0.0.1:3001/api/v1/ready',reuseExistingServer:false,timeout:30000,env:{DATABASE_URL:db.toString(),PORT:'3001',PUBLIC_URL:'http://127.0.0.1:3001',HOST:'127.0.0.1'}}});
