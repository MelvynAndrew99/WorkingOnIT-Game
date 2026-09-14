import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,place,stepCity,parseCity,entrance} from './cityModel.ts';
import {insidePatrol,patrolRoute,stepPolicePatrols} from './cityPatrols.ts';
import {isEmergencyResponse} from './cityTraffic.ts';
function fixture(){
 const city=createCity();city.funds=10000;
 place(city,'policeStation',4,1);
 for(let x=0;x<16;x++)place(city,'road',x,3);
 return city;
}
function reload(city:ReturnType<typeof fixture>){const saved=parseCity(JSON.parse(JSON.stringify(city)));assert.ok(saved);return saved;}
test('police patrol real roads inside the radius, return, rest and preserve saves',()=>{
 const city=fixture(),station=city.buildings[0];stepPolicePatrols(city);
 assert.equal(city.trips.length,1);const trip=city.trips[0];
 assert.ok(trip.patrol);assert.equal(isEmergencyResponse(trip),false);
 assert.deepEqual(trip.path[0],entrance(station));assert.deepEqual(trip.path.at(-1),entrance(station));
 assert.ok(trip.path.every(p=>insidePatrol(station,p)));
 stepPolicePatrols(city);assert.equal(city.trips.length,1);
 stepCity(city,.5);assert.ok(trip.progress>0);assert.ok(reload(city).trips[0].patrol);
 for(let n=0;n<500&&city.trips.includes(trip);n++)stepCity(city,.1);
 assert.ok(!city.trips.includes(trip),'patrol finishes a real return');
 assert.ok(station.patrolReadyAt!>city.elapsed);assert.equal(city.trips.length,0);
 assert.equal(reload(city).buildings[0].patrolReadyAt,station.patrolReadyAt);
 stepCity(city,5);assert.ok(city.trips.some(t=>t.patrol));
});
test('disconnected stations do not spawn and radius excludes distant roads',()=>{
 const city=fixture(),station=city.buildings[0];
 assert.ok(patrolRoute(city,station)!.every(p=>insidePatrol(station,p)));
 city.roads=city.roads.filter(p=>p.x!==entrance(station).x);
 assert.equal(patrolRoute(city,station),null);stepPolicePatrols(city);assert.equal(city.trips.length,0);
});
for(const returningHome of [false,true])test(`the same patrol car takes a distant call, clears it and returns to patrol (interrupted return: ${returningHome})`,()=>{
 const city=fixture();stepCity(city,1);const car=city.trips[0],id=car.id;
 if(returningHome)car.patrolReturningHome=true;
 const incident={id:city.nextId++,x:14,y:3,severity:'minor' as const,status:'active' as const,createdAt:city.elapsed,
 required:['police' as const],completedServices:[],rescueDeadline:null,outcome:'none' as const};
 city.incidents.push(incident);city.accidentCount++;
 stepCity(city,.1);assert.equal(city.trips[0].id,id);assert.equal(city.trips.length,1);
 assert.equal(car.patrol,undefined);assert.equal(car.incidentId,incident.id);assert.ok(isEmergencyResponse(car));
 assert.equal(car.patrolReturningHome,undefined);
 assert.ok(car.path.some(p=>!insidePatrol(city.buildings[0],p)));reload(city);
 for(let n=0;n<1000&&incident.status==='active';n++)stepCity(city,.1);
 assert.equal(incident.status,'cleared');
 for(let n=0;n<1000&&!city.trips.some(t=>t.patrol);n++)stepCity(city,.1);
 assert.ok(city.trips.some(t=>t.patrol));reload(city);
});
test('malformed patrol saves cannot become civilian or emergency vehicles',()=>{
 const city=fixture();stepPolicePatrols(city);
 for(const patch of [{service:'ems'},{incidentId:999},{phase:'outbound'},{patrol:false}]){
 const raw=JSON.parse(JSON.stringify(city));Object.assign(raw.trips[0],patch);assert.equal(parseCity(raw),null);
 }
});
