import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,findPath,blockedTiles,type City,type Point} from './cityModel.ts';
const key=(p:Point)=>`${p.x},${p.y}`;
// Original independent breadth-first reference, including directed escape from a blocked start.
function reference(city:City,start:Point,end:Point,responding=false,avoid=new Set<string>()):Point[]|null {
 const roads=new Set(city.roads.map(key)),blocked=blockedTiles(city,responding);
 if(!roads.has(key(start))||!roads.has(key(end)))return null;
 for(const p of avoid)if(p!==key(start))blocked.add(p);
 if(blocked.has(key(end)))return null;
 const queue=[start],previous=new Map<string,Point|null>([[key(start),null]]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(key(p)===key(end)){const result:Point[]=[];let at:Point|null=p;while(at){result.push({...at});at=previous.get(key(at))??null;}return result.reverse();}
  for(const n of [{x:p.x+1,y:p.y},{x:p.x,y:p.y+1},{x:p.x-1,y:p.y},{x:p.x,y:p.y-1}])if(roads.has(key(n))&&!blocked.has(key(n))&&!previous.has(key(n))){previous.set(key(n),p);queue.push(n);}
 }
 return null;
}
function town(){const c=createCity();c.roads=[];c.closures=[];c.incidents=[];for(let x=-4;x<6;x++)for(let y=-4;y<6;y++)c.roads.push({x,y});return c;}
test('cached paths reproduce BFS tie order, isolated roads, diversions, incident blocks and avoid sets',()=>{
 const c=town();c.closures=[{x:0,y:0},{x:1,y:0}];
 c.incidents=[{id:1,x:0,y:1,status:'active',severity:'minor',required:['police'],completedServices:[],createdAt:0,rescueDeadline:null,outcome:'none'}];
 c.roads.push({x:20,y:20});
 const points=[...c.roads.filter((_,i)=>i%5===0),{x:0,y:0},{x:0,y:1},{x:99,y:99}];
 for(const responding of [false,true])for(const start of points)for(const end of points)for(const avoid of [new Set<string>(),new Set(['-1,0','0,-1'])]){
  assert.deepEqual(findPath(c,start,end,responding,avoid),reference(c,start,end,responding,avoid));
 }
});
test('road cache invalidates on in-place edits, same-count replacement, closures and incident clearance',()=>{
 const c=town(),start={x:-4,y:0},end={x:5,y:0};
 const check=()=>{for(const response of [false,true])assert.deepEqual(findPath(c,start,end,response),reference(c,start,end,response));};
 check();c.roads.find(p=>p.x===0&&p.y===0)!.y=10;check();
 c.roads=c.roads.map(p=>p.x===1&&p.y===0?{x:1,y:10}:p);check();
 c.closures.push({x:-3,y:0});check();c.closures[0].y=1;check();
 c.incidents=[{id:1,x:-2,y:0,status:'active',severity:'minor',required:['police'],completedServices:[],createdAt:0,rescueDeadline:null,outcome:'none'}];check();
 c.incidents[0].status='cleared';check();c.closures=[];check();
});
test('cached paths remain isolated from caller mutation, other cities and tree eviction',()=>{
 const c=town(),start={x:-4,y:-4},end={x:5,y:5};
 const path=findPath(c,start,end)!;path[0].x=500;path.pop();
 for(const p of c.roads)assert.deepEqual(findPath(c,p,end),reference(c,p,end));
 assert.deepEqual(findPath(c,start,end),reference(c,start,end));
 const other=town();other.roads=other.roads.filter(p=>p.x!==0);
 assert.equal(findPath(other,start,end),null);assert.deepEqual(findPath(c,start,end),reference(c,start,end));
});

test('planning through temporary blocks does not poison ordinary or emergency routes',async()=>{
 const {plannedRoadPath}=await import('./cityModel.ts');
 const {withRoadPathRead}=await import('./cityPathfinding.ts');
 const c=town();c.roads=c.roads.filter(p=>p.y===0);c.closures=[{x:0,y:0}];
 const start={x:-4,y:0},end={x:5,y:0},clear={...c,closures:[],incidents:[]};
 withRoadPathRead(c,()=>{
  assert.deepEqual(plannedRoadPath(c,start,end),reference(clear,start,end));
  assert.equal(findPath(c,start,end),null);
  assert.deepEqual(findPath(c,start,end,true),reference(c,start,end,true));
 });
 assert.throws(()=>withRoadPathRead(c,()=>{findPath(c,start,end);throw Error('interrupted report');}));
 c.closures=[];
 assert.deepEqual(findPath(c,start,end),reference(c,start,end),'scope is released after an exception');
});
