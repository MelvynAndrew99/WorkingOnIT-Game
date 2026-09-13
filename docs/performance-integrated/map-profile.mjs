import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(process.cwd()+'/package.json');const {TraceMap,originalPositionFor}=require('@jridgewell/trace-mapping');
const p=JSON.parse(readFileSync(process.argv[2]));const maps=new Map(),nodes=new Map(p.nodes.map(n=>[n.id,n])),parent=new Map();
for(const n of p.nodes)for(const child of n.children??[])parent.set(child,n.id);
function label(n){const f=n.callFrame;if(!f.url)return f.functionName||'(anonymous native)';const file=f.url.split('/').at(-1);let map=maps.get(file);if(!map){map=new TraceMap(JSON.parse(readFileSync(process.argv[3]+'/'+file+'.map')));maps.set(file,map);}
const at=originalPositionFor(map,{line:f.lineNumber+1,column:f.columnNumber});return `${at.source?.replace(/^.*\/src\//,'src/').replace(/^.*node_modules\//,'node_modules/')} : ${at.line} (${at.name??f.functionName??'anonymous'})`;}
const self=new Map(),inclusive=new Map();for(let i=0;i<p.samples.length;i++){let id=p.samples[i],dt=p.timeDeltas[i];const l=label(nodes.get(id));self.set(l,(self.get(l)??0)+dt);const seen=new Set();while(id){const k=label(nodes.get(id));if(!seen.has(k)){inclusive.set(k,(inclusive.get(k)??0)+dt);seen.add(k);}id=parent.get(id);}}
const lines=[`Profile duration ${((p.endTime-p.startTime)/1000).toFixed(1)} ms; sample deltas ${p.timeDeltas.reduce((a,b)=>a+b,0)/1000} ms.`, 'SELF ms'];
for(const [k,v]of [...self].sort((a,b)=>b[1]-a[1]).slice(0,30))lines.push(`${(v/1000).toFixed(1)} ${k}`);
lines.push('\nINCLUSIVE ms (overlap; do not add)');for(const[k,v]of [...inclusive].sort((a,b)=>b[1]-a[1]).slice(0,35))lines.push(`${(v/1000).toFixed(1)} ${k}`);
writeFileSync(process.argv[4],lines.join('\n')+'\n');console.log(lines.join('\n'));
