import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync(process.argv[2])),nodes=new Map(p.nodes.map(n=>[n.id,n])),cost=new Map();
for(let i=0;i<p.samples.length;i++){const n=nodes.get(p.samples[i]),f=n.callFrame,k=`${f.functionName||'(anonymous)'} ${f.url.replace(/^.*\/src\//,'src/').split('?')[0]}:${f.lineNumber+1}`;cost.set(k,(cost.get(k)??0)+(p.timeDeltas[i]??0)/1000);}
console.log([...cost].sort((a,b)=>b[1]-a[1]).slice(0,35).map(([k,v])=>`${v.toFixed(1)}ms ${k}`).join('\n'));
