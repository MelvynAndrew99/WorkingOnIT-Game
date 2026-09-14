import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,place,previewWideRoadPlacement,stepCity,parseCity,findPath,entrance,isBlocked,type City,COSTS} from './cityModel.ts';
import {allowsRoadStep} from './cityDirections.ts';
import {roadIndex} from './cityTraffic.ts';
const fresh=()=>{const c=createCity();c.funds=10000;return c;};
const saved=(c:City)=>JSON.parse(JSON.stringify(c));
const reload=(c:City)=>{const loaded=parseCity(saved(c));assert.ok(loaded);return loaded;};
function stamp(c:City,x:number,y:number,rotation=0){const preview=previewWideRoadPlacement(c,x,y,rotation);assert.equal(preview.ok,true,preview.message);place(c,'wideRoad',x,y,rotation);if(c.wideRoadWorks?.length)stepCity(c,3);assert(c.wideRoads?.some(s=>s.x===x&&s.y===y&&s.axis===(rotation%2?'vertical':'horizontal')));}

test('direct wide placement builds both tiles in every rotation and refunds the whole pair',()=>{
 for(let rotation=0;rotation<4;rotation++){
  const c=fresh(),before=c.funds;const preview=previewWideRoadPlacement(c,4,4,rotation);
  assert.equal(preview.cost,2*COSTS.road);assert.equal(preview.ok,true);
  place(c,'wideRoad',4,4,rotation);assert.equal(c.funds,before-2*COSTS.road);
  assert.deepEqual(c.roads,preview.tiles);assert.equal(c.wideRoadWorks,undefined);
  const loaded=reload(c);assert.deepEqual(loaded.wideRoads,c.wideRoads);
  place(c,'bulldoze',preview.tiles[1].x,preview.tiles[1].y);assert.equal(c.roads.length,0);assert.equal(c.wideRoads,undefined);assert.equal(c.funds,before);
 }
});
test('wide preview is atomic on buildings, map edge, insufficient cash and misaligned pairs',()=>{
 const c=fresh();place(c,'home',4,4);const before=saved(c);
 assert.equal(previewWideRoadPlacement(c,4,4).ok,false);place(c,'wideRoad',4,4);assert.deepEqual(saved(c),before);
 assert.equal(previewWideRoadPlacement(c,0,c.map.height-1).ok,false);
 const poor=fresh();poor.funds=COSTS.road;const snapshot=saved(poor);place(poor,'wideRoad',3,3);assert.deepEqual(saved(poor),snapshot);
 const aligned=fresh();stamp(aligned,4,4);const old=saved(aligned);place(aligned,'wideRoad',4,5);assert.deepEqual(saved(aligned),old);
});
test('conversion charges only added land, closes responder access, reloads work, and finishes without double billing',()=>{
 const c=fresh();place(c,'road',4,4);const before=c.funds;
 assert.equal(previewWideRoadPlacement(c,4,4).cost,COSTS.road);place(c,'wideRoad',4,4);
 assert.equal(c.funds,before-COSTS.road);assert.equal(c.wideRoads,undefined);
 assert.equal(isBlocked(c,{x:4,y:4}),true);assert.equal(isBlocked(c,{x:4,y:4},true),true);
 stepCity(c,1);const loaded=reload(c);assert.equal(loaded.wideRoadWorks![0].remaining,2);
 stepCity(loaded,2);assert.equal(loaded.wideRoadWorks,undefined);assert.equal(loaded.wideRoads!.length,1);assert.equal(loaded.funds,before-COSTS.road);
 place(loaded,'bulldoze',4,5);assert.equal(loaded.funds,before+COSTS.road);assert.equal(loaded.roads.length,0);
});
test('cancelled work restores the old road and exactly the construction charge after reload',()=>{
 const c=fresh();place(c,'road',4,4);const before=c.funds;place(c,'wideRoad',4,4);place(c,'bulldoze',4,4);
 assert.equal(c.wideRoadWorks![0].cancelling,true);assert.equal(c.funds,before-COSTS.road);
 const loaded=reload(c);stepCity(loaded,1);assert.deepEqual(loaded.roads,[{x:4,y:4}]);assert.equal(loaded.wideRoads,undefined);assert.equal(loaded.wideRoadWorks,undefined);assert.equal(loaded.funds,before);
});
test('actual stamped carriageways connect narrow roads at either offset and preserve routing after save',()=>{
 for(let rotation=0;rotation<4;rotation++)for(let offset=0;offset<2;offset++){
  let c=fresh();for(let i=3;i<=9;i++)stamp(c,rotation%2?4:i,rotation%2?i:4,rotation);
  const start=rotation%2?{x:4+offset,y:2}:{x:2,y:4+offset};
  const end=rotation%2?{x:4+offset,y:10}:{x:10,y:4+offset};
  place(c,'road',start.x,start.y);place(c,'road',end.x,end.y);c=reload(c);
  for(const[a,b]of[[start,end],[end,start]]){const path=findPath(c,a,b);assert.ok(path);for(let i=1;i<path.length;i++)assert.equal(allowsRoadStep(c,path[i-1],path[i]),true);}
 }
});
test('malformed pairs and construction records reject the save without mutating its source',()=>{
 const c=fresh();stamp(c,4,4);for(const edit of [(raw:City)=>raw.roads.pop(),(raw:City)=>raw.wideRoads!.push({...raw.wideRoads![0]}),(raw:City)=>{raw.wideRoads![0].axis='diagonal' as never;}]){const raw=saved(c);edit(raw);const original=JSON.stringify(raw);assert.equal(parseCity(raw),null);assert.equal(JSON.stringify(raw),original);}
 const work=fresh();place(work,'road',4,4);place(work,'wideRoad',4,4);
 for(const edit of [(raw:City)=>{raw.wideRoadWorks![0].paid+=1;},(raw:City)=>{raw.wideRoadWorks![0].remaining=4;},(raw:City)=>{raw.wideRoadWorks![0].remaining=0;},(raw:City)=>{raw.wideRoadWorks!.push(structuredClone(raw.wideRoadWorks![0]));}]){const raw=saved(work);edit(raw);assert.equal(parseCity(raw),null);}
});
test('household physically crosses a wide-wide junction, visits, returns and continues after an in-motion save',()=>{
 let c=fresh();for(let x=2;x<=12;x++)stamp(c,x,5);
 for(let y=1;y<=10;y++)stamp(c,7,y,1);
 place(c,'home',2,7,2);place(c,'store',9,1,1);
 assert.equal(c.buildings.length,2);const home=c.buildings.find(b=>b.kind==='home')!,store=c.buildings.find(b=>b.kind==='store')!;
 assert.deepEqual(entrance(home),{x:3,y:6});assert.deepEqual(entrance(store),{x:8,y:2});
 assert.ok(findPath(c,entrance(home),entrance(store)));assert.ok(findPath(c,entrance(store),entrance(home)));
 const index=roadIndex(c);assert.equal(index.areas.get('7,5'),index.areas.get('8,6'));
 let sawVisit=false,sawReturn=false,sawCrossing=false,didReload=false;
 for(let tick=0;tick<2400&&c.completed<1;tick++){
  stepCity(c,.025);
  for(const t of c.trips){sawVisit||=t.phase==='visiting';sawReturn||=t.phase==='returning';const p=t.path[Math.min(t.path.length-1,Math.round(t.progress))];sawCrossing||=(p.x===7||p.x===8)&&(p.y===5||p.y===6);}
  if(!didReload&&c.trips.some(t=>t.phase==='outbound'&&t.progress>1&&t.progress%1>0)){c=reload(c);didReload=true;}
 }
 assert.equal(didReload,true);assert.equal(sawCrossing,true);assert.equal(sawVisit,true);assert.equal(sawReturn,true);assert.equal(c.completed,1);assert.equal(c.accidentCount,0);
 assert.ok(reload(c));
});
test('saved manual one-way edges cannot override a paired carriageway or a pending conversion',()=>{
 for(const pending of [false,true]){
  const c=fresh();place(c,'road',5,4);
  if(pending){place(c,'road',4,4);place(c,'wideRoad',4,4);}else stamp(c,4,4);
  const raw=saved(c);raw.roadDirections={'4,4>5,4':'forward'};
  const original=JSON.stringify(raw);assert.equal(parseCity(raw),null);assert.equal(JSON.stringify(raw),original);
 }
});
test('a household negotiates a wide L bend and physically returns on the opposite carriageway',()=>{
 let c=fresh();for(let x=2;x<=8;x++)stamp(c,x,5);for(let y=5;y<=11;y++)stamp(c,7,y,1);
 place(c,'home',2,7,2);place(c,'store',5,9,3);assert.equal(c.buildings.length,2);
 const home=c.buildings.find(b=>b.kind==='home')!,store=c.buildings.find(b=>b.kind==='store')!;
 assert.deepEqual(entrance(home),{x:3,y:6});assert.deepEqual(entrance(store),{x:7,y:10});
 assert.ok(findPath(c,entrance(home),entrance(store)));assert.ok(findPath(c,entrance(store),entrance(home)));
 let sawBend=false,sawVisit=false,sawReturnLane=false;
 for(let tick=0;tick<3200&&c.completed<1;tick++){
  stepCity(c,.025);
  for(const t of c.trips){const p=t.path[Math.min(t.path.length-1,Math.round(t.progress))];sawBend||=(p.x===7||p.x===8)&&(p.y===5||p.y===6);sawVisit||=t.phase==='visiting';sawReturnLane||=t.phase==='returning'&&p.x===8&&p.y>=7;}
  if(tick===300)c=reload(c);
 }
 assert.equal(sawBend,true);assert.equal(sawVisit,true);assert.equal(sawReturnLane,true);assert.equal(c.completed,1);assert.equal(c.accidentCount,0);assert.ok(reload(c));
});
test('a reachable store without a legal return does not dispatch a trapped household',()=>{
 const c=fresh();for(let x=2;x<=8;x++)stamp(c,x,5);
 for(let x=9;x<=11;x++)place(c,'road',x,5);
 c.roadDirections={'9,5>10,5':'forward','10,5>11,5':'forward'};
 place(c,'home',2,7,2);place(c,'store',10,3,0);assert.equal(c.buildings.length,2);
 const home=c.buildings.find(b=>b.kind==='home')!,store=c.buildings.find(b=>b.kind==='store')!;
 assert.ok(findPath(c,entrance(home),entrance(store)));assert.equal(findPath(c,entrance(store),entrance(home)),null);
 stepCity(c,20);assert.equal(c.trips.length,0);assert.equal(c.completed,0);assert.equal(c.accidentCount,0);assert.ok(reload(c));
});

test('police physically traverse a wide corridor, clear a scene, and return after reload',()=>{
 let c=fresh();for(let x=1;x<=13;x++)stamp(c,x,3);
 assert.match(place(c,'policeStation',2,1),/built/);
 const incidentId=c.nextId++;c.incidents.push({id:incidentId,x:10,y:3,severity:'minor',status:'active',createdAt:c.elapsed,required:['police'],completedServices:[],rescueDeadline:null,outcome:'none'});c.accidentCount++;
 let crew:number|undefined,sawTravel=false,sawWork=false,didReload=false;
 for(let i=0;i<3200;i++){
  stepCity(c,.025);const t=c.trips.find(t=>t.incidentId===incidentId);if(t){crew??=t.id;sawTravel||=t.progress>1;sawWork||=t.phase==='working';}
  if(!didReload&&t&&t.progress>1&&t.progress%1>0){c=reload(c);didReload=true;}
  if(crew!==undefined&&!c.trips.some(t=>t.id===crew))break;
 }
 assert.equal(didReload,true);assert.equal(sawTravel,true);assert.equal(sawWork,true);assert.equal(c.incidents[0].status,'cleared');assert.ok(crew!==undefined&&!c.trips.some(t=>t.id===crew));reload(c);
});
