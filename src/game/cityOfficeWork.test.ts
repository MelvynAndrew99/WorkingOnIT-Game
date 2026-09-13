import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,place,stepCity,parseCity,entrance,upgradeOffice,TRAFFIC_TICK,income,type City} from './cityModel.ts';
import {chooseDestination,householdFor,growDemand,spawnTrips,visitorSlots,WORK_CAP,WORK_INTERVAL,VISIT_SECONDS,officeVisitorCapacity} from './cityVisits.ts';
import {roadIndex} from './cityTraffic.ts';

function fixture(kind: 'home' | 'apartment' = 'home') {
  const city = createCity(); city.funds = 100000;
  place(city,kind,0,kind === 'home' ? 4 : 2);
  for(let x=0;x<=12;x++) place(city,'road',x,6);
  place(city,'office',8,2);
  const home=city.buildings.find(b=>b.kind===kind)!;
  const office=city.buildings.find(b=>b.kind==='office')!;
  assert.ok(home && office);
  return {city,home,office};
}
function run(city: City, seconds: number, observe?:()=>void) {
  for(let i=0;i<seconds/TRAFFIC_TICK;i++){stepCity(city,TRAFFIC_TICK);observe?.();}
}
function until(city:City, ready:()=>boolean) {
  for(let i=0;i<120/TRAFFIC_TICK;i++){if(ready())return;stepCity(city,TRAFFIC_TICK);}
  assert.fail('expected real journey stage never appeared');
}

for(const kind of ['home','apartment'] as const)test(`${kind} residents physically work and return without shopping money or shopping/leisure credit`,()=>{
  const {city,home,office}=fixture(kind);
  const funds=city.funds, missions=structuredClone(city.missions);
  let visiting=false,returning=false;
  run(city,90,()=>{
    for(const trip of city.trips){
      assert.equal(trip.purpose,'work');assert.equal(trip.storeId,office.id);assert.equal(trip.homeId,home.id);
      if(trip.phase==='visiting'){visiting=true;assert.ok((trip.visitRemaining??0)<=VISIT_SECONDS.office);}
      if(trip.phase==='returning')returning=true;
    }
    const slots=visitorSlots(city,office);assert.ok(slots.occupied+slots.inbound<=8);
  });
  assert.ok(visiting && returning && city.completed>0);
  assert.equal(city.funds,funds+Math.floor((city.elapsed+1e-6)/10)*income(city));
  assert.deepEqual(city.missions,missions);
  const loaded=parseCity(JSON.parse(JSON.stringify(city)));assert.ok(loaded);
  assert.deepEqual(loaded.trips,city.trips);assert.deepEqual(loaded.households,city.households);
});

test('work reserves bounded need and an active work save cannot lose or corrupt its ledger',()=>{
  const {city,home}=fixture('apartment');
  growDemand(city,0);const h=householdFor(city,home.id);h.work=1;h.shopping=0;h.leisure=0;
  spawnTrips(city,roadIndex(city));assert.equal(city.trips.length,1);assert.equal(city.trips[0].purpose,'work');
  const t=city.trips[0];t.phase='visiting';t.progress=t.path.length-1;t.visitRemaining=10;
  spawnTrips(city,roadIndex(city));assert.equal(city.trips.length,1);
  const raw=JSON.parse(JSON.stringify(city));assert.ok(parseCity(raw));
  for(const values of [{work:0},{work:WORK_CAP*4+1},{workClock:WORK_INTERVAL},{work:undefined,workClock:undefined}]){
    const bad=structuredClone(raw);Object.assign(bad.households[0],values);assert.equal(parseCity(bad),null);
  }
});

test('a chosen office side entrance provides both arrival and departure when the primary is diverted',()=>{
  const {city,home,office}=fixture();
  const chosen={x:7,y:3};upgradeOffice(city,office.id,chosen);
  for(let y=3;y<=5;y++)place(city,'road',7,y);
  place(city,'closure',entrance(office).x,entrance(office).y);
  const choice=chooseDestination(city,home,'work');assert.ok(choice);assert.deepEqual(choice.path.at(-1),chosen);
  let visited=false,returned=false;
  run(city,70,()=>{
    for(const trip of city.trips){
      if(trip.phase==='outbound'){assert.deepEqual(trip.target,chosen);assert.deepEqual(trip.path.at(-1),chosen);}
      if(trip.phase==='visiting'){visited=true;assert.deepEqual(trip.path.at(-1),chosen);}
      if(trip.phase==='returning'){returned=true;assert.deepEqual(trip.path[0],chosen);}
    }
  });
  assert.ok(visited && returned && city.completed>0);assert.ok(parseCity(JSON.parse(JSON.stringify(city))));
  assert.equal(officeVisitorCapacity(office),16);
});

test('a worker already inside the office can leave by the newly opened side door',()=>{
  const {city,office}=fixture();
  until(city,()=>city.trips.some(t=>t.phase==='visiting'));
  const trip=city.trips.find(t=>t.phase==='visiting')!;assert.deepEqual(trip.path.at(-1),entrance(office));
  const chosen={x:7,y:3};upgradeOffice(city,office.id,chosen);
  for(let y=3;y<=5;y++)place(city,'road',7,y);
  place(city,'closure',entrance(office).x,entrance(office).y);
  until(city,()=>trip.phase==='returning');
  assert.deepEqual(trip.path[0],chosen);assert.ok(parseCity(JSON.parse(JSON.stringify(city))));
  until(city,()=>!city.trips.some(t=>t.id===trip.id));assert.ok(city.completed>0);
});

test('office places cap real arriving workers and leave excess work demand pending',()=>{
  const city=createCity();city.funds=100000;
  place(city,'apartment',0,1);place(city,'apartment',5,1);place(city,'home',10,3);
  for(let x=0;x<=12;x++)place(city,'road',x,5);
  for(let y=6;y<=12;y++)place(city,'road',9,y);
  place(city,'road',10,12);place(city,'office',10,8);
  const office=city.buildings.find(b=>b.kind==='office')!;assert.ok(office);
  place(city,'stop',9,5);
  let peak=0;
  run(city,180,()=>{
    const slots=visitorSlots(city,office);peak=Math.max(peak,slots.occupied+slots.inbound);
    assert.ok(slots.occupied+slots.inbound<=8);
    if(slots.occupied+slots.inbound===8)assert.equal(chooseDestination(city,city.buildings[0],'work'),null);
  });
  assert.equal(peak,8);assert.ok(city.completed>0);assert.ok(parseCity(JSON.parse(JSON.stringify(city))));
  assert.ok(city.households.some(h=>(h.work??0)>0));
  upgradeOffice(city,office.id,{x:9,y:9});assert.equal(visitorSlots(city,office).capacity,16);
});

test('old towns acquire no work fields or work trips before an office exists',()=>{
  const city=createCity();city.funds=10000;place(city,'home',0,4);for(let x=0;x<13;x++)place(city,'road',x,6);place(city,'store',10,4);
  run(city,80);
  assert.ok(city.households.every(h=>!Object.hasOwn(h,'work')&&!Object.hasOwn(h,'workClock')));
  assert.ok(city.trips.every(t=>t.purpose!=='work'));assert.ok(city.completed>0);
  assert.ok(parseCity(JSON.parse(JSON.stringify(city))));
});
