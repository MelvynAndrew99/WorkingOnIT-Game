import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_ENVELOPE_HEIGHT, DEFAULT_ENVELOPE_WIDTH, PLOT_BASE_PRICE, PLOT_SIZE, STARTER_OWNED_PLOTS,
  adjacentPlotInDirection, createLandState, growMapToPlots, landEnvelope, migrateLandFromMap,
  parseLand, plotCount, plotPrice, plotRect, plotSignTiles, purchasablePlots, tileOwned,
} from './cityLand.ts';
import { createCity, parseCity, place, unlockPlot, type City } from './cityModel.ts';
import { tutorialAction } from './cityTutorial.ts';

function reload(c: City) {
  const loaded = parseCity(JSON.parse(JSON.stringify(c)));
  assert.ok(loaded);
  return loaded;
}

test('jam envelope is 64×48 of 16×16 plots and stores its own size', () => {
  const land = createLandState([0]);
  assert.equal(land.envelopeWidth, DEFAULT_ENVELOPE_WIDTH);
  assert.equal(land.envelopeHeight, DEFAULT_ENVELOPE_HEIGHT);
  assert.equal(land.plotSize, PLOT_SIZE);
  assert.equal(plotCount(land), 12);
  assert.deepEqual(landEnvelope(land), { x: 0, y: 0, width: 64, height: 48 });
  assert.deepEqual(plotRect(land, 0), { x: 0, y: 0, width: 16, height: 16 });
  assert.deepEqual(plotRect(land, 11), { x: 48, y: 32, width: 16, height: 16 });
});

test('new sandbox owns one plot; H starter owns the four plots covering the teaching roads', () => {
  const sandbox = createCity();
  assert.deepEqual(sandbox.land?.owned, [0]);
  assert.deepEqual(sandbox.map, { x: 0, y: 0, width: 16, height: 16 });
  const guided = createCity(true);
  assert.deepEqual(guided.land?.owned, [...STARTER_OWNED_PLOTS]);
  assert.deepEqual(guided.map, { x: 0, y: 0, width: 32, height: 32 });
  assert.equal(guided.roads.length, 43);
});

test('only adjacent locked plots are for sale; the sign is the centre 2×2', () => {
  const land = createLandState([0]);
  assert.deepEqual(purchasablePlots(land), [1, 4]);
  assert.equal(adjacentPlotInDirection(land, 'east'), 1);
  assert.equal(adjacentPlotInDirection(land, 'south'), 4);
  assert.equal(adjacentPlotInDirection(land, 'west'), null);
  assert.equal(adjacentPlotInDirection(land, 'north'), null);
  assert.deepEqual(plotSignTiles(land, 1), [{ x: 23, y: 7 }, { x: 24, y: 7 }, { x: 23, y: 8 }, { x: 24, y: 8 }]);
});

test('two free unlocks then a cash charge; unaffordable clicks do not spend', () => {
  const c = createCity();
  c.tutorial!.status = 'skipped';
  assert.match(unlockPlot(c, 1), /free plot/);
  assert.equal(c.land!.freeUnlocks, 1);
  assert.equal(c.funds, 900);
  assert.match(unlockPlot(c, 2), /Further plots cost money/);
  assert.equal(c.land!.freeUnlocks, 0);
  const funds = c.funds;
  c.funds = 10;
  const before = structuredClone(c);
  assert.match(unlockPlot(c, 3), /costs \$250/);
  assert.deepEqual(c, before);
  c.funds = funds;
  assert.match(unlockPlot(c, 3), /Bought land for \$250/);
  assert.equal(c.funds, funds - PLOT_BASE_PRICE);
  assert.ok(c.land!.owned.includes(3));
  assert.deepEqual(reload(c).land, c.land);
});

test('cannot build on locked land; unlocking opens that plot only', () => {
  const c = createCity();
  c.tutorial!.status = 'skipped';
  c.funds = 10000;
  assert.match(place(c, 'road', 20, 4), /Unlock this land first/);
  assert.equal(c.roads.length, 0);
  unlockPlot(c, 1);
  assert.match(place(c, 'road', 20, 4), /Road built/);
  assert.match(place(c, 'road', 36, 4), /Unlock this land first/);
});

test('existing towns keep their rectangle and unused permits become free unlocks', () => {
  const land = migrateLandFromMap({ x: -16, y: -8, width: 48, height: 46 }, { used: 2, levels: 3, briefingSeen: true });
  assert.equal(land.origin.x, -16);
  assert.equal(land.origin.y, -8);
  assert.equal(land.envelopeWidth, 64);
  assert.equal(land.envelopeHeight, 48);
  assert.ok(land.owned.length >= 6);
  assert.equal(land.freeUnlocks, 3);
  assert.equal(land.briefingSeen, true);
  const parsed = parseLand(undefined, { x: 0, y: 0, width: 16, height: 14 });
  assert.deepEqual(parsed.owned, [0]);
  assert.equal(parsed.freeUnlocks, 2);
});

test('tile ownership does not grant the bounding-box hole between L-shaped plots', () => {
  const land = createLandState([0, 1, 4]);
  const map = growMapToPlots({ x: 0, y: 0, width: 16, height: 16 }, land);
  assert.equal(tileOwned(land, map, { x: 2, y: 2 }), true);
  assert.equal(tileOwned(land, map, { x: 18, y: 2 }), true);
  assert.equal(tileOwned(land, map, { x: 2, y: 18 }), true);
  assert.equal(tileOwned(land, map, { x: 18, y: 18 }), false);
  land.freeUnlocks = 0;
  land.purchased = 2;
  assert.equal(plotPrice(land), 250);
});

test('H tutorial gates plot buying until the control lesson; skip keeps two free unlocks', () => {
  const c = createCity(true);
  const before = structuredClone(c);
  assert.match(unlockPlot(c, 2), /junction-control/);
  assert.deepEqual(c, before);
  tutorialAction(c, 'skip');
  assert.match(unlockPlot(c, 2), /New land opened/);
  assert.match(unlockPlot(c, 3), /New land opened/);
  const blocked = structuredClone(c);
  assert.match(unlockPlot(c, 6), /Further plots cost money|Bought land|costs \$/);
  assert.equal(c.land!.freeUnlocks, 0);
  assert.ok(reload(blocked));
});
