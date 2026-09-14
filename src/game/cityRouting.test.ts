import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,place,findPath,parseCity,stepCity,type Trip} from './cityModel.ts';
import {roadIndex,trafficTick,TRAFFIC_TICK} from './cityTraffic.ts';
import {routingSnapshot,weightedRoute,routeCost,worthwhileRoute} from './cityRouting.ts';
function town(){const c=createCity();c.funds=10000;place(c,'home',1,1);place(c,'store',10,1);for(let x=1;x<=11;x++)place(c,'road',x,3);return c;}
function bypass(c:ReturnType<typeof town>){for(let x=2;x<=9;x++)place(c,'road',x,5);for(const x of [2,9])place(c,'road',x,4);}
function queue(c:ReturnType<typeof town>,reverse=false){const path=[{x:5,y:3},{x:6,y:3}];if(reverse)path.reverse();const t:Trip={id:c.nextId++,homeId:0,storeId:0,phase:'waiting',path,progress:0,hold:12,wait:12};c.trips.push(t);return t;}
test('weighted search chooses longer clear roads, keeps opposite lanes independent and is deterministic',()=>{
 const c=town();bypass(c);const start={x:1,y:3},goal={x:11,y:3};queue(c);
 const snapshot=routingSnapshot(c),r=weightedRoute(snapshot,start,goal)!;
 assert.ok(r.path.some(p=>p.y===5));assert.ok(r.cost.total<routeCost(snapshot,findPath(c,start,goal)!).total);
 assert.deepEqual(weightedRoute(snapshot,start,goal),r);
 c.trips=[];queue(c,true);assert.ok(weightedRoute(routingSnapshot(c),start,goal)!.path.every(p=>p.y===3));
 // Published snapshot remains detached from later city mutations.
 c.roads=[];assert.deepEqual(weightedRoute(snapshot,start,goal),r);
});
test('closed, wrecked and missing roads remain hard constraints with no destination substitution',()=>{
 const c=town(),start={x:1,y:3},goal={x:11,y:3};
 c.closures=[{x:6,y:3}];assert.equal(weightedRoute(routingSnapshot(c),start,goal),null);
 c.closures=[];c.incidents.push({id:99,x:6,y:3,status:'active',severity:'minor',createdAt:0,required:['police'],completedServices:[],rescueDeadline:90,outcome:'pending'});
 assert.equal(weightedRoute(routingSnapshot(c),start,goal),null);
 c.incidents=[];c.roads=c.roads.filter(p=>p.x!==6);assert.equal(weightedRoute(routingSnapshot(c),start,goal),null);
});
test('control estimates charge once on entry and do not double count measured waiting',()=>{
 const c=town();place(c,'road',5,4);place(c,'signal',5,3);
 const path=[{x:4,y:3},{x:5,y:3},{x:6,y:3}],s=routingSnapshot(c);
 assert.equal(routeCost(s,path).control,3);
 c.trips.push({id:c.nextId++,homeId:0,storeId:0,phase:'outbound',path,progress:0,hold:5,wait:5});
 const cost=routeCost(routingSnapshot(c),path);assert.equal(cost.control+cost.queue,5);
 assert.equal(worthwhileRoute(10,9),false);assert.equal(worthwhileRoute(10,7),true);
});
test('optional rerouting discovers new roads without changing position, destination or cooldown on reload',()=>{
 const c=town();bypass(c);
 const t:Trip={id:c.nextId++,homeId:c.buildings[0].id,storeId:c.buildings[1].id,phase:'outbound',purpose:'shopping',rewarded:false,
 path:findPath(c,{x:1,y:3},{x:11,y:3})!,progress:0,wait:0,hold:0,target:{x:11,y:3},nextRouteQueryAt:0};
 c.trips=[t];const q=queue(c);const before={x:1+t.progress,y:3};trafficTick(c,roadIndex(c));
 assert.ok(t.path.some(p=>p.y===5));assert.equal(t.path[0].x+t.progress,before.x+2*TRAFFIC_TICK);
 assert.equal(t.storeId,c.buildings[1].id);assert.deepEqual(t.target,{x:11,y:3});
 c.trips=c.trips.filter(x=>x!==q);const restored=parseCity(JSON.parse(JSON.stringify(c)))!;assert.ok(restored);
 assert.equal(restored.trips[0].nextRouteQueryAt,t.nextRouteQueryAt);
 const a=JSON.parse(JSON.stringify(c));delete a.trips[0].nextRouteQueryAt;assert.ok(parseCity(a));
 a.trips[0].nextRouteQueryAt=-1;assert.equal(parseCity(a),null);
 for(let n=0;n<300;n++){stepCity(c,.1);stepCity(restored,.1);}
 assert.deepEqual(restored,c);assert.ok(c.completed>0,'real visit and home return finish');
});
test('ordinary signal wait and distant queues retain the usable route',()=>{
 const c=town();bypass(c);place(c,'signal',2,3);const t:Trip={id:c.nextId++,homeId:c.buildings[0].id,storeId:c.buildings[1].id,
 phase:'outbound',path:findPath(c,{x:1,y:3},{x:11,y:3})!,progress:0,wait:3,hold:3,nextRouteQueryAt:0};c.trips=[t];
 for(const x of [1,2])place(c,'road',x,8);
 c.trips.push({id:c.nextId++,homeId:0,storeId:0,phase:'waiting',path:[{x:1,y:8},{x:2,y:8}],progress:0,wait:30,hold:30});
 const path=structuredClone(t.path);trafficTick(c,roadIndex(c));assert.deepEqual(t.path,path);
 const next=t.nextRouteQueryAt;trafficTick(c,roadIndex(c));assert.equal(t.nextRouteQueryAt,next);
});
test('new departures choose a less delayed route to the same selected store',()=>{
 const c=town();bypass(c);queue(c);stepCity(c,4);
 const t=c.trips.find(t=>t.homeId===c.buildings[0].id)!;
 assert.ok(t);assert.equal(t.storeId,c.buildings[1].id);assert.ok(t.path.some(p=>p.y===5));
});
test('optional query budget retains waiting routes and eventually serves every due car',()=>{
 const c=town();
 for(let y=6;y<=10;y+=2)for(let x=1;x<=11;x++)place(c,'road',x,y);
 for(const y of [6,8,10])c.trips.push({id:c.nextId++,homeId:0,storeId:0,phase:'waiting',resume:'outbound',target:{x:11,y},path:[{x:1,y}],progress:0,hold:0,wait:0});
 // Use explicit outbound destinations while each vehicle occupies a separate road.
 for(let i=0;i<3;i++) {
   const t=c.trips[i],y=6+i*2;
   c.buildings.push({id:c.nextId++,kind:'store',x:10,y:y-2,rotation:0});
   t.storeId=c.buildings.at(-1)!.id;t.phase='outbound';t.path=findPath(c,{x:1,y},{x:11,y})!;t.nextRouteQueryAt=0;
 }
 const paths=c.trips.map(t=>structuredClone(t.path));trafficTick(c,roadIndex(c));
 assert.equal(c.trips.filter(t=>t.nextRouteQueryAt!>0).length,2);
 assert.deepEqual(c.trips.map(t=>t.path),paths);
 for(let n=0;n<40;n++){c.elapsed+=TRAFFIC_TICK;trafficTick(c,roadIndex(c));}
 assert.ok(c.trips.every(t=>t.nextRouteQueryAt!>0));
});
