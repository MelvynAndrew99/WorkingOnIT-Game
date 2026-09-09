import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCity, place, parseCity, type City } from './cityModel.ts';
import { tutorialAction, refreshTutorial } from './cityTutorial.ts';
import { activateGrant, consumeGrant, constructionPriceForCity, COSTS, LESSON_ORDER, parseEconomyProgress, clearStall } from './cityEconomy.ts';

function atRescue(): City {
  const city = createCity();
  activateGrant(city, 'first-visit');
  city.tutorial!.completed = LESSON_ORDER.slice(0, LESSON_ORDER.indexOf('rescue'));
  activateGrant(city, 'rescue');
  return city;
}
function reload(city: City): City {
  const loaded = parseCity(JSON.parse(JSON.stringify(city)));
  assert.ok(loaded);
  return loaded;
}

test('reset teaching metadata cannot borrow a later allowance despite an earlier grant receipt', () => {
  const city = atRescue();
  assert.equal(constructionPriceForCity(city, 'hospital'), 0);
  city.tutorial!.completed = [];
  assert.equal(constructionPriceForCity(city, 'hospital'), COSTS.hospital);
  assert.equal(constructionPriceForCity(city, 'road'), COSTS.road);
  const before = structuredClone(city.economy);
  consumeGrant(city, 'hospital');
  assert.deepEqual(city.economy, before);
  const raw = JSON.parse(JSON.stringify(city));
  raw.tutorial = { broken: true };
  const loaded = parseCity(raw);
  assert.ok(loaded, 'malformed ancillary teaching data does not erase the city');
  loaded.tutorial!.status = 'active';
  assert.equal(constructionPriceForCity(loaded, 'hospital'), COSTS.hospital);
  assert.deepEqual(loaded.economy, city.economy);
});

test('inactive or mismatched grants cannot be consumed or newly activated', () => {
  const city = atRescue();
  for (const status of ['skipped', 'complete', 'available'] as const) {
    city.tutorial!.status = status;
    const before = structuredClone(city.economy);
    consumeGrant(city, 'hospital');
    activateGrant(city, 'detour');
    assert.equal(constructionPriceForCity(city, 'hospital'), COSTS.hospital);
    assert.deepEqual(city.economy, before);
  }
  city.tutorial!.status = 'active';
  clearStall(city);
  assert.equal(city.economy!.allowanceLesson, 'rescue', 'stall reset does not transfer ownership');
  assert.equal(constructionPriceForCity(city, 'hospital'), 0);
  consumeGrant(city, 'hospital');
  assert.equal(city.economy!.allowance!.hospital, 0);
  assert.equal(constructionPriceForCity(city, 'hospital'), COSTS.hospital);
});

test('saved grant accounting rejects mismatched budgets and migrates only the latest recorded owner', () => {
  for (const economy of [
    {version: 1, waived: ['first-visit'], allowance: {hospital: 32}},
    {version: 1, waived: ['first-visit'], allowanceLesson: 'rescue', allowance: {hospital: 1}},
    {version: 1, waived: ['rescue'], allowanceLesson: 'rescue', allowance: {hospital: 2}},
    {version: 1, waived: ['rescue'], allowanceLesson: 'rescue', allowance: {home: 0}},
    {version: 1, waived: [], allowance: {road: 1}},
    {version: 1, waived: ['first-visit', 'rescue'], allowance: {home: 1}},
  ]) assert.equal(parseEconomyProgress(economy, 100), null);
  const old = parseEconomyProgress({version: 1, waived: ['first-visit', 'rescue'], allowance: {hospital: 0, road: 3}}, 100);
  assert.ok(old);
  assert.equal(old.allowanceLesson, 'rescue');
  assert.deepEqual(old.allowance, {hospital: 0, road: 3});
  assert.deepEqual(parseEconomyProgress(old, 100), old);
});

test('free construction consumes once, survives reload, and cannot turn demolition into cash', () => {
  let city = createCity();
  activateGrant(city, 'first-visit');
  const funds = city.funds;
  assert.match(place(city, 'home', 0, 0), /built/);
  assert.equal(city.funds, funds);
  assert.equal(city.economy!.allowance!.home, 0);
  const allowance = structuredClone(city.economy!.allowance);
  assert.match(place(city, 'store', 0, 0), /occupied/);
  assert.deepEqual(city.economy!.allowance, allowance, 'failure never consumes allowance');
  assert.match(place(city, 'road', 8, 8), /built/);
  assert.equal(city.economy!.allowance!.road, 11);
  city = reload(city);
  assert.equal(city.buildings[0].paid, 0);
  assert.equal(city.roadPaid!['8,8'], 0);
  assert.match(place(city, 'bulldoze', 0, 0), /\$0 refund/);
  assert.match(place(city, 'bulldoze', 8, 8), /\$0 refund/);
  assert.equal(city.funds, funds);
  assert.equal(city.economy!.allowance!.home, 0);
  assert.equal(city.economy!.allowance!.road, 11);
  assert.match(place(city, 'home', 0, 0), /built/);
  assert.equal(city.funds, funds - COSTS.home);
  assert.match(place(city, 'bulldoze', 0, 0), /\$200 refund/);
  assert.equal(city.funds, funds);
});

test('legacy paid construction refunds catalog costs while malformed accounting rejects the save', () => {
  const city = createCity();
  place(city, 'home', 0, 0);
  place(city, 'road', 8, 8);
  const raw = JSON.parse(JSON.stringify(city));
  delete raw.buildings[0].paid;
  delete raw.roadPaid;
  delete raw.economy;
  const loaded = parseCity(raw);
  assert.ok(loaded);
  const before = loaded.funds;
  place(loaded, 'bulldoze', 0, 0);
  place(loaded, 'bulldoze', 8, 8);
  assert.equal(loaded.funds, before + COSTS.home + COSTS.road);
  for (const amount of [-1, COSTS.home + 1, null, '0']) {
    const invalid = JSON.parse(JSON.stringify(city));
    invalid.buildings[0].paid = amount;
    assert.equal(parseCity(invalid), null);
  }
});


test('skip and completion discard leftovers without making the saved grant owner invalid or reusable', () => {
  const skipped = atRescue();
  tutorialAction(skipped, 'skip');
  assert.equal(skipped.economy!.allowance, undefined);
  const restored = reload(skipped);
  tutorialAction(restored, 'resume');
  activateGrant(restored, 'rescue');
  assert.equal(constructionPriceForCity(restored, 'hospital'), COSTS.hospital);
  assert.equal(restored.economy!.allowance, undefined);
  const completed = atRescue();
  completed.tutorial!.completed = [...LESSON_ORDER];
  refreshTutorial(completed);
  assert.equal(completed.tutorial!.status, 'complete');
  assert.equal(completed.economy!.allowance, undefined);
  assert.ok(reload(completed));
});
