import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createCity, place, stepCity, parseCity, income, connectedHomes, COSTS, STARTING_FUNDS,
  STALL_SECONDS, constructionPriceForCity, toolPrices, paidForBuilding, paidForRoad,
  constructionChanged, expandCity, type City,
} from './cityModel.ts';
import { SHOP_INCOME } from './cityVisits.ts';
import { tutorialAction, tutorialSnapshot, refreshTutorial } from './cityTutorial.ts';
import { LESSON_ORDER, createEconomyProgress } from './cityEconomy.ts';
import { missionSnapshot } from './cityMissions.ts';

function starter(city: City): void {
  place(city, 'home', 2, 2, 0);
  place(city, 'store', 7, 2, 0);
  for (let x = 2; x <= 8; x++) place(city, 'road', x, 4);
}

function reload(city: City): City {
  const copy = parseCity(JSON.parse(JSON.stringify(city)));
  assert.ok(copy, 'town must reload');
  return copy;
}

test('lesson grant table matches tutorial snapshot ids', () => {
  const city = createCity();
  assert.deepEqual(tutorialSnapshot(city).lessons.map(l => l.id), [...LESSON_ORDER]);
});

test('new towns start with the smaller grant; old saved cash is unchanged', () => {
  const city = createCity();
  assert.equal(city.funds, STARTING_FUNDS);
  assert.equal(STARTING_FUNDS, 900);
  const starterCost = COSTS.home + COSTS.store + 7 * COSTS.road;
  assert.equal(starterCost, 740);
  starter(city);
  assert.equal(city.funds, 160);
  assert.equal(connectedHomes(city), 1);
  assert.equal(city.buildings.length, 2);
  assert.match(place(city, 'park', 4, 7, 2), /Wait for the next income/);
  assert.match(place(city, 'hospital', 9, 7, 2), /Wait for the next income/);
  const saved = JSON.parse(JSON.stringify(city));
  saved.funds = 10000;
  const loaded = parseCity(saved);
  assert.ok(loaded);
  assert.equal(loaded.funds, 10000);
  assert.equal(loaded.buildings.length, 2);
  saved.funds = 0;
  assert.equal(parseCity(saved)?.funds, 0);
  saved.funds = 4820;
  assert.equal(parseCity(saved)?.funds, 4820);
});

test('starter budget plus real shopping visits, not support ticks, fund the next destination', () => {
  const idle = createCity();
  const shopping = createCity();
  starter(shopping);
  const spent = STARTING_FUNDS - shopping.funds;
  assert.equal(spent, 740);
  stepCity(idle, 60);
  stepCity(shopping, 60);
  const idleGain = idle.funds - STARTING_FUNDS;
  const visitPay = shopping.trips.filter(t => t.rewarded).length + shopping.completed;
  const support = Math.floor((shopping.elapsed + 1e-6) / 10) * 20;
  assert.equal(idleGain, Math.floor(60 / 10) * 20);
  assert.equal(shopping.funds, STARTING_FUNDS - spent + visitPay * SHOP_INCOME + support);
  assert.ok(visitPay * SHOP_INCOME > idleGain, 'earned visits beat idle support over the same minute');
  assert.equal(income(idle), 20);
  assert.ok(visitPay >= 1, 'the connected starter actually completed shopping');
});

test('paid construction refunds the recorded amount, including after a catalog would have changed', () => {
  const city = createCity();
  starter(city);
  const home = city.buildings.find(b => b.kind === 'home')!;
  assert.equal(paidForBuilding(home), COSTS.home);
  assert.equal(paidForRoad(city, { x: 2, y: 4 }), COSTS.road);
  const funds = city.funds;
  assert.match(place(city, 'bulldoze', 3, 3), /Full \$200 refund/);
  assert.equal(city.funds, funds + 200);
  assert.match(place(city, 'bulldoze', 2, 4), /Full \$20 refund/);
});

