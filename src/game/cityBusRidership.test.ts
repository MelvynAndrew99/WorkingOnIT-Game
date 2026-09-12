import test from 'node:test';
import assert from 'node:assert/strict';
import {createCity,place,parseCity,entrance,type City} from './cityModel.ts';
import {buyBus,applyBusRoute,setBusRouteRunning,stepTransit,parseTransit,transitRemovalGuard,tryTransitJourney} from './cityTransit.ts';
import {stepBusRidership,exchangeBusRiders,busRiderCount,cancelRecoveredBusRiders,waitingBusRiders,unservedBusHomes} from './cityBusRidership.ts';
import {roadIndex,trafficTick} from './cityTraffic.ts';
function fixture(){
 const c=createCity();c.map={x:0,y:0,width:24,height:20};c.funds=100000;c.tutorial=undefined;c.economy=undefined;
 for(let x=3;x<=21;x++){place(c,'road',x,5);place(c,'road',x,15);}
 for(let y=6;y<15;y++){place(c,'road',3,y);place(c,'road',21,y);}place(c,'road',3,4);
 const build=(kind:Parameters<typeof place>[1],x:number,y:number,rotation=0)=>{assert.match(place(c,kind,x,y,rotation as 0),/built/);return c.buildings.at(-1)!;};
 const station=build('busStation',2,1),a=build('busStop',8,6,2),z=build('busStop',17,6,2),home=build('home',5,3),shop=build('store',17,3);
 applyBusRoute(c,station.id,[a.id,z.id]);buyBus(c,station.id);setBusRouteRunning(c,station.id,true);
 return {c,station,a,z,home,shop};
}
function tick(c:City,seconds:number){for(let i=0;i<seconds*40;i++){c.elapsed=Math.round((c.elapsed+.025)*1e6)/1e6;const index=roadIndex(c);stepTransit(c,index,.025);trafficTick(c,index);}}
function reload(c:City){const saved=parseCity(JSON.parse(JSON.stringify(c)));assert.ok(saved,`reload at ${c.elapsed}: ${JSON.stringify(c.transit)}`);return saved;}
test('opening riders ride the physical route, stay and return with no household or economy receipts',()=>{
 let {c}=fixture();const funds=c.funds,history=structuredClone(c.history),households=structuredClone(c.households);const seen=new Set<string>();let peak=0;
 for(let i=0;i<600;i++){
   tick(c,1);for(const j of c.transit!.ridership!.riders)seen.add(j.stage);peak=Math.max(peak,busRiderCount(c.transit!.fleet[0]));
   if(i%5===0)c=reload(c);if(c.transit!.ridership!.completed>=2)break;
 }
 assert.ok(c.transit!.ridership!.completed>=2);assert.ok(peak>0&&peak<=8);
 for(const stage of ['riding-out','visiting','waiting-back','riding-back'])assert.ok(seen.has(stage),stage);
 assert.equal(c.funds,funds);assert.equal(c.completed,0);assert.deepEqual(c.history,history);assert.deepEqual(c.households,households);assert.equal(c.trips.some(t=>t.busId===undefined),false);
});
test('shared saved home clocks seed once, wait twenty seconds and cap all outstanding stages at two',()=>{
 let {c,station}=fixture();stepBusRidership(c,0);assert.equal(c.transit!.ridership!.generated,1);
 buyBus(c,station.id);setBusRouteRunning(c,station.id,false);setBusRouteRunning(c,station.id,true);
 c=reload(c);c.elapsed=19;stepBusRidership(c,0);assert.equal(c.transit!.ridership!.generated,1);
 c.elapsed=20;stepBusRidership(c,0);assert.equal(c.transit!.ridership!.generated,2);
 c.elapsed=200;stepBusRidership(c,0);assert.equal(c.transit!.ridership!.generated,2);assert.equal(unservedBusHomes(c),1);reload(c);
});
test('a disconnected loop preserves admitted queues and reports blockage; repair and stop service drain returns',()=>{
 const {c,station}=fixture();stepBusRidership(c,0);const id=c.transit!.ridership!.riders[0].id;
 c.closures.push({x:12,y:5});tick(c,30);
 assert.equal(c.transit!.ridership!.generated,1);assert.equal(c.transit!.ridership!.riders[0].id,id);assert.match(c.transit!.routes[0].blocked!,/route/);reload(c);
 c.closures=[];setBusRouteRunning(c,station.id,false);
 for(let i=0;i<600&&(!c.transit!.ridership!.completed||c.transit!.fleet[0].tripId!==undefined);i++)tick(c,1);
 assert.equal(c.transit!.ridership!.completed,1);assert.equal(c.transit!.ridership!.riders.length,0);assert.equal(c.transit!.fleet[0].tripId,undefined);reload(c);
});
test('route edits and demolition retain dependent riders until they finish',()=>{
 const {c,station,a,z,home}=fixture();stepBusRidership(c,0);
 assert.match(transitRemovalGuard(c,home)!,/traveler/);assert.match(applyBusRoute(c,station.id,[z.id,a.id]),/queued/);
 for(let i=0;i<600&&c.transit!.routes[0].pendingStopIds;i++)tick(c,1);
 assert.equal(c.transit!.routes[0].pendingStopIds,undefined);assert.deepEqual(c.transit!.routes[0].stopIds,[z.id,a.id]);assert.ok(c.transit!.ridership!.completed);reload(c);
});
test('empty fields and walking gaps do not seed riders; a six-tile connected catchment does',()=>{
 const {c,home}=fixture();c.roads=c.roads.filter(p=>!(p.x===5&&p.y===5));stepBusRidership(c,0);
 assert.equal(c.transit!.ridership!.generated,0);assert.equal(unservedBusHomes(c),1);
 c.roads.push(entrance(home));c.elapsed=1;stepBusRidership(c,0);assert.equal(c.transit!.ridership!.generated,1);
});
test('legacy linked passengers drain before representative admission',()=>{
 const {c,home}=fixture();assert.equal(tryTransitJourney(c,entrance(home),home.id,'shopping'),true);stepBusRidership(c,0);assert.equal(c.transit!.ridership!.generated,0);
 tick(c,1);assert.equal(c.transit!.ridership!.generated,0);assert.equal(c.transit!.journeys.length,1);reload(c);
});
test('FIFO boards eight total seats and separate shop stays bound congestion; incident recovery cancels explicitly',()=>{
 const {c,station,z,home}=fixture();stepBusRidership(c,0);const s=c.transit!.ridership!,example=s.riders[0],bus=c.transit!.fleet[0];
 // Focused exchange fixture: ten queued tokens, presented out of order.
 s.riders=Array.from({length:10},(_,i)=>({...example,id:c.nextId++,queuedAt:i})).reverse();s.generated=10;
 assert.equal(exchangeBusRiders(c,bus,station.id),8);assert.equal(busRiderCount(bus),8);assert.deepEqual(bus.abstractOnboard,s.riders.filter(j=>j.busId).sort((a,b)=>a.queuedAt-b.queuedAt).map(j=>j.id));
 assert.equal(exchangeBusRiders(c,bus,z.id),8);assert.equal(busRiderCount(bus),0);stepBusRidership(c,0);
 assert.equal(s.riders.filter(j=>j.stage==='visiting').length,4);assert.equal(s.riders.filter(j=>j.stage==='waiting-visit').length,4);assert.equal(waitingBusRiders(c).get(z.id),4);
 c.elapsed=6;stepBusRidership(c,6);assert.equal(s.riders.filter(j=>j.stage==='waiting-back').length,4);exchangeBusRiders(c,bus,z.id);assert.equal(busRiderCount(bus),4);
 cancelRecoveredBusRiders(c,bus);assert.equal(s.cancelled,4);assert.equal(s.completed,0);assert.equal(busRiderCount(bus),0);assert.equal(c.completed,0);assert.ok(home);
});
test('save validation rejects duplicate riders, forged completion, missing seed receipts and orphaned seats',()=>{
 const {c}=fixture();tick(c,1);reload(c);
 const invalid=(change:(t:NonNullable<City['transit']>)=>void)=>{const t=structuredClone(c.transit!);change(t);assert.equal(parseTransit(t,c),null);};
 invalid(t=>t.ridership!.completed++);invalid(t=>t.ridership!.homes=[]);
 invalid(t=>t.ridership!.riders.push({...t.ridership!.riders[0]}));
 invalid(t=>t.fleet[0].abstractOnboard=[]);invalid(t=>t.fleet[0].abstractOnboard!.push(999999));
 invalid(t=>t.ridership!.riders[0].destinationStopId=t.ridership!.riders[0].originStopId);
 invalid(t=>t.ridership!.homes[0].nextAt=1e300);
});

