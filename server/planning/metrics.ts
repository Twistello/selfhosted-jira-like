const day=86400000;
const numeric=(v:unknown)=>Number(v)||0;
const mean=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
export function computeMetrics(tasks:any[],events:any[],baseline:any[],now=new Date()):any {
 const completed=tasks.filter(t=>t.status==='done');
 const planned=baseline.reduce((n,t)=>n+numeric(t.story_points),0);
 const baselineIds=new Set(baseline.map(t=>typeof t==='string'?t:t.id));
 const baselineCompleted=completed.filter(t=>baselineIds.has(t.id)).reduce((n,t)=>n+numeric(baseline.find(b=>b.id===t.id)?.story_points),0);
 const leads=completed.filter(t=>t.completed_at).map(t=>Math.max(0,(+new Date(t.completed_at)-+new Date(t.created_at))/day));
 const cycles=completed.flatMap(t=>{
  const starts=events.filter(e=>e.task_id===t.id&&e.kind==='status_changed'&&e.data.to==='in_progress').sort((a,b)=>+new Date(a.created_at)-+new Date(b.created_at));
  return starts.length&&t.completed_at?[Math.max(0,(+new Date(t.completed_at)-+new Date(starts[0].created_at))/day)]:[];
 });
 const rework=events.filter(e=>e.kind==='status_changed'&&e.data.to==='returned');
 const dates=[...new Set(events.map(e=>new Date(e.created_at).toISOString().slice(0,10)))].sort();
 const flow:Record<string,string>={};
 const cumulative_flow=dates.map(date=>{
   for(const e of events.filter(e=>new Date(e.created_at).toISOString().slice(0,10)===date).sort((a,b)=>+new Date(a.created_at)-+new Date(b.created_at))){
     if(e.task_id&&(e.kind==='task_created'||e.kind==='status_changed'))flow[e.task_id]=e.data.to||e.data.status||'backlog';
   }
   const counts:Record<string,number>={};for(const status of Object.values(flow))counts[status]=(counts[status]||0)+1;
   return {date,...counts};
 });
 return {
  total_count:tasks.length,completed_count:completed.length,planned_points:planned,
  completed_points:completed.reduce((n,t)=>n+numeric(t.story_points),0),predictability:planned?baselineCompleted/planned*100:null,
  lead_time_days:mean(leads),cycle_time_days:mean(cycles),rework_count:rework.length,
  throughput:completed.length,scope_changes:events.filter(e=>['scope_added','scope_removed'].includes(e.kind)),
  aging:tasks.filter(t=>t.status!=='done').map(t=>({id:t.id,key:t.key,days:Math.max(0,(+now-+new Date(t.created_at))/day)})),
  by_status:tasks.reduce((acc,t)=>({...acc,[t.status]:(acc[t.status]||0)+1}),{} as Record<string,number>),cumulative_flow,
 };
}
export function csvCell(value:unknown):string {
 let text=value==null?'':String(value); if(/^[\s]*[=+@\-\t\r]/.test(text))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
}
export function workingDays(start:string,end:string,holidays:string[]=[]):number {
 const a=new Date(start+'T00:00:00Z'),b=new Date(end+'T00:00:00Z');
 if(!Number.isFinite(+a)||!Number.isFinite(+b)||+b<+a)throw new Error('Invalid date range');
 if((+b-+a)/day>36600)throw new Error('Date range too large');
 let count=0;for(let d=+a;d<=+b;d+=day){const date=new Date(d);if(date.getUTCDay()!==0&&date.getUTCDay()!==6&&!holidays.includes(date.toISOString().slice(0,10)))count++;}return count;
}
