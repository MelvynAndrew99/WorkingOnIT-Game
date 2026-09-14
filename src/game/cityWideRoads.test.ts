import test from 'node:test';
import assert from 'node:assert/strict';
import { allowsRoadStep, directionSignature } from './cityDirections.ts';
import { wideRoadFootprint, wideRoadTopology, wideRoadPlacementGeometry, parseWideRoads, type WideRoadSection } from './cityWideRoads.ts';
const key=(p:{x:number;y:number})=>`${p.x},${p.y}`;
const corridor=(axis:'horizontal'|'vertical'='horizontal')=>{
 const wideRoads:WideRoadSection[]=Array.from({length:7},(_,i)=>({x:axis==='horizontal'?i:0,y:axis==='vertical'?i:0,axis}));
 return {wideRoads,roads:wideRoads.flatMap(wideRoadFootprint)};
};
test('paired carriageways preserve right-hand directions and close the midblock median',()=>{
 const city=corridor();
 assert.equal(allowsRoadStep(city,{x:3,y:0},{x:2,y:0}),true);
 assert.equal(allowsRoadStep(city,{x:2,y:0},{x:3,y:0}),false);
 assert.equal(allowsRoadStep(city,{x:2,y:1},{x:3,y:1}),true);
 assert.equal(allowsRoadStep(city,{x:3,y:1},{x:2,y:1}),false);
 assert.equal(allowsRoadStep(city,{x:3,y:0},{x:3,y:1}),false);
 assert.equal(allowsRoadStep(city,{x:3,y:1},{x:3,y:0}),false);
 const vertical=corridor('vertical');
 assert.equal(allowsRoadStep(vertical,{x:0,y:2},{x:0,y:3}),true);
 assert.equal(allowsRoadStep(vertical,{x:1,y:2},{x:1,y:3}),false);
});
test('either narrow-end offset has a legal path into each directed carriageway and back',()=>{
 for(const axis of ['horizontal','vertical'] as const)for(const offset of [0,1]) {
  const city=corridor(axis);
  const narrow=axis==='horizontal'?{x:-1,y:offset}:{x:offset,y:-1};city.roads.push(narrow);
  const target=axis==='horizontal'?{x:3,y:1}:{x:0,y:3};
  const connected=(start:typeof target,end:typeof target)=>{const queue=[start],seen=new Set([key(start)]),roads=new Set(city.roads.map(key));for(let i=0;i<queue.length;i++){const p=queue[i];if(key(p)===key(end))return true;for(const n of [{x:p.x-1,y:p.y},{x:p.x+1,y:p.y},{x:p.x,y:p.y-1},{x:p.x,y:p.y+1}])if(!seen.has(key(n))&&allowsRoadStep(city,p,n,roads)){seen.add(key(n));queue.push(n);}}return false;};
  assert.equal(connected(narrow,target),true);assert.equal(connected(target,narrow),true);
 }
});
test('side street creates a shared two-cell junction while neighboring medians remain closed',()=>{
 const city=corridor();city.roads.push({x:3,y:-1});
 const topology=wideRoadTopology(city);
 assert(topology.junctions.some(group=>group.length===2&&group.some(p=>key(p)==='3,0')&&group.some(p=>key(p)==='3,1')));
 assert.equal(allowsRoadStep(city,{x:3,y:0},{x:3,y:1}),true);
 assert.equal(allowsRoadStep(city,{x:2,y:0},{x:2,y:1}),false);
 assert.equal(allowsRoadStep(city,{x:3,y:0},{x:4,y:0}),false);
});
test('wide crossing yields one four-cell junction and directional exits',()=>{
 const city=corridor();for(let y=-3;y<=4;y++){const s:WideRoadSection={x:3,y,axis:'vertical'};city.wideRoads.push(s);for(const p of wideRoadFootprint(s))if(!city.roads.some(q=>key(p)===key(q)))city.roads.push(p);}
 const core=wideRoadTopology(city).junctions.find(g=>g.some(p=>key(p)==='3,0'))!;
 assert.equal(core.length,4);
 assert.equal(allowsRoadStep(city,{x:3,y:0},{x:3,y:-1}),false);
 assert.equal(allowsRoadStep(city,{x:4,y:0},{x:4,y:-1}),true);
});
test('save validation rejects partial or overlapping parallel carriageways, preserves old towns',()=>{
 const city=corridor();const roads=new Set(city.roads.map(key));
 assert.deepEqual(parseWideRoads(city.wideRoads,roads),city.wideRoads);
 assert.equal(parseWideRoads(undefined,roads),undefined);
 assert.equal(parseWideRoads([...city.wideRoads,city.wideRoads[0]],roads),null);
 assert.equal(parseWideRoads([{x:8,y:0,axis:'horizontal'}],roads),null);
 assert.equal(wideRoadPlacementGeometry(city,{x:3,y:1,axis:'horizontal'}).ok,false);
 assert.equal(wideRoadPlacementGeometry(city,{x:3,y:0,axis:'vertical'}).ok,true);
});
test('new side street and changed section metadata invalidate connectivity caches and route signatures',()=>{
 const city=corridor();const before=wideRoadTopology(city),signature=directionSignature(city);
 city.roads.push({x:3,y:-1});assert.notEqual(wideRoadTopology(city),before);
 city.wideRoads=city.wideRoads.slice(1);assert.notEqual(directionSignature(city),signature);
 assert.equal(directionSignature({roads:[]}), '');
});
