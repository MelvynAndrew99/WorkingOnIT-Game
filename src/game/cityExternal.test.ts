import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCity, place, stepCity, parseCity, expandCity, TRAFFIC_TICK, type City } from './cityModel.ts';
import { connectExternalCity, externalDemand, boundaryGatewayCandidates, finishTutorialAndConnect, relocateInteriorGateway, externalNeedsRoad } from './cityExternal.ts';
import {bodyTile} from './cityTraffic.ts';
import {readFileSync} from 'node:fs';

test('interior connector relocation preserves captured town and physical visitors through reload',()=>{
 const c=parseCity(JSON.parse(readFileSync(new URL('../../docs/emergency-recovery/bottom-right-jam/original-save.json',import.meta.url),'utf8')).city)!;
 assert.ok(c);const before=structuredClone(c);
 const positions=c.trips.map(t=>({id:t.id,point:t.path[bodyTile(t)],offset:Math.round((t.progress-bodyTile(t))*1e6)}));
 assert.ok(relocateInteriorGateway(c));assert.deepEqual(c.external!.gateway,{x:39,y:10});assert.ok(externalNeedsRoad(c));
 assert.deepEqual(c.trips.map(t=>({id:t.id,point:t.path[bodyTile(t)],offset:Math.round((t.progress-bodyTile(t))*1e6)})),positions);
 for(const key of ['roads','buildings','map','expansion','missions','incidents','funds','completed','roadPaid'] as const)assert.deepEqual(c[key],before[key]);
 const saved=reload(c);assert.deepEqual(saved.external,c.external);assert.equal(relocateInteriorGateway(saved),false);
 assert.match(expandCity(saved,'east'),/outside city connects/);
 for(let x=34;x<=39;x++)assert.match(place(saved,'road',x,10),/Road built/);
 assert.equal(externalNeedsRoad(saved),false);assert.ok(reload(saved));
});

test('relocated visitors wait for a player-built exit and physically return after reconnecting',()=>{
 let c=town();connectExternalCity(c,{x:0,y:6});
 until(c,()=>c.trips.some(t=>t.external&&t.phase==='returning'));
 const id=c.trips.find(t=>t.external&&t.phase==='returning')!.id;
 c.map={...c.map,x:-8,width:c.map.width+8};
 assert.ok(relocateInteriorGateway(c));assert.deepEqual(c.external!.gateway,{x:0,y:0});
 const completed=c.external!.completed,arrivals=c.external!.arrivals;
 c=reload(c);run(c,10);assert.ok(c.trips.some(t=>t.id===id));assert.equal(c.external!.completed,completed);assert.equal(c.external!.arrivals,arrivals);
 for(let y=0;y<6;y++)place(c,'road',0,y);
 assert.equal(externalNeedsRoad(c),false);c=reload(c);
 until(c,()=>!c.trips.some(t=>t.id===id));assert.ok(c.external!.completed>completed);
 assert.equal(c.external!.needsRoadConnection,undefined);assert.ok(reload(c));
});
import { visitorSlots } from './cityVisits.ts';
import { recordConflict, RISK_THRESHOLD } from './cityIncidents.ts';

/** Traffic and persistence fixtures fund their geometry independently of the starter economy. */
function createTestCity() {
  const city = createCity();
  city.funds = 10000;
  return city;
}

function town():City {
  const c=createTestCity();
  for(let x=0;x<=14;x++)place(c,'road',x,6);
  place(c,'store',11,4);
  place(c,'park',5,7,2);
  return c;
}
function run(c:City,seconds:number):void {for(let i=0;i<Math.round(seconds/TRAFFIC_TICK);i++)stepCity(c,TRAFFIC_TICK);}
function until(c:City,ready:()=>boolean,limit=180):void {
  for(let i=0;i<limit/TRAFFIC_TICK;i++){if(ready())return;stepCity(c,TRAFFIC_TICK);}
  assert.ok(ready(),`condition not reached by ${c.elapsed}s`);
}
function reload(c:City):City {const copy=parseCity(JSON.parse(JSON.stringify(c)));assert.ok(copy,'external town must reload');return copy;}

