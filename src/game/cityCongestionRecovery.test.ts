import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {parseCity,stepCity} from './cityModel.ts';
import {vehicleDebug} from './cityTraffic.ts';
const raw=JSON.parse(readFileSync(new URL('../../docs/performance-review/supplied-town-hitch/save.json',import.meta.url),'utf8')).city;
function town(){const c=parseCity(structuredClone(raw));assert.ok(c);return c;}

test('blocked mandatory merge records waiting without changing the occupied lane',()=>{
  const c=town(),t=c.trips.find(t=>t.id===34374)!;
  const wait=t.wait,path=structuredClone(t.path),progress=t.progress;
  for(let i=0;i<40;i++)stepCity(c,.025);
  assert.equal(t.hold,1);assert.equal(t.wait,wait+1);
  assert.equal(t.trafficLane,1);assert.equal(t.progress,progress);assert.deepEqual(t.path,path);
  const debug=vehicleDebug(c,t);assert.match(debug.reason,/space to merge/);assert.ok(debug.blockerIds.length);
  assert.ok(parseCity(JSON.parse(JSON.stringify(c))));
});

test('response holds position when its replacement route needs an occupied turn, including reload',()=>{
  let c=town();
  for(let pass=0;pass<2;pass++){
    const t=c.trips.find(t=>t.id===34934)!;const path=structuredClone(t.path),progress=t.progress,wait=t.wait;
    for(let i=0;i<120;i++){stepCity(c,.025);assert.equal(t.progress,progress);assert.deepEqual(t.path,path);}
    assert.ok(t.wait>=wait+3-1e-6);
    const loaded=parseCity(JSON.parse(JSON.stringify(c)));assert.ok(loaded);c=loaded;
  }
});

test('response retries when turn space clears and backs up continuously before rerouting',()=>{
  const c=town(),t=c.trips.find(t=>t.id===34934)!;
  // Clear civilian cars in the isolated fixture while preserving service and bus assignments.
  for(let i=0;i<40;i++)stepCity(c,.025);
  c.trips=c.trips.filter(other=>other.service || other.busId!==undefined);
  let reversed=false,rerouted=false;
  const oldPath=t.path;
  for(let i=0;i<80;i++){
    const old=t.progress;stepCity(c,.025);
    if(t.path===oldPath){assert.ok(Math.abs(t.progress-old)<=.075001);reversed ||= t.progress<old;}
    else {rerouted=true;break;}
  }
  assert.ok(reversed);assert.ok(rerouted);assert.equal(t.incidentId,34929);
  assert.ok(parseCity(JSON.parse(JSON.stringify(c))));
});

test('required merge resumes through a saved lateral transition after its lane clears',()=>{
  let c=town();
  for(let i=0;i<40;i++)stepCity(c,.025);
  c.trips=c.trips.filter(other=>other.service || other.busId!==undefined);
  let merged=false;
  for(let i=0;i<80;i++){
    stepCity(c,.025);
    const t=c.trips.find(t=>t.id===34374)!;
    if(t.laneChange && t.laneChange.shift>0){
      const loaded=parseCity(JSON.parse(JSON.stringify(c)));assert.ok(loaded);c=loaded;
      assert.deepEqual(c.trips.find(t=>t.id===34374)!.laneChange,t.laneChange);
      merged=true;break;
    }
  }
  assert.ok(merged,'police takes the space only once a lateral merge is available');
  for(let i=0;i<20;i++)stepCity(c,.025);
  assert.equal(c.trips.find(t=>t.id===34374)!.trafficLane,0);
});
