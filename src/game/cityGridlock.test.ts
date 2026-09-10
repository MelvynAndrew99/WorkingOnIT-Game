import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,place,type Trip} from './cityModel.ts';
import {roadIndex,trafficTick,TRAFFIC_TICK} from './cityTraffic.ts';
function town(){const city=createCity();city.funds=10000;return city;}
function tick(city:ReturnType<typeof town>,seconds:number){for(let n=0;n<seconds/TRAFFIC_TICK;n++){city.elapsed+=TRAFFIC_TICK;trafficTick(city,roadIndex(city));}}
test('EMS at a stop can turn into a free lane while an opposing exit car yields',()=>{
 const city=town();
 for(let x=3;x<=8;x++)place(city,'road',x,5);
 for(let y=2;y<=7;y++)place(city,'road',5,y);
 place(city,'stop',5,5);
 const ems:Trip={id:city.nextId++,homeId:0,storeId:0,service:'ems',phase:'outbound',stationId:99,incidentId:100,
 path:[{x:5,y:3},{x:5,y:4},{x:5,y:5},{x:6,y:5},{x:7,y:5}],progress:1.5,wait:0,hold:0,target:{x:7,y:5}};
 const car:Trip={id:city.nextId++,homeId:0,storeId:0,phase:'returning',path:[{x:7,y:5},{x:6,y:5},{x:5,y:5},{x:4,y:5}],progress:1,wait:0,hold:0};
 city.trips=[ems,car];tick(city,.4);assert.ok(ems.progress>1.5,'opposing exit lane must not deadlock a clear junction');
});
test('a long-stopped civilian uses a new bypass without a diversion or destination change',()=>{
 const city=town();place(city,'home',0,1);place(city,'store',10,1);
 for(let x=1;x<=11;x++)place(city,'road',x,3);
 const target={x:11,y:3};
 const car:Trip={id:city.nextId++,homeId:city.buildings[0].id,storeId:city.buildings[1].id,phase:'outbound',purpose:'shopping',target,
 path:Array.from({length:11},(_,i)=>({x:i+1,y:3})),progress:2.5,wait:0,hold:12};
 const blocker:Trip={id:city.nextId++,homeId:0,storeId:0,phase:'waiting',resume:'returning',path:[{x:4,y:3}],progress:0,wait:20,hold:20};
 city.trips=[car,blocker];tick(city,2);assert.equal(car.progress,2.5,'no needless reversing without a bypass');
 for(let x=2;x<=6;x++)place(city,'road',x,4);
 tick(city,10);assert.ok(car.path.some(p=>p.y===4),'new road should be discovered automatically');
 assert.deepEqual(car.target,target);assert.equal(car.storeId,city.buildings[1].id);
});

for(const service of ['ems','police','fire'] as const)test(`${service}: a vehicle occupying the scene approach clears instead of yielding forever`,()=>{
 const city=town();
 for(let x=2;x<=7;x++)place(city,'road',x,5);
 for(let y=2;y<=7;y++)place(city,'road',5,y);
 // EMS needs the first exit tile north of the junction to work at a scene.
 // An oncoming civilian occupies that tile and is about to enter the junction.
 const ems:Trip={id:city.nextId++,homeId:0,storeId:0,service,phase:'outbound',stationId:99,incidentId:100,
 path:[{x:5,y:7},{x:5,y:6},{x:5,y:5},{x:5,y:4}],progress:1.5,wait:500,hold:500,target:{x:5,y:4}};
 const car:Trip={id:city.nextId++,homeId:0,storeId:0,phase:'returning',path:[{x:5,y:3},{x:5,y:4},{x:5,y:5},{x:5,y:6},{x:5,y:7}],progress:1,wait:500,hold:500};
 city.trips=[ems,car];
 city.incidents.push({id:100,x:5,y:3,severity:'fire',status:'active',createdAt:0,required:['police','ems','fire'],completedServices:[],rescueDeadline:90,outcome:'pending'});
 const old=car.progress;tick(city,.4);
 assert.ok(car.progress>old,'the blocking car must clear for the responder');
 tick(city,2);assert.equal(ems.phase,'working','response reaches the scene after the car clears');
});
