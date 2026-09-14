import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=process.argv[2]??process.cwd();const tag=process.argv[3]??'after';
const {parseCity,stepCity}=await import(pathToFileURL(root+'/src/game/cityModel.ts'));
const {relocateInteriorGateway}=await import(pathToFileURL(root+'/src/game/cityExternal.ts'));
const raw=JSON.parse(readFileSync(new URL('../../performance-review/player-town/save.json',import.meta.url),'utf8'));const results=[];
for(let trial=0;trial<4;trial++){
 const city=parseCity(raw.city);if(!city)throw Error('Invalid supplied city');relocateInteriorGateway(city);
 const frames=[],hashes=[];const start=performance.now();
 for(let i=0;i<3600;i++){const t=performance.now();stepCity(city,1/60);frames.push(performance.now()-t);if(i%60===59)hashes.push(createHash('sha256').update(JSON.stringify(city)).digest('hex'));}
 const ms=performance.now()-start;frames.sort((a,b)=>a-b);if(trial)results.push({ms,p50:frames[1800],p95:frames[3420],p99:frames[3564],max:frames.at(-1),hashes,completed:city.completed,accidents:city.accidentCount});
}
writeFileSync(new URL(`${tag}-model.json`,import.meta.url),JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({hashes,...r})=>r)));
