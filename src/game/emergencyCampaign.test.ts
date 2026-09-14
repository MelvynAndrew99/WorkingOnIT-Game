import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {parseCity} from './cityModel.ts';
import {createChallenge,stepChallenge,challengeStages,challengePlace,challengeDirections,parseChallenge,CHALLENGES} from './cityChallenges.ts';
import {EMERGENCY_LEVELS,recoveryStreet} from './fixtures/emergencyTown.ts';
import {solveEmergency} from './fixtures/emergencySolutions.ts';
const copy=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
for(const d of EMERGENCY_LEVELS)test(`${d.id}: untouched, two legal solutions, dispatch/arrival/clearance and reload`,()=>{
 const untouched=createChallenge(d.id);assert.ok(parseChallenge(copy(untouched)));stepChallenge(untouched,180);assert.equal(untouched.earned,false);
 for(const alternative of [false,true]){
  const run=createChallenge(d.id);solveEmergency(run,alternative,r=>{
   const saved=parseChallenge(copy(r));assert.ok(saved);assert.deepEqual(saved.emergency,r.emergency);
   const other=parseChallenge(copy(r))!;stepChallenge(saved,.4);for(let i=0;i<4;i++)stepChallenge(other,.1);
   assert.deepEqual(saved.city,other.city);assert.deepEqual(saved.emergency,other.emergency);
  });
  assert.equal(run.earned,false,'construction or recovery controls alone do not award completion');
  stepChallenge(run,3);const reloaded=parseChallenge(copy(run));assert.ok(reloaded);
  const funds=run.city.funds;stepChallenge(run,240);stepChallenge(reloaded,240);
  assert.equal(run.earned,true,JSON.stringify(challengeStages(run)));assert.equal(run.failed,undefined);assert.ok(run.city.funds>=0);assert.equal(run.city.funds,funds);
  assert.deepEqual(reloaded.city,run.city);assert.deepEqual(reloaded.emergency,run.emergency);assert.equal(reloaded.earned,true);
  assert.ok(challengeStages(run).every(s=>s.done));assert.equal(run.city.fatalities,0);assert.equal(run.city.accidentCount,['district-recovery','what-a-jam'].includes(d.id)?2:1,'no additional accidents in the reference solution');
  for(const s of run.emergency!.scenes){assert.deepEqual(new Set(s.dispatched),new Set(s.required));assert.deepEqual(new Set(s.arrived),new Set(s.required));assert.deepEqual(new Set(s.completed),new Set(s.required));assert.ok(s.cleared);}
  const frozen=copy(run);stepChallenge(run,1);assert.deepEqual(run,frozen);assert.ok(parseChallenge(copy(run)));
 }
});
test('placing a disconnected clinic never substitutes for actual EMS arrival',()=>{
 const r=createChallenge('clinic-access');challengePlace(r.city,'hospital',2,14,2,r.id);stepChallenge(r,45);
 assert.equal(r.earned,false);assert.ok(!r.emergency!.scenes[0].arrived.includes('ems'));assert.equal(challengeStages(r)[0].done,false);
});
test('one-way directions and occupied-road reservations remain authoritative',()=>{
 const r=createChallenge('temporary-two-way');stepChallenge(r,4.5);assert.ok(r.city.trips.length>0,'starts with real civilian traffic');
 const before=copy(r.city.roadDirections);assert.equal(challengeDirections(r.city,recoveryStreet,'two-way',r.id).ok,false);assert.deepEqual(r.city.roadDirections,before);
 stepChallenge(r,10);assert.equal(r.emergency!.scenes[0].arrived.length,0,'police cannot travel west against the eastbound street');
 assert.equal(r.earned,false);
});
test('temporary recovery receipts enforce ordering, original flow and post-reopening returns',()=>{
 const r=createChallenge('temporary-two-way'),snapshots:ReturnType<typeof createChallenge>[]=[];r.revision=3;
 solveEmergency(r,false,s=>snapshots.push(copy(s)));
 assert.ok(snapshots.length>=5);
 assert.equal(snapshots[0].emergency!.converted,undefined);
 assert.equal(snapshots[1].emergency!.clearedAt,undefined);
 assert.equal(snapshots[2].emergency!.restored,undefined);
 assert.equal(snapshots[3].emergency!.reopened,undefined);
 const e=r.emergency!;assert.ok(e.diverted!<=e.converted!&&e.converted!<=e.clearedAt!&&e.clearedAt!<=e.restored!&&e.restored!<=e.reopened!);
 assert.equal(e.recovered.length,0);assert.equal(r.earned,false);
 const wrong=parseChallenge(copy(r))!;for(const key of Object.keys(wrong.city.roadDirections!))wrong.city.roadDirections![key]='reverse';stepChallenge(wrong,1);
 assert.equal(challengeStages(wrong).find(s=>s.label.includes('original eastbound'))!.done,false);assert.equal(wrong.earned,false);
 const early=parseChallenge(snapshots[1])!;challengePlace(early.city,'closure',14,8,0,early.id);stepChallenge(early,90);assert.equal(early.earned,false);assert.equal(early.emergency!.restored,undefined);
});
test('malformed emergency receipts cannot create earned stages or silently reset a new attempt',()=>{
 const r=createChallenge('fire-access');
 for(const mutate of [(s:typeof r)=>s.earned=true,(s:typeof r)=>s.emergency!.scenes[0].arrived.push('ems'),(s:typeof r)=>s.emergency!.scenes[0].id=99999,(s:typeof r)=>s.emergency!.original={'0,0>1,0':'forward'},(s:typeof r)=>s.emergency!.reopened=0,(s:typeof r)=>s.emergency!.recovered=[s.city.buildings[0].id]]){
  const s=copy(r);mutate(s);assert.equal(parseChallenge(s),null);
 }
});
test('Level 15 legacy bus run remains parseable for archive; Level 25 is the playable finale',()=>{
 const old=JSON.parse(readFileSync(new URL('../../docs/challenges/levels-6-15/evidence/a-town-that-works.json',import.meta.url),'utf8'));const legacy={...old,earned:true};
 const parsed=parseChallenge(legacy);assert.ok(parsed);assert.equal(parsed.earned,true);assert.equal(parsed.revision,2);assert.equal(parsed.emergency,undefined);assert.deepEqual(parsed.city,parseCity(old.city));assert.deepEqual(parsed.city.roads,old.city.roads);assert.deepEqual(parsed.city.buildings,old.city.buildings);
 assert.equal(CHALLENGES.length,25);assert.equal(CHALLENGES[14].id,'a-town-that-works');assert.equal(createChallenge('a-town-that-works').revision,3);assert.equal(CHALLENGES[24].id,'what-a-jam');
});