test('four homes fill all eight seats on a one-way loop and all eight requests return',()=>{
 const {c,station}=fixture();for(const x of [7,9,11])assert.match(place(c,'home',x,3),/built/);
 // Driving is eastbound here; walking from the homes at 9 and 11 to stop 8 is westbound.
 c.roadDirections={};for(let x=3;x<21;x++)c.roadDirections[`${x},5>${x+1},5`]='forward';
 stepBusRidership(c,0);assert.equal(c.transit!.ridership!.generated,4);
 c.elapsed=20;stepBusRidership(c,0);assert.equal(c.transit!.ridership!.generated,8);
 setBusRouteRunning(c,station.id,false);let peak=0;
 for(let i=0;i<600&&c.transit!.ridership!.completed<8;i++){tick(c,1);peak=Math.max(peak,busRiderCount(c.transit!.fleet[0]));if(i%10===0)reload(c);}
 assert.equal(peak,8);assert.equal(c.transit!.ridership!.completed,8);assert.equal(c.transit!.ridership!.generated,8);assert.equal(c.completed,0);
});

test('depot boarding preserves shared departure spacing for a second bus',()=>{
 const {c,station}=fixture();buyBus(c,station.id);const departures=new Map<number,number>();
 for(let i=0;i<1600&&departures.size<2;i++){
   tick(c,.025);
   for(const b of c.transit!.fleet){const trip=c.trips.find(t=>t.id===b.tripId);if(trip?.phase==='outbound'&&!departures.has(b.id))departures.set(b.id,c.elapsed);}
   if(i%40===0)reload(c);
 }
 assert.equal(departures.size,2);const times=[...departures.values()].sort((a,b)=>a-b);assert.ok(times[1]-times[0]>=12-1e-6);
});