test('confirmed tutorial exit adds a free safe access corridor and keeps the town across reload',()=>{
  const c=createTestCity();
  for(let x=3;x<=12;x++)place(c,'road',x,6);
  place(c,'store',9,4);
  const buildings=structuredClone(c.buildings), roads=structuredClone(c.roads), funds=c.funds;
  assert.equal(c.external!.gateway,null);
  assert.match(finishTutorialAndConnect(c),/connected/);
  assert.equal(c.tutorial!.status,'skipped');
  assert.deepEqual(c.buildings,buildings);assert.equal(c.funds,funds);
  assert.deepEqual(c.roads.slice(0,roads.length),roads);
  const added=c.roads.slice(roads.length);assert.ok(added.length>0);
  for(const p of added)assert.equal(c.roadPaid![`${p.x},${p.y}`],0);
  let saved=reload(c);const gateway=structuredClone(saved.external!.gateway);
  const roadCount=saved.roads.length;finishTutorialAndConnect(saved);run(saved,0.5);
  assert.equal(saved.roads.length,roadCount);assert.deepEqual(saved.external!.gateway,gateway);
  until(saved,()=>saved.external!.completed>0);
  saved=reload(saved);assert.ok(saved.external!.completed>0);
});

test('automatic gateway favors the store network over an isolated boundary road',()=>{
  const c=createTestCity();place(c,'road',0,0);
  for(let x=3;x<=12;x++)place(c,'road',x,6);
  place(c,'store',9,4);
  finishTutorialAndConnect(c);
  assert.notDeepEqual(c.external!.gateway,{x:0,y:0});
  until(c,()=>c.external!.completed>0);
});

test('empty-town consent persists and connects after the first real road without a second menu',()=>{
  let c=createTestCity();finishTutorialAndConnect(c);
  assert.equal(c.external!.gateway,null);assert.equal(c.external!.autoConnectRequested,true);
  c=reload(c);place(c,'road',5,6);const funds=c.funds;
  stepCity(c,TRAFFIC_TICK);
  assert.ok(c.external!.gateway);assert.equal(c.funds,funds);
  assert.ok(reload(c));
});

test('ordinary disconnected saves never auto-connect and malformed consent is rejected',()=>{
  const c=town();run(c,20);assert.equal(c.external!.gateway,null);
  const bad=structuredClone(c);bad.external!.autoConnectRequested='yes' as never;
  assert.equal(parseCity(bad),null);
  c.external!.autoConnectRequested=true;
  // Resuming teaching explicitly suspends a pending connection.
  c.tutorial!.status='active';stepCity(c,TRAFFIC_TICK);
  assert.equal(c.external!.gateway,null);
});

test('a fully enclosed road waits for player access without replacing buildings',()=>{
  let c=createTestCity();place(c,'road',5,5);
  // Legal lots form a ring around the single road tile.
  place(c,'home',3,4);place(c,'home',6,5);place(c,'home',5,3);place(c,'home',4,6);
  assert.equal(c.buildings.length,4);
  const before=structuredClone(c.buildings);
  finishTutorialAndConnect(c);assert.equal(c.external!.gateway,null);
  assert.deepEqual(c.buildings,before);c=reload(c);
  place(c,'bulldoze',3,4);stepCity(c,TRAFFIC_TICK);
  assert.ok(c.external!.gateway);assert.ok(reload(c));
});

test('outside traffic requires explicit boundary-road connection and preserves the original town',()=>{
  const c=town();run(c,60);assert.equal(c.trips.length,0);
  assert.deepEqual(boundaryGatewayCandidates(c),[{x:0,y:6}]);
  const before=structuredClone(c);
  assert.match(connectExternalCity(c,{x:3,y:6}),/map edge/);
  assert.deepEqual(c,before);
  assert.match(connectExternalCity(c,{x:0,y:6}),/connected/);
  assert.deepEqual(c.roads,before.roads);assert.deepEqual(c.buildings,before.buildings);assert.equal(c.funds,before.funds);
  until(c,()=>c.trips.some(t=>!!t.external));
  assert.ok(c.trips.every(t=>t.external&&t.homeId===0));
  assert.equal(c.households.length,0,'outside visitors are not invisible households');
  assert.equal(c.buildings.filter(b=>b.kind==='home').length,0);
});

