import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,place,stepCity,parseCity,findPath,retarget,type Trip} from './cityModel.ts';
import {routingSnapshot,weightedRoute,responseRoute,routeCost} from './cityRouting.ts';
import {roadIndex,trafficTick,TRAFFIC_TICK,EMERGENCY_TILES_PER_SECOND,isEmergencyResponse} from './cityTraffic.ts';
import {stepIncidents,type ServiceKind} from './cityIncidents.ts';

function fixture(service:ServiceKind='ems') {
 const c=createCity();c.funds=10000;
 place(c,service==='ems'?'hospital':service==='fire'?'fireStation':'policeStation',1,1);
 for(let x=2;x<=12;x++)place(c,'road',x,3);
 for(let x=3;x<=10;x++)place(c,'road',x,5);
 for(const x of [3,10])place(c,'road',x,4);
 c.incidents.push({id:c.nextId++,x:12,y:3,severity:'fire',status:'active',createdAt:0,required:['police','ems','fire'],completedServices:[],rescueDeadline:90,outcome:'pending'});c.accidentCount=1;
 return c;
}
function queue(c:ReturnType<typeof fixture>) {
 const t:Trip={id:c.nextId++,homeId:0,storeId:0,phase:'waiting',path:[{x:6,y:3},{x:7,y:3}],progress:0,hold:12,wait:12};
 c.trips.push(t);return t;
}
for(const service of ['ems','police','fire'] as const)test(`${service} dispatch selects weighted bypass, preserves assignment on reload and really works and returns`,()=>{
 const c=fixture(service),q=queue(c);stepIncidents(c,TRAFFIC_TICK);
 const t=c.trips.find(t=>t.service===service)!;assert.ok(t);assert.ok(t.path.some(p=>p.y===5));
 assert.deepEqual(t.path[0],{x:2,y:3});assert.equal(t.incidentId,c.incidents[0].id);
 c.trips=c.trips.filter(t=>t!==q);stepCity(c,.3);
 const loaded=parseCity(JSON.parse(JSON.stringify(c)));assert.ok(loaded);
 assert.deepEqual(loaded.trips,c.trips);assert.deepEqual(loaded.buildings,c.buildings);
 for(let i=0;i<500;i++){stepCity(c,.1);stepCity(loaded,.1);}
 assert.deepEqual(loaded,c);assert.ok(c.incidents[0].completedServices.includes(service));
 assert.ok(!c.trips.some(v=>v.id===t.id),'original vehicle physically returns to station');
 assert.equal(c.incidents[0].completedServices.filter(s=>s===service).length,1);
});
test('response policy admits diversions and clear controlled junctions, but never wrecks or missing roads',()=>{
 const c=fixture();place(c,'signal',3,3);c.closures=[{x:4,y:3}];
 const start={x:2,y:3},goal={x:11,y:3},s=routingSnapshot(c,roadIndex(c),true);
 const r=responseRoute(s,start,c.incidents[0])!;assert.ok(r.path.some(p=>p.x===4&&p.y===3));assert.equal(r.cost.control,0);
 const ordinary=weightedRoute(routingSnapshot(c),start,goal)!;
 assert.ok(ordinary.path.some(p=>p.y===5));assert.ok(ordinary.cost.control>0);
 assert.equal(weightedRoute(s,start,{x:12,y:3}),null);
 c.roads=c.roads.filter(p=>p.x!==4&&p.x!==5);assert.equal(responseRoute(routingSnapshot(c,roadIndex(c),true),start,c.incidents[0]),null);
});
test('response observations include stopped crews, exclude parked work and do not count the querying responder',()=>{
 const c=fixture(),q=queue(c);q.service='fire';q.resume='outbound';
 const path=findPath(c,{x:2,y:3},{x:11,y:3},true)!;
 const s=routingSnapshot(c,roadIndex(c),true);
 assert.equal(routeCost(s,path,EMERGENCY_TILES_PER_SECOND).queue,12);
 assert.equal(routeCost(s,path,EMERGENCY_TILES_PER_SECOND,q.id).queue,0);
 q.sceneParked=true;assert.equal(routeCost(routingSnapshot(c,roadIndex(c),true),path).queue,0);
});
test('optional response reroute retains physical progress and incident while routine returns obey closures',()=>{
 const c=fixture();stepIncidents(c,TRAFFIC_TICK);const t=c.trips[0];queue(c);
 t.nextRouteQueryAt=0;trafficTick(c,roadIndex(c));assert.ok(t.path.some(p=>p.y===5));
 assert.ok(Math.abs(t.progress-EMERGENCY_TILES_PER_SECOND*TRAFFIC_TICK)<1e-9);assert.equal(t.incidentId,c.incidents[0].id);
 // Returning service type alone must not inherit response routing privileges.
 c.closures=[{x:4,y:3}];t.phase='returning';t.target={x:2,y:3};t.path=[{x:11,y:3}];t.progress=0;
 assert.equal(isEmergencyResponse(t),false);retarget(c,t,{x:11,y:3});
 assert.ok(t.path.some(p=>p.y===5));assert.ok(!t.path.some(p=>p.x===4&&p.y===3));
});
test('response-first optional budget reserves civilian progress under repeated due response requests',()=>{
 const c=fixture();c.trips=[];
 // Independent real road corridors avoid occupancy deciding scheduler eligibility.
 c.map={x:0,y:0,width:16,height:24};
 for(let y=6;y<=16;y+=2)for(let x=1;x<=12;x++)c.roads.push({x,y});
 for(let i=0;i<6;i++) {
  const y=6+i*2,service=i<3?(['ems','police','fire'] as const)[i]:undefined;
  c.buildings.push({id:c.nextId++,kind:'store',x:10,y:y-2,rotation:0});
  c.trips.push({id:c.nextId++,homeId:0,storeId:c.buildings.at(-1)!.id,service,stationId:service?c.buildings[0].id:undefined,
   incidentId:service?c.incidents[0].id:undefined,phase:'outbound',path:Array.from({length:11},(_,n)=>({x:n+1,y})),
   progress:0,hold:8,wait:8,nextRouteQueryAt:0,target:{x:11,y}});
 }
 const civilians=c.trips.filter(t=>!t.service),responders=c.trips.filter(t=>t.service);
 trafficTick(c,roadIndex(c));
 assert.equal(responders.filter(t=>t.nextRouteQueryAt!>0).length,2);
 assert.equal(civilians.filter(t=>t.nextRouteQueryAt!>0).length,2);
 for(let n=0;n<100;n++){
  c.elapsed+=TRAFFIC_TICK;for(const t of responders)t.nextRouteQueryAt=0;
  trafficTick(c,roadIndex(c));
 }
 assert.ok(civilians.every(t=>t.nextRouteQueryAt!>0),'all due civilians receive a query despite response pressure');
 assert.ok(civilians.every(t=>t.progress>0),'ordinary traffic still moves');
});
test('weighted reconsideration chooses another legitimate scene approach without changing the incident',()=>{
 const c=fixture();for(const p of [{x:11,y:5},{x:12,y:5},{x:12,y:4}])place(c,'road',p.x,p.y);
 stepIncidents(c,TRAFFIC_TICK);const t=c.trips[0];assert.deepEqual(t.target,{x:11,y:3});
 const q=queue(c);q.path=[{x:10,y:3},{x:11,y:3}];
 t.nextRouteQueryAt=0;trafficTick(c,roadIndex(c));
 assert.deepEqual(t.target,{x:12,y:4});assert.equal(t.incidentId,c.incidents[0].id);
 assert.ok(!t.path.some(p=>p.x===12&&p.y===3));
});
