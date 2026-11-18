import { Module, Controller, Get, Post, Body, Param, Req, Inject, HttpCode } from '@nestjs/common';
import type { Request } from 'express';
import { CoreModule } from '../core/core.module.js';
import { IntegrationsService } from './integrations.service.js';

@Controller()
class IntegrationsController {
 constructor(@Inject(IntegrationsService) private readonly service:IntegrationsService){}
 @Get('projects/:id/integrations') list(@Req() req:Request,@Param('id') id:string){return this.service.list(req,id);}
 @Post('projects/:id/integrations') create(@Req() req:Request,@Param('id') id:string,@Body() body:any){return this.service.create(req,id,body);}
 @Post('integrations/:id/check') check(@Req() req:Request,@Param('id') id:string){return this.service.check(req,id);}
 @Get('integrations/:id/projects') projects(@Req() req:Request,@Param('id') id:string){return this.service.projects(req,id);}
 @Post('integrations/:id/bind') bind(@Req() req:Request,@Param('id') id:string,@Body() body:any){return this.service.bind(req,id,body);}
 @Post('integrations/:id/webhook') webhook(@Req() req:Request,@Param('id') id:string,@Body() body:any){return this.service.installWebhook(req,id,body||{});}
 @Post('integrations/:id/reconcile') reconcile(@Req() req:Request,@Param('id') id:string){return this.service.enqueue(req,id);}
 @Post('integrations/:id/issues/import') importIssues(@Req() req:Request,@Param('id') id:string,@Body() body:any){return this.service.importIssues(req,id,body||{});}
 @Post('tasks/:id/branch') branch(@Req() req:Request,@Param('id') id:string,@Body() body:any){return this.service.branch(req,id,body);}
 @Post('tasks/:id/gitlab-issue') push(@Req() req:Request,@Param('id') id:string,@Body() body:any){return this.service.pushIssue(req,id,body);}
 @Get('tasks/:id/development') development(@Req() req:Request,@Param('id') id:string){return this.service.development(req,id);}
 @Post('webhooks/gitlab/:id') @HttpCode(202) receive(@Req() req:Request,@Param('id') id:string,@Body() body:any){return this.service.receive(id,String(req.headers['x-gitlab-token']||''),String(req.headers['x-gitlab-event-uuid']||req.headers['x-gitlab-webhook-uuid']||''),body);}
}
@Module({imports:[CoreModule],controllers:[IntegrationsController],providers:[IntegrationsService],exports:[IntegrationsService]})
export class IntegrationsModule {}
