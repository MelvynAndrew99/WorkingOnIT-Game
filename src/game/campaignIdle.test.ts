import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CHALLENGES,challengeAvailable,createChallenge,parseChallenge,stepChallenge} from './cityChallenges.ts';

// Functional mission check: smoother traffic must not solve an untouched puzzle.
// Split the observation across a reload to cover saved progress as well as a fresh run.
for(const [index,definition] of CHALLENGES.entries()){
  if(!challengeAvailable(definition.id))continue;
  test(`Level ${index+1}: pressing Play alone cannot earn the award, including after reload`,()=>{
    const run=createChallenge(definition.id);
    stepChallenge(run,300);
    assert.equal(run.earned,false,'untouched starting map must need player intervention');
    const restored=parseChallenge(JSON.parse(JSON.stringify(run)));
    assert.ok(restored,'untouched attempt must remain reloadable');
    stepChallenge(restored,300);
    assert.equal(restored.earned,false,'waiting after reload must not bypass the puzzle');
  });
}
