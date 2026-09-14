import {createApartmentIncident} from './cityIncidents.ts';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,place,parseCity,stepCity,editBuildingEntrance,type City} from './cityModel.ts';
import {planPrivateLanes,buildPrivateComplex,privateLaneKeys} from './cityPrivateLanes.ts';
import {apartmentComplexSummary} from './cityApartmentComplexes.ts';
import {applyRoadDirections} from './cityDirectionEdits.ts';
const key=(p:{x:number;y:number})=>`${p.x},${p.y}`;
function fixture(){
 const city=createCity();delete city.land;city.map={x:0,y:0,width:32,height:24};city.funds=20000;city.tutorial!.status='complete';
 for(const x of [2,8])assert.match(place(city,'apartment',x,2),/built/);
 return {city,ids:city.buildings.map(b=>b.id)};
}
function load(city:City){const restored=parseCity(JSON.parse(JSON.stringify(city)));assert.ok(restored);return restored;}
test('preview is read-only; join builds narrow slow lanes, charges once, preserves residents and survives reload',()=>{
 const {city,ids}=fixture(),before=JSON.stringify(city);
 const plan=planPrivateLanes(city,...ids as [number,number]);assert.ok(plan.ok,plan.message);assert.equal(plan.added.length,7);assert.equal(plan.cost,140);
 assert.equal(JSON.stringify(city),before);
 const buildings=JSON.stringify(city.buildings),funds=city.funds;
 assert.match(buildPrivateComplex(city,ids[0],ids[1]),/Complex joined/);
 assert.equal(city.funds,funds-140);assert.equal(JSON.stringify(city.buildings),buildings);
 assert.equal(privateLaneKeys(city).size,7);assert.ok(apartmentComplexSummary(city,ids[0])!.connected);
 const restored=load(city);assert.deepEqual(restored.apartmentComplexes,city.apartmentComplexes);
 assert.match(buildPrivateComplex(restored,ids[0],ids[1]),/Complex joined/);assert.equal(restored.funds,city.funds);
});
test('private lanes are protected from public road tools and directions; public approach remains editable',()=>{
 const {city,ids}=fixture();buildPrivateComplex(city,ids[0],ids[1]);
 for(const tool of ['road','communityRoad','bulldoze','stop','signal','closure','wideRoad'] as const){
  const before=JSON.stringify(city);assert.match(place(city,tool,4,6),/community manages/);assert.equal(JSON.stringify(city),before);
 }
 assert.equal(applyRoadDirections(city,[{x:4,y:6},{x:5,y:6}],'forward').ok,false);
 assert.match(place(city,'road',2,7),/built/);assert.match(place(city,'closure',2,7),/closed/);
 assert.equal(editBuildingEntrance(city,ids[0],'primary',{x:6,y:2}).ok,false);
});
test('blocked and unaffordable joins are atomic, never bulldoze or cross public streets',()=>{
 const {city,ids}=fixture();city.funds=0;let before=JSON.stringify(city);
 assert.equal(planPrivateLanes(city,ids[0],ids[1]).ok,false);buildPrivateComplex(city,ids[0],ids[1]);assert.equal(JSON.stringify(city),before);
 city.funds=20000;for(let y=0;y<10;y++)assert.match(place(city,'road',7,y),/built/);
 before=JSON.stringify(city);assert.equal(planPrivateLanes(city,ids[0],ids[1]).ok,false);buildPrivateComplex(city,ids[0],ids[1]);assert.equal(JSON.stringify(city),before);
});
test('joining shares one public approach and actual residents finish journeys through private lanes after reload',()=>{
 const {city,ids}=fixture();
 for(let y=7;y<=12;y++)assert.match(place(city,'road',2,y),/built/);
 for(let x=3;x<=16;x++)assert.match(place(city,'road',x,12),/built/);
 assert.match(place(city,'store',14,10),/built/);
 assert.match(place(city,'park',20,9),/built/);
 for(let x=17;x<=20;x++)assert.match(place(city,'road',x,12),/built/);
 const originalRoads=JSON.stringify(city.roads);
 assert.match(buildPrivateComplex(city,ids[0],ids[1]),/Complex joined/);
 assert.equal(JSON.stringify(city.roads.filter(p=>!privateLaneKeys(city).has(key(p)))),originalRoads);
 const restored=load(city),departures=new Set<number>(),returns=new Set<number>();
 for(let n=0;n<2400;n++){
  stepCity(restored,.05);
  for(const trip of restored.trips)if(ids.includes(trip.homeId)&&trip.path.some(p=>privateLaneKeys(restored).has(key(p))))departures.add(trip.homeId);
  for(const record of restored.history)if(record.service&&ids.includes(record.service.homeId))returns.add(record.service.homeId);
  if(ids.every(id=>returns.has(id)))break;
 }
 assert.deepEqual([...departures].sort(),ids);assert.deepEqual([...returns].sort(),ids);
});
test('public entrance pavement and one-way directions are preserved, while the other block gains shared access',()=>{
 const {city,ids}=fixture();
 for(let y=6;y<=10;y++)place(city,'road',2,y);
 assert.ok(applyRoadDirections(city,[{x:2,y:6},{x:2,y:7},{x:2,y:8}],'forward').ok);
 const directions=JSON.stringify(city.roadDirections);
 assert.match(buildPrivateComplex(city,ids[0],ids[1]),/Complex joined/);
 assert.equal(JSON.stringify(city.roadDirections),directions);assert.ok(!privateLaneKeys(city).has('2,6'));
 assert.ok(apartmentComplexSummary(city,ids[1])!.connected);assert.ok(load(city));
});
test('merging communities connects all blocks, retains ownership and validates saved lane metadata',()=>{
 const {city,ids}=fixture();for(const x of [14,20]){place(city,'apartment',x,2);ids.push(city.buildings.at(-1)!.id);}
 buildPrivateComplex(city,ids[0],ids[1]);buildPrivateComplex(city,ids[2],ids[3]);
 assert.match(buildPrivateComplex(city,ids[0],ids[2]),/Complex joined/);
 assert.deepEqual(city.apartmentComplexes![0].buildingIds,ids);assert.ok(apartmentComplexSummary(city,ids[0])!.connected);load(city);
 for(const lanes of [[{x:31,y:23}],[{x:2,y:6},{x:2,y:6}],null]){
  const corrupt=JSON.parse(JSON.stringify(city));corrupt.apartmentComplexes[0].privateLanes=lanes;assert.equal(parseCity(corrupt),null);
 }
});

