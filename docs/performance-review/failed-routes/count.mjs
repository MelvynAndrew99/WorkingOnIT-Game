// Isolated instrumentation; never modifies the runtime source tree.
import {cpSync,mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const raw=JSON.parse(readFileSync(new URL('../supplied-town-hitch/save.json',import.meta.url))).city;
const results={};let baseline;
for(const [i,root] of process.argv.slice(2).entries()){
 const dir=mkdtempSync('/tmp/won-retry-count-');cpSync(resolve(root,'src'),join(dir,'src'),{recursive:true});cpSync(resolve(root,'package.json'),join(dir,'package.json'));
 const modelPath=join(dir,'src/game/cityModel.ts'),trafficPath=join(dir,'src/game/cityTraffic.ts');
 let source=readFileSync(modelPath,'utf8');source=source.replace('  if (trip.emergencyPass) return false;\n  let goal = goalOf(city, trip);','  globalThis.__retryCounts[trip.id]=(globalThis.__retryCounts[trip.id]??0)+1;\n  if (trip.emergencyPass) return false;\n  let goal = goalOf(city, trip);');writeFileSync(modelPath,source);
 source=readFileSync(trafficPath,'utf8').replace('function grid(city: City, index: RoadIndex): { grid: Grid; held: Map<number, Slot[]> } {','function grid(city: City, index: RoadIndex): { grid: Grid; held: Map<number, Slot[]> } {\n globalThis.__grids++;');writeFileSync(trafficPath,source);
 const m=await import(pathToFileURL(modelPath));const c=m.parseCity(structuredClone(raw));globalThis.__retryCounts={};globalThis.__grids=0;
 const waiting=c.trips.filter(t=>t.phase==='waiting'&&!t.service).map(t=>t.id);
 for(let j=0;j<800;j++)m.stepCity(c,.025);
 if(baseline)assert.deepEqual(c,baseline);else baseline=c;
 results[i?'after':'before']={seconds:20,retargetCalls:Object.values(globalThis.__retryCounts).reduce((a,b)=>a+b,0),gridConstructions:globalThis.__grids,originalWaiting:Object.fromEntries(waiting.map(id=>[id,globalThis.__retryCounts[id]??0]))};
}
console.log(JSON.stringify(results,null,2));
