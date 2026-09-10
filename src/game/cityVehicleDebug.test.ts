import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,place,type Trip} from './cityModel.ts';
import {debugVehicles,vehicleDebug} from './cityTraffic.ts';
test('debug identifies conflicting vehicle reservations without mutating the city',()=>{
 const city=createCity();city.funds=10000;for(let x=0;x<8;x++)place(city,'road',x,3);
 const car:Trip={id:city.nextId++,homeId:0,storeId:0,phase:'returning',service:'police',stationId:10,path:[{x:1,y:3},{x:2,y:3},{x:3,y:3}],progress:.5,hold:10,wait:10};
 const blocker:Trip={id:city.nextId++,homeId:0,storeId:0,phase:'waiting',path:[{x:2,y:3}],progress:0,hold:10,wait:10};
 city.trips=[car,blocker];const before=structuredClone(city),info=debugVehicles(city);
 assert.equal(info[0].emergency,false);assert.equal(info[0].intent,'returning');assert.deepEqual(info[0].blockerIds,[blocker.id]);assert.match(info[0].reason,/occupied/);
 info[0].path[0].x=999;assert.deepEqual(city,before);
});
test('debug separates disconnected parked return from work and outbound response',()=>{
 const city=createCity();city.funds=10000;place(city,'hospital',1,1);place(city,'road',2,3);place(city,'road',6,3);
 const car:Trip={id:city.nextId++,homeId:0,storeId:0,stationId:city.buildings[0].id,service:'ems',phase:'working',sceneParked:true,path:[{x:6,y:3}],progress:0,hold:0,wait:0,workRemaining:0};
 city.trips=[car];assert.match(vehicleDebug(city,car).reason,/no open road route back/);
 car.workRemaining=5;assert.match(vehicleDebug(city,car).reason,/crew working/);
 delete car.sceneParked;car.phase='outbound';assert.equal(vehicleDebug(city,car).emergency,true);
});
