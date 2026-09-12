import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCity,place,parseCity,stepCity,entrance,type City} from './cityModel.ts';
import {applyBusRoute,buyBus,setBusRouteRunning,tryTransitJourney} from './cityTransit.ts';
import {busPassengerTimes,busStopNotices,moveBusStop} from './cityBusStops.ts';
import {walkingPath} from './cityJourneys.ts';
import {newHousehold} from './cityVisits.ts';

const captured=()=>parseCity(JSON.parse(readFileSync(new URL('../../docs/transit-and-one-way/buses/stuck-stop-14813/city.json',import.meta.url),'utf8')))!;
const reload=(c:City)=>{const loaded=parseCity(JSON.parse(JSON.stringify(c)));assert.ok(loaded);return loaded;};
function loop(){
 const c=createCity();c.map={x:0,y:0,width:24,height:20};c.funds=100000;c.tutorial=undefined;c.economy=undefined;
 for(let x=3;x<=21;x++){place(c,'road',x,5);place(c,'road',x,15);}
 for(let y=6;y<15;y++){place(c,'road',3,y);place(c,'road',21,y);}place(c,'road',3,4);
 const build=(kind:Parameters<typeof place>[1],x:number,y:number,r=0)=>{assert.match(place(c,kind,x,y,r),/built/);return c.buildings.at(-1)!;};
 const depot=build('busStation',2,1),a=build('busStop',8,6,2),z=build('busStop',17,6,2),home=build('home',5,3),shop=build('store',17,3);
 c.households=[newHousehold(home.id)];applyBusRoute(c,depot.id,[a.id,z.id]);buyBus(c,depot.id);setBusRouteRunning(c,depot.id,true);
 return {c,a,z,home,shop};
}
test('captured town skips bad curb without road edits, losing riders or invalidating reload',()=>{
 let c=captured();const roads=structuredClone(c.roads),buildings=structuredClone(c.buildings),riders=structuredClone(c.transit!.ridership!.riders);
 stepCity(c,5);c=reload(c);
 for(const id of [14934,15013])assert.equal(c.trips.find(t=>t.busId===id)?.phase,'outbound');
 assert.deepEqual(c.trips.find(t=>t.busId===14934)?.target,{x:16,y:10});
 for(const rider of riders)assert.ok(c.transit!.ridership!.riders.some(j=>j.id===rider.id));
 assert.equal(c.transit!.ridership!.riders.find(j=>j.id===19074)?.stage,'waiting-out');
 assert.equal(c.transit!.ridership!.riders.find(j=>j.id===18898)?.stage,'riding-back');
 assert.deepEqual(c.roads,roads);assert.deepEqual(c.buildings,buildings);
 assert.equal(busStopNotices(c)[0].id,14813);
});
test('captured stop moves one square with queues, paid value, route order and receipts intact',()=>{
 let c=captured();const funds=c.funds,route=structuredClone(c.transit!.routes[0].stopIds),riders=c.transit!.ridership!.riders.map(j=>j.id);
 assert.equal(moveBusStop(c,14813,-2,7,3).ok,true);c=reload(c);
 assert.equal(c.funds,funds);assert.equal(c.buildings.find(b=>b.id===14813)!.paid,50);
 assert.deepEqual(c.transit!.routes[0].stopIds,route);assert.deepEqual(c.transit!.ridership!.riders.map(j=>j.id),riders);
 assert.ok(!busStopNotices(c).some(n=>n.id===14813));
 stepCity(c,5);reload(c);
});
test('invalid relocation is atomic and cannot move a stop out from under an approaching bus',()=>{
 const {c,a}=loop();for(let i=0;i<400&&c.transit!.fleet[0].stopIndex!==1;i++)for(let i=0;i<400&&c.transit!.fleet[0].stopIndex!==1;i++)stepCity(c,.025);assert.equal(c.transit!.fleet[0].stopIndex,1);const before=JSON.stringify(c);
 assert.equal(moveBusStop(c,a.id,9,6,2).ok,false);assert.equal(JSON.stringify(c),before);
 assert.equal(moveBusStop(c,a.id,3,5,2).ok,false);assert.equal(JSON.stringify(c),before);
});
test('a stop invalidated during travel is skipped using physical movement and reload-safe targets',()=>{
 let {c,a,z}=loop();for(let i=0;i<400&&c.transit!.fleet[0].stopIndex!==1;i++)stepCity(c,.025);assert.equal(c.transit!.fleet[0].stopIndex,1);
 c.roads.push({x:a.x+1,y:4});
 let skipped=false;
 for(let i=0;i<400;i++){stepCity(c,.025);if(Number(c.transit!.fleet[0].stopIndex)===2){skipped=true;assert.deepEqual(c.trips.find(t=>t.busId)?.target,entrance(z));break;}}
 assert.ok(skipped);c=reload(c);assert.equal(c.transit!.fleet[0].stopIndex,2);
});
test('moving a stop preserves an interpolated linked walker and redirects them along sidewalks',()=>{
 let {c,a,home}=loop();assert.ok(tryTransitJourney(c,entrance(home),home.id,'shopping'));
 const j=c.transit!.journeys[0];j.boardStopId=a.id;j.returnAlightStopId=a.id;j.seat!.boardIndex=1;j.path=walkingPath(c,entrance(home),entrance(a))!;j.progress=.5;
 const before=structuredClone(j.path.slice(0,2));
 // The fleet has not deployed yet, so the curb can be moved now.
 assert.ok(moveBusStop(c,a.id,9,6,2).ok);
 assert.equal(j.progress,.5);assert.deepEqual(j.path.slice(0,2),before);assert.deepEqual(j.path.at(-1),{x:9,y:5});
 c=reload(c);stepCity(c,1);reload(c);
});
test('passenger time is derived without mutation, survives reload, and excludes destination stays',()=>{
 const c=captured(),before=JSON.stringify(c),times=busPassengerTimes(c);
 assert.equal(JSON.stringify(c),before);assert.equal(times.stops.get(14813),406);
 assert.equal(times.buses.get(14934),454);
 const restored=reload(c);assert.deepEqual(busPassengerTimes(restored),times);
 const j=restored.transit!.ridership!.riders.find(j=>j.id===19074)!;
 j.stage='visiting';assert.equal(busPassengerTimes(restored).stops.get(14813),406);
 const corrupt=captured();corrupt.transit!.ridership!.riders[0].walkRange=10000;assert.equal(parseCity(corrupt),null);
});
test('linked rider already aboard keeps their boarding history and completes after stop relocation',()=>{
 let {c,a,home}=loop();assert.ok(tryTransitJourney(c,entrance(home),home.id,'shopping'));
 const j=c.transit!.journeys[0],id=j.id;
 j.boardStopId=a.id;j.returnAlightStopId=a.id;j.seat!.boardIndex=1;j.path=walkingPath(c,entrance(home),entrance(a))!;
 for(let i=0;i<3000&&c.transit!.journeys.find(j=>j.id===id)?.state!=='riding-out';i++)stepCity(c,.1);
 assert.equal(c.transit!.journeys.find(j=>j.id===id)?.state,'riding-out');
 // Arrival dwell must end before the platform can be moved.
 for(let i=0;i<100&&c.transit!.fleet[0].stopIndex===1;i++)stepCity(c,.1);
 const before=structuredClone(c.transit!.journeys.find(j=>j.id===id)!.path);
 assert.ok(moveBusStop(c,a.id,9,6,2).ok);c=reload(c);
 assert.deepEqual(c.transit!.journeys.find(j=>j.id===id)!.path,before);
 for(let i=0;i<4000&&c.transit!.journeys.some(j=>j.id===id);i++)stepCity(c,.1);
 assert.ok(!c.transit!.journeys.some(j=>j.id===id));
 assert.ok(c.history.some(h=>h.service?.homeId===home.id));reload(c);
});
