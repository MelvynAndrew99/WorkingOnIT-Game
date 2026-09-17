import fs from 'node:fs';
import {parseCity,stepCity,place,footprint} from '../../src/game/cityModel.ts';
import {debugVehicles} from '../../src/game/cityTraffic.ts';
const input=JSON.parse(fs.readFileSync(process.argv[2]??new URL('original.json',import.meta.url),'utf8'));
fs.writeFileSync(new URL('original.json',import.meta.url),JSON.stringify(input));
const c=parseCity(input.city);if(!c)throw Error('invalid');
console.log('SUMMARY',JSON.stringify({roads:c.roads.length,buildings:c.buildings.length,trips:c.trips.length,funds:c.funds,elapsed:c.elapsed,incidents:c.incidents,closures:c.closures,controls:c.controls}));
console.log('BUILDINGS',JSON.stringify(c.buildings.map(b=>({id:b.id,kind:b.kind,x:b.x,y:b.y,rotation:b.rotation}))));
function dump(n){const ds=debugVehicles(c); fs.writeFileSync(new URL(`debug-${n}.json`,import.meta.url),JSON.stringify(ds,null,2)); console.log('AT',n,JSON.stringify({active:c.incidents.filter(i=>i.status==='active'),trips:c.trips.length,stuck:ds.filter(d=>d.stoppedSeconds>10).length,history:c.history,services:ds.filter(d=>d.stationId)}));}
dump(0);for(let n=1;n<=120*40;n++){stepCity(c,.025);if(n%2400===0)dump(n/40);}
fs.writeFileSync(new URL('baseline.json',import.meta.url),JSON.stringify(c));
