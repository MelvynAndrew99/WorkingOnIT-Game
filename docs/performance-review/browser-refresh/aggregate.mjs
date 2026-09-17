import {readFileSync,writeFileSync} from 'node:fs';
const runs=JSON.parse(readFileSync(new URL('./browser.json',import.meta.url))),out=[];
const p95=a=>a.sort((a,b)=>a-b)[Math.min(a.length-1,Math.floor(a.length*.95))];
for(const width of [1440,390])for(const phase of ['steady','panZoom'])for(const version of ['before','after']){
 const selected=runs.filter(r=>r.width===width&&r.version===version),frames=selected.flatMap(r=>r.frames.filter(f=>f.phase===phase));
 if(!frames.length)continue;
 const intervals=selected.flatMap(r=>{const a=r.raf.filter(f=>f.phase===phase);return a.slice(1).map((f,i)=>f.at-a[i].at);});
 const sums={};for(const f of frames)for(const [k,s] of Object.entries(f.spans)){const a=sums[k]??={calls:0,ms:0,max:0};a.calls+=s.count;a.ms+=s.total;a.max=Math.max(a.max,s.max);}
 const spans=Object.fromEntries(Object.entries(sums).map(([k,v])=>[k,{...v,mean:v.ms/v.calls}]));
 out.push({width,phase,version,runs:selected.length,fps:intervals.length/(intervals.reduce((a,b)=>a+b,0)/1000),frameP95Ms:p95(intervals),sceneP95Ms:p95(frames.map(f=>f.cpu)),longTasks:selected.reduce((n,r)=>n+r.longTasks.filter(t=>t.phase===phase).length,0),spans});
}
writeFileSync(new URL('./aggregate.json',import.meta.url),JSON.stringify(out,null,2));
for(const r of out)console.log([r.width,r.phase,r.version,r.fps.toFixed(1),r.frameP95Ms.toFixed(1),r.sceneP95Ms.toFixed(1),r.spans.report.mean.toFixed(1),r.spans.trafficTick.mean.toFixed(1),r.longTasks].join(' | '));
