import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,entrance,type City,type Building} from './cityModel.ts';
import {newHousehold,SHOP_INCOME} from './cityVisits.ts';
import {walkingPath,createWalkingJourney,stepWalkingJourneys,journeyActivitySlots,parseJourneys,completeJourneyReturn,type TransitJourney} from './cityJourneys.ts';
function fixture():{city:City;home:Building;store:Building;j:TransitJourney} {
  const city=createCity();city.buildings=[];city.roads=[];city.trips=[];city.households=[];city.history=[];city.elapsed=10;
  const home:Building={id:100,kind:'home',x:0,y:0,rotation:0};
  const store:Building={id:101,kind:'store',x:3,y:0,rotation:0};
  city.buildings.push(home,store);city.households.push(newHousehold(home.id));
  const start=entrance(home),end=entrance(store);
  for(let x=start.x;x<=end.x;x++)city.roads.push({x,y:start.y});
  const j=createWalkingJourney(city,home,store,'shopping',200)!;
  assert.ok(j);return {city,home,store,j};
}
function advance(city:City,j:TransitJourney,seconds:number) {
  for(let i=0;i<seconds*4;i++){city.elapsed+=0.25;stepWalkingJourneys(city,[j],0.25);}
}
test('sidewalk graph never crosses diagonal/empty gaps and ignores car flow direction',()=>{
  const {city,home,store}=fixture();const start=entrance(home),end=entrance(store);
  assert.ok(walkingPath(city,end,start));
  assert.equal(walkingPath(city,start,end,1),null);
  city.closures=[{...city.roads[1]}];assert.ok(walkingPath(city,start,end));
  assert.equal(walkingPath(city,start,end,6,new Set([`${city.roads[1].x},${city.roads[1].y}`])),null);
  city.roads.splice(1,1);assert.equal(walkingPath(city,start,end),null);
});
test('walker reserves activity, visits once, then physically returns with original journey attribution',()=>{
  const {city,store,j}=fixture();const funds=city.funds;
  assert.deepEqual(journeyActivitySlots([j],store.id),{occupied:0,inbound:1});
  advance(city,j,4);assert.equal(j.state,'visiting');assert.equal(city.funds,funds);
  assert.deepEqual(journeyActivitySlots([j],store.id),{occupied:1,inbound:0});
  advance(city,j,5);assert.equal(j.rewarded,true);assert.equal(city.funds,funds+SHOP_INCOME);
  assert.equal(city.history.length,0);assert.equal(j.activityReserved,false);
  const saved=parseJourneys(JSON.parse(JSON.stringify([j])),city);assert.ok(saved);
  const restored=saved[0];advance(city,restored,5);assert.equal(restored.state,'complete');
  assert.equal(city.funds,funds+SHOP_INCOME);assert.equal(city.history.length,1);
  assert.equal(city.history[0].service?.startedAt,10);
  assert.equal(completeJourneyReturn(city,restored),false);
});
test('broken sidewalk strands a walker at physical position and reload preserves it',()=>{
  const {city,j}=fixture();advance(city,j,0.5);const at=j.progress;
  const removed=city.roads.splice(1,1)[0];advance(city,j,2);
  assert.equal(j.progress,at);assert.match(j.blockedReason!,/blocked/);
  const parsed=parseJourneys(JSON.parse(JSON.stringify([j])),city);assert.ok(parsed);assert.equal(parsed[0].progress,at);
  city.roads.push(removed);advance(city,j,20);assert.equal(j.state,'complete');
});
test('journey parser rejects duplicate households, malformed seats and duplicate receipts',()=>{
  const {city,j}=fixture();
  assert.ok(parseJourneys([j],city));
  assert.equal(parseJourneys([j,{...j,id:201}],city),null);
  assert.equal(parseJourneys([{...j,progress:Infinity}],city),null);
  assert.equal(parseJourneys([{...j,rewarded:true}],city),null);
  assert.equal(parseJourneys([{...j,returned:true}],city),null);
  assert.equal(parseJourneys([{...j,mode:'bus',seat:{busId:1,runId:0,boardIndex:1,alightIndex:1}}],city),null);
});
test('bus access walking becomes a queue and visit completion delegates return planning',()=>{
  const {city,j}=fixture();j.mode='bus';j.walkTarget='board-out';advance(city,j,5);assert.equal(j.state,'waiting-out');
  j.state='visiting';j.visitRemaining=0;let calls=0;
  stepWalkingJourneys(city,[j],0.25,new Set(),r=>{calls++;r.state='walking-back';r.walkTarget='board-back';});
  assert.equal(calls,1);assert.equal(j.rewarded,true);assert.equal(j.state,'walking-back');
});