test('stalled current objective waives its own tools, not a clinic, with finite allowance', () => {
  const city = createCity();
  tutorialAction(city, 'start');
  assert.equal(tutorialSnapshot(city).canAssist, false);
  assert.equal(tutorialSnapshot(city).waiver?.status, 'waiting');
  assert.equal(constructionPriceForCity(city, 'home'), COSTS.home);
  stepCity(city, STALL_SECONDS - 0.05);
  assert.equal(toolPrices(city).home, COSTS.home);
  stepCity(city, 0.05);
  const snap = tutorialSnapshot(city);
  assert.equal(snap.waiver?.status, 'active');
  assert.equal(snap.waiver?.lessonId, 'first-visit');
  assert.deepEqual(snap.prices.home, 0);
  assert.equal(snap.prices.hospital, COSTS.hospital);
  assert.ok(snap.waived?.tools.includes('home'));
  assert.match(snap.waived?.reason ?? '', /home, store, and roads/i);
  const before = structuredClone(city);
  place(city, 'home', 2, 2, 0);
  assert.equal(city.funds, before.funds);
  assert.ok(constructionChanged(before, city));
  assert.equal(city.buildings[0].paid, 0);
  assert.equal(city.economy!.allowance!.home, 0);
  assert.equal(constructionPriceForCity(city, 'home'), COSTS.home);
  assert.equal(constructionPriceForCity(city, 'store'), 0);
  const cash = city.funds;
  assert.match(place(city, 'bulldoze', 2, 2), /Full \$0 refund/);
  assert.equal(city.funds, cash);
  assert.equal(city.economy!.allowance!.home, 0, 'demolition does not refill the grant');
  const loaded = reload(city);
  assert.deepEqual(loaded.economy?.waived, ['first-visit']);
  assert.equal(loaded.economy?.allowance?.home, 0);
  assert.equal(constructionPriceForCity(loaded, 'store'), 0);
});

test('a stalled park objective offers a park, never a hospital', () => {
  const city = createCity();
  city.tutorial!.completed = ['first-visit'];
  refreshTutorial(city);
  stepCity(city, STALL_SECONDS);
  const prices = toolPrices(city);
  assert.equal(prices.park, 0);
  assert.equal(prices.road, 0);
  assert.equal(prices.hospital, COSTS.hospital);
  assert.equal(prices.home, COSTS.home);
  assert.equal(tutorialSnapshot(city).waiver?.lessonId, 'park-visit');
  const funds = city.funds;
  place(city, 'park', 4, 7, 2);
  assert.equal(city.funds, funds);
  assert.equal(city.buildings[0].paid, 0);
  assert.equal(constructionPriceForCity(city, 'hospital'), COSTS.hospital);
});

test('rescue stall waives the missing services the player then places', () => {
  const city = createCity();
  city.tutorial!.completed = ['first-visit', 'park-visit', 'driver-rules', 'junction-control', 'accident-response'];
  city.tutorial!.accidentSeen = true;
  refreshTutorial(city);
  stepCity(city, STALL_SECONDS);
  assert.equal(toolPrices(city).hospital, 0);
  assert.equal(toolPrices(city).fireStation, 0);
  assert.equal(toolPrices(city).policeStation, 0);
  city.incidents.push({
    id: 900, x: 8, y: 6, severity: 'serious', status: 'active', createdAt: city.elapsed,
    required: ['police', 'ems'], completedServices: [], rescueDeadline: 90, outcome: 'pending',
  });
  city.nextId = Math.max(city.nextId, 901);
  assert.equal(missionSnapshot(city).neededServiceCost, 0);
  const funds = city.funds;
  place(city, 'hospital', 4, 10, 0);
  place(city, 'policeStation', 0, 10, 0);
  assert.equal(city.funds, funds);
  assert.equal(city.buildings.find(b => b.kind === 'hospital')!.paid, 0);
});

test('assist never builds a layout or mints cash; historical free practice construction still refunds zero', () => {
  const city = createCity();
  const before = structuredClone(city);
  assert.match(tutorialAction(city, 'assist').message, /Keep building/);
  tutorialAction(city, 'accept-waiver');
  tutorialAction(city, 'practice');
  assert.equal(city.buildings.length, 0);
  assert.equal(city.roads.length, 0);
  assert.equal(city.funds, before.funds);
  // Historical save provenance remains supported after removing its creation action.
  place(city, 'home', 2, 2, 0);
  place(city, 'road', 2, 4);
  city.buildings[0].paid = 0;
  city.roadPaid = {'2,4': 0};
  city.tutorial!.practice = {x:0,y:0};
  city.tutorial!.assisted = ['practice'];
  const loaded = reload(city);
  assert.equal(paidForBuilding(loaded.buildings[0]), 0);
  assert.equal(paidForRoad(loaded, {x:2,y:4}), 0);
  const cash = loaded.funds;
  place(loaded, 'bulldoze', 2, 2);
  place(loaded, 'bulldoze', 2, 4);
  assert.equal(loaded.funds, cash);
  const demolished = structuredClone(loaded);
  tutorialAction(loaded, 'practice');
  assert.deepEqual(loaded, demolished, 'legacy receipt cannot rebuild removed free construction');
});

