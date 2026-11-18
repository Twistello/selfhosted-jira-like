import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptSecret, decryptSecret, allowedBaseUrl, extractTaskKeys, normalizeWebhook, GitLabClient } from '../server/integrations/gitlab.js';
import { createServer } from 'node:http';

test('tokens are encrypted with authenticated encryption and tampering fails closed', () => {
 process.env.APP_ENCRYPTION_KEY=Buffer.alloc(32,7).toString('base64');
 const encrypted=encryptSecret('private-token');
 assert.ok(!encrypted.includes('private-token'));
 assert.equal(decryptSecret(encrypted),'private-token');
 const parts=encrypted.split('.'); parts[2]=Buffer.alloc(16).toString('base64');
 assert.throws(()=>decryptSecret(parts.join('.')));
});
test('outbound requests require exact origins and reject credentials and metadata even when listed',()=>{
 process.env.INTEGRATION_ALLOWED_ORIGINS='https://gitlab.internal,http://169.254.169.254';
 assert.equal(allowedBaseUrl('https://gitlab.internal/'),'https://gitlab.internal');
 for(const url of ['https://gitlab.internal.evil','https://secret@gitlab.internal','http://169.254.169.254','https://gitlab.internal/path']) assert.throws(()=>allowedBaseUrl(url));
});
test('GitLab HTTP contract uses private token, encoded path and refuses redirects',async()=>{
 const requests:string[]=[];
 const server=createServer((req,res)=>{requests.push(req.url!);assert.equal(req.headers['private-token'],'fixture-token');if(req.url?.includes('redirect')){res.writeHead(302,{location:'http://169.254.169.254'});res.end();}else{res.setHeader('content-type','application/json');res.end(JSON.stringify({id:3}));}});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 try{const port=(server.address() as any).port;process.env.INTEGRATION_ALLOWED_ORIGINS=`http://127.0.0.1:${port}`;
 const client=new GitLabClient(`http://127.0.0.1:${port}`,'fixture-token');
 assert.deepEqual(await client.request('/projects/group%2Frepo'),{id:3});
 await assert.rejects(()=>client.request('/redirect'),/redirect/i);
 assert.equal(requests.length,2);
 }finally{await new Promise<void>(r=>server.close(()=>r()));}
});
test('extracts distinct bounded task keys from development event text',()=>{
 assert.deepEqual(extractTaskKeys('feature/APP-12 APP-12 fixes APP-2 and BADAPP-3x'),['APP-12','APP-2']);
});
test('merge requests and pipelines retain external timestamps and task references',()=>{
 const mr=normalizeWebhook({object_kind:'merge_request',project:{id:5},object_attributes:{id:40,iid:2,title:'APP-1 fix',source_branch:'feature/APP-2',url:'https://gitlab/mr/2',state:'merged',updated_at:'2026-01-02T01:00:00Z'}});
 assert.equal(mr[0].kind,'merge_request');assert.deepEqual(mr[0].taskKeys,['APP-1','APP-2']);assert.equal(mr[0].external_id,'5:40');
 const pipeline=normalizeWebhook({object_kind:'pipeline',project:{id:5},object_attributes:{id:2,ref:'APP-2',status:'failed',updated_at:'2026-01-03T00:00:00Z'},commit:{message:'APP-1'}});
 assert.equal(pipeline[0].state,'failed');assert.deepEqual(pipeline[0].taskKeys,['APP-2','APP-1']);
});
test('validated DNS addresses are pinned without breaking Node family selection',async()=>{
 const server=createServer((_req,res)=>res.end('{"ok":true}'));await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://localhost:${(server.address() as any).port}`;process.env.INTEGRATION_ALLOWED_ORIGINS=origin;
 try{assert.deepEqual(await new GitLabClient(origin,'fixture').request('/user'),{ok:true});}finally{await new Promise<void>(r=>server.close(()=>r()));}
});
