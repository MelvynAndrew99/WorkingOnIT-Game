import fs from 'node:fs';
import {parseCity,stepCity,place} from '../../src/game/cityModel.ts';
import {debugVehicles} from '../../src/game/cityTraffic.ts';
import {busRoutePreview} from '../../src/game/cityTransit.ts';
const raw=JSON.parse(fs.readFileSync(new URL('original.json',import.meta.url)));
const cases={baseline:[],reopenNorth:[['closure',2,-2]],signals:[['signal',10,10],['signal',4,11],['signal',12,18]],combined:[['closure',2,-2],['signal',10,10],['signal',4,11],['signal',12,18]]};
if(process.argv[2]==='refined'){for(const k of Object.keys(cases))delete cases[k];cases.refined=[['closure',2,-2],['signal',10,10],['signal',4,11],['signal',12,18],['signal',17,18]];}
const duration=process.argv[3]?Number(process.argv[3]):180;
const results=[];
for(const [name,actions] of Object.entries(cases)){
 let c=parseCity(raw.city); const before={completed:c.completed,accidents:c.accidentCount,riders:c.transit.ridership.completed},logs=actions.map(a=>({action:a,result:place(c,...a)}));
 const initialIds=new Set(c.trips.map(t=>t.id));let clearedAt=null;const snapshots=[];
 if(name==='refined')fs.writeFileSync(new URL('suggested-edits.json',import.meta.url),JSON.stringify({...raw,city:c}));
 for(let n=1;n<=duration*40;n++){stepCity(c,.025);if(process.argv[3]&&n===2400){c=parseCity(JSON.parse(JSON.stringify(c)));if(!c)throw Error('reload invalid');}if(clearedAt===null&&c.incidents.find(i=>i.id===36012)?.status==='cleared')clearedAt=n/40;if(n%2400===0){const ds=debugVehicles(c);snapshots.push({seconds:n/40,completed:c.completed-before.completed,accidents:c.accidentCount-before.accidents,active:c.incidents.filter(i=>i.status==='active').map(i=>({id:i.id,x:i.x,y:i.y})),stuck:ds.filter(d=>d.stoppedSeconds>10).length,originalTripsRemaining:c.trips.filter(t=>initialIds.has(t.id)).map(t=>t.id),bus:c.trips.find(t=>t.id===35662),riders:c.transit.ridership.completed-before.riders});}}
 fs.writeFileSync(new URL(`${name}-final-debug.json`,import.meta.url),JSON.stringify(debugVehicles(c),null,2));
 const r={name,logs,clearedAt,snapshots,valid:!!parseCity(JSON.parse(JSON.stringify(c))),route:busRoutePreview(c,21610,[21075,14773]).error};results.push(r);fs.writeFileSync(new URL(process.argv[3]?'extended.json':process.argv[2]==='refined'?'refined.json':'experiments.json',import.meta.url),JSON.stringify(results,null,2));console.log(name,JSON.stringify({...r,snapshots:r.snapshots.map(s=>({...s,bus:s.bus?{phase:s.bus.phase,progress:s.bus.progress,target:s.bus.target}:null}))}));
}
