import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createCity,parseCity,stepCity,type Trip} from './cityModel.ts';
import {roadEdgeKey,roadDirectionForStep} from './cityDirections.ts';
import {roadIndex,trafficTick} from './cityTraffic.ts';
function fixture(){const c=createCity();c.roads=[{x:0,y:0},{x:2,y:0}];c.buildings=[];c.incidents=[];c.closures=[];c.controls=[];delete c.wideRoads;delete c.roadDirections;
 const t:Trip={id:100,homeId:0,storeId:0,path:[{x:0,y:0}],progress:0,phase:'waiting',resume:'outbound',target:{x:2,y:0},hold:0,wait:0};c.trips=[t];return {c,t};}
function tick(c:ReturnType<typeof createCity>){c.elapsed+=.025;trafficTick(c,roadIndex(c));}
test('failed route retries on the first tick after a missing road is built',()=>{
 const {c,t}=fixture();for(let i=0;i<10;i++)tick(c);assert.equal(t.phase,'waiting');assert.equal(t.hold,.25);
 c.roads.push({x:1,y:0});tick(c);assert.equal(t.phase,'outbound');assert.ok(t.progress>0);
});
test('failed route reacts to same-length coordinate edits and a changed destination',()=>{
 const {c,t}=fixture();c.roads.push({x:1,y:1});tick(c);tick(c);assert.equal(t.phase,'waiting');
 c.roads[2].y=0;tick(c);assert.equal(t.phase,'outbound');
 const other=fixture();tick(other.c);tick(other.c);other.t.target={x:0,y:0};tick(other.c);assert.notEqual(other.t.phase,'waiting');
});
test('closure removal invalidates failed route without a retry timer',()=>{
 const {c,t}=fixture();c.roads.push({x:1,y:0});c.closures=[{x:1,y:0}];tick(c);tick(c);assert.equal(t.phase,'waiting');
 c.closures=[];tick(c);assert.equal(t.phase,'outbound');
});
test('opening a route does not let a vehicle drive through an occupied lane',()=>{
 const {c,t}=fixture();tick(c);tick(c);c.roads.push({x:1,y:0});
 c.trips.push({id:101,homeId:0,storeId:0,path:[{x:1,y:0}],progress:0,phase:'waiting',wait:0,hold:0});
 for(let i=0;i<40;i++)tick(c);assert.equal(t.phase,'outbound');assert.ok(t.progress<=.5);
 c.trips=c.trips.filter(t=>t.id!==101);tick(c);assert.ok(t.progress>.5);
});

test('incident clearance and in-place one-way reversal invalidate failed access',()=>{
 const {c,t}=fixture();c.roads.push({x:1,y:0});
 c.incidents=[{id:200,x:1,y:0,severity:'minor',status:'active',createdAt:0,required:['police'],completedServices:[],rescueDeadline:null,outcome:'none'}];
 tick(c);tick(c);assert.equal(t.phase,'waiting');c.incidents[0].status='cleared';tick(c);assert.equal(t.phase,'outbound');
 const other=fixture();other.c.roads.push({x:1,y:0});const a={x:0,y:0},b={x:1,y:0};
 other.c.roadDirections={[roadEdgeKey(a,b)]:roadDirectionForStep(b,a)};
 tick(other.c);tick(other.c);assert.equal(other.t.phase,'waiting');
 other.c.roadDirections[roadEdgeKey(a,b)]=roadDirectionForStep(a,b);tick(other.c);assert.equal(other.t.phase,'outbound');
});

test('saved supplied town resumes identically with a fresh failure cache',()=>{
 const raw=JSON.parse(readFileSync(new URL('../../docs/performance-review/supplied-town-hitch/save.json',import.meta.url),'utf8')).city;
 const c=parseCity(raw)!;assert.ok(c);for(let i=0;i<4;i++)stepCity(c,.025);
 const loaded=parseCity(JSON.parse(JSON.stringify(c)))!;assert.ok(loaded);
 for(let i=0;i<20;i++){stepCity(c,.025);stepCity(loaded,.025);assert.deepEqual(loaded,c);}
});
