import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import * as before from '/tmp/won-access-baseline/src/game/cityModel.ts';
import * as after from '/home/phil/Code/jams/won/src/game/cityModel.ts';
const raw=JSON.parse(readFileSync('/home/phil/Code/jams/won/docs/performance-integrated/current-town/save.json')).city;
const results=[];
for(const hz of [60,120]){
 const a=before.parseCity(raw),b=after.parseCity(raw);assert.ok(a&&b);let repeats=0;
 for(let i=0;i<hz*3;i++){
  const elapsed=a.elapsed;const clock=a.tickClock;
  before.stepCity(a,1/hz);after.stepCity(b,1/hz);assert.deepEqual(b,a);
  if(clock+(a.elapsed-elapsed)<.025-1e-9)repeats++;
 }
 results.push({hz,frames:hz*3,identicalFullStateFrames:hz*3,framesWithoutTrafficTick:repeats});
}
writeFileSync('/tmp/won-motion-cadence.json',JSON.stringify(results,null,2));console.log(results);
