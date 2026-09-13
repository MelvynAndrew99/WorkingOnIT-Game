import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createCity,place,parseCity} from '../../src/game/cityModel.ts';
import {relocateInteriorGateway} from '../../src/game/cityExternal.ts';
const small=createCity();small.funds=20000;delete small.land;small.map={x:0,y:0,width:32,height:24};small.tutorial.status='complete';
const put=(tool,x,y,r=0)=>assert.match(place(small,tool,x,y,r),/built/);
for(let x=2;x<=27;x++)put('road',x,14);
for(let y=8;y<14;y++)put('road',2,y);
put('home',2,6);put('home',4,12);put('store',22,12);put('park',25,11);put('office',3,15,2);
put('apartment',10,9);put('apartment',16,9);
// Apartments are intentionally unjoined for the same real pointer joining scenario in both builds.
const busy=parseCity(JSON.parse(readFileSync(new URL('../performance-review/player-town/save.json',import.meta.url))).city);assert.ok(busy);relocateInteriorGateway(busy);
for(const [name,city] of Object.entries({small,busy})){
 assert.ok(parseCity(JSON.parse(JSON.stringify(city))),name);
 const json=JSON.stringify({city,updatedAt:1},null,2);writeFileSync(new URL(`model-${name}.json`,import.meta.url),json);
 console.log({name,roads:city.roads.length,buildings:city.buildings.length,trips:city.trips.length,sha256:createHash('sha256').update(json).digest('hex')});
}
