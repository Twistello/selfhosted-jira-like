import {Module,Controller,Get,Post,Patch,Delete,Param,Body,Req,Res,Query,Inject} from '@nestjs/common';
import type {Request,Response} from 'express';
import {AuthService,text,uuid} from './auth.service.js';
import {WorkService} from './work.service.js';
import {query} from '../db.js';
import {hashToken} from './crypto.js';
@Controller('auth')
class AuthController{
 constructor(@Inject(AuthService) private auth:AuthService){}
 @Get('status') status(){return this.auth.status();}
 @Post('setup') setup(@Body() b:any,@Req() r:Request,@Res({passthrough:true}) s:Response){return this.auth.setup(b,r,s);}
 @Post('login') login(@Body() b:any,@Req() r:Request,@Res({passthrough:true}) s:Response){return this.auth.login(b,r,s);}
 @Get('me') me(@Req() r:Request){return this.auth.actor(r,true);}
 @Post('logout') async logout(@Req() r:Request,@Res({passthrough:true}) s:Response){if(r.cookies?.sid)await query('DELETE FROM sessions WHERE token_hash=$1',[hashToken(r.cookies.sid)]);s.clearCookie('sid',{path:'/'});return {ok:true};}
 @Get('mfa/setup') async mfa(@Req() r:Request){return this.auth.mfaSetup(await this.auth.actor(r,true));}
 @Post('mfa/enable') async enable(@Body() b:any,@Req() r:Request){return this.auth.enableMfa(await this.auth.actor(r,true),b.code,r);}
 @Post('mfa/disable') async disable(@Body() b:any,@Req() r:Request,@Res({passthrough:true}) s:Response){const result=await this.auth.disableMfa(await this.auth.actor(r),b);s.clearCookie('sid',{path:'/'});return result;}
 @Post('invitations') async invite(@Body() b:any,@Req() r:Request){return this.auth.issueToken(await this.auth.actor(r),b,'invitation');}
 @Post('invitations/accept') accept(@Body() b:any,@Req() r:Request,@Res({passthrough:true}) s:Response){return this.auth.acceptInvitation(b,r,s);}
 @Post('password-reset/request') async requestReset(@Body() b:any,@Req() r:Request){return this.auth.issueToken(await this.auth.actor(r),b,'password_reset');}
 @Post('password-reset') reset(@Body() b:any){return this.auth.resetPassword(b);}
 @Get('sessions') async sessions(@Req() r:Request){const a=await this.auth.actor(r,true);return (await query('SELECT id,user_agent,created_at,expires_at,token_hash=$2 AS current FROM sessions WHERE user_id=$1 AND expires_at>now() ORDER BY created_at DESC',[a.id,hashToken(r.cookies.sid)])).rows;}
 @Delete('sessions/:id') async revoke(@Param('id') id:string,@Req() r:Request){const a=await this.auth.actor(r,true);await query('DELETE FROM sessions WHERE id=$1 AND user_id=$2',[uuid(id),a.id]);return {ok:true};}
}
@Controller()
class WorkController{
 constructor(@Inject(AuthService) private auth:AuthService,@Inject(WorkService) private work:WorkService){}
 @Get('projects') async projects(@Req() r:Request){return this.work.projects(await this.auth.actor(r));}
 @Post('projects') async createProject(@Req() r:Request,@Body() b:any){return this.work.createProject(await this.auth.actor(r),b);}
 @Get('projects/:id') async project(@Req() r:Request,@Param('id') id:string){return this.auth.requireProject(await this.auth.actor(r),id);}
 @Patch('projects/:id') async updateProject(@Req() r:Request,@Param('id') id:string,@Body() b:any){return this.work.updateProject(await this.auth.actor(r),id,b);}
 @Get('projects/:id/members') async members(@Req() r:Request,@Param('id') id:string){return this.work.members(await this.auth.actor(r),id);}
 @Post('projects/:id/members') async addMember(@Req() r:Request,@Param('id') id:string,@Body() b:any){return this.work.addMember(await this.auth.actor(r),id,b);}
 @Get('projects/:id/tasks') async tasks(@Req() r:Request,@Param('id') id:string,@Query() q:any){return this.work.tasks(await this.auth.actor(r),id,q);}
 @Post('projects/:id/tasks') async createTask(@Req() r:Request,@Param('id') id:string,@Body() b:any){return this.work.createTask(await this.auth.actor(r),id,b);}
 @Get('tasks/:id') async task(@Req() r:Request,@Param('id') id:string){return this.work.task(await this.auth.actor(r),id);}
 @Patch('tasks/:id') async updateTask(@Req() r:Request,@Param('id') id:string,@Body() b:any){return this.work.updateTask(await this.auth.actor(r),id,b);}
 @Delete('tasks/:id') async deleteTask(@Req() r:Request,@Param('id') id:string){return this.work.removeTask(await this.auth.actor(r),id);}
 @Post('tasks/:id/comments') async comment(@Req() r:Request,@Param('id') id:string,@Body() b:any){return this.work.comment(await this.auth.actor(r),id,b);}
 @Get('projects/:id/sprints') async sprints(@Req() r:Request,@Param('id') id:string){return this.work.sprints(await this.auth.actor(r),id);}
 @Post('projects/:id/sprints') async createSprint(@Req() r:Request,@Param('id') id:string,@Body() b:any){return this.work.createSprint(await this.auth.actor(r),id,b);}
 @Post('sprints/:id/start') async start(@Req() r:Request,@Param('id') id:string){return this.work.sprintAction(await this.auth.actor(r),id,'start');}
 @Post('sprints/:id/close') async close(@Req() r:Request,@Param('id') id:string,@Body() b:any){return this.work.sprintAction(await this.auth.actor(r),id,'close',b);}
 @Get('projects/:id/events') async events(@Req() r:Request,@Param('id') id:string,@Query() q:any){return this.work.events(await this.auth.actor(r),id,q);}
 @Get('users') async users(@Req() r:Request){const a=await this.auth.actor(r);this.auth.requireAdmin(a);return (await query('SELECT id,email,name,role,mfa_enabled,disabled,created_at FROM users ORDER BY created_at')).rows;}
 @Get('settings') async settings(@Req() r:Request){await this.auth.actor(r,true);return (await query("SELECT value FROM settings WHERE key='organization'")).rows[0]?.value;}
 @Patch('settings') async updateSettings(@Req() r:Request,@Body() b:any){const a=await this.auth.actor(r);this.auth.requireAdmin(a);const org:any={};if('name' in b)org.name=text(b.name,'organization name',200);if('require_mfa' in b)org.require_mfa=!!b.require_mfa;return (await query("UPDATE settings SET value=value || $1::jsonb WHERE key='organization' RETURNING value",[JSON.stringify(org)])).rows[0].value;}
}
@Module({controllers:[AuthController,WorkController],providers:[AuthService,WorkService],exports:[AuthService,WorkService]})
export class CoreModule{}