test('stale preview cannot silently buy a different route; occupied shared access delays construction',()=>{
 const {city,ids}=fixture();
 const plan=planPrivateLanes(city,ids[0],ids[1]);assert.ok(plan.ok);
 place(city,'road',4,6);const before=JSON.stringify(city);
 assert.match(buildPrivateComplex(city,ids[0],ids[1],plan),/changed/);assert.equal(JSON.stringify(city),before);
 const second=fixture();place(second.city,'road',2,7);place(second.city,'road',2,8);
 second.city.trips.push({id:100,path:[{x:2,y:7},{x:2,y:8}],progress:0,homeId:second.ids[0],storeId:second.ids[1],wait:0,hold:0});
 const occupied=JSON.stringify(second.city);assert.equal(planPrivateLanes(second.city,second.ids[0],second.ids[1]).ok,false);
 buildPrivateComplex(second.city,second.ids[0],second.ids[1]);assert.equal(JSON.stringify(second.city),occupied);
});
test('automatic lanes follow each first-entrance orientation around buildings',()=>{
 for(let a=0;a<4;a++)for(let b=0;b<4;b++){
  const {city,ids}=fixture();city.buildings[0].rotation=a;city.buildings[1].rotation=b;
  const plan=planPrivateLanes(city,ids[0],ids[1]);assert.ok(plan.ok,`${a}/${b}: ${plan.message}`);
  assert.match(buildPrivateComplex(city,ids[0],ids[1]),/joined/);assert.ok(apartmentComplexSummary(city,ids[0])!.connected);load(city);
 }
});
test('a responder really reaches the second block through shared access and clears its incident',()=>{
 const {city,ids}=fixture();buildPrivateComplex(city,ids[0],ids[1]);
 place(city,'policeStation',1,10);
 for(let y=7;y<=9;y++)place(city,'road',2,y);
 for(let y=9;y<=12;y++)place(city,'road',4,y);
 for(let x=2;x<=4;x++){place(city,'road',x,9);place(city,'road',x,12);}
 const incident=createApartmentIncident(city,ids[1],'minor');assert.ok(incident);
 const restored=load(city);let usedPrivate=false,worked=false;
 for(let n=0;n<2400&&restored.incidents[0].status==='active';n++){
  stepCity(restored,.025);
  for(const t of restored.trips.filter(t=>t.incidentId===incident.id)){
   if(t.path.some(p=>privateLaneKeys(restored).has(key(p))))usedPrivate=true;
   if(t.sceneParked)worked=true;
  }
 }
 assert.ok(usedPrivate);assert.ok(worked);assert.equal(restored.incidents[0].status,'cleared');load(restored);
});
