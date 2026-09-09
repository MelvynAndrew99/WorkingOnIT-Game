import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCity, place, stepCity, parseCity, TRAFFIC_TICK, COSTS, type City } from './cityModel.ts';
import { createMissionProgress, missionSnapshot, refreshMissions, claimMissionReward } from './cityMissions.ts';

function town(homes = 6, park = true): City {
  const c = createCity();
  c.funds = 10000;
  for (let x = 0; x <= 14; x++) place(c, 'road', x, 6);
  for (let i = 0; i < homes; i++) place(c, 'home', i * 2, 4);
  place(c, 'store', 12, 4);
  if (park) place(c, 'park', 5, 7, 2);
  if (homes === 6) place(c, 'store', 9, 7, 2); // genuine overflow capacity
  assert.equal(c.buildings.filter(b => b.kind === 'home').length, homes);
  return c;
}
function run(c: City, seconds: number): void {
  for (let i = 0; i < Math.round(seconds / TRAFFIC_TICK); i++) stepCity(c, TRAFFIC_TICK);
}
function until(c: City, ready: () => boolean, seconds = 240): void {
  for (let i = 0; i < Math.round(seconds / TRAFFIC_TICK); i++) {
    if (ready()) return;
    stepCity(c, TRAFFIC_TICK);
  }
  assert.ok(ready(), `condition not reached by ${c.elapsed.toFixed(2)} seconds: ${JSON.stringify({missions:c.missions,trips:c.trips.map(t=>({home:t.homeId,phase:t.phase,purpose:t.purpose,hold:t.hold})), households:c.households})}`);
}
function reload(c: City): City {
  const copy = parseCity(JSON.parse(JSON.stringify(c)));
  assert.ok(copy, 'a valid town must load');
  return copy;
}

test('growth arc completes through real distinct shopping and park visits without any accident', () => {
  const c = town();
  until(c, () => missionSnapshot(c).recognition === 4);
  assert.deepEqual(c.missions!.shoppers.length, 6);
  assert.ok(c.missions!.parkVisitors.length >= 3);
  assert.equal(c.accidentCount, 0);
  assert.equal(c.fatalities, 0);
  assert.deepEqual(missionSnapshot(c).items.map(i => i.current), [1, 3, 3, 6]);
  assert.ok(c.completed > 0);
});

test('one household making repeated visits cannot satisfy growth goals or duplicate recognition', () => {
  const c = town(1);
  run(c, 240);
  assert.ok(c.completed > 5, 'the same household really made repeated trips');
  assert.deepEqual(c.missions!.shoppers.length, 1);
  assert.deepEqual(c.missions!.parkVisitors.length, 1);
  assert.equal(missionSnapshot(c).recognition, 1);
  const before = structuredClone(c.missions);
  refreshMissions(c); refreshMissions(c);
  assert.deepEqual(c.missions, before);
});

test('departures, unfinished parked stays and stranded cars do not earn mission credit', () => {
  const c = town(1, false);
  until(c, () => c.trips.some(t => t.phase === 'outbound'));
  assert.equal(missionSnapshot(c).recognition, 0);
  place(c, 'closure', 8, 6);
  run(c, 90);
  assert.ok(c.trips.some(t => t.phase === 'waiting' && t.hold > 10));
  assert.equal(missionSnapshot(c).recognition, 0);
  place(c, 'closure', 8, 6);
  until(c, () => c.trips.some(t => t.phase === 'visiting'));
  assert.equal(missionSnapshot(c).recognition, 0);
  assert.ok(c.trips[0].visitRemaining! > 0);
  until(c, () => missionSnapshot(c).recognition === 1);
});

test('mid-visit and post-credit saves neither pay extra nor duplicate mission completion', () => {
  const c = town(1, false);
  until(c, () => c.trips.some(t => t.phase === 'visiting' && !t.rewarded));
  const copy = reload(c);
  run(c, 60); run(copy, 60);
  assert.deepEqual(copy, c);
  const after = reload(c);
  run(c, 30); run(after, 30);
  assert.deepEqual(after, c);
  assert.equal(c.missions!.completed.length, 1);
  // Current shopping payments are on visit completion, before the return journey finishes.
  const paid = c.completed + c.trips.filter(t => t.rewarded).length;
  assert.equal(c.funds, 10000 - COSTS.home - COSTS.store - 15 * COSTS.road
    + paid * 100 + Math.floor((c.elapsed + 1e-6) / 10) * 20);
});

test('completed jobs and hide/reopen preference persist while demolition cannot raise incomplete progress', () => {
  const c = town(1, false);
  until(c, () => missionSnapshot(c).recognition === 1);
  until(c, () => c.trips.length === 0);
  assert.match(place(c, 'bulldoze', 0, 4), /refund/);
  refreshMissions(c);
  assert.equal(missionSnapshot(c).recognition, 1, 'earned recognition stays earned');
  assert.equal(missionSnapshot(c).items[1].current, 0, 'a demolished home cannot count toward three');
  c.missions!.hidden = true;
  const hidden = reload(c);
  assert.equal(missionSnapshot(hidden).hidden, true);
  hidden.missions!.hidden = false;
  assert.equal(missionSnapshot(reload(hidden)).hidden, false);
});