test('real outside visits reserve capacity, park off-road and return physically to the gateway',()=>{
  const c=town();connectExternalCity(c,{x:0,y:6});
  let sawShopping=false,sawLeisure=false,sawReturn=false;
  for(let i=0;i<180/TRAFFIC_TICK;i++){
    stepCity(c,TRAFFIC_TICK);
    for(const b of c.buildings){const v=visitorSlots(c,b);assert.ok(v.inbound+v.occupied<=v.capacity);}
    for(const t of c.trips){
      if(t.phase==='visiting'){sawShopping ||= t.purpose==='shopping';sawLeisure ||= t.purpose==='leisure';}
      if(t.phase==='returning'){sawReturn=true;assert.deepEqual(t.path.at(-1),{x:0,y:6});}
    }
  }
  assert.ok(sawShopping&&sawLeisure&&sawReturn);
  assert.ok(c.external!.completed>0);
  assert.equal(c.completed,c.external!.completed);
  assert.equal(c.missions!.shoppers.length,0,'outside visits do not impersonate local households');
  assert.equal(c.missions!.parkVisitors.length,0);
});

test('outside mid-visit saves preserve payment and continuation exactly',()=>{
  const c=town();connectExternalCity(c,{x:0,y:6});
  until(c,()=>c.trips.some(t=>t.phase==='visiting'&&!t.rewarded));
  const copy=reload(c);assert.deepEqual(copy,c);
  run(c,60);run(copy,60);assert.deepEqual(copy,c);
  const paid=reload(c);run(c,20);run(paid,20);assert.deepEqual(paid,c);
});

test('connected edge rejects expansion and closing access never teleports a visitor home',()=>{
  const c=town();connectExternalCity(c,{x:0,y:6});
  until(c,()=>c.trips.some(t=>t.phase==='visiting'));
  const trip=c.trips.find(t=>t.phase==='visiting')!,id=trip.id;
  const before=structuredClone(c);
  assert.match(expandCity(c,'west'),/outside city connects on the west edge/);
  assert.deepEqual(c,before,'rejection preserves active visitors and allowances');
  place(c,'closure',0,6);
  run(c,40);
  const held=c.trips.find(t=>t.id===id);assert.ok(held,'blocked return retains visitor');
  assert.ok(held.rewarded);assert.equal(held.phase,'visiting');
  const copy=reload(c);assert.deepEqual(copy,c);
  const arrivals=c.external!.arrivals;run(c,40);assert.equal(c.external!.arrivals,arrivals,'closed gateway spawns nobody');
  place(c,'closure',0,6);
  until(c,()=>!c.trips.some(t=>t.id===id));
  assert.ok(c.external!.completed>0);
});

test('outside demand grows with town size rather than traffic performance or mission skill',()=>{
  const c=town();const initial=externalDemand(c);
  c.completed=999;c.fatalities=9;c.missions!.completed=['open-for-business'];
  assert.deepEqual(externalDemand(c),initial);
  place(c,'home',0,4);place(c,'home',2,4);place(c,'home',4,4);
  const grown=externalDemand(c);
  assert.ok(grown.interval<initial.interval);assert.ok(grown.limit>initial.limit);
});

test('blocked arrivals never build a backlog and capacity stays bounded',()=>{
  const c=town();connectExternalCity(c,{x:0,y:6});place(c,'closure',0,6);
  run(c,120);assert.equal(c.external!.arrivals,0);assert.equal(c.trips.length,0);
  place(c,'closure',0,6);run(c,1);assert.equal(c.trips.length,0,'reopening cannot dump a hidden queue');
  run(c,12);assert.equal(c.external!.arrivals,1);
  for(let i=0;i<120/TRAFFIC_TICK;i++){stepCity(c,TRAFFIC_TICK);assert.ok(c.trips.filter(t=>t.external).length<=externalDemand(c).limit);}
});

test('legacy disconnected saves migrate safely and malformed external trip ownership is rejected',()=>{
  const c=town();const old=structuredClone(c);delete old.external;
  const migrated=parseCity(old);assert.ok(migrated);assert.equal(migrated.external!.gateway,null);
  connectExternalCity(c,{x:0,y:6});until(c,()=>c.trips.length>0);
  for(const mutate of [
    (v:City)=>{v.trips[0].external={origin:{x:1,y:6}};},
    (v:City)=>{v.trips[0].homeId=999;},
    (v:City)=>{v.trips[0].rewarded=true;},
    (v:City)=>{v.trips[0].external=null as never;},
    (v:City)=>{v.external!.gateway=null;},
    (v:City)=>{v.external!.arrivalClock=Infinity;},
    (v:City)=>{v.external!.completed=v.external!.arrivals+1;},
  ]){const bad=structuredClone(c);mutate(bad);assert.equal(parseCity(bad),null);}
});