test('Level 21 accepts permanent two-way conversion or a bypass with the original arrows',()=>{
 for(const alternative of [false,true]){
  const r=createChallenge('temporary-two-way'),original=copy(r.city.roadDirections);
  assert.equal(r.revision,4);assert.equal(challengeStages(r)[0].done,false);
  solveEmergency(r,alternative);
  assert.ok(challengeStages(r)[0].done);assert.equal(r.earned,false);
  const saved=parseChallenge(copy(r));assert.ok(saved);stepChallenge(saved,180);
  assert.ok(saved.earned);assert.equal(saved.city.closures.length,0);
  assert.equal(saved.emergency!.restored,undefined);assert.equal(saved.emergency!.reopened,undefined);
  if(alternative)assert.deepEqual(saved.city.roadDirections,original);
  else assert.notDeepEqual(saved.city.roadDirections,original);
  assert.ok(saved.emergency!.scenes[0].completed.includes('police'));
  assert.ok(saved.emergency!.recovered.length>0);
 }
});
test('old Level 21 remains readable with its original completion evidence',()=>{
 const raw=JSON.parse(readFileSync(new URL('../../docs/challenges/levels-15-24/evidence/temporary-two-way.json',import.meta.url),'utf8'));
 const saved=parseChallenge(raw);assert.ok(saved);assert.equal(saved.revision,3);assert.deepEqual(saved.emergency,raw.emergency);
});
