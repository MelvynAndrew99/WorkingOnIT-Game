import test from 'node:test';
import assert from 'node:assert/strict';
import {createCity,place,parseCity,stepCity,entrance,type City} from './cityModel.ts';
import {buyBus,applyBusRoute,setBusRouteRunning,busRoutePreview,tryTransitJourney,parseTransit} from './cityTransit.ts';
import {newHousehold,visitorSlots,capacityRespected} from './cityVisits.ts';
import {bodyTile} from './cityTraffic.ts';
import {parseJourneys} from './cityJourneys.ts';
function fixture(){
 const c=createCity();c.map={x:0,y:0,width:24,height:20};c.funds=100000;c.tutorial=undefined;c.economy=undefined;
 for(let x=3;x<=21;x++){place(c,'road',x,5);place(c,'road',x,15);}
 for(let y=6;y<15;y++){place(c,'road',3,y);place(c,'road',21,y);}place(c,'road',3,4);
 assert.match(place(c,'busStation',2,1),/built/);const station=c.buildings.at(-1)!;
 assert.match(place(c,'busStop',8,6,2),/built/);const a=c.buildings.at(-1)!;
 assert.match(place(c,'busStop',17,6,2),/built/);const z=c.buildings.at(-1)!;
 assert.match(place(c,'home',5,3),/built/);const home=c.buildings.at(-1)!;
 assert.match(place(c,'store',17,3),/built/);const shop=c.buildings.at(-1)!;
 c.households=[newHousehold(home.id)];
 assert.equal(busRoutePreview(c,station.id,[a.id,z.id]).error,null);
 assert.match(applyBusRoute(c,station.id,[a.id,z.id]),/ready/);assert.match(buyBus(c,station.id),/purchased/);
 assert.match(setBusRouteRunning(c,station.id,true),/started/);
 return {c,station,a,z,home,shop};
}
function tick(c:City,seconds:number){for(let i=0;i<seconds*40;i++)stepCity(c,.025);}
test('cars and admitted riders share finite destination activity slots',()=>{
 const {c,home,shop}=fixture(),origin=entrance(home);
 for(let i=0;i<3;i++)c.trips.push({id:c.nextId++,homeId:0,storeId:shop.id,external:{origin},path:[entrance(shop)],progress:0,wait:0,hold:0,phase:'visiting',purpose:'shopping',visitRemaining:5,rewarded:false});
 assert.equal(tryTransitJourney(c,origin,home.id,'shopping'),true);
 assert.deepEqual(visitorSlots(c,shop),{occupied:3,inbound:1,capacity:4});
 const before=c.nextId;
 assert.equal(tryTransitJourney(c,origin,0,'shopping',Infinity,true),false);
 assert.equal(c.nextId,before);assert.equal(capacityRespected(c),true);
 assert.equal(c.transit!.journeys.length,1);
});
test('two buses retain departure spacing and never occupy the same road body tile',()=>{
 const {c,station}=fixture();assert.match(buyBus(c,station.id),/purchased/);
 c.buildings=c.buildings.filter(b=>b.kind!=='home');c.households=[];
 const departures=new Map<number,number>();
 for(let i=0;i<4000;i++){
  stepCity(c,.025);
  for(const bus of c.transit!.fleet)if(bus.tripId!==undefined&&!departures.has(bus.id))departures.set(bus.id,c.elapsed);
  const active=c.trips.filter(t=>t.busId!==undefined&&t.phase!=='visiting');
  if(active.length===2){
    const a=active[0].path[bodyTile(active[0])],b=active[1].path[bodyTile(active[1])];
    if(a.x===b.x&&a.y===b.y){
      const headings=active.map(t=>{const i=Math.min(t.path.length-2,Math.floor(t.progress)),p=t.path[Math.max(0,i)],q=t.path[Math.max(0,i)+1];return {x:q.x-p.x,y:q.y-p.y};});
      assert.notDeepEqual(headings[0],headings[1],'buses cannot occupy the same tile in the same lane');
    }
  }
  if(i%200===0)assert.ok(parseCity(JSON.parse(JSON.stringify(c))));
 }
 assert.equal(departures.size,2);
 const starts=[...departures.values()].sort((a,b)=>a-b);assert.ok(starts[1]-starts[0]>=12-1e-6);
 assert.equal(c.completed,0);assert.equal(c.history.length,0);assert.equal(c.missions?.shoppers.length??0,0);
});
test('closure preserves commitments and queued route reversal waits for real rider returns',()=>{
 const {c,station,a,z,home}=fixture();assert.equal(tryTransitJourney(c,entrance(home),home.id,'shopping'),true);
 const journeyId=c.transit!.journeys[0].id;tick(c,1);
 assert.match(applyBusRoute(c,station.id,[z.id,a.id]),/queued/);
 assert.deepEqual(c.transit!.routes[0].stopIds,[a.id,z.id]);
 c.closures.push({x:12,y:5});tick(c,10);
 assert.ok(c.transit!.journeys.find(j=>j.id===journeyId));assert.equal(c.history.length,0);
 assert.ok(parseCity(JSON.parse(JSON.stringify(c))));
 c.closures=[];
 for(let i=0;i<24000&&c.transit!.routes[0].pendingStopIds;i++)stepCity(c,.025);
 assert.equal(c.transit!.routes[0].pendingStopIds,undefined);
 assert.deepEqual(c.transit!.routes[0].stopIds,[z.id,a.id]);
 assert.ok(c.history.some(h=>h.service?.homeId===home.id));
 assert.ok(parseCity(JSON.parse(JSON.stringify(c))));
});
test('fleet parser rejects unbounded clocks/runs and deployed vehicles with missing route ownership',()=>{
 const {c}=fixture();
 const parsed=(mutate:(raw:NonNullable<City['transit']>)=>void)=>{
  const raw=structuredClone(c.transit!);mutate(raw);return parseTransit(raw,c);
 };
 assert.equal(parsed(t=>{t.fleet[0].readyAt=1e300;}),null);
 assert.equal(parsed(t=>{t.fleet[0].run=Number.MAX_SAFE_INTEGER;}),null);
 tick(c,1);
 assert.equal(parsed(t=>{delete t.fleet[0].routeId;}),null);
 assert.equal(parsed(t=>{t.fleet[0].stopIndex=2;}),null);
});
test('admission refuses full reserved runs and reuses seats on nonoverlapping stop intervals',()=>{
 const {c,station,a,z,home}=fixture();
 const origin=entrance(home);c.external!.gateway={...origin};
 assert.equal(tryTransitJourney(c,origin,0,'shopping',Infinity,true),true);
 const example=c.transit!.journeys[0],bus=c.transit!.fleet[0];c.transit!.journeys=[];
 // Real return commitments occupy the full next two runs; no destination activity is held.
 for(const runId of [0,1])for(const interval of [[0,2],[2,3]])for(let i=0;i<8;i++){
  const ids=[station.id,a.id,z.id],board=ids[interval[0]],alight=ids[interval[1]%3];
  const b=c.buildings.find(b=>b.id===board)!;
  c.transit!.journeys.push({...structuredClone(example),id:c.nextId++,state:'waiting-back',rewarded:true,visitedAt:0,activityReserved:false,
    walkTarget:'board-back',path:[entrance(b)],progress:0,returnBoardStopId:board,returnAlightStopId:alight,
    seat:{busId:bus.id,runId,boardIndex:interval[0],alightIndex:interval[1]}});
 }
 assert.ok(parseJourneys(c.transit!.journeys,c));
 assert.equal(tryTransitJourney(c,origin,0,'shopping',Infinity,true),false);
 // Release eight seats on segment 1 while keeping segment 0 fully reserved.
 for(const j of c.transit!.journeys)if(j.seat!.boardIndex===0){j.seat!.alightIndex=1;j.returnAlightStopId=a.id;}
 assert.ok(parseJourneys(c.transit!.journeys,c));
 assert.equal(tryTransitJourney(c,origin,0,'shopping',Infinity,true),true);
 const admitted=c.transit!.journeys.at(-1)!;
 assert.equal(admitted.seat!.boardIndex,1);assert.equal(admitted.seat!.alightIndex,2);
});
