import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,place,upgradeApartment,entrances,footprint,parseCity,COSTS,APARTMENT_ENTRANCE_UPGRADE_COST,stepCity} from './cityModel.ts';
import {createApartmentIncident} from './cityIncidents.ts';

for(let rotation=0;rotation<4;rotation++)test(`apartment upgrade saves both rotated entrances and refunds actual payment once (${rotation})`,()=>{
 const city=createCity();city.funds=10000;
 assert.match(place(city,'apartment',5,5,rotation),/built/);
 const b=city.buildings[0], lot=footprint(b), before=city.funds;
 assert.equal(entrances(b).length,1);
 assert.match(upgradeApartment(city,b.id,{x:6,y:4}),/entrance open/);
 assert.equal(city.funds,before-APARTMENT_ENTRANCE_UPGRADE_COST);
 assert.deepEqual(footprint(b),lot);
 assert.equal(entrances(b).length,2);
 for(const door of entrances(b))assert.ok(!lot.some(p=>p.x===door.x&&p.y===door.y));
 const loaded=parseCity(JSON.parse(JSON.stringify(city)));assert.ok(loaded);
 assert.deepEqual(loaded.buildings,city.buildings);
 assert.match(upgradeApartment(loaded,b.id,{x:6,y:4}),/already/);
 assert.equal(loaded.funds,city.funds);
 assert.match(place(loaded,'bulldoze',b.x,b.y),new RegExp(`\\$${COSTS.apartment+APARTMENT_ENTRANCE_UPGRADE_COST} refund`));
 assert.equal(loaded.funds,10000);
 place(loaded,'bulldoze',b.x,b.y);assert.equal(loaded.funds,10000);
});

test('unaffordable, obstructed and out-of-bounds second entrances leave the town intact',()=>{
 for(const reason of ['funds','building','edge']){
  const city=createCity();city.funds=10000;place(city,'apartment',5,reason==='edge'?0:5);
  const b=city.buildings[0];
  if(reason==='funds')city.funds=199;
  if(reason==='building')assert.match(place(city,'home',6,3,2),/built/);
  const before=JSON.stringify(city);upgradeApartment(city,b.id,reason==='edge'?{x:6,y:-1}:{x:6,y:4});assert.equal(JSON.stringify(city),before);
 }
});

test('upgraded access is protected from construction and malformed upgrade saves reject',()=>{
 const city=createCity();city.funds=10000;place(city,'apartment',5,5);const b=city.buildings[0];upgradeApartment(city,b.id,{x:6,y:4});
 assert.match(place(city,'home',6,3,2),/entrance/);
 const raw=JSON.parse(JSON.stringify(city));
 for(const fields of [{entranceCount:3},{entranceCount:1,entranceUpgradePaid:200},{entranceUpgradePaid:201},{secondEntrance:{x:6,y:6}},{secondEntrance:{x:5,y:9}},{secondEntrance:{x:4,y:4}},{secondEntrance:undefined}]){
  const bad=structuredClone(raw);Object.assign(bad.buildings[0],fields);assert.equal(parseCity(bad),null);
 }
});

test('active apartment journeys and emergencies prevent removal',()=>{
 const city=createCity();city.funds=10000;place(city,'apartment',2,3);const b=city.buildings[0];
 for(let x=2;x<=11;x++)place(city,'road',x,7);place(city,'store',10,5);stepCity(city,5);
 assert.ok(city.trips.some(t=>t.homeId===b.id));assert.match(place(city,'bulldoze',b.x,b.y),/car out/);
 createApartmentIncident(city,b.id);assert.match(place(city,'bulldoze',b.x,b.y),/emergency/);
 assert.ok(parseCity(JSON.parse(JSON.stringify(city))));
});

 test('choosing an entrance is required before the upgrade charges or changes population',()=>{
 const city=createCity();city.funds=10000;place(city,'apartment',5,5);const b=city.buildings[0];
 const before=JSON.stringify(city);assert.match(upgradeApartment(city,b.id),/Choose/);assert.equal(JSON.stringify(city),before);
 });

test('all fifteen edge choices preserve the primary driveway in every rotation',async()=>{
 const {apartmentEntranceOptions}=await import('./cityModel.ts');
 for(let rotation=0;rotation<4;rotation++){
  const city=createCity();city.funds=10000;place(city,'apartment',5,5,rotation);
  const b=city.buildings[0],primary=entrances(b)[0],options=apartmentEntranceOptions(city,b);
  assert.equal(options.length,15);
  for(const selected of options){
   const copy=parseCity(JSON.parse(JSON.stringify(city)))!;assert.ok(copy);
   assert.match(upgradeApartment(copy,b.id,selected),/entrance open/);
   assert.deepEqual(entrances(copy.buildings[0]),[primary,selected]);
   assert.ok(parseCity(JSON.parse(JSON.stringify(copy))));
  }
 }
});
