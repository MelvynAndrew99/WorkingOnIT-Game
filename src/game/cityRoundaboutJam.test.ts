import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {parseCity,stepCity,entrance,type Trip} from './cityModel.ts';
import {bodyTile,validRoadDirectionCommitments,vehicleDebug} from './cityTraffic.ts';
import {patrolRoute,insidePatrol} from './cityPatrols.ts';
import {roundaboutIndex} from './cityRoundabouts.ts';
import {allowsRoadStep} from './cityDirections.ts';
const fixture=()=>{
 const c=parseCity(JSON.parse(readFileSync(new URL('../../docs/transit-and-one-way/roundabout-jam/original-save.json',import.meta.url),'utf8')).city);
 assert.ok(c);return c;
};
const key=(p:{x:number;y:number})=>`${p.x},${p.y}`;
function position(t:Trip){const k=Math.floor(t.progress),a=t.path[k],b=t.path[Math.min(k+1,t.path.length-1)],f=t.progress-k;return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};}
test('captured roundabout jam clears through physical patrol return with reload during recovery',()=>{
 let c=fixture();const initial=c.completed,accidents=c.accidentCount,fatalities=c.fatalities;
 const geometry=JSON.stringify({roads:c.roads,buildings:c.buildings.map(({patrolReadyAt,...b})=>b),directions:c.roadDirections,paid:c.roadPaid,wide:c.wideRoads});
 const policeHome=entrance(c.buildings.find(b=>b.id===33)!);
 const originalIds=[21481,21515,21528,21548,21552,21555,21598,21605];
 assert.ok(vehicleDebug(c,c.trips.find(t=>t.id===21515)!).blockerIds.includes(21548));
 const completed=new Set<number>();let leftPatrol=false,returnedAt=0,carAt=0;
 for(let tick=0;tick<4800;tick++){
  const police=c.trips.find(t=>t.id===21548),before=police&&position(police);
  const prior=new Map(c.trips.filter(t=>originalIds.includes(t.id)).map(t=>[t.id,{position:position(t),end:t.path.at(-1)!}]));
  stepCity(c,.025);
  const current=c.trips.find(t=>t.id===21548);
  if(current)for(let i=1;i<current.path.length;i++)assert.ok(allowsRoadStep(c,current.path[i-1],current.path[i]),'police return follows every one-way connection');
  if(current&&before){const after=position(current);assert.ok(Math.abs(after.x-before.x)+Math.abs(after.y-before.y)<=.050001,'no teleport during reversal or route change');}
  if(current?.patrolReturningHome){leftPatrol=true;assert.equal(current.patrol,true);assert.equal(current.phase,'returning');assert.deepEqual(current.target,policeHome);}
  if(police&&!current){returnedAt=(tick+1)*.025;assert.ok(before&&Math.abs(before.x-policeHome.x)+Math.abs(before.y-policeHome.y)<=.050001,'same police car reaches its station');}
  for(const [id,last]of prior)if(!c.trips.some(t=>t.id===id)){
   assert.ok(Math.abs(last.position.x-last.end.x)+Math.abs(last.position.y-last.end.y)<=.050001,'original vehicle physically reaches its destination');
   assert.ok(!completed.has(id));completed.add(id);if(id===21515)carAt=(tick+1)*.025;
  }
  if(tick===2||tick===20||tick===2399){
   assert.ok(validRoadDirectionCommitments(c));const trips=structuredClone(c.trips);
   const loaded=parseCity(JSON.parse(JSON.stringify(c)));assert.ok(loaded);assert.deepEqual(loaded.trips,trips);c=loaded;
  }
 }
 assert.ok(leftPatrol);assert.ok(returnedAt>0&&returnedAt<25);assert.ok(carAt>0&&carAt<10);
 assert.deepEqual([...completed].sort(),[...originalIds].sort());assert.ok(c.completed>initial);
 assert.equal(c.accidentCount,accidents);assert.equal(c.fatalities,fatalities);
 assert.equal(JSON.stringify({roads:c.roads,buildings:c.buildings.map(({patrolReadyAt,...b})=>b),directions:c.roadDirections,paid:c.roadPaid,wide:c.wideRoads}),geometry);
 assert.ok(parseCity(JSON.parse(JSON.stringify(c))));
});
test('all patrol endpoint choices avoid a U-turn immediately outside the ring and retain the patrol radius',()=>{
 const c=fixture(),station=c.buildings.find(b=>b.id===33)!,index=roundaboutIndex(c);
 for(let choice=0;choice<100;choice++){
  c.nextId++;const path=patrolRoute(c,station);assert.ok(path);assert.ok(path.every(p=>insidePatrol(station,p)));
  assert.deepEqual(path.at(-1),entrance(station));
  for(let i=1;i<path.length-1;i++)assert.ok(!(key(path[i-1])===key(path[i+1])&&index.byTile.has(key(path[i-1]))&&!index.byTile.has(key(path[i]))),'optional turnaround does not block a ring exit');
 }
});
test('old patrol retains its position and assignment when no alternative return exists',()=>{
 const c=fixture();c.closures.push({x:7,y:4});
 const police=c.trips.find(t=>t.id===21548)!;const before={path:structuredClone(police.path),progress:police.progress};
 for(let n=0;n<80;n++)stepCity(c,.025);
 assert.equal(police.patrol,true);assert.equal(police.progress,before.progress);assert.deepEqual(police.path,before.path);
 assert.deepEqual(police.path[bodyTile(police)],{x:8,y:4});assert.ok(parseCity(JSON.parse(JSON.stringify(c))));
});
test('saved patrol return intent cannot be attached to a civilian or emergency response',()=>{
 const c=fixture(),police=c.trips.find(t=>t.id===21548)!;
 police.patrolReturningHome=true;assert.ok(parseCity(JSON.parse(JSON.stringify(c))));
 for(const patch of [{patrolReturningHome:false},{patrol:undefined},{phase:'outbound'}]){
  const raw=JSON.parse(JSON.stringify(c));Object.assign(raw.trips.find((t:Trip)=>t.id===21548),patch);
  assert.equal(parseCity(raw),null);
 }
});
