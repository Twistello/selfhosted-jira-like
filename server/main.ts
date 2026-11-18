import 'reflect-metadata';
import 'dotenv/config';
import { Module,Controller,Get,Catch,HttpException,Req,Inject, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder,SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { query,migrate,pool } from './db.js';
import { CoreModule } from './core/core.module.js';
import { AuthService } from './core/auth.service.js';
import { IntegrationsModule } from './integrations/integrations.module.js';
import { PlanningModule } from './planning/planning.module.js';

@Controller()
class HealthController{
 constructor(@Inject(AuthService) private auth:AuthService){}
 @Get('health') health(){return {status:'ok',version:'0.1.0'};}
 @Get('ready') async ready(){await query('SELECT 1');return {status:'ready'};}
 @Get('admin/runtime') async runtime(@Req() req:express.Request){const actor=await this.auth.actor(req);this.auth.requireAdmin(actor);return {memory:process.memoryUsage(),cpu_microseconds:process.cpuUsage(),uptime_seconds:process.uptime(),node:process.version};}
}
@Catch()
class SafeErrors implements ExceptionFilter {
 catch(error:unknown,host:ArgumentsHost){
  const response=host.switchToHttp().getResponse();
  if(error instanceof HttpException)return response.status(error.getStatus()).json(typeof error.getResponse()==='string'?{message:error.message}:error.getResponse());
  const code=(error as any)?.code;
  if(code==='22P02'||code==='22007'||code==='22008')return response.status(400).json({message:'Invalid identifier or date'});
  if(code==='23505'||code==='23503')return response.status(409).json({message:'Conflicting or referenced object'});
  // Never log database query values or credentials.
  console.error(JSON.stringify({level:'error',event:'request_failed',type:error instanceof Error?error.name:'UnknownError',code}));
  return response.status(500).json({message:'Internal server error'});
 }
}
@Module({imports:[CoreModule,IntegrationsModule,PlanningModule],controllers:[HealthController]})
class AppModule{}

async function bootstrap(){
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
 if(Buffer.from(process.env.APP_ENCRYPTION_KEY||'','base64').length!==32)throw new Error('APP_ENCRYPTION_KEY must be 32 random bytes encoded as base64');
 if(process.env.NODE_ENV==='production'&&!process.env.PUBLIC_URL?.startsWith('https://'))throw new Error('Production PUBLIC_URL must use HTTPS');
 await migrate();
 const app=await NestFactory.create(AppModule,{logger:['error','warn','log'],bodyParser:false});
 app.setGlobalPrefix('api/v1');app.enableShutdownHooks();app.useGlobalFilters(new SafeErrors());
 const http=app.getHttpAdapter().getInstance();
 http.disable('x-powered-by');
 if(process.env.TRUST_PROXY==='1')http.set('trust proxy',1);
 app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],imgSrc:["'self'",'data:'],styleSrc:["'self'","'unsafe-inline'"],scriptSrc:["'self'"],connectSrc:["'self'"],objectSrc:["'none'"],frameAncestors:["'none'"]}}}));
 app.use(express.json({limit:'1mb'}));app.use(cookieParser());
 app.use((req:express.Request,res:express.Response,next:express.NextFunction)=>{
  const requestId=randomUUID();res.setHeader('X-Request-Id',requestId);res.setHeader('Cache-Control','no-store');
  const start=performance.now();res.on('finish',()=>{if(req.path.startsWith('/api/'))console.log(JSON.stringify({level:'info',request_id:requestId,method:req.method,path:req.path,status:res.statusCode,duration_ms:Math.round(performance.now()-start)}));});
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&!/^\/api\/v1\/webhooks\/gitlab\/[0-9a-f-]+$/.test(req.path)){
   const allowed=[process.env.PUBLIC_URL||'http://127.0.0.1:3000',...(process.env.NODE_ENV==='production'?[]:['http://127.0.0.1:5173','http://localhost:5173'])];
   // Non-browser clients have no ambient cookie authority; reject cross-site browser requests.
   if((req.headers.origin&&!allowed.includes(req.headers.origin))||req.headers['sec-fetch-site']==='cross-site')return res.status(403).json({message:'Cross-site request denied'});
   if(req.cookies?.sid&&!req.headers.origin)return res.status(403).json({message:'Origin header required for cookie authenticated changes'});
  }
  next();
 });
 app.use('/api/v1/auth',rateLimit({windowMs:60_000,limit:30,standardHeaders:'draft-8',legacyHeaders:false}));
 app.use('/api',rateLimit({windowMs:60_000,limit:600,standardHeaders:'draft-8',legacyHeaders:false}));
 const document=SwaggerModule.createDocument(app,new DocumentBuilder().setTitle('Forgeboard REST API').setVersion('1').addCookieAuth('sid').build());
 SwaggerModule.setup('api/docs',app,document);
 const web=resolve('dist/web');if(existsSync(web)){
  app.use(express.static(web,{index:false}));http.get(/^(?!\/api(?:\/|$)).*/,(_req:express.Request,res:express.Response)=>res.sendFile(resolve(web,'index.html')));
 }
 await app.listen(Number(process.env.PORT)||3000,process.env.HOST||'127.0.0.1');
 const shutdown=async()=>{await app.close();await pool.end();};process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
 console.log(JSON.stringify({level:'info',event:'listening',port:Number(process.env.PORT)||3000}));
}
bootstrap().catch(e=>{console.error(e instanceof Error?e.message:'Startup failed');process.exitCode=1;pool.end();});
