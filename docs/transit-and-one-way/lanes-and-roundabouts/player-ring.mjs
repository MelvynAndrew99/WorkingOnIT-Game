import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {parseCity,place,stepCity,footprint} from '../../../src/game/cityModel.ts';
import {directionReservedTiles} from '../../../src/game/cityTraffic.ts';
import {applyRoadDirections} from '../../../src/game/cityDirectionEdits.ts';
import {relocateInteriorGateway} from '../../../src/game/cityExternal.ts';
const raw=JSON.parse(readFileSync(new URL('../../performance-review/player-town/save.json',import.meta.url)));
const c=parseCity(raw.city);assert.ok(c);relocateInteriorGateway(c);
const buildings=structuredClone(c.buildings),homes=c.buildings.filter(b=>b.kind==='home').map(b=>b.id);
const center={x:10,y:4},ring=[[9,3],[10,3],[11,3],[11,4],[11,5],[10,5],[9,5],[9,4],[9,3]].map(([x,y])=>({x,y}));
const lots=new Set(c.buildings.flatMap(footprint).map(p=>`${p.x},${p.y}`));assert.ok(ring.every(p=>!lots.has(`${p.x},${p.y}`)));
const events=[],initial={elapsed:c.elapsed,completed:c.completed,accidents:c.accidentCount,trips:c.trips.length};
let ready=false;
for(let n=0;n<=120*40;n++){
 const occupied=directionReservedTiles(c);
 if([center,...ring].every(p=>!occupied.has(`${p.x},${p.y}`))){ready=true;events.push({afterSeconds:n/40,action:'All future ring tiles and center physically clear'});break;}
 if(n<120*40)stepCity(c,.025);
}
if(ready){
 events.push({action:'remove existing center signal',result:place(c,'bulldoze',10,4)});
 events.push({action:'remove center road',result:place(c,'bulldoze',10,4)});
 assert.ok(!c.roads.some(p=>p.x===10&&p.y===4));
 for(const p of ring.slice(0,-1))if(!c.roads.some(r=>r.x===p.x&&r.y===p.y))events.push({action:`build ${p.x},${p.y}`,result:place(c,'road',p.x,p.y)});
 const edit=applyRoadDirections(c,ring,'forward');events.push({action:'clockwise direction',...edit});assert.ok(edit.ok);
 assert.deepEqual(c.buildings,buildings);
 writeFileSync(new URL('player-ring-save.json',import.meta.url),JSON.stringify({...raw,city:c}));
 const returned=new Set(),beforeRun=c.completed,accidents=c.accidentCount,startElapsed=c.elapsed;
 for(let n=0;n<120*40;n++){stepCity(c,.025);for(const h of c.history)if(h.at>startElapsed&&h.service?.purpose==='shopping')returned.add(h.service.homeId);}
 events.push({action:'120-second observation',completed:c.completed-beforeRun,newAccidents:c.accidentCount-accidents,returningHouseholds:[...returned],households:homes.length,newIncidents:c.incidents.filter(i=>i.createdAt>initial.elapsed).map(i=>({x:i.x,y:i.y,status:i.status,severity:i.severity}))});
 assert.deepEqual(c.buildings,buildings);
}
const result={initial,ready,center,events,noDemandOrVehicleDeletion:true,buildingGeometryPreserved:JSON.stringify(c.buildings)===JSON.stringify(buildings)};
writeFileSync(new URL('player-ring-results.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
