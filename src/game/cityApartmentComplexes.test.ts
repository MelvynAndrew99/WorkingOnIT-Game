import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity, place, upgradeApartment, parseCity} from './cityModel.ts';
import {apartmentComplexSummary, joinApartmentComplex, parseApartmentComplexes, pruneApartmentComplexes} from './cityApartmentComplexes.ts';

function fixture() {
  const city=createCity();city.funds=20000;city.map={x:0,y:0,width:28,height:18};
  for(const x of [1,7,13,19])assert.match(place(city,'apartment',x,1),/built/);
  for(let x=1;x<=19;x++)assert.match(place(city,'road',x,5),/built/);
  city.communityRoads=city.roads.map(p=>({...p}));
  const ids=city.buildings.map(b=>b.id);
  return {city,ids};
}

test('joins and merges connected blocks with canonical IDs while leaving individual buildings and journeys intact',()=>{
  const {city,ids}=fixture();
  const unchanged=JSON.stringify({buildings:city.buildings,trips:city.trips,households:city.households,roads:city.roads,funds:city.funds,nextId:city.nextId});
  assert.match(joinApartmentComplex(city,ids[1],ids[0]),/Complex joined/);
  assert.deepEqual(city.apartmentComplexes,[{id:ids[0],buildingIds:ids.slice(0,2)}]);
  assert.match(joinApartmentComplex(city,ids[3],ids[2]),/Complex joined/);
  assert.match(joinApartmentComplex(city,ids[1],ids[3]),/Complex joined/);
  assert.deepEqual(city.apartmentComplexes,[{id:ids[0],buildingIds:ids}]);
  assert.deepEqual(apartmentComplexSummary(city,ids[2]),{id:ids[2],blocks:4,residents:16,connected:true});
  assert.equal(JSON.stringify({buildings:city.buildings,trips:city.trips,households:city.households,roads:city.roads,funds:city.funds,nextId:city.nextId}),unchanged);
  assert.match(joinApartmentComplex(city,ids[0],ids[1]),/already belong/);
  assert.ok(parseCity(JSON.parse(JSON.stringify(city))));
});

test('joining requires an unbroken community road connection at enabled entrances and rejects invalid selections without mutation',()=>{
  const {city,ids}=fixture();
  city.communityRoads=city.communityRoads!.filter(p=>p.x!==4);
  const before=JSON.stringify(city);
  assert.match(joinApartmentComplex(city,ids[0],ids[1]),/continuous community roads/);
  assert.match(joinApartmentComplex(city,ids[0],ids[0]),/different/);
  assert.match(joinApartmentComplex(city,ids[0],9999),/two apartment/);
  assert.equal(JSON.stringify(city),before,'ordinary connecting pavement is insufficient and failed join changes nothing');
  city.communityRoads.push({x:4,y:5});
  city.communityRoads=city.communityRoads.filter(p=>p.x!==1);
  assert.match(joinApartmentComplex(city,ids[0],ids[1]),/continuous community roads/);
  city.communityRoads.push({x:1,y:5});
  assert.match(joinApartmentComplex(city,ids[0],ids[1]),/Complex joined/);
});

test('saved complex persists across road severance and reports restored access after reconnecting',()=>{
  const {city,ids}=fixture();
  assert.match(joinApartmentComplex(city,ids[0],ids[1]),/Complex joined/);
  assert.match(place(city,'bulldoze',4,5),/Removed/);
  city.communityRoads=city.communityRoads!.filter(p=>p.x!==4);
  assert.equal(apartmentComplexSummary(city,ids[0])!.connected,false);
  assert.deepEqual(parseApartmentComplexes(city.apartmentComplexes,city),city.apartmentComplexes);
  const loaded=parseCity(JSON.parse(JSON.stringify(city)));assert.ok(loaded);
  assert.deepEqual(loaded.apartmentComplexes,city.apartmentComplexes);
  assert.equal(apartmentComplexSummary(loaded,ids[0])!.connected,false);
  assert.match(place(loaded,'road',4,5),/built/);(loaded.communityRoads??=[]).push({x:4,y:5});
  assert.equal(apartmentComplexSummary(loaded,ids[0])!.connected,true);
});

test('aggregate residents follow individual upgrades and removal preserves remaining members with canonical ID',()=>{
  const {city,ids}=fixture();
  assert.match(joinApartmentComplex(city,ids[0],ids[1]),/Complex joined/);
  assert.match(joinApartmentComplex(city,ids[1],ids[2]),/Complex joined/);
  assert.match(place(city,'road',6,3),/built/);
  assert.match(upgradeApartment(city,ids[1],{x:6,y:3}),/entrance open/);
  assert.equal(apartmentComplexSummary(city,ids[0])!.residents,14);
  city.buildings=city.buildings.filter(b=>b.id!==ids[0]);pruneApartmentComplexes(city);
  assert.deepEqual(city.apartmentComplexes,[{id:ids[1],buildingIds:[ids[1],ids[2]]}]);
  assert.equal(apartmentComplexSummary(city,ids[1])!.residents,10);
  city.buildings=city.buildings.filter(b=>b.id!==ids[1]);pruneApartmentComplexes(city);
  assert.equal(city.apartmentComplexes,undefined);
  assert.deepEqual(apartmentComplexSummary(city,ids[2]),{id:ids[2],blocks:1,residents:4,connected:true});
});

test('parser rejects duplicate, absent and non-apartment members and noncanonical saved IDs',()=>{
  const {city,ids}=fixture();
  assert.match(place(city,'store',1,9),/built/);
  const store=city.buildings.find(b=>b.kind==='store')!;
  const group=(buildingIds:number[],id=buildingIds[0])=>({id,buildingIds});
  for(const raw of [null,{},[group([ids[0]])],[group([ids[0],ids[0]])],[group([ids[0],999])],
    [group([ids[0],store.id])],[group([ids[0],ids[1]]),group([ids[1],ids[2]])],
    [group([ids[0],ids[1]],ids[1])]])assert.equal(parseApartmentComplexes(raw,city),null);
  assert.equal(parseApartmentComplexes(undefined,city),undefined);
  assert.equal(parseApartmentComplexes([],city),undefined);
  assert.deepEqual(parseApartmentComplexes([group([ids[1],ids[0]],ids[0])],city),[group([ids[0],ids[1]])]);
});

test('a chosen upgraded entrance can join a community network when the primary entrance cannot',()=>{
  const {city,ids}=fixture();
  city.communityRoads=city.communityRoads!.filter(p=>p.x!==1);
  for(const p of [{x:0,y:3},{x:0,y:4},{x:0,y:5},{x:0,y:6},{x:1,y:6},{x:2,y:6}]) {
    assert.match(place(city,'road',p.x,p.y),/built/);city.communityRoads.push(p);
  }
  assert.match(joinApartmentComplex(city,ids[0],ids[1]),/continuous community roads/);
  assert.match(upgradeApartment(city,ids[0],{x:0,y:3}),/entrance open/);
  assert.match(joinApartmentComplex(city,ids[0],ids[1]),/Complex joined/);
  assert.equal(apartmentComplexSummary(city,ids[0])!.connected,true);
});
