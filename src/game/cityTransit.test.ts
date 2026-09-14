import test from 'node:test';
import assert from 'node:assert/strict';
import {createCity,place,parseCity,stepCity,entrance,type City} from './cityModel.ts';
import {initTransit,buyBus,applyBusRoute,setBusRouteRunning,busRoutePreview,tryTransitJourney,sellBus,busStopIssue} from './cityTransit.ts';
import {newHousehold,visitorSlots} from './cityVisits.ts';
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
test('station owns nine tiles, stop owns one curb and fleet receipts survive reload',()=>{
 const {c,station,a}=fixture();assert.equal(c.transit!.fleet.length,1);
 assert.equal(busStopIssue(c,a),null);assert.equal(busStopIssue(c,{...a,rotation:0})!==null,true);
 assert.match(place(c,'road',station.x+2,station.y+2),/occupied/);
 assert.ok(parseCity(JSON.parse(JSON.stringify(c))));
 const funds=c.funds,id=c.transit!.fleet[0].id;assert.match(sellBus(c,id),/refunded/);assert.equal(c.funds,funds+400);assert.match(sellBus(c,id),/Select/);
});
test('physical bus loop carries real rider through stay and return without duplicate reward',()=>{
 const {c,home,shop}=fixture();assert.equal(tryTransitJourney(c,entrance(home),home.id,'shopping'),true);
 const riderId=c.transit!.journeys[0].id;let boarded=false,visited=false,returned=false;
 for(let i=0;i<20000;i++){
  stepCity(c,.025);const j=c.transit!.journeys.find(j=>j.id===riderId);
  if(j?.state.startsWith('riding'))boarded=true;if(j?.rewarded)visited=true;
  if(i%80===0){const restored=parseCity(JSON.parse(JSON.stringify(c)));assert.ok(restored,`reload at ${c.elapsed} ${j?.state}`);}
  assert.ok(visitorSlots(c,shop).occupied+visitorSlots(c,shop).inbound<=4);
  if(!j){returned=true;break;}
 }
 assert.ok(boarded);assert.ok(visited);assert.ok(returned);assert.ok(c.history.some(h=>h.service?.homeId===home.id));
});
test('a closed loop retains bus and riders; reopening restores physical progress',()=>{
 const {c,home}=fixture();tryTransitJourney(c,entrance(home),home.id,'shopping');tick(c,8);
 const id=c.transit!.journeys[0].id;c.closures.push({x:12,y:5});tick(c,5);
 assert.ok(c.transit!.journeys.some(j=>j.id===id));assert.ok(parseCity(JSON.parse(JSON.stringify(c))));
 c.closures=[];tick(c,150);assert.ok(c.completed>0);
});
test('deployed fleet and rider dependencies prevent destructive edits',()=>{
 const {c,home,station,a}=fixture();tryTransitJourney(c,entrance(home),home.id,'shopping');tick(c,1);
 assert.match(place(c,'bulldoze',station.x,station.y),/fleet/);
 assert.match(place(c,'bulldoze',a.x,a.y),/active riders/);
 assert.match(place(c,'bulldoze',home.x,home.y),/traveler/);
 assert.match(sellBus(c,c.transit!.fleet[0].id),/wait/);
});
test('no transit data leaves original city behavior opt-in',()=>{
 const c=createCity();assert.equal(c.transit,undefined);const loaded=parseCity(JSON.parse(JSON.stringify(c)));assert.ok(loaded);assert.equal(loaded.transit,undefined);
 const t=initTransit(c);assert.equal(t.walkingEnabled,true);
});
test('roadside dwell holds a following car while opposite traffic retains its lane',()=>{
 const {c,home,shop}=fixture();c.households[0].shopping=0;
 let bus=c.trips[0];for(let i=0;i<1500;i++){stepCity(c,.025);bus=c.trips.find(t=>t.busId!==undefined)!;if(bus?.phase==='bus-dwell')break;}
 assert.equal(bus.phase,'bus-dwell');const at=bus.path.at(-1)!,before=bus.path.at(-2)!;
 const direction={x:at.x-before.x,y:at.y-before.y};assert.equal(direction.x,1);
 c.trips=c.trips.filter(t=>t.busId!==undefined);
 const path=Array.from({length:18-before.x+1},(_,i)=>({x:before.x+i,y:5}));
 const follower={id:c.nextId++,homeId:home.id,storeId:shop.id,path,progress:0,wait:0,hold:0,phase:'outbound' as const,purpose:'shopping' as const,target:entrance(shop),rewarded:false};c.trips.push(follower);
 const opposite={id:c.nextId++,homeId:0,storeId:0,path:[{x:at.x+1,y:5},{x:at.x,y:5},{x:at.x-1,y:5}],progress:0,wait:0,hold:0,phase:'legacy' as const};c.trips.push(opposite);
 for(let i=0;i<20;i++)stepCity(c,.025);
 assert.ok(follower.progress<=.5,'following car cannot enter occupied bus lane');
 assert.ok(opposite.progress>.5,'opposite lane stays usable');
 assert.equal(c.accidentCount,0,'stationary boarding does not manufacture collisions');
});
test('gateway opportunity enters as one rider and completes only at the real gateway',async()=>{
 const {connectExternalCity,stepExternal}=await import('./cityExternal.ts');const {applyRoadDirections}=await import('./cityDirectionEdits.ts');const {roadIndex}=await import('./cityTraffic.ts');
 const {c}=fixture();
 for(let x=0;x<3;x++)place(c,'road',x,5);
 assert.match(connectExternalCity(c,{x:0,y:5}),/connected/);
 assert.ok(applyRoadDirections(c,[{x:3,y:5},{x:2,y:5},{x:1,y:5},{x:0,y:5}],'forward').ok);
 c.elapsed=11;stepExternal(c,roadIndex(c),11);
 const visitor=c.transit!.journeys.find(j=>j.external);assert.ok(visitor);assert.equal(visitor.mode,'bus');assert.equal(c.external!.arrivals,1);assert.equal(c.external!.completed,0);
 let aboard=false;
 for(let i=0;i<20000;i++){
  stepCity(c,.025);const j=c.transit!.journeys.find(j=>j.id===visitor.id);if(j?.state.startsWith('riding'))aboard=true;
  if(i%200===0)assert.ok(parseCity(JSON.parse(JSON.stringify(c))),`gateway reload at ${c.elapsed}`);
  if(!j)break;
 }
 assert.ok(aboard);assert.ok(!c.transit!.journeys.some(j=>j.id===visitor.id));assert.ok(c.external!.completed>0);
 assert.ok(!c.history.some(h=>h.service?.homeId===0),'external rider is not a household mission');
});
test('the same four household demands return in one shared bus instead of four cars',async()=>{
 const {spawnTrips,stepVisits}=await import('./cityVisits.ts');const {roadIndex,trafficTick}=await import('./cityTraffic.ts');const {stepTransit}=await import('./cityTransit.ts');
 const {c}=fixture();for(const x of [7,9,11]){assert.match(place(c,'home',x,3),/built/);c.households.push(newHousehold(c.buildings.at(-1)!.id));}
 const cars=structuredClone(c);delete cars.transit;cars.buildings=cars.buildings.filter(b=>b.kind!=='busStation'&&b.kind!=='busStop');
 spawnTrips(cars,roadIndex(cars));assert.equal(cars.trips.length,4);
 for(const h of c.buildings.filter(b=>b.kind==='home'))assert.ok(tryTransitJourney(c,entrance(h),h.id,'shopping'));
 let largestLoad=0;
 for(const city of [cars,c])for(let i=0;i<24000&&city.completed<4;i++){
  city.elapsed+=.025;const index=roadIndex(city);stepTransit(city,index,.025);trafficTick(city,index);stepVisits(city,index,.025);
  largestLoad=Math.max(largestLoad,city.transit?.fleet[0].onboard.length??0);
 }
 assert.equal(cars.completed,4);assert.equal(c.completed,4);assert.equal(largestLoad,4);
 assert.equal(c.trips.filter(t=>t.busId===undefined).length,0);assert.equal(c.transit!.fleet.length,1);
 assert.equal(new Set(c.history.flatMap(h=>h.service?[h.service.homeId]:[])).size,4);
});
