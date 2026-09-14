import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,place,stepCity,parseCity,type Trip} from './cityModel.ts';
import {applyRoadDirections} from './cityDirectionEdits.ts';
import {bodyTile,travelLaneOffset} from './cityTraffic.ts';
function corridor(){const c=createCity();c.funds=100000;c.tutorial!.status='complete';c.map={x:0,y:0,width:32,height:32};const path=Array.from({length:23},(_,x)=>({x,y:6}));for(const p of path)place(c,'road',p.x,p.y);assert.ok(applyRoadDirections(c,path.slice(0,17),'forward').ok);return {c,path};}
test('ordinary vehicles select both physical lanes, share road space and safely merge before two-way road',()=>{const {c,path}=corridor();if(c.nextId%2)c.nextId++;const leader:Trip={id:c.nextId++,homeId:0,storeId:0,path,progress:2,wait:0,hold:0};const follower:Trip={id:c.nextId++,homeId:1,storeId:0,path,progress:.6,wait:0,hold:0};c.trips=[leader,follower];let shared=false,left=false,merged=false;
 for(let i=0;i<800;i++){stepCity(c,.025);left ||= travelLaneOffset(leader)===1;merged ||= left&&leader.progress>16&&travelLaneOffset(leader)===0;
  if(c.trips.length===2){const a=travelLaneOffset(leader),b=travelLaneOffset(follower);const dx=Math.abs(leader.progress-follower.progress),dy=.32*Math.abs(a-b);assert.ok(dx>.24||dy>.20,`physical bodies must not overlap: ${dx},${dy}`);if(bodyTile(leader)===bodyTile(follower)&&a!==b&&!leader.laneChange&&!follower.laneChange)shared=true;}
 }
 assert.ok(left,'an initially ordinary vehicle actually uses second lane');assert.ok(shared,'same-direction vehicles physically share a tile in separate lanes');assert.ok(merged,'second-lane car returns before two-way traffic');assert.equal(c.completed,2);assert.equal(c.accidentCount,0);
});
test('a real household second-lane journey preserves lateral position through reload and completes shopping return',()=>{const {c}=corridor();for(let x=2;x<=21;x++)place(c,'road',x,10);for(let y=7;y<10;y++){place(c,'road',2,y);place(c,'road',21,y);}place(c,'home',2,4);place(c,'store',19,4);let live=c,reloaded=false;const home=c.buildings.find(b=>b.kind==='home')!;
 for(let i=0;i<7200;i++){stepCity(live,.025);const moving=live.trips.find(t=>t.laneChange&&t.laneChange.shift>0&&t.laneChange.shift<1);if(moving&&!reloaded){const parsed=parseCity(JSON.parse(JSON.stringify(live)));assert.ok(parsed,'real mid-lane-change save remains valid');assert.deepEqual(parsed.trips,live.trips);assert.equal(travelLaneOffset(parsed.trips.find(t=>t.id===moving.id)!),travelLaneOffset(moving));live=parsed;reloaded=true;}}
 assert.ok(reloaded,'real demand must use both lanes, including a reloadable transition');assert.ok(live.history.some(h=>h.service?.homeId===home.id&&h.service.purpose==='shopping'),'household physically visits shop and gets home');assert.equal(live.accidentCount,0);
});