test('served homes disconnected by edits do not complete the next goal', () => {
  const c = town(2, false);
  until(c, () => c.missions!.shoppers.length === 2);
  place(c, 'closure', 8, 6);
  for (let x = 10; x <= 14; x++) place(c, 'road', x, 2);
  place(c, 'home', 10, 0);
  place(c, 'store', 12, 0);
  // The new eastern household can visit, but the two western households lack current access.
  until(c, () => c.missions!.shoppers.length === 3);
  refreshMissions(c);
  assert.equal(missionSnapshot(c).items[1].done, false);
  assert.equal(missionSnapshot(c).items[1].current, 1);
  place(c, 'closure', 8, 6);
  refreshMissions(c);
  assert.equal(missionSnapshot(c).items[1].done, true);
});

test('foresight and early public services keep recognition and rewards wait for an explicit claim', () => {
  const c = town();
  place(c, 'hospital', 0, 10);
  place(c, 'policeStation', 4, 10);
  place(c, 'fireStation', 8, 10);
  assert.equal(c.buildings.length, 12);
  until(c, () => missionSnapshot(c).recognition === 4);
  const snapshot = missionSnapshot(c);
  assert.equal(snapshot.servicesSpent, COSTS.hospital + COSTS.policeStation + COSTS.fireStation);
  const funds = c.funds;
  refreshMissions(c);
  assert.equal(c.funds, funds, 'refreshing completion does not automatically pay a reward');
  assert.deepEqual(reload(c).missions, c.missions);
});

test('a park objective can complete ahead of shopping suggestions with no efficiency or time gate', () => {
  const c = town(3);
  assert.match(place(c, 'bulldoze', 12, 4), /refund/);
  run(c, 600);
  assert.equal(missionSnapshot(c).items[2].done, true);
  assert.equal(missionSnapshot(c).items[0].done, false);
  assert.equal(c.accidentCount, 0);
});

test('legacy and malformed ancillary mission data preserve the existing town', () => {
  const c = town(1);
  run(c, 20);
  for (const raw of [undefined, null, {}, { version: 99 },
    { ...createMissionProgress(), shoppers: [1, 1] },
    { ...createMissionProgress(), shoppers: [c.nextId] },
    { ...createMissionProgress(), completed: ['bad id'] },
    { ...createMissionProgress(), claimed: ['bad id'] },
    { ...createMissionProgress(), claimed: ['open-for-business', 'open-for-business'] },
    { ...createMissionProgress(), hidden: 'yes' }]) {
    const input = { ...structuredClone(c), missions: raw };
    const loaded = parseCity(input);
    assert.ok(loaded, 'bad optional metadata must not erase a valid town');
    assert.deepEqual(loaded, { ...c, missions: createMissionProgress() });
  }
});


test('completed mission rewards are visible and require exactly one explicit claim, including after reload', () => {
  const city = town();
  until(city, () => missionSnapshot(city).recognition === 4);
  const jobs = missionSnapshot(city).items;
  assert.deepEqual(jobs.map(j => j.reward), [100, 200, 200, 400]);
  assert.ok(jobs.every(j => j.done && !j.claimed));
  const funds = city.funds;
  for (const job of jobs) {
    assert.deepEqual(claimMissionReward(city, job.id), {claimed: true, amount: job.reward, message: `${job.title}: $${job.reward} reward claimed.`});
    assert.equal(claimMissionReward(city, job.id).amount, 0, 'a repeated click cannot pay again');
  }
  assert.equal(city.funds, funds + 900);
  const loaded = reload(city);
  for (const job of jobs) assert.equal(claimMissionReward(loaded, job.id).claimed, false);
  assert.equal(loaded.funds, funds + 900);
  assert.ok(missionSnapshot(loaded).items.every(j => j.claimed));
});

test('unknown and incomplete missions cannot pay, while legitimately completed work survives demolition', () => {
  const city = town(1, false);
  const funds = city.funds;
  assert.equal(claimMissionReward(city, 'not-a-mission').amount, 0);
  assert.equal(claimMissionReward(city, 'open-for-business').amount, 0);
  assert.equal(city.funds, funds);
  until(city, () => missionSnapshot(city).items[0].done);
  until(city, () => city.trips.length === 0);
  assert.match(place(city, 'bulldoze', 0, 4), /refund/);
  const earned = city.funds;
  assert.equal(claimMissionReward(city, 'open-for-business').amount, 100);
  assert.equal(city.funds, earned + 100);
  assert.equal(claimMissionReward(city, 'word-on-the-street').amount, 0);
});

test('old completed missions migrate to a finite unclaimed reward without paying on load', () => {
  const city = town(1, false);
  until(city, () => missionSnapshot(city).items[0].done);
  const raw = JSON.parse(JSON.stringify(city));
  delete raw.missions.claimed;
  raw.missions.completed.push('future-civic-goal');
  const migrated = parseCity(raw);
  assert.ok(migrated);
  assert.equal(migrated.funds, city.funds);
  assert.equal(migrated.missions!.claimed.length, 0);
  assert.ok(migrated.missions!.completed.includes('future-civic-goal'));
  assert.equal(claimMissionReward(migrated, 'future-civic-goal').amount, 0);
  assert.equal(claimMissionReward(migrated, 'open-for-business').amount, 100);
  migrated.missions!.claimed.push('future-civic-goal');
  const saved = reload(migrated);
  assert.deepEqual(saved.missions, migrated.missions, 'valid unknown receipts survive older builds');
  assert.equal(claimMissionReward(saved, 'open-for-business').amount, 0);
  assert.equal(saved.funds, city.funds + 100);
});
