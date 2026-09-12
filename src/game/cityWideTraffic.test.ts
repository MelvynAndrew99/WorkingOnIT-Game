import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity, type City, type Point, type Trip} from './cityModel.ts';
import {roadIndex, secondLaneAvailable, trafficTick, TRAFFIC_TICK, bodyTile, controlAt, placeControl, startBlocked, validRoadDirectionCommitments} from './cityTraffic.ts';

function wide():City {
  const c=createCity();c.funds=10000;c.roads=[];c.wideRoads=[];
  for(let x=2;x<=12;x++){c.wideRoads.push({x,y:5,axis:'horizontal'});c.roads.push({x,y:5},{x,y:6});}
  return c;
}
const line=(from:number,to:number,y:number):Point[]=>Array.from({length:Math.abs(to-from)+1},(_,i)=>({x:from+i*Math.sign(to-from),y}));
const car=(id:number,path:Point[],progress=0,trafficLane:0|1=0):Trip=>({id,path,progress,trafficLane,homeId:0,storeId:0,wait:0,hold:0});
function run(c:City,seconds:number,watch?:()=>void){for(let i=0;i<seconds/TRAFFIC_TICK;i++){c.elapsed+=TRAFFIC_TICK;trafficTick(c,roadIndex(c));watch?.();}}

test('wide straight has two physical lanes each way and no midblock junctions',()=>{
  const c=wide(),index=roadIndex(c);
  for(let x=3;x<12;x++)for(const y of [5,6])assert.equal(index.junctions.has(`${x},${y}`),false);
  assert.equal(secondLaneAvailable(index,line(3,11,6),3),true);
  assert.equal(secondLaneAvailable(index,line(11,3,5),3),true);
  assert.equal(secondLaneAvailable(index,line(11,3,6),3),false);
  c.trips=[car(1,line(3,11,6),1,0),car(2,line(3,11,6),1,1),car(3,line(11,3,5),1,0),car(4,line(11,3,5),1,1)];
  assert.equal(validRoadDirectionCommitments(c),true);
  run(c,1);assert.ok(c.trips.every(t=>t.progress>2));
});

test('both lanes merge physically before a narrow exit and both queues finish',()=>{
  const c=wide();c.roads.push({x:13,y:6},{x:14,y:6},{x:15,y:6});
  const path=line(3,15,6);c.trips=[car(1,path,4,0),car(2,path,4,1)];
  let sawMerge=false;
  run(c,12,()=>{
    sawMerge ||= c.trips.some(t=>t.laneChange?.to===0);
    for(const t of c.trips)if(t.path[bodyTile(t)].x>=13)assert.equal(t.trafficLane??0,0);
    if(c.trips.length===2){const[a,b]=c.trips;assert.ok(bodyTile(a)!==bodyTile(b)||(a.trafficLane??0)!==(b.trafficLane??0));}
  });
  assert.equal(sawMerge,true);assert.equal(c.completed,2);
});

test('wide crossing shares control and reserves the far exit before entering either half',()=>{
  const c=wide();for(const y of [2,3,4,7,8,9])c.roads.push({x:7,y});
  const index=roadIndex(c);assert.equal(index.areas.get('7,5'),index.areas.get('7,6'));
  placeControl(c,'signal',{x:7,y:6});assert.equal(controlAt(c,{x:7,y:5}),c.controls[0]);
  const crossing=Array.from({length:8},(_,i)=>({x:7,y:2+i}));
  c.trips=[car(1,crossing,2.5),{...car(3,[{x:7,y:7},{x:7,y:8}]),phase:'bus-dwell',busId:99}];
  run(c,.5);assert.equal(c.trips[0].progress,2.5,'no entry when the far-side exit is blocked');
  c.trips.splice(1);run(c,3);assert.equal(c.completed,1);
});

test('a turn owns the shared junction even when another entry touches a different tile',()=>{
  const c=wide();for(const y of [3,4,7,8])c.roads.push({x:7,y});
  const turning=[{x:5,y:6},{x:6,y:6},{x:7,y:6},{x:7,y:5},{x:7,y:4},{x:7,y:3}];
  c.trips=[car(1,turning,2)];
  assert.equal(startBlocked(c,roadIndex(c),[{x:7,y:5},{x:8,y:5},{x:9,y:5}]),true);
});

test('a stopped curb bus can be passed by a car using the second lane',()=>{
  const c=wide();
  c.trips=[{...car(99,line(3,11,6),3),phase:'bus-dwell',busId:99},car(1,line(3,11,6),2)];
  let passed=false;run(c,3,()=>{const t=c.trips.find(t=>t.id===1);if(t&&t.progress>3&&t.trafficLane===1)passed=true;});
  assert.equal(passed,true);assert.equal(c.trips.find(t=>t.id===99)!.progress,3);
});
