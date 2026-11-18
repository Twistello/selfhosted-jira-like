import {createCipheriv,createDecipheriv,createHash,createHmac,randomBytes} from 'node:crypto';
export const hashToken=(s:string)=>createHash('sha256').update(s).digest('hex');
export const token=()=>randomBytes(32).toString('base64url');
function key(){const k=Buffer.from(process.env.APP_ENCRYPTION_KEY||'','base64');if(k.length!==32)throw new Error('APP_ENCRYPTION_KEY must be 32 bytes encoded as base64');return k;}
export function encryptSecret(s:string){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key(),iv);const data=Buffer.concat([c.update(s,'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),data]).toString('base64');}
export function decryptSecret(s:string){const b=Buffer.from(s,'base64'),c=createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));c.setAuthTag(b.subarray(12,28));return Buffer.concat([c.update(b.subarray(28)),c.final()]).toString('utf8');}
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(b:Buffer){let bits=0,value=0,out='';for(const byte of b){value=(value<<8)|byte;bits+=8;while(bits>=5){out+=alphabet[(value>>>(bits-5))&31];bits-=5;}}if(bits)out+=alphabet[(value<<(5-bits))&31];return out;}
export function totp(secret:string,time=Date.now()){let bits=0,value=0;const bytes:number[]=[];for(const ch of secret){value=(value<<5)|alphabet.indexOf(ch);bits+=5;if(bits>=8){bytes.push((value>>>(bits-8))&255);bits-=8;}}const count=Buffer.alloc(8);count.writeBigUInt64BE(BigInt(Math.floor(time/30000)));const h=createHmac('sha1',Buffer.from(bytes)).update(count).digest(),o=h[19]&15;return String((h.readUInt32BE(o)&0x7fffffff)%1000000).padStart(6,'0');}
