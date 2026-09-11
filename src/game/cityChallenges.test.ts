import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createChallenge,challengePlace,challengeSnapshot,parseChallenge,stepChallenge} from './cityChallenges.ts';
import {applyFlowSolution} from './fixtures/flowTown.ts';

test('challenge baseline remains unmet; two alternatives solve the same demand',()=>{
  const base=createChallenge();const saved=JSON.stringify(base);
  const results=[];
  for(const solution of ['baseline','retimed','destinations'] as const){
    const run=parseChallenge(JSON.parse(saved))!;assert.ok(run);
    applyFlowSolution(run.city,solution);stepChallenge(run,240);
    results.push({solution,earned:run.earned,returns:challengeSnapshot(run).returns});
    assert.equal(run.earned,solution!=='baseline');
    assert.equal(run.city.buildings.filter(b=>b.kind==='home').length,9);
    assert.equal(run.city.external?.arrivals,0);
    assert.equal(run.city.accidentCount,0);
  }
  assert.equal(JSON.stringify(base),saved,'source snapshot preserved');
  console.log('Challenge comparisons',results);
});
test('challenge completion survives disruption and parsing; no deleted household solution',()=>{
  const run=createChallenge(),home=run.city.buildings.find(b=>b.kind==='home')!;
  const before=JSON.stringify(run.city);
  challengePlace(run.city,'bulldoze',home.x,home.y);
  challengePlace(run.city,'home',0,0);
  assert.equal(JSON.stringify(run.city),before);
  challengePlace(run.city,'signal',8,6);stepChallenge(run,180);assert.ok(run.earned);
  challengePlace(run.city,'closure',8,6);stepChallenge(run,120);
  const loaded=parseChallenge(JSON.parse(JSON.stringify(run)))!;
  assert.ok(loaded.earned);assert.ok(!challengeSnapshot(loaded).ready);
});
test('challenge fixed ticks preserve outcomes across frames, pause and reload',()=>{
  const a=createChallenge(),b=createChallenge();
  challengePlace(a.city,'signal',8,6);challengePlace(b.city,'signal',8,6);
  stepChallenge(a,30.013);
  for(let i=0;i<300;i++)stepChallenge(b,.1);stepChallenge(b,.013);
  assert.deepEqual(b.city,a.city);assert.equal(b.earned,a.earned);
  const paused=JSON.stringify(a);stepChallenge(a,0);assert.equal(JSON.stringify(a),paused);
  const c=parseChallenge(JSON.parse(paused))!;assert.ok(c);
  stepChallenge(a,90);stepChallenge(c,90);
  assert.deepEqual(c.city,a.city);assert.equal(c.earned,a.earned);
});

test('challenge refunds recover only paid construction; budgets cannot grow by selling inherited assets',()=>{
  const run=createChallenge('first-road');
  challengePlace(run.city,'bulldoze',3,6,0,run.id);assert.equal(run.city.funds,140);
  challengePlace(run.city,'road',3,6,0,run.id);assert.equal(run.city.funds,120);
  challengePlace(run.city,'bulldoze',3,6,0,run.id);assert.equal(run.city.funds,140);
  stepChallenge(run,300);assert.equal(run.city.funds,140);
});
test('legacy FLOW saves retain their identity and earned progress',()=>{
  const old=JSON.parse(JSON.stringify(createChallenge()));delete old.id;old.earned=true;old.city.funds=2345;
  const saved=parseChallenge(old)!;assert.equal(saved.id,'shopping-flow');assert.ok(saved.earned);
  stepChallenge(saved,30);assert.equal(saved.city.funds,2345);
});
