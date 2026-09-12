import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';
const results=[];
for(const [label,root] of [['prior-one-lane','/tmp/oneway-dev'],['current-two-lanes',process.cwd()]]){
 const {createCity,place,stepCity}=await import(pathToFileURL(root+'/src/game/cityModel.ts'));
 const {applyRoadDirections}=await import(pathToFileURL(root+'/src/game/cityDirectionEdits.ts'));
 const c=createCity();c.funds=100000;c.tutorial.status='complete';c.map={x:0,y:0,width:64,height:32};const path=Array.from({length:61},(_,x)=>({x,y:10}));for(const p of path)place(c,'road',p.x,p.y);assert.ok(applyRoadDirections(c,path.slice(0,56),'forward').ok);
 if(c.nextId%2===0)c.nextId++;
 const leader={id:c.nextId++,homeId:0,storeId:0,path,progress:15,wait:0,hold:0,speed:.7};c.trips=[leader];for(let i=0;i<8;i++)c.trips.push({id:c.nextId++,homeId:i+1,storeId:0,path,progress:13-i*1.5,wait:0,hold:0});
 const initial=c.trips.map(({id,progress,speed})=>({id,progress,speed:speed??2}));let sharedTicks=0;const passedLeader=new Set();const crossed40=new Set();for(let n=0;n<1600;n++){stepCity(c,.025);for(const t of c.trips){if(t.id!==leader.id&&t.progress>leader.progress)passedLeader.add(t.id);if(t.progress>=40)crossed40.add(t.id);}for(let i=0;i<c.trips.length;i++)for(let j=i+1;j<c.trips.length;j++){const a=c.trips[i],b=c.trips[j];if(Math.ceil(a.progress-.5)===Math.ceil(b.progress-.5)&&a.trafficLane!==b.trafficLane)sharedTicks++;}}
 results.push({label,initial,simulatedSeconds:40,completed:c.completed,crossed40:crossed40.size,passedLeader:passedLeader.size,sharedTicks,newAccidents:c.accidentCount,remaining:c.trips.map(t=>({id:t.id,progress:t.progress,lane:t.trafficLane??0}))});
}
assert.deepEqual(results[0].initial,results[1].initial);assert.ok(results[1].crossed40>results[0].crossed40,'additional physical lane must move more of the same demand past bottleneck');assert.ok(results[1].passedLeader>0);assert.equal(results[1].newAccidents,0);
writeFileSync(new URL('capacity.json',import.meta.url),JSON.stringify({description:'Identical nine physical vehicles on a 61-tile corridor, first56 tiles one-way, one slower leader. Same timestep, speed, demand and geometry. Synthetic road-capacity fixture, not a general city throughput multiplier.',results},null,2));console.log(JSON.stringify(results,null,2));
