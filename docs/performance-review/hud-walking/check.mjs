import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const roots=process.argv.slice(2);assert.equal(roots.length,2,'provide baseline and candidate roots');
const raw=JSON.parse(readFileSync(new URL('../supplied-town-hitch/save.json',import.meta.url))).city;
async function load(root){const get=name=>import(pathToFileURL(resolve(root,'src/game/'+name+'.ts')));return {m:await get('cityModel'),j:await get('cityJourneys'),p:await get('cityPathfinding'),missions:await get('cityMissions'),flow:await get('cityFlow'),diag:await get('cityDiagnostics')};}
const [before,after]=await Promise.all(roots.map(load));
function report(lib,c){return lib.p.withRoadPathRead(c,()=>{
 const action=()=>{lib.missions.refreshMissions(c);return {flow:lib.flow.flowReport(c),diagnostics:lib.diag.cityDiagnostics(c),missions:lib.missions.missionSnapshot(c),connected:lib.m.connectedHomes(c)};};
 return lib.j.withWalkingPathRead?lib.j.withWalkingPathRead(c,action):action();
});}
let a=before.m.parseCity(structuredClone(raw)),b=after.m.parseCity(structuredClone(raw));
let paths=0;
for(const maximum of [0,.5,1,2.5,6,12])for(let i=0;i<a.roads.length;i+=13)for(let k=0;k<a.roads.length;k+=17){
 const from=a.roads[i],to=a.roads[k];assert.deepEqual(after.j.withWalkingPathRead(b,()=>after.j.walkingPath(b,from,to,maximum)),before.j.walkingPath(a,from,to,maximum));paths++;
}
for(let n=0;n<20;n++){
 assert.deepEqual(report(after,b),report(before,a));assert.deepEqual(b,a);
 before.m.stepCity(a,.25);after.m.stepCity(b,.25);assert.deepEqual(b,a);
}
// Report results remain fresh after coordinate edits and restoration.
for(const mutate of [c=>{c.roads[0].x+=1;},c=>{c.roads[0].x-=1;},c=>{c.buildings[0].rotation=(c.buildings[0].rotation+1)%4;}]){
 mutate(a);mutate(b);assert.deepEqual(report(after,b),report(before,a));assert.deepEqual(b,a);
}
const times={before:[],after:[]};
a=before.m.parseCity(structuredClone(raw));b=after.m.parseCity(structuredClone(raw));
for(let i=0;i<10;i++){report(before,a);report(after,b);}
for(let i=0;i<60;i++)for(const name of i%2?['after','before']:['before','after']){const lib=name==='before'?before:after,c=name==='before'?a:b;const start=performance.now();report(lib,c);times[name].push(performance.now()-start);}
const stats=arr=>{arr.sort((a,b)=>a-b);return {medianMs:arr[Math.floor(arr.length/2)],p95Ms:arr[Math.floor(arr.length*.95)]};};
console.log(JSON.stringify({pathComparisons:paths,fullStateCheckpoints:20,editedReportChecks:3,repetitions:60,before:stats(times.before),after:stats(times.after)},null,2));
