import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,place,stepCity,parseCity,type Trip} from './cityModel.ts';
function fixture(){
 const city=createCity();city.funds=10000;
 for(const [x,kind] of [[1,'policeStation'],[5,'hospital'],[9,'fireStation']] as const)place(city,kind,x,1);
 for(let x=1;x<=13;x++)place(city,'road',x,3);
 for(let y=4;y<=8;y++)place(city,'road',8,y);
 const scene={id:city.nextId++,x:8,y:8,severity:'fire' as const,status:'active' as const,createdAt:0,required:['police','ems','fire'] as const,
 completedServices:[] as ('police'|'ems'|'fire')[],rescueDeadline:90,outcome:'rescued' as const};
 city.incidents.push({...scene,required:[...scene.required]});city.accidentCount=1;city.rescuedCount=1;
 for(const [i,kind] of ['police','ems','fire'].entries())city.trips.push({id:city.nextId++,homeId:0,storeId:0,service:kind as Trip['service'],stationId:city.buildings[i].id,incidentId:scene.id,
 phase:'working',sceneParked:true,path:[{x:8,y:7}],target:{x:8,y:7},progress:0,hold:0,wait:0,workRemaining:1});
 return city;
}
test('three crews share scene parking, clear a crash, reload and all return after access reopens',()=>{
 const city=fixture();place(city,'closure',8,5);stepCity(city,2);
 assert.equal(city.incidents[0].status,'cleared');assert.equal(city.trips.length,3);
 assert.ok(city.trips.every(t=>t.sceneParked&&t.workRemaining===0));
 const loaded=parseCity(JSON.parse(JSON.stringify(city)));assert.ok(loaded);
 place(loaded,'closure',8,5);
 const ids=loaded.trips.map(t=>t.id);stepCity(loaded,40);
 assert.ok(ids.every(id=>!loaded.trips.some(t=>t.id===id)),'every original crew must return');
 assert.deepEqual([...loaded.incidents[0].completedServices].sort(),['ems','fire','police']);
 assert.ok(parseCity(JSON.parse(JSON.stringify(loaded))));
});
test('an old completed crew stuck turning at the scene recovers without a city reset',()=>{
 const city=fixture();city.trips=city.trips.slice(0,1);const car=city.trips[0];
 city.incidents[0].completedServices=['police','ems','fire'];city.incidents[0].status='cleared';
 delete car.sceneParked;car.phase='returning';car.path=[{x:8,y:6},{x:8,y:7},{x:8,y:6},{x:8,y:5},{x:8,y:4},{x:8,y:3},{x:7,y:3},{x:6,y:3},{x:5,y:3},{x:4,y:3},{x:3,y:3},{x:2,y:3}];car.target={x:2,y:3};car.progress=1.5;car.hold=10;car.wait=10;car.workRemaining=0;city.elapsed=10;
 const saved=parseCity(JSON.parse(JSON.stringify(city)));assert.ok(saved);
 const original=saved.trips[0],id=original.id;
 stepCity(saved,.025);assert.ok(original.progress<1.5&&original.progress>1,'back up physically, not a position snap');
 stepCity(saved,30);assert.ok(!saved.trips.some(t=>t.id===id));assert.ok(parseCity(JSON.parse(JSON.stringify(saved))));
});