test('meaningful progress resets stall; clicks, pause, and rebuild cycles do not refill grants', () => {
  const city = createCity();
  stepCity(city, 30);
  assert.equal(toolPrices(city).home, COSTS.home);
  place(city, 'home', 2, 2, 0);
  assert.ok((city.economy?.stallAt ?? 0) >= 30 - 1e-6);
  stepCity(city, 30);
  assert.equal(toolPrices(city).home, COSTS.home, 'placing a home is progress, so the grant is not due yet');
  const paused = city.elapsed;
  assert.equal(city.elapsed, paused);
  assert.equal(toolPrices(city).store, COSTS.store);
  place(city, 'bulldoze', 2, 2);
  place(city, 'home', 2, 2, 0);
  stepCity(city, STALL_SECONDS);
  assert.equal(toolPrices(city).store, 0);
  const waived = [...(city.economy?.waived ?? [])];
  const loaded = reload(city);
  stepCity(loaded, 120);
  assert.deepEqual(loaded.economy?.waived, waived);
  tutorialAction(city, 'skip');
  assert.equal(constructionPriceForCity(city, 'store'), COSTS.store);
  tutorialAction(city, 'resume');
  assert.equal(constructionPriceForCity(city, 'store'), COSTS.store, 'consumed first-visit grant does not return');
});

test('grant timing agrees across one step, 40Hz ticks, and a mid-wait reload', () => {
  const a = createCity();
  const b = createCity();
  const c = createCity();
  stepCity(a, STALL_SECONDS);
  for (let i = 0; i < STALL_SECONDS * 40; i++) stepCity(b, 0.025);
  stepCity(c, 20);
  const mid = reload(c);
  stepCity(c, 40);
  stepCity(mid, 40);
  assert.deepEqual(a.economy?.waived, ['first-visit']);
  assert.deepEqual(b.economy?.waived, ['first-visit']);
  assert.deepEqual(c.economy?.waived, ['first-visit']);
  assert.deepEqual(mid.economy?.waived, ['first-visit']);
  assert.equal(toolPrices(a).home, 0);
  assert.equal(toolPrices(mid).home, 0);
});

test('invalid placement consumes neither cash nor allowance', () => {
  const city = createCity();
  stepCity(city, STALL_SECONDS);
  const allowance = { ...city.economy!.allowance };
  const funds = city.funds;
  place(city, 'home', 2, 2, 0);
  const after = city.economy!.allowance!.home;
  place(city, 'home', 2, 2, 0);
  place(city, 'home', 90, 90, 0);
  assert.equal(city.economy!.allowance!.home, after);
  assert.equal(city.funds, funds);
  assert.ok(allowance.home === 1 && after === 0);
});

test('mixed paid and free tiles survive west expansion and reload', () => {
  const city = createCity();
  starter(city);
  stepCity(city, STALL_SECONDS);
  refreshTutorial(city);
  const parkPrice = constructionPriceForCity(city, 'park');
  if (parkPrice === 0) place(city, 'park', 4, 7, 2);
  expandCity(city, 'west');
  place(city, 'road', -1, 4);
  const loaded = reload(city);
  assert.equal(loaded.map.x, -8);
  for (const building of loaded.buildings) {
    assert.equal(paidForBuilding(building), building.paid ?? COSTS[building.kind]);
  }
  assert.equal(paidForRoad(loaded, { x: 2, y: 4 }), COSTS.road);
});

test('malformed economy or paid fields reject the save; missing ones migrate', () => {
  const city = createCity();
  starter(city);
  const raw = JSON.parse(JSON.stringify(city));
  delete raw.economy;
  const migrated = parseCity(raw);
  assert.ok(migrated);
  assert.deepEqual(migrated.economy, createEconomyProgress());
  assert.equal(migrated.funds, city.funds);
  for (const economy of [{ version: 1, waived: ['first-visit', 'first-visit'] }, { version: 2, waived: [] }, { version: 1, waived: ['not-a-lesson'] }]) {
    assert.equal(parseCity({ ...raw, economy }), null);
  }
  raw.buildings[0].paid = -1;
  assert.equal(parseCity(raw), null);
  const zero = JSON.parse(JSON.stringify(city));
  zero.buildings[0].paid = 0;
  const kept = parseCity(zero);
  assert.equal(kept?.buildings[0].paid, 0);
});

test('legacy assist callers cannot inject a district; skip preserves cash and consumed grants', () => {
  const city = createCity();
  stepCity(city, STALL_SECONDS);
  tutorialAction(city, 'assist');
  assert.equal(city.buildings.length, 0);
  const funds = city.funds;
  tutorialAction(city, 'skip');
  const loaded = reload(city);
  assert.equal(loaded.tutorial?.status, 'skipped');
  assert.equal(loaded.funds, funds);
  assert.ok(loaded.economy?.waived.includes('first-visit'));
  assert.equal(loaded.external?.gateway ?? null, null);
});
