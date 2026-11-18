import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMetrics, csvCell, workingDays } from '../server/planning/metrics.ts';

test('empty scope does not invent predictability or cycle time',()=>{
 const result=computeMetrics([],[],[]); assert.equal(result.predictability,null);assert.equal(result.cycle_time_days,null);assert.equal(result.completed_count,0);
});
test('baseline scope remains distinct from completion and late added work',()=>{
 const tasks=[{id:'a',status:'done',story_points:5,created_at:'2026-11-01T00:00:00Z',completed_at:'2026-11-05T00:00:00Z'},{id:'b',status:'done',story_points:3,created_at:'2026-11-01T00:00:00Z',completed_at:'2026-11-07T00:00:00Z'}];
 const events=[{task_id:'a',kind:'status_changed',data:{from:'ready',to:'in_progress'},created_at:'2026-11-03T00:00:00Z'},{task_id:'a',kind:'status_changed',data:{from:'review',to:'returned'},created_at:'2026-11-04T00:00:00Z'}];
 const r=computeMetrics(tasks,events,[{id:'a',story_points:5}],new Date('2026-11-10T00:00:00Z'));
 assert.equal(r.planned_points,5);assert.equal(r.completed_points,8);assert.equal(r.predictability,100);assert.equal(r.rework_count,1);assert.equal(r.cycle_time_days,2);assert.equal(r.lead_time_days,5);
});
test('CSV cells neutralize formulas and preserve commas and quotes',()=>{assert.equal(csvCell('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');assert.equal(csvCell('a,b'),'"a,b"');});
test('working days skip weekends and explicit leave',()=>{assert.equal(workingDays('2026-11-13','2026-11-17',['2026-11-16']),2);});
