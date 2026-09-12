import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseCity, stepCity} from '../../../../src/game/cityModel.ts';
import {moveBusStop} from '../../../../src/game/cityBusStops.ts';
import {busRoutePreview} from '../../../../src/game/cityTransit.ts';

const raw = JSON.parse(readFileSync(new URL('./city.json', import.meta.url), 'utf8'));
const city = parseCity(structuredClone(raw));
assert.ok(city);
const roads = structuredClone(city.roads);
stepCity(city, 5);
for (const busId of [14934, 15013]) assert.equal(city.trips.find(t=>t.busId===busId)?.phase, 'outbound');
assert.deepEqual(city.roads, roads);
assert.ok(parseCity(JSON.parse(JSON.stringify(city))));

let restored = parseCity(structuredClone(raw));
assert.ok(moveBusStop(restored, 14813, -2, 7, 3).ok);
assert.equal(busRoutePreview(restored, 14723, [14749, 14813, 14773]).error, null);
restored = parseCity(JSON.parse(JSON.stringify(restored)));
assert.ok(restored);
stepCity(restored, 5);
for (const busId of [14934, 15013]) {
  const trip = restored.trips.find(t => t.busId === busId);
  assert.equal(trip?.phase, 'outbound');
  assert.ok(trip.progress > 1);
}
assert.equal(restored.buildings.length, raw.buildings.length);
assert.equal(restored.buildings.find(b=>b.id===14813).y, 7);
assert.deepEqual(restored.missions.claimed, raw.missions.claimed);
console.log('Verified automatic skipping with roads preserved, stop relocation with riders retained, and save/reload.');
