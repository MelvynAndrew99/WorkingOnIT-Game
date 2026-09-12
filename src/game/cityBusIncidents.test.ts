import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCity, entrance, parseCity, place, stepCity, type City, type Trip } from './cityModel.ts';
import {newHousehold} from './cityVisits.ts';
import { arriveResponse, parseIncidentState, recordConflict, stepIncidents, type Incident } from './cityIncidents.ts';
import type { TransitJourney } from './cityJourneys.ts';

/** Isolated incident fixture; controller route construction is tested by the transit suite. */
function fixture() {
  const city = createCity();
  city.roads = [
    ...Array.from({length:12},(_,x)=>({x,y:5})),
    ...Array.from({length:11},(_,y)=>({x:5,y:y+2})).filter(p=>p.y!==5),
  ];
  city.buildings = [{id:1,kind:'busStation',x:0,y:1,rotation:0},
    {id:2,kind:'home',x:6,y:0,rotation:0},{id:3,kind:'store',x:9,y:0,rotation:0},
    {id:4,kind:'home',x:6,y:9,rotation:0},{id:5,kind:'home',x:0,y:8,rotation:0},
    {id:6,kind:'busStop',x:3,y:6,rotation:2},{id:7,kind:'busStop',x:8,y:6,rotation:2}];
  city.households=[2,4,5].map(newHousehold);
  city.trips = [
    {id:10,busId:30,stationId:1,homeId:0,storeId:0,phase:'outbound',target:{x:8,y:5},path:Array.from({length:9},(_,x)=>({x,y:5})),progress:4.5,wait:0,hold:0},
    {id:11,homeId:5,storeId:3,phase:'outbound',path:Array.from({length:11},(_,y)=>({x:5,y:y+2})),progress:2.5,wait:0,hold:0},
  ];
  city.nextId=100; city.elapsed=0;
  const journeys:TransitJourney[] = [40,41].map((id,i)=>({id,homeId:i===0?2:4,destinationId:3,purpose:'shopping',mode:'bus',
    state:'riding-out',origin:entrance(city.buildings.find(b=>b.id===(i===0?2:4))!),path:[entrance(city.buildings[0])],progress:0,startedAt:0,wait:0,
    visitRemaining:0,rewarded:false,returned:false,activityReserved:true,busId:30,routeId:31,
    boardStopId:1,alightStopId:7,returnBoardStopId:7,returnAlightStopId:1,
    seat:{busId:30,runId:0,boardIndex:0,alightIndex:2}}));
  city.transit = {version:1,walkingEnabled:true,journeys,routes:[{id:31,stationId:1,stopIds:[6,7],running:true}],
    fleet:[{id:30,stationId:1,routeId:31,tripId:10,onboard:[40,41],paid:400,stopIndex:2,run:0,dwell:0,readyAt:0}]};
  return {city,bus:city.trips[0],journeys};
}
function crash(city:City,severity:Incident['severity']) {
  city.accidentCount=severity==='minor'?0:severity==='serious'?1:2;
  for(let n=0;n<4;n++) {
    city.elapsed+=n===3?3:0.025;
    city.trips[1].id=city.nextId++;
    recordConflict(city,{x:5,y:5},city.trips[0].id,city.trips[1].id,0.025);
  }
  assert.equal(city.incidents.length,1);
  return city.incidents[0];
}
function crew(city:City,incident:Incident,kind:'ems'|'police'):Trip {
  const trip:Trip={id:city.nextId++,homeId:0,storeId:0,path:[{x:4,y:5}],progress:0,hold:0,wait:0,
    phase:'outbound',service:kind,stationId:999,incidentId:incident.id,workRemaining:0};
  city.trips.push(trip);return trip;
}

