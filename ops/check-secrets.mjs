import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard'],{encoding:'utf8',windowsHide:true}).split('\n').filter(Boolean);
const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\bgh[pousr]_[A-Za-z0-9]{30,}/,/\bglpat-[A-Za-z0-9_-]{20,}/,/\bAKIA[A-Z0-9]{16}\b/,/APP_ENCRYPTION_KEY=[A-Za-z0-9+/]{40,}={0,2}/];
let failed=false;
for(const file of files){
 if(/^(?:node_modules|dist|\.runtime|test-results|playwright-report)\//.test(file)||file==='.env'){console.error('Runtime file must not be committed: '+file);failed=true;continue;}
 if(file==='ops/check-secrets.mjs'||/\.(png|jpg|zip)$/.test(file))continue;
 const text=readFileSync(file,'utf8');if(patterns.some(p=>p.test(text))){console.error('Potential secret in '+file);failed=true;}
}
if(failed)process.exit(1);console.log(`Checked ${files.length} source files for common secret patterns and runtime artifacts. This is a bounded pattern scan, not a security audit.`);
