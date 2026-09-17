import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {parseCity,stepCity} from './cityModel.ts';
import {debugVehicles,isYielding,roadIndex,vehicleDebug} from './cityTraffic.ts';
function town(){const c=parseCity(JSON.parse(readFileSync(new URL('./fixtures/police-junction-jam.json',import.meta.url),'utf8')).city);assert.ok(c);return c;}
test('batched occupancy inspection agrees with fresh reads and never mutates reservations',()=>{
 const c=town();
 for(let i=0;i<80;i++){
  const before=structuredClone(c),index=roadIndex(c);
  assert.deepEqual(debugVehicles(c),c.trips.map(t=>vehicleDebug(c,t,index)));
  assert.deepEqual(c,before);
  stepCity(c,.025);
 }
});
test('yield reads observe a blocker leaving and reappearing without a stale grid',()=>{
 const c=town(),ems=c.trips.find(t=>t.id===8007)!,blocker=c.trips.find(t=>t.id===7994)!,index=roadIndex(c);
 assert.equal(isYielding(c,ems,index),false);
 c.trips=c.trips.filter(t=>t!==blocker);assert.equal(isYielding(c,ems,index),true);
 c.trips.push(blocker);assert.equal(isYielding(c,ems,index),false);
});