test('real bus conflict freezes every onboard journey and preserves its receipts and ownership',()=>{
  const {city,bus,journeys}=fixture();
  const incident=crash(city,'serious');
  assert.equal(bus.phase,'crashed');
  assert.deepEqual(bus.path,[{x:5,y:5}]);
  assert.deepEqual(journeys.map(j=>[j.state,j.busId,j.incidentId,j.incidentOutcome,j.rewarded,j.returned]),
    journeys.map(()=>['crashed',30,incident.id,'disrupted',false,false]));
  assert.deepEqual(city.transit!.fleet[0].onboard,[40,41]);
  assert.equal(city.completed,0);
});

test('EMS rescue attributes affected bus journeys while counting the existing single incident',()=>{
  const {city,journeys}=fixture();const incident=crash(city,'serious');
  arriveResponse(city,crew(city,incident,'ems'));
  assert.equal(incident.outcome,'rescued');assert.equal(city.rescuedCount,1);
  assert.equal(city.fatalities,0);
  assert.ok(journeys.every(j=>j.incidentOutcome==='rescued'&&j.state==='crashed'&&!j.returned));
  assert.equal(city.history.length,0);
});

test('missed rescue deadline records one incident loss without making all bus riders fatalities',()=>{
  const {city,journeys}=fixture();const incident=crash(city,'serious');
  city.elapsed=incident.rescueDeadline!;
  stepIncidents(city,0.025);stepIncidents(city,0.025);
  assert.equal(city.fatalities,1);assert.equal(city.rescuedCount,0);
  assert.ok(journeys.every(j=>j.incidentOutcome==='incident-loss'&&j.state==='crashed'));
  arriveResponse(city,crew(city,incident,'ems'));
  assert.equal(city.rescuedCount,0);assert.equal(city.fatalities,1);
});

test('clearing bus wreck retains physical bus and riders for a real station recovery',()=>{
  const {city,bus,journeys}=fixture();const incident=crash(city,'minor');
  const police=crew(city,incident,'police');arriveResponse(city,police);
  police.workRemaining=0;stepIncidents(city,0.025);
  assert.equal(incident.status,'cleared');
  assert.ok(city.trips.includes(bus));assert.equal(bus.phase,'waiting');assert.equal(bus.resume,'returning');
  assert.deepEqual(bus.path,[{x:5,y:5}]);assert.deepEqual(bus.target,entrance(city.buildings[0]));
  assert.equal(bus.incidentId,undefined);
  assert.ok(journeys.every(j=>j.state==='crashed'&&j.busId===30));
  assert.deepEqual(city.transit!.fleet[0].onboard,[40,41]);
  assert.equal(city.completed,0);assert.equal(city.history.length,0);
});

test('incident reference parser allows bus station ownership but still rejects orphan incident IDs',()=>{
  const {city,bus}=fixture();city.trips=[bus];
  assert.equal(parseIncidentState({},city),true);
  bus.incidentId=999;
  assert.equal(parseIncidentState({},city),false);
});

test('full crash save preserves onboard journeys and scene outcome through real parseCity',()=>{
  const {city,bus}=fixture();bus.trafficLane=1;
  crash(city,'serious');
  assert.equal(bus.trafficLane,undefined);
  const saved=JSON.parse(JSON.stringify(city));
  const restored=parseCity(saved);
  assert.ok(restored,'the full crashed bus and passenger snapshot must reload');
  assert.deepEqual(restored.transit!.journeys,city.transit!.journeys);
  assert.deepEqual(restored.transit!.fleet,city.transit!.fleet);
  assert.equal(restored.incidents[0].outcome,'pending');
});

test('full bus crash save rejects lost, orphaned and duplicate passenger ownership',()=>{
  const {city}=fixture();crash(city,'serious');
  for (const [label,corrupt] of [
    ['missing journey',(c:City)=>{c.transit!.journeys.pop();}],
    ['missing onboard rider',(c:City)=>{c.transit!.fleet[0].onboard.pop();}],
    ['orphan bus',(c:City)=>{c.transit!.journeys[0].busId=999;}],
    ['orphan incident',(c:City)=>{c.transit!.journeys[0].incidentId=999;}],
  ] as const) {
    const saved=structuredClone(city);corrupt(saved);
    assert.ok(parseCity(saved)===null,`${label}: inconsistent rider ownership must reject the save candidate`);
  }
});

