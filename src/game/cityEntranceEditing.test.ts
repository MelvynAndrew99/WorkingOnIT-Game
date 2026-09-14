import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,place,entrances,footprint,upgradeBuildingEntrance,editBuildingEntrance,buildingEntranceEditOptions,parseCity,stepCity} from './cityModel.ts';
import {FRAMES} from './cityAtlas.ts';
import {lotFrame} from './cityLotArt.ts';
import {createBuildingIncident} from './cityIncidents.ts';

for(const kind of ['apartment','office'] as const)test(`${kind}: edits preserve lot, capacity, paid upgrade and saved sprite geometry`,()=>{
 const city=createCity();city.funds=10000;place(city,kind,5,5);const b=city.buildings[0];
 const lot=footprint(b).sort((a,b)=>a.x-b.x||a.y-b.y),funds=city.funds;
 for(const target of buildingEntranceEditOptions(city,b,'primary')){
  assert.equal(editBuildingEntrance(city,b.id,'primary',target).ok,true);
  assert.deepEqual(entrances(b),[target]);assert.ok(FRAMES[lotFrame(b)]);
  assert.equal(b.entranceCount??1,1);assert.equal(city.funds,funds);
 }
 upgradeBuildingEntrance(city,b.id,{x:6,y:4});const paid=b.entranceUpgradePaid,cash=city.funds;
 for(const target of buildingEntranceEditOptions(city,b,'secondary')){
  const first=entrances(b)[0];assert.equal(editBuildingEntrance(city,b.id,'secondary',target).ok,true);
  assert.deepEqual(entrances(b),[first,target]);assert.ok(FRAMES[lotFrame(b)]);
 }
 for(const target of buildingEntranceEditOptions(city,b,'primary')){
  const second=b.secondEntrance;assert.equal(editBuildingEntrance(city,b.id,'primary',target).ok,true);
  assert.deepEqual(entrances(b),[target,second]);assert.ok(FRAMES[lotFrame(b)]);
 }
 assert.deepEqual(footprint(b).sort((a,b)=>a.x-b.x||a.y-b.y),lot);
 assert.equal(city.funds,cash);assert.equal(b.entranceUpgradePaid,paid);assert.equal(b.entranceCount,2);
 assert.deepEqual(parseCity(JSON.parse(JSON.stringify(city)))?.buildings,city.buildings);
});

test('invalid, duplicate, occupied and out-of-bounds edits are atomic',()=>{
 const city=createCity();city.funds=10000;place(city,'apartment',5,5);const b=city.buildings[0];
 const initial=JSON.stringify(city);assert.equal(editBuildingEntrance(city,b.id,'secondary',{x:6,y:4}).ok,false);assert.equal(JSON.stringify(city),initial);
 upgradeBuildingEntrance(city,b.id,{x:6,y:4});place(city,'home',3,5);
 for(const [slot,target] of [['primary',{x:4,y:5}],['primary',{x:6,y:4}],['secondary',entrances(b)[0]],['secondary',{x:5,y:5}],['secondary',{x:6.5,y:4}],['secondary',{x:-1,y:5}]] as const){
  const before=JSON.stringify(city);assert.equal(editBuildingEntrance(city,b.id,slot,target).ok,false);assert.equal(JSON.stringify(city),before);
 }
});

test('live journeys and building emergencies prevent entrance relocation',()=>{
 const city=createCity();city.funds=10000;place(city,'apartment',2,3);const b=city.buildings[0];
 for(let x=2;x<=11;x++)place(city,'road',x,7);place(city,'store',10,5);stepCity(city,5);
 assert.ok(city.trips.some(t=>t.homeId===b.id));let before=JSON.stringify(city);
 assert.equal(editBuildingEntrance(city,b.id,'primary',{x:1,y:3}).ok,false);assert.equal(JSON.stringify(city),before);
 const emergency=createCity();emergency.funds=10000;place(emergency,'office',5,5);const office=emergency.buildings[0];createBuildingIncident(emergency,office.id,'minor');before=JSON.stringify(emergency);
 assert.match(editBuildingEntrance(emergency,office.id,'primary',{x:4,y:5}).message,/emergency/);assert.equal(JSON.stringify(emergency),before);
});
