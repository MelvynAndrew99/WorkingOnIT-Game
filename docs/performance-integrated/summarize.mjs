import fs from 'node:fs';
const before=JSON.parse(fs.readFileSync(process.argv[2]??'/tmp/integrated-browser-baseline/results.json')),after=JSON.parse(fs.readFileSync(process.argv[3]??'/tmp/integrated-browser-after/results.json'));
const median=a=>{a=[...a].sort((a,b)=>a-b);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
const n=x=>x.toFixed(1),pair=(b,a)=>`${n(b)} → ${n(a)}`;
const lines=['# Production browser before/after results','','Values are medians of two capture-level measurements (not pooled percentiles). Frame and input values are milliseconds. Input is dispatch-to-second-rAF; “—” means no scripted input, not zero latency. See README for methods and software-rendering limits.',''];
const summary=[];
for(const town of ['small','busy'])for(const width of [1440,390]){
 lines.push(`## ${town}, ${width===390?'mobile layout 390×844':'desktop 1440×900'}`,'','| Phase | FPS | Frame p95 | Frame p99 | Input proxy p95 | Long tasks >50ms |','|---|---:|---:|---:|---:|---:|');
 for(const name of ['live','pan-zoom','construction','apartment-joining','inspectors','radio']){
 const get=(data,fn)=>median(data.filter(r=>r.town===town&&r.width===width).map(r=>fn(r.phases.find(p=>p.name===name))));
 const metrics={};for(const [key,fn] of Object.entries({fps:p=>p.frames.n/(p.frames.total/1000),p95:p=>p.frames.p95,p99:p=>p.frames.p99,input:p=>p.input.p95,longTasks:p=>p.longTasks.n,simRatio:p=>p.simSeconds/(p.wallMs/1000),simP95:p=>p.costs.simulation?.p95??0,reportP95:p=>p.costs.report?.p95??0,groundMs:p=>p.costs.renderGround?.total??0,submitP95:p=>p.costs.pixiSubmit?.p95??0,heapMB:p=>p.heap/1048576}))metrics[key]={before:get(before,fn),after:get(after,fn)};
 summary.push({town,width,name,...metrics});
 lines.push(`| ${name} | ${pair(metrics.fps.before,metrics.fps.after)} | ${pair(metrics.p95.before,metrics.p95.after)} | ${pair(metrics.p99.before,metrics.p99.after)} | ${name==='live'?'—':pair(metrics.input.before,metrics.input.after)} | ${pair(metrics.longTasks.before,metrics.longTasks.after)} |`);
 }
 lines.push('');
}
fs.writeFileSync('docs/performance-integrated/browser-results.md',lines.join('\n')+'\n');fs.writeFileSync('docs/performance-integrated/browser-summary.json',JSON.stringify(summary,null,2));
console.log(summary.filter(s=>['live','pan-zoom'].includes(s.name)));