test('real responders clear a loaded bus and its recovery reloads without passenger service credit',()=>{
  const {city}=fixture();city.funds=10000;
  place(city,'hospital',9,9);place(city,'policeStation',0,11);
  assert.equal(city.buildings.filter(b=>b.kind==='hospital'||b.kind==='policeStation').length,2);
  for(let x=3;x<=10;x++)if(x!==5)place(city,'road',x,12);
  for(let x=1;x<=5;x++)place(city,'road',x,13);
  place(city,'road',10,11);place(city,'road',1,4);
  for(const y of [2,11])for(const x of [6,7])place(city,'road',x,y);
  city.transit!.routes[0].running=false;
  crash(city,'serious');
  let live=city,cleared=false,parked=false;
  for(let i=0;i<2400;i++) {
    stepCity(live,0.025);
    if(i%80===0){const restored=parseCity(JSON.parse(JSON.stringify(live)));assert.ok(restored,`recovery snapshot ${i} must reload`);live=restored;}
    cleared ||= live.incidents[0]?.status==='cleared';
    parked ||= cleared&&live.transit!.fleet[0].tripId===undefined;
    if(parked&&live.transit!.journeys.length===0)break;
  }
  assert.equal(cleared,true,JSON.stringify({incidents:live.incidents,trips:live.trips}));assert.equal(parked,true,JSON.stringify(live.trips));
  assert.equal(live.rescuedCount,1);assert.equal(live.fatalities,0);
  assert.ok(live.transit!.journeys.every(j=>j.state==='cancelled'||j.state==='stranded'));
  assert.equal(live.history.filter(h=>h.service?.homeId===2||h.service?.homeId===4).length,0);
});

test('representative riders survive crash saves and cancel only after physical depot recovery',()=>{
  const {city}=fixture();const t=city.transit!,fleet=t.fleet[0];
  t.ridership={version:1,checkedAt:0,generated:2,completed:0,cancelled:0,
    homes:[2,4].map(homeId=>({homeId,nextAt:20,requests:1})),
    riders:t.journeys.map(j=>({id:j.id,homeId:j.homeId,destinationId:3,originStopId:1,destinationStopId:7,routeId:31,stage:'riding-out',busId:30,queuedAt:0,remaining:0}))};
  fleet.abstractOnboard=[...fleet.onboard];fleet.onboard=[];t.journeys=[];t.routes[0].running=false;
  city.funds=10000;place(city,'hospital',9,9);place(city,'policeStation',0,11);
  for(let x=3;x<=10;x++)if(x!==5)place(city,'road',x,12);
  for(let x=1;x<=5;x++)place(city,'road',x,13);
  place(city,'road',10,11);place(city,'road',1,4);
  crash(city,'serious');let live=parseCity(JSON.parse(JSON.stringify(city)));assert.ok(live);
  assert.equal(live.transit!.ridership!.riders.length,2);assert.equal(live.transit!.ridership!.cancelled,0);
  let sawRecovery=false;
  for(let i=0;i<2400&&live.transit!.fleet[0].tripId!==undefined;i++){
    stepCity(live,.025);const trip=live.trips.find(t=>t.busId===30);
    if(trip?.phase==='returning'){sawRecovery=true;assert.equal(live.transit!.ridership!.riders.length,2);}
    if(i%80===0){const restored=parseCity(JSON.parse(JSON.stringify(live)));assert.ok(restored);live=restored;}
  }
  assert.ok(sawRecovery);assert.equal(live.transit!.fleet[0].tripId,undefined);
  assert.equal(live.transit!.ridership!.cancelled,2);assert.equal(live.transit!.ridership!.completed,0);
  assert.equal(live.rescuedCount,1);assert.equal(live.fatalities,0);assert.ok(parseCity(JSON.parse(JSON.stringify(live))));
});
