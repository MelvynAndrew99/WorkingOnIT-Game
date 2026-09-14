import assert from 'node:assert/strict';
import {test} from 'node:test';
import {bodyTile} from './cityTraffic.ts';
import {createCity,place,entrance,parseCity,stepCity,type Trip} from './cityModel.ts';
import {stepIncidents,BACKUP_WAIT_SECONDS,type ServiceKind} from './cityIncidents.ts';
function fixture(kind:ServiceKind){
 const city=createCity();city.funds=10000;city.elapsed=BACKUP_WAIT_SECONDS;
 const building=kind==='ems'?'hospital':kind==='fire'?'fireStation':'policeStation';
 place(city,building,1,1);place(city,building,10,1);assert.equal(city.buildings.length,2);
 for(let x=0;x<16;x++)place(city,'road',x,3);
 const incident={id:city.nextId++,x:8,y:3,severity:'fire' as const,status:'active' as const,createdAt:0,
  required:['police','ems','fire'] as ServiceKind[],completedServices:[] as ServiceKind[],rescueDeadline:90,outcome:'pending' as const};
 city.incidents.push(incident);city.accidentCount++;
 const old:Trip={id:city.nextId++,homeId:0,storeId:0,service:kind,stationId:city.buildings[0].id,incidentId:incident.id,
  phase:'outbound',path:Array.from({length:6},(_,i)=>({x:i+2,y:3})),progress:2.5,hold:BACKUP_WAIT_SECONDS,wait:BACKUP_WAIT_SECONDS,
  target:{x:7,y:3},workRemaining:0};
 city.trips.push(old);assert.ok(parseCity(JSON.parse(JSON.stringify(city))),'legacy assignment loads before transfer');return {city,old,incident};
}
for(const kind of ['police','ems','fire'] as const)test(`${kind}: a backup takes a stalled call without teleporting the old crew or losing the save`,()=>{
 const {city,old,incident}=fixture(kind);const position=old.path[bodyTile(old)],progress=old.progress;
 stepIncidents(city,.025);
 assert.equal(old.progress,progress);assert.equal(old.responseCancelled,true);assert.equal(old.phase,'waiting');assert.equal(old.resume,'returning');
 assert.deepEqual(old.path[bodyTile(old)],position);assert.deepEqual(old.target,entrance(city.buildings[0]));
 const replacement=city.trips.find(t=>t.service===kind&&!t.responseCancelled)!;
 assert.ok(replacement&&replacement.id!==old.id);assert.equal(replacement.stationId,city.buildings[1].id);
 assert.deepEqual(replacement.path[0],entrance(city.buildings[1]));
 assert.equal(incident.completedServices.length,0);
 assert.ok(parseCity(JSON.parse(JSON.stringify(city))));
 for(let i=0;i<300&&!incident.completedServices.includes(kind);i++)stepCity(city,.1);
 assert.ok(incident.completedServices.includes(kind));assert.ok(!city.trips.includes(old));
 assert.equal(incident.completedServices.filter(s=>s===kind).length,1);
 assert.ok(parseCity(JSON.parse(JSON.stringify(city))));
});
test('moving assignments, working crews, and unavailable backups keep their assignment',()=>{
 for(const mode of ['moving','working','unreachable'] as const){
  const {city,old}=fixture('ems');
  if(mode==='moving')old.hold=0;
  if(mode==='working'){old.phase='working';old.progress=old.path.length-1;old.workRemaining=6;}
  if(mode==='unreachable')city.roads=city.roads.filter(p=>p.x!==10);
  stepIncidents(city,.025);assert.equal(old.responseCancelled,undefined);assert.equal(city.trips.filter(t=>t.service==='ems').length,1);
 }
});
test('cancelled response save flags cannot grant work or bypass ordinary assignment validation',()=>{
 const {city,old}=fixture('ems');stepIncidents(city,.025);
 for(const patch of [{phase:'outbound'},{phase:'working'},{responseCancelled:false},{workRemaining:1},{patrol:true}]){
  const raw=JSON.parse(JSON.stringify(city));Object.assign(raw.trips.find((t:Trip)=>t.id===old.id),patch);assert.equal(parseCity(raw),null);
 }
});