test('outside shopping pays once per completed stay and leisure never invents household tax',()=>{
  const c=town();connectExternalCity(c,{x:0,y:6});const funds=c.funds;
  const paid=new Set<number>();
  for(let i=0;i<180/TRAFFIC_TICK;i++){
    stepCity(c,TRAFFIC_TICK);
    for(const t of c.trips)if(t.rewarded&&t.purpose==='shopping')paid.add(t.id);
  }
  assert.ok(paid.size>0);
  assert.equal(c.funds,funds+paid.size*100+18*20);
  assert.equal(c.households.length,0);
});

test('an outside visitor keeps a real blocked road position across edits and reload',()=>{
  const c=town();connectExternalCity(c,{x:0,y:6});
  until(c,()=>c.trips.some(t=>t.phase==='outbound'));
  const id=c.trips[0].id;
  place(c,'closure',8,6);
  run(c,20);
  const held=c.trips.find(t=>t.id===id)!;
  assert.ok(held);assert.equal(held.phase,'waiting');assert.ok(held.hold>10);
  const restored=reload(c);assert.deepEqual(restored,c);
  const bad=structuredClone(c);bad.trips.find(t=>t.id===id)!.target={x:1,y:6};
  assert.equal(parseCity(bad),null,'a saved outside trip cannot change its intended destination');
  place(c,'closure',8,6);
  until(c,()=>!c.trips.some(t=>t.id===id));
  assert.ok(c.external!.completed>0);
});


test('outside visitors participate in the same collision and police-clearance lifecycle',()=>{
  const c=createTestCity();
  place(c,'store',10,3);place(c,'home',5,0);place(c,'store',4,10);
  for(let x=0;x<=11;x++)place(c,'road',x,5);
  for(let y=2;y<=12;y++)place(c,'road',5,y);
  place(c,'policeStation',0,6,2);
  connectExternalCity(c,{x:0,y:5});
  until(c,()=>c.trips.some(t=>t.external));
  const outside=c.trips.find(t=>t.external)!, local=c.trips.find(t=>!t.external)!;
  assert.ok(local,'a real local trip also departed');
  // Isolate actual incompatible junction claims, as the core incident regression does.
  outside.path=Array.from({length:12},(_,x)=>({x,y:5}));outside.progress=4.5;
  outside.storeId=c.buildings.find(b=>b.kind==='store'&&b.x===10)!.id;
  outside.target={x:11,y:5};outside.phase='outbound';outside.purpose='shopping';outside.rewarded=false;
  local.path=Array.from({length:11},(_,i)=>({x:5,y:i+2}));local.progress=2.5;
  local.storeId=c.buildings.find(b=>b.kind==='store'&&b.x===4)!.id;
  local.target={x:5,y:12};local.phase='outbound';local.purpose='shopping';local.rewarded=false;
  // Response-only fixture: a fresh real contact finishes existing exposure. Repeated stationary
  // claims from the same two drivers no longer fabricate an increasingly busy intersection.
  c.elapsed+=3;
  c.risks=[{x:5,y:5,exposure:RISK_THRESHOLD-1.5,lastConflictAt:c.elapsed,warnedAt:c.elapsed-3,firstId:outside.id,secondId:local.id}];
  outside.hold=0;local.hold=0;
  c.elapsed=Math.round((c.elapsed+TRAFFIC_TICK)*1e6)/1e6;
  recordConflict(c,{x:5,y:5},outside.id,local.id,TRAFFIC_TICK);
  assert.equal(outside.phase,'crashed');assert.equal(local.phase,'crashed');
  assert.equal(c.accidentCount,1);assert.deepEqual(reload(c),c);
  const completed=c.external!.completed;
  until(c,()=>c.incidents[0].status==='cleared');
  run(c,TRAFFIC_TICK);
  assert.ok(!c.trips.some(t=>t.id===outside.id));
  assert.equal(c.external!.completed,completed,'clearing a wreck is never a successful outside visit');
});
