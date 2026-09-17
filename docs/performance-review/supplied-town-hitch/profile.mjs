import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import * as model from '/home/phil/Code/jams/won/src/game/cityModel.ts';
import {debugVehicles} from '/home/phil/Code/jams/won/src/game/cityTraffic.ts';
const out='/home/phil/Code/jams/won/docs/performance-review/supplied-town-hitch';
const raw=JSON.parse(readFileSync(out+'/save.json')).city;
const city=model.parseCity(raw);assert.ok(city);
const initial=debugVehicles(city);const start=structuredClone(city);const states=[];
for(let i=0;i<1800;i++){model.stepCity(city,1/60);if(i%60===59)states.push({seconds:(i+1)/60,trips:city.trips.length,stalled:city.trips.filter(t=>t.hold>5&&!['crashed','visiting','working'].includes(t.phase)).length});}
writeFileSync(out+'/traffic-state.json',JSON.stringify({initial,states,final:debugVehicles(city),originalTripsRemaining:city.trips.filter(t=>start.trips.some(x=>x.id===t.id)).length,completedDelta:city.completed-start.completed},null,2));
console.log({trips:city.trips.length,completedDelta:city.completed-start.completed,stalled:states.at(-1).stalled});
