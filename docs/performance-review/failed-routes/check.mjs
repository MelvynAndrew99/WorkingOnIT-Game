import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [oldRoot,newRoot]=process.argv.slice(2);
const load=root=>import(pathToFileURL(resolve(root,'src/game/cityModel.ts')));
const [oldModel,newModel]=await Promise.all([load(oldRoot),load(newRoot)]);
const raw=JSON.parse(readFileSync(new URL('../supplied-town-hitch/save.json',import.meta.url))).city;
let a=oldModel.parseCity(structuredClone(raw)),b=newModel.parseCity(structuredClone(raw));
for(let i=0;i<2400;i++){oldModel.stepCity(a,.025);newModel.stepCity(b,.025);if(i%40===39)assert.deepEqual(b,a);}
const edits=[c=>c.closures.splice(0,1),c=>c.roads[0].x++,c=>c.roads[0].x--,
 c=>c.incidents[0].status='cleared',c=>c.buildings.find(b=>b.kind==='busStop').rotation=(c.buildings.find(b=>b.kind==='busStop').rotation+1)%4,
 c=>c.transit.routes[0].stopIds.reverse(),c=>{const t=c.trips.find(t=>t.phase==='waiting'&&!t.service);t.target={...t.path[0]};}];
for(const edit of edits){a=oldModel.parseCity(structuredClone(raw));b=newModel.parseCity(structuredClone(raw));for(let i=0;i<4;i++){oldModel.stepCity(a,.025);newModel.stepCity(b,.025);}edit(a);edit(b);for(let i=0;i<10;i++){oldModel.stepCity(a,.025);newModel.stepCity(b,.025);assert.deepEqual(b,a);}}
// Time complete model replay, alternating order, outside other test/build work.
const times={before:[],after:[]};
for(let round=0;round<8;round++)for(const name of round%2?['after','before']:['before','after']){
 const m=name==='before'?oldModel:newModel,c=m.parseCity(structuredClone(raw));const start=performance.now();for(let i=0;i<200;i++)m.stepCity(c,.025);if(round>0)times[name].push(performance.now()-start);
}
const median=a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)];
console.log(JSON.stringify({fullStateCheckpoints:60,editCases:edits.length,editCheckpoints:edits.length*10,simulatedSecondsPerSample:5,samples:7,beforeMedianMs:median(times.before),afterMedianMs:median(times.after)},null,2));
