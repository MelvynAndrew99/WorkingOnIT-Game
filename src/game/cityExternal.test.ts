import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCity, place, stepCity, parseCity, expandCity, TRAFFIC_TICK, type City } from './cityModel.ts';
import { connectExternalCity, externalDemand, boundaryGatewayCandidates } from './cityExternal.ts';
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

test('gateway expansion preserves origin and closing access never teleports a visitor home',()=>{
  const c=town();connectExternalCity(c,{x:0,y:6});
  until(c,()=>c.trips.some(t=>t.phase==='visiting'));
  const trip=c.trips.find(t=>t.phase==='visiting')!,id=trip.id;
  expandCity(c,'west');assert.deepEqual(c.external!.gateway,{x:0,y:6});
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
  for(let i=0;i<RISK_THRESHOLD/TRAFFIC_TICK;i++){
    c.elapsed=Math.round((c.elapsed+TRAFFIC_TICK)*1e6)/1e6;
    recordConflict(c,{x:5,y:5},outside.id,local.id,TRAFFIC_TICK);
  }
  assert.equal(outside.phase,'crashed');assert.equal(local.phase,'crashed');
  assert.equal(c.accidentCount,1);assert.deepEqual(reload(c),c);
  const completed=c.external!.completed;
  until(c,()=>c.incidents[0].status==='cleared');
  run(c,TRAFFIC_TICK);
  assert.ok(!c.trips.some(t=>t.id===outside.id));
  assert.equal(c.external!.completed,completed,'clearing a wreck is never a successful outside visit');
});
