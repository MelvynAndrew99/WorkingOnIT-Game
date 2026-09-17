import ts from '/home/phil/Code/jams/won/node_modules/typescript/lib/typescript.js';
import {readFileSync,writeFileSync} from 'node:fs';
for(const [path,targets]of Object.entries({'game/cityTraffic.ts':['replan','allowed','grid','detectAccidents'],'game/cityModel.ts':['retarget'],'game/cityRouting.ts':['weightedRoute'],'game/cityTransit.ts':['hasJourneyAccess'],'game/cityJourneys.ts':['walkingPath']})){
 const file='/tmp/won-hitch-town/src/'+path;let s=readFileSync(file,'utf8');const ast=ts.createSourceFile(path,s,ts.ScriptTarget.Latest,true);const edits=[];
 function visit(n){if(ts.isFunctionDeclaration(n)&&n.body&&targets.includes(n.name?.text)){
 const name=n.name.text;const begin=name==='retarget'?`const __tripStarted=performance.now();const __initialPhase=trip.phase;try{`:`const __phaseStarted=performance.now();try{`;
 const end=name==='retarget'?`}finally{(globalThis as any).__tripRecord?.(trip,__initialPhase,performance.now()-__tripStarted);}`:`}finally{(globalThis as any).__probeRecord?.('${name}',performance.now()-__phaseStarted);}`;
 edits.push([n.body.getStart(ast)+1,begin],[n.body.end-1,end]);}ts.forEachChild(n,visit);}
 visit(ast);for(const [at,text]of edits.sort((a,b)=>b[0]-a[0]))s=s.slice(0,at)+text+s.slice(at);writeFileSync(file,s);
}
