import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,place,parseCity,stepCity,upgradeApartment,COSTS,type City} from './cityModel.ts';
import {joinApartmentComplex,apartmentComplexSummary} from './cityApartmentComplexes.ts';
import {createOfficeIncident} from './cityIncidents.ts';

function run(city:City,seconds:number){for(let i=0;i<seconds/.025;i++)stepCity(city,.025);}

test('community classification preserves real road payments and reloads without inventing pavement',()=>{
 const city=createCity();city.funds=10000;
 assert.match(place(city,'communityRoad',3,5),/built/);assert.equal(city.funds,10000-COSTS.road);
 assert.match(place(city,'road',3,5),/restored/);assert.equal(city.funds,10000-COSTS.road);
 assert.equal(city.communityRoads,undefined);
 assert.match(place(city,'communityRoad',3,5),/built/);assert.equal(city.funds,10000-COSTS.road);
 const loaded=parseCity(JSON.parse(JSON.stringify(city)));assert.ok(loaded);assert.deepEqual(loaded.communityRoads,[{x:3,y:5}]);
 assert.match(place(loaded,'bulldoze',3,5),/refund/);assert.equal(loaded.funds,10000);assert.equal(loaded.communityRoads,undefined);
 assert.ok(parseCity(JSON.parse(JSON.stringify(loaded))));
});

test('joined blocks keep real work journeys through one slower shared approach across reload',()=>{
 let city=createCity();city.map.width=32;city.map.height=24;city.funds=10000;
 for(const x of [3,9])assert.match(place(city,'apartment',x,9),/built/);
 const [a,b]=city.buildings;
 for(let x=3;x<=20;x++)assert.match(place(city,x<=9?'communityRoad':'road',x,13),/built/);
 assert.match(joinApartmentComplex(city,a.id,b.id),/joined/);
 assert.match(upgradeApartment(city,a.id,{x:2,y:11}),/open/);
 assert.equal(apartmentComplexSummary(city,a.id)!.residents,10);
 assert.match(place(city,'office',20,9),/built/);
 run(city,20);assert.ok(city.trips.some(t=>t.purpose==='work'));
 city=parseCity(JSON.parse(JSON.stringify(city)))!;assert.ok(city);
 run(city,90);
 for(const id of [a.id,b.id])assert.ok(city.history.some(h=>h.service?.homeId===id&&h.service.purpose==='work'));
 assert.equal(city.apartmentComplexes!.length,1);
 assert.ok(parseCity(JSON.parse(JSON.stringify(city))));
 const isolated=createCity();isolated.funds=10000;
 place(isolated,'apartment',1,2);place(isolated,'apartment',7,2);
 for(let x=1;x<=7;x++)place(isolated,'communityRoad',x,6);
 const members=isolated.buildings.map(b=>b.id);joinApartmentComplex(isolated,...members as [number,number]);
 place(isolated,'bulldoze',1,2);assert.equal(isolated.apartmentComplexes,undefined);
});

test('offices also receive actual emergency arrival and completed work through their entrance',()=>{
 const city=createCity();city.funds=10000;
 place(city,'policeStation',1,1);place(city,'office',8,5);
 for(let y=3;y<=9;y++)place(city,'road',2,y);
 for(let x=3;x<=8;x++)place(city,'road',x,9);
 const office=city.buildings.find(b=>b.kind==='office')!;
 const incident=createOfficeIncident(city,office.id,'minor');assert.ok(incident);
 run(city,45);assert.equal(incident.status,'cleared');assert.deepEqual(incident.completedServices,['police']);
 assert.ok(parseCity(JSON.parse(JSON.stringify(city))));
});
