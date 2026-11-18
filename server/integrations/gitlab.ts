import { createCipheriv, createDecipheriv, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';

function encryptionKey(){const key=Buffer.from(process.env.APP_ENCRYPTION_KEY||'','base64');if(key.length!==32)throw new Error('APP_ENCRYPTION_KEY must encode 32 bytes');return key;}
export function encryptSecret(secret:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv);const data=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);return [iv,data,cipher.getAuthTag()].map(v=>v.toString('base64')).join('.');}
export function decryptSecret(value:string){const [iv,data,tag]=value.split('.').map(v=>Buffer.from(v,'base64'));const cipher=createDecipheriv('aes-256-gcm',encryptionKey(),iv);cipher.setAuthTag(tag);return Buffer.concat([cipher.update(data),cipher.final()]).toString('utf8');}
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export function verifyWebhookToken(token:string,expected:string){const actual=digest(token);return expected.length===actual.length&&timingSafeEqual(Buffer.from(actual),Buffer.from(expected));}
function metadataAddress(host:string){host=host.replace(/^\[|\]$/g,'').toLowerCase();return host==='metadata.google.internal'||host==='metadata'||host==='100.100.100.200'||host==='0.0.0.0'||host==='::'||host.startsWith('169.254.')||host.startsWith('fe80:')||host.includes('ffff:169.254.')||host.includes('ffff:a9fe:')||host==='fd00:ec2::254';}
export function allowedBaseUrl(value:string){const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/'||metadataAddress(url.hostname))throw new Error('Invalid GitLab base URL');
 const origins=(process.env.INTEGRATION_ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);if(!origins.includes(url.origin))throw new Error('GitLab origin is not allowlisted');return url.origin;
}
export class GitLabClient {
 readonly base:string;
 constructor(base:string,private readonly token:string){this.base=allowedBaseUrl(base);}
 async request(path:string,method='GET',body?:unknown):Promise<any>{
  if(!path.startsWith('/')||path.startsWith('//')||path.includes('\\'))throw new Error('Invalid GitLab API path');
  const url=new URL(`${this.base}/api/v4${path}`);if(url.origin!==this.base)throw new Error('Invalid GitLab API origin');
  // Resolve once, validate all answers, then pin the connection to a validated IP.
  const addresses=await lookup(url.hostname.replace(/^\[|\]$/g,''),{all:true});if(!addresses.length||addresses.some(a=>metadataAddress(a.address)))throw new Error('Blocked metadata address');
  const address=addresses[0];const payload=body===undefined?undefined:JSON.stringify(body);
  return new Promise((resolve,reject)=>{const req=(url.protocol==='https:'?https:http).request(url,{method,headers:{'PRIVATE-TOKEN':this.token,accept:'application/json',...(payload?{'content-type':'application/json','content-length':Buffer.byteLength(payload)}:{})},lookup:((_host:any,options:any,cb:any)=>options.all?cb(null,addresses):cb(null,address.address,address.family)) as any},res=>{
   if((res.statusCode||0)>=300&&(res.statusCode||0)<400){res.resume();reject(new Error('GitLab redirects are forbidden'));return;}
   const chunks:Buffer[]=[];let size=0;res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>5*1024*1024){req.destroy(new Error('GitLab response too large'));return;}chunks.push(chunk);});res.on('end',()=>{if((res.statusCode||500)>=400){reject(new Error(`GitLab request failed (HTTP ${res.statusCode})`));return;}try{resolve(size?JSON.parse(Buffer.concat(chunks).toString('utf8')):null);}catch{reject(new Error('Invalid GitLab JSON response'));}});res.on('error',reject);
  });req.setTimeout(15000,()=>req.destroy(new Error('GitLab request timed out')));req.on('error',reject);if(payload)req.write(payload);req.end();});
 }
 async list(path:string,maxPages=20){const result:any[]=[];for(let page=1;page<=maxPages;page++){const batch=await this.request(`${path}${path.includes('?')?'&':'?'}per_page=100&page=${page}`);if(!Array.isArray(batch))throw new Error('Invalid GitLab collection');result.push(...batch);if(batch.length<100)return result;}throw new Error('GitLab pagination limit reached; narrow the request');}
}
export function extractTaskKeys(text:string){return [...new Set(text.match(/\b[A-Z][A-Z0-9]{1,9}-[1-9][0-9]*\b/g)||[])];}
export interface DevelopmentEvent {external_id:string;kind:string;title:string;url:string;state:string|null;external_updated_at:string;taskKeys:string[];data:Record<string,unknown>}
export function normalizeWebhook(payload:any):DevelopmentEvent[]{
 const kind=payload.object_kind||payload.event_type;const p=payload.project?.id??payload.project_id;const a=payload.object_attributes||{};
 const date=(s:any)=>{const value=new Date(s||0);return Number.isFinite(value.getTime())?value.toISOString():new Date(0).toISOString();};
 const event=(type:string,id:any,title:any,url:any,state:any,updated:any,text:string,data:Record<string,unknown>={}):DevelopmentEvent=>({external_id:`${p}:${id}`,kind:type,title:String(title||'').slice(0,2000),url:String(url||'').slice(0,4000),state:state?String(state):null,external_updated_at:date(updated),taskKeys:extractTaskKeys(text),data:{...data,gitlab_project_id:p}});
 if(kind==='merge_request')return [event('merge_request',a.id,a.title,a.url,a.state,a.updated_at,`${a.title} ${a.description||''} ${a.source_branch||''}`,{iid:a.iid,source_branch:a.source_branch,target_branch:a.target_branch})];
 if(kind==='pipeline')return [event('pipeline',a.id,`Pipeline #${a.id}`,a.url||`${payload.project?.web_url||''}/-/pipelines/${a.id}`,a.status,a.updated_at||a.finished_at||a.created_at,`${a.ref||''} ${payload.commit?.message||''}`,{ref:a.ref,sha:a.sha})];
 if(kind==='push')return (payload.commits||[]).map((c:any)=>event('commit',c.id,c.title||c.message,c.url,null,c.timestamp,`${c.message||''} ${payload.ref||''}`,{sha:c.id,ref:payload.ref}));
 if(kind==='issue')return a.confidential?[]:[event('issue',a.iid,a.title,a.url,a.state,a.updated_at,`${a.title||''} ${a.description||''}`,{iid:a.iid,description:a.description||'',labels:(payload.labels||a.labels||[]).map((l:any)=>typeof l==='string'?l:l.title),due_date:a.due_date||null})];
 if(kind==='release')return [event('release',payload.tag,payload.name,payload.url||`${payload.project?.web_url||''}/-/releases/${encodeURIComponent(payload.tag||'')}`,payload.action,payload.released_at||payload.created_at,`${payload.name||''} ${payload.description||''} ${payload.tag||''}`,{tag:payload.tag})];
 return [];
}
