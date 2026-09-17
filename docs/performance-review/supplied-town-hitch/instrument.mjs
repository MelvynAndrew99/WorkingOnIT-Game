import ts from '/home/phil/Code/jams/won/node_modules/typescript/lib/typescript.js';
import {readFileSync,writeFileSync} from 'node:fs';
const root='/tmp/won-hitch-town/src/';
const names={
 'game/cityScene.ts':['report','renderGround','renderCars','renderControls','renderActivity','preview','syncWeather'],
 'game/cityModel.ts':['stepCity','connectedHomes'],
 'game/cityTraffic.ts':['trafficTick','roadIndex'],
 'game/cityVisits.ts':['spawnTrips','stepVisits','homeRoadIssues'],
 'game/cityFlow.ts':['flowSnapshot','refreshFlowProgress','flowReport'],
 'game/cityRouting.ts':['routingSnapshot'],
 'game/cityIncidents.ts':['stepIncidents'],
 'game/cityMissions.ts':['missionSnapshot','refreshMissions'],
 'game/cityDiagnostics.ts':['cityDiagnostics'],
 'game/cityPulse.ts':['cityPulse'],
 'state/save.ts':['flushSave']
};
for(const [path,targets] of Object.entries(names)){
 let s=readFileSync(root+path,'utf8');const ast=ts.createSourceFile(path,s,ts.ScriptTarget.Latest,true);const edits=[],found=[];
 function visit(n){if(ts.isFunctionDeclaration(n)&&n.body&&targets.includes(n.name?.text)){
  const name=n.name.text;found.push(name);
  edits.push([n.body.getStart(ast)+1,`const __probeStart=performance.now();try{`]);
  edits.push([n.body.end-1,`}finally{(globalThis as any).__probeRecord?.('${name}',performance.now()-__probeStart);}`]);
 }ts.forEachChild(n,visit);}
 visit(ast);for(const name of targets)if(!found.includes(name))throw Error('Missing '+name);
 for(const [at,text] of edits.sort((a,b)=>b[0]-a[0]))s=s.slice(0,at)+text+s.slice(at);
 if(path==='game/cityScene.ts'){
  s=s.replace('    const tick = () => {',`    (window as any).__hitch={city,app,ready:true};
    const tick = () => {
        (window as any).__probeBegin?.(city.elapsed);`);
  const end='        if (saveClock >= 2) { saveClock = 0; flushSave(); }';
  s=s.replace(end,end+`\n        (window as any).__probeEnd?.(city.elapsed);`);
 }
 writeFileSync(root+path,s);
}
