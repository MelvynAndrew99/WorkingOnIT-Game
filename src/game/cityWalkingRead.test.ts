import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity} from './cityModel.ts';
import {walkingPath,withWalkingPathRead} from './cityJourneys.ts';
function fixture(){const c=createCity();c.roads=Array.from({length:9},(_,x)=>({x,y:0}));return c;}
test('report walking reads preserve paths, limits, blocked sets and caller ownership',()=>{
 const c=fixture(),a={x:0,y:0},b={x:3,y:0};
 withWalkingPathRead(c,()=>{
  assert.equal(walkingPath(c,a,b,2),null);
  const p=walkingPath(c,a,b,2.5)!;assert.equal(p.length,4);p[0].x=99;p.pop();
  assert.deepEqual(walkingPath(c,a,b,2.5),[{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0}]);
  const blocked=new Set(['1,0']);assert.equal(walkingPath(c,a,b,6,blocked),null);
  blocked.clear();assert.equal(walkingPath(c,a,b,6,blocked)?.length,4);
  assert.equal(withWalkingPathRead(c,()=>walkingPath(c,a,b))?.length,4);
  assert.equal(walkingPath(c,a,{x:8,y:0}),null);
  assert.equal(walkingPath(c,a,{x:8,y:0},8)?.length,9);
 });
});
test('report cache expires on return and exceptions, and isolates cities',()=>{
 const c=fixture(),other=fixture(),a={x:0,y:0},b={x:3,y:0};other.roads.splice(1,1);
 withWalkingPathRead(c,()=>{assert.ok(walkingPath(c,a,b));assert.equal(walkingPath(other,a,b),null);});
 c.roads[1].x=20;
 withWalkingPathRead(c,()=>assert.equal(walkingPath(c,a,b),null));
 c.roads[1].x=1;
 assert.throws(()=>withWalkingPathRead(c,()=>{assert.ok(walkingPath(c,a,b));throw Error('report failed');}));
 c.roads.splice(1,1);assert.equal(walkingPath(c,a,b),null);
 c.roads.push({x:1,y:0});assert.ok(withWalkingPathRead(c,()=>walkingPath(c,a,b)));
});