test('a rescued rider physically returns without counting an incident as successful service',()=>{
  const {city,j}=fixture();advance(city,j,9);assert.equal(j.rewarded,true);
  j.incidentId=99;j.incidentOutcome='rescued';advance(city,j,6);
  assert.equal(j.state,'cancelled');assert.equal(city.history.length,0);assert.equal(j.returned,false);
  assert.ok(parseJourneys([j],city));
});
function busFixture(){
  const f=fixture(),{city,j}=f;
  city.buildings.push({id:102,kind:'busStation',x:8,y:8,rotation:0},
    {id:103,kind:'busStop',x:5,y:5,rotation:0},{id:104,kind:'busStop',x:6,y:5,rotation:0});
  city.transit={version:1,walkingEnabled:true,routes:[{id:105,stationId:102,stopIds:[103,104],running:true}],
    fleet:[{id:106,stationId:102,routeId:105,stopIndex:0,run:0,dwell:0,readyAt:0,paid:400,onboard:[]}],journeys:[]};
  Object.assign(j,{mode:'bus',state:'waiting-out',routeId:105,boardStopId:103,alightStopId:104,
    returnBoardStopId:104,returnAlightStopId:103,walkTarget:'board-out',seat:{busId:106,runId:0,boardIndex:1,alightIndex:2}});
  j.path=[entrance(city.buildings.find(b=>b.id===103)!)];j.progress=0;delete j.goal;
  return f;
}
test('bus save references require reciprocal physical occupancy and valid route stop intervals',()=>{
  const {city,j}=busFixture();assert.ok(parseJourneys([j],city));
  assert.equal(parseJourneys([{...j,routeId:999}],city),null);
  assert.equal(parseJourneys([{...j,alightStopId:999}],city),null);
  assert.equal(parseJourneys([{...j,seat:{...j.seat!,boardIndex:0}}],city),null);
  j.state='riding-out';j.busId=106;assert.equal(parseJourneys([j],city),null);
  city.transit!.fleet[0].onboard=[j.id];assert.equal(parseJourneys([j],city),null);
  city.transit!.fleet[0].tripId=107;
  city.trips.push({id:107,busId:106,stationId:102,homeId:0,storeId:0,path:[{x:0,y:2}],progress:0,wait:0,hold:0,phase:'outbound'});
  assert.ok(parseJourneys([j],city));assert.equal(parseJourneys([],city),null);
  assert.equal(parseJourneys([{...j,seat:undefined}],city),null);
  j.state='crashed';j.incidentId=900;j.incidentOutcome='rescued';assert.ok(parseJourneys([j],city));
});
test('seat capacity counts overlapping intervals and permits reuse after alighting',()=>{
  const {city,j}=busFixture();city.external!.gateway={...j.origin};
  const riders=Array.from({length:8},(_,i)=>({...structuredClone(j),id:200+i,homeId:0,external:{origin:{...j.origin}}}));
  assert.ok(parseJourneys(riders,city));
  assert.equal(parseJourneys([...riders,{...structuredClone(riders[0]),id:209}],city),null);
  const next={...structuredClone(riders[0]),path:[entrance(city.buildings.find(b=>b.id===104)!)],id:209,boardStopId:104,alightStopId:103,seat:{busId:106,runId:0,boardIndex:2,alightIndex:4}};
  assert.ok(parseJourneys([...riders,next],city));
  assert.equal(parseJourneys([...riders,{...next,seat:{...next.seat,alightIndex:99}}],city),null);
});
test('walker reroutes from its real sidewalk node when an edit leaves an alternate connection',()=>{
  const {city,j}=fixture(),origin={...j.path[0]},last=j.path.at(-1)!;
  city.roads.splice(1,1);
  for(let x=origin.x;x<=last.x;x++)city.roads.push({x,y:origin.y+1});
  advance(city,j,.25);assert.equal(j.progress,0);assert.deepEqual(j.path[0],origin);
  assert.equal(j.path[1].y,origin.y+1);advance(city,j,25);assert.equal(j.state,'complete');
});
test('incident recovery keeps a stranded traveler and resumes a physical exit after repairs',()=>{
  const {city,j}=fixture(),removed=city.roads.splice(1,1)[0];
  j.path=[{...j.path.at(-1)!}];j.progress=0;j.state='stranded';j.goal={...j.origin};
  j.activityReserved=false;j.incidentOutcome='rescued';j.incidentId=900;
  advance(city,j,2);assert.equal(j.state,'stranded');assert.equal(j.progress,0);
  city.roads.push(removed);advance(city,j,6);assert.equal(j.state,'cancelled');assert.equal(city.history.length,0);
});
test('save cannot shorten a walking leg or move a waiting rider away from their actual stop',()=>{
 const {city,j}=fixture();
 assert.equal(parseJourneys([{...j,path:[j.path[0]]}],city),null);
 assert.equal(parseJourneys([{...j,origin:{x:j.origin.x+1,y:j.origin.y}}],city),null);
 const b=busFixture();assert.equal(parseJourneys([{...b.j,path:[b.j.origin]}],b.city),null);
});
test('a relocated external return finishes its committed walking edge before replanning',()=>{
 const {city,j}=fixture();advance(city,j,9.5);
 assert.equal(j.state,'walking-back');assert.equal(j.progress,.5);
 j.external={origin:{x:0,y:3}};j.origin={x:0,y:3};j.goal={...j.origin};city.external!.gateway={...j.origin};
 city.roads.push({x:0,y:3});assert.ok(parseJourneys([j],city));
 const oldPath=structuredClone(j.path);advance(city,j,.25);assert.equal(j.progress,.75);assert.deepEqual(j.path,oldPath);
 advance(city,j,.25);assert.equal(j.progress,1);assert.deepEqual(j.path,oldPath);
 advance(city,j,.25);assert.equal(j.progress,.25);assert.deepEqual(j.path[0],oldPath[1]);
 advance(city,j,8);assert.equal(j.state,'complete');assert.equal(city.history[0].service,undefined);
});
