import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createChallenge,challengePlace,challengeProgress,stepChallenge,parseChallenge} from './cityChallenges.ts';
function connectNeighborhood(r:ReturnType<typeof createChallenge>){
 for(let y=3;y<=11;y++)challengePlace(r.city,'road',6,y,0,r.id);
 for(const y of [3,7,11])for(let x=2;x<6;x++)challengePlace(r.city,'road',x,y,0,r.id);
 for(let x=7;x<=12;x++)challengePlace(r.city,'road',x,7,0,r.id);
}
function crossing(control?:'stop'|'signal'){
 const r=createChallenge('safe-crossing');for(const [x,y]of [[7,6],[8,6],[9,6],[8,5]])challengePlace(r.city,'road',x,y,0,r.id);
 if(control)challengePlace(r.city,control,8,6,0,r.id);return r;
}
test('level 1 wins on arrival before the visit ends or a return is completed',()=>{
 const r=createChallenge('first-road');for(let x=4;x<=9;x++)challengePlace(r.city,'road',x,6,0,r.id);
 stepChallenge(r,60);assert.ok(r.earned);assert.ok(r.city.trips.some(t=>t.phase==='visiting'&&!t.rewarded));assert.equal(r.city.history.length,0);
 assert.ok(challengeProgress(r).seconds<10);const saved=JSON.stringify(r);stepChallenge(r,100);assert.equal(JSON.stringify(r),saved);
});
test('level 2 requires branching roads and all three actual returns within its test clock',()=>{
 const r=createChallenge('neighborhood-roads');assert.deepEqual(r.city.buildings.filter(b=>b.kind==='home').map(b=>b.y),[1,5,9]);
 connectNeighborhood(r);stepChallenge(r,45);assert.ok(r.earned);assert.equal(challengeProgress(r).served,3);assert.ok(challengeProgress(r).seconds<30);assert.equal(r.city.funds,140);
 const failed=createChallenge('neighborhood-roads');stepChallenge(failed,45);assert.equal(failed.failed,'time');assert.equal(failed.earned,false);assert.equal(failed.city.funds,600);
});
test('level 3 cannot win untouched; an unsigned repair really crashes while stops and lights solve it',()=>{
 const untouched=createChallenge('safe-crossing');assert.equal(untouched.city.controls.length,0);stepChallenge(untouched,90);assert.equal(untouched.earned,false);
 const unsafe=crossing();stepChallenge(unsafe,90);assert.equal(unsafe.failed,'accident');assert.equal(unsafe.city.accidentCount,1);assert.equal(unsafe.earned,false);
 for(const control of ['stop','signal']as const){const r=crossing(control);stepChallenge(r,90);assert.ok(r.earned);assert.equal(r.city.accidentCount,0);assert.equal(challengeProgress(r).served,10);}
});
test('timed lesson pause, fixed frames and mid-run reload preserve time and outcome',()=>{
 const a=createChallenge('neighborhood-roads');connectNeighborhood(a);stepChallenge(a,7.013);const b=parseChallenge(JSON.parse(JSON.stringify(a)))!;assert.ok(b);
 const snapshot=JSON.stringify(b);stepChallenge(b,0);assert.equal(JSON.stringify(b),snapshot);
 stepChallenge(a,30);for(let i=0;i<300;i++)stepChallenge(b,.1);assert.deepEqual(b.city,a.city);assert.equal(b.finishedAt,a.finishedAt);assert.ok(b.earned);
});

test('2x playback preserves simulation results and the 45-second deadline',()=>{
 for(const solved of [false,true]){
  const normal=createChallenge('neighborhood-roads');if(solved)connectNeighborhood(normal);
  const fast=parseChallenge(JSON.parse(JSON.stringify(normal)))!;
  let normalFrames=0,fastFrames=0;
  while(!normal.earned&&!normal.failed){stepChallenge(normal,.025);normalFrames++;}
  while(!fast.earned&&!fast.failed){stepChallenge(fast,.025*2);fastFrames++;}
  assert.deepEqual(fast.city,normal.city,'same trips, controls, funds and simulation time');
  assert.deepEqual(challengeProgress(fast),challengeProgress(normal),'score uses game time at either speed');
  assert.equal(fast.failed,normal.failed);assert.equal(fast.earned,normal.earned);
  assert.ok(Math.abs(fastFrames*2-normalFrames)<=1,'twice the simulation per playback frame');
  if(!solved)assert.ok(Math.abs(challengeProgress(fast).seconds-45)<1e-6);
 }
});
