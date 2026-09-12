import assert from 'node:assert/strict';
import {test} from 'node:test';
import {startBlocked,roadIndex} from './cityTraffic.ts';
import {createCity, place, parseCity, stepCity, findPath, plannedRoadPath, isBlocked, previewWideRoadPlacement, COSTS, type City} from './cityModel.ts';
function town(){const c=createCity();c.funds=10000;c.tutorial!.status='complete';for(let x=1;x<=12;x++)assert.match(place(c,'road',x,6),/built/);return c;}
function saved(c:City){const restored=parseCity(JSON.parse(JSON.stringify(c)));assert.ok(restored,'valid in-progress work must reload');return restored;}
test('widening charges only extra land, closes responders too, and finishes after three simulation seconds',()=>{
 let c=town();const funds=c.funds,roads=structuredClone(c.roads);
 assert.match(place(c,'wideRoad',5,6),/widening started/);assert.equal(c.funds,funds-COSTS.road);assert.deepEqual(c.roads,roads);
 assert.equal(isBlocked(c,{x:5,y:6},true),true);assert.equal(findPath(c,{x:1,y:6},{x:12,y:6},true),null);assert.ok(plannedRoadPath(c,{x:1,y:6},{x:12,y:6}));
 stepCity(c,1);c=saved(c);assert.equal(c.wideRoadWorks![0].remaining,2);stepCity(c,1.999);assert.equal(c.wideRoads,undefined);
 stepCity(c,.001);assert.equal(c.wideRoadWorks,undefined);assert.equal(c.wideRoads!.length,1);assert.equal(c.roads.length,roads.length+1);assert.ok(findPath(c,{x:1,y:6},{x:12,y:6}));assert.equal(c.funds,funds-COSTS.road);saved(c);
});
test('cancellation has bounded restoration, refunds once, and preserves independent Divert',()=>{
 let c=town();place(c,'closure',5,6);const before=c.funds;
 place(c,'wideRoad',5,6);stepCity(c,.5);assert.match(place(c,'bulldoze',5,6),/Making the road safe/);assert.equal(c.funds,before-COSTS.road);
 c=saved(c);stepCity(c,1);assert.equal(c.wideRoadWorks,undefined);assert.equal(c.wideRoads,undefined);assert.equal(c.funds,before);assert.deepEqual(c.closures,[{x:5,y:6}]);stepCity(c,.5);assert.equal(c.funds,before);
});
test('simultaneous adjacent widening orders conserve costs and finish identically across timestep sizes',()=>{
 const c=town();for(let x=4;x<=8;x++)assert.match(place(c,'wideRoad',x,6),/widening started/);
 const a=saved(c),b=saved(c);stepCity(a,4);for(let i=0;i<160;i++)stepCity(b,.025);
 const stable=(c:City)=>JSON.parse(JSON.stringify(c,(_key,value)=>typeof value==='number'?Math.round(value*1e6)/1e6:value));
 assert.deepEqual(stable(a),stable(b));assert.equal(a.wideRoads!.length,5);assert.equal(a.wideRoadWorks,undefined);saved(a);
});
test('work footprint rejects buildings, extra construction, duplicate orders and occupied approaches without mutations',()=>{
 const c=town();assert.match(place(c,'home',5,7),/built/);const before=JSON.stringify(c);assert.equal(previewWideRoadPlacement(c,5,6).ok,false);place(c,'wideRoad',5,6);assert.equal(JSON.stringify(c),before);
 const d=town();d.trips=[{id:1,homeId:0,storeId:0,path:[{x:4,y:6},{x:5,y:6}],progress:0,wait:0,hold:0}];d.nextId=2;
 const occupied=JSON.stringify(d);assert.match(place(d,'wideRoad',5,6),/Traffic must clear/);assert.equal(JSON.stringify(d),occupied);
 d.trips=[];place(d,'wideRoad',5,6);const working=JSON.stringify(d);place(d,'wideRoad',5,6);place(d,'road',5,7);assert.equal(JSON.stringify(d),working);
});
test('malformed work geometry, paid amounts, overlapping orders and timers reject the save',()=>{
 const c=town();place(c,'wideRoad',5,6);saved(c);
 for(const change of [(r:City)=>r.wideRoadWorks![0].paid++, (r:City)=>r.wideRoadWorks![0].remaining=0,(r:City)=>r.wideRoadWorks![0].remaining=4,(r:City)=>r.wideRoadWorks![0].section.x=99,(r:City)=>r.wideRoadWorks!.push(structuredClone(r.wideRoadWorks![0]))]){const raw=structuredClone(c);change(raw);assert.equal(parseCity(raw),null);}
});

test('new departures cannot reserve a connected junction across a work closure',()=>{
 const c=town();for(let x=1;x<=12;x++)place(c,'road',x,5);
 place(c,'wideRoad',7,6);
 const path=Array.from({length:10},(_,i)=>({x:i+2,y:6}));
 assert.equal(startBlocked(c,roadIndex(c),path),true);
 assert.equal(startBlocked(c,roadIndex(c),path,true),true);
 saved(c);
});
