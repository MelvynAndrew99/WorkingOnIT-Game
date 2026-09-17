import {readFileSync,writeFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('./browser.json',import.meta.url)));
const stats=a=>{a.sort((a,b)=>a-b);return {count:a.length,median:a[Math.floor(a.length*.5)]??0,p95:a[Math.min(a.length-1,Math.floor(a.length*.95))]??0,max:a.at(-1)??0};};
const rows=[];
for(const run of data)for(const phase of ['steady','panZoom']){
 const frames=run.frames.filter(f=>f.phase===phase),raf=run.raf.filter(f=>f.phase===phase),intervals=raf.slice(1).map((f,i)=>f.at-raf[i].at),spans={};
 for(const f of frames)for(const [name,s] of Object.entries(f.spans)){const a=spans[name]??={calls:0,totalMs:0,maxMs:0,frameTotals:[]};a.calls+=s.count;a.totalMs+=s.total;a.maxMs=Math.max(a.maxMs,s.max);a.frameTotals.push(s.total);}
 for(const s of Object.values(spans)){s.meanCallMs=s.totalMs/s.calls;s.perFrame=stats(s.frameTotals);delete s.frameTotals;}
 const start=run.metrics[phase==='steady'?'start':'steadyEnd'],end=run.metrics[phase==='steady'?'steadyEnd':'end'];
 rows.push({version:run.version,repeat:run.repeat,width:run.width,phase,frames:frames.length,approxFps:intervals.length/(intervals.reduce((a,b)=>a+b,0)/1000),frameIntervalMs:stats(intervals),sceneCallbackMs:stats(frames.map(f=>f.cpu)),simulatedSeconds:frames.at(-1).simEnd-frames[0].sim,longTasks:stats(run.longTasks.filter(t=>t.phase===phase).map(t=>t.duration)),heapStartMB:start.JSHeapUsedSize/1e6,heapEndMB:end.JSHeapUsedSize/1e6,taskSeconds:end.TaskDuration-start.TaskDuration,scriptSeconds:end.ScriptDuration-start.ScriptDuration,spans});
}
writeFileSync(new URL('./summary.json',import.meta.url),JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows.map(({spans,...r})=>({...r,reportMean:spans.report?.meanCallMs,trafficTickMean:spans.trafficTick?.meanCallMs,activityMean:spans.renderActivity?.meanCallMs,carsMean:spans.renderCars?.meanCallMs})),null,2));
