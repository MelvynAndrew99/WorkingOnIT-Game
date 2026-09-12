import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,place,stepCity,type Point,type Trip} from './cityModel.ts';
import {applyRoadDirections} from './cityDirectionEdits.ts';

function bentRoad(directedPoints=5){
  const city=createCity();city.funds=100000;city.tutorial!.status='complete';city.map={x:0,y:0,width:32,height:32};
  const path:Point[]=[[10,10],[11,10],[12,10],[12,11],[13,11],[14,11],[15,11]].map(([x,y])=>({x,y}));
  for(const p of path)place(city,'road',p.x,p.y);
  assert.ok(applyRoadDirections(city,path.slice(0,directedPoints),'forward').ok);
  if(city.nextId%2)city.nextId++;
  const trip:Trip={id:city.nextId++,homeId:0,storeId:0,path,progress:0,wait:0,hold:0};city.trips.push(trip);
  return {city,trip};
}
test('second lane merges before consecutive bends ending at a two-way exit',()=>{
  const {city,trip}=bentRoad();let usedSecondLane=false;
  for(let i=0;i<1600;i++){stepCity(city,.025);usedSecondLane ||= trip.trafficLane===1;}
  assert.ok(usedSecondLane,'actual lane choice must exercise the second lane');
  assert.equal(city.completed,1,`must clear two-way exit, progress=${trip.progress}, lane=${trip.trafficLane}`);
});

test('second-lane vehicle stopped on a bend can take a newly required two-way detour',()=>{
  const {city,trip}=bentRoad(7);
  for(const [x,y] of [[12,9],[13,9],[14,9],[15,9],[15,10]])place(city,'road',x,y);
  place(city,'home',14,12,2);assert.equal(city.buildings.length,1);trip.homeId=city.buildings[0].id;
  let reachedBend=false;
  for(let i=0;i<200;i++){
    stepCity(city,.025);
    if(trip.trafficLane===1&&Math.abs(trip.progress-2)<1e-9){reachedBend=true;break;}
  }
  assert.ok(reachedBend,'vehicle physically reaches bend using second lane');
  city.closures.push({...trip.path[3]});
  for(let i=0;i<1600;i++)stepCity(city,.025);
  assert.equal(city.completed,1,`existing clear detour must be usable, progress=${trip.progress}, lane=${trip.trafficLane}, phase=${trip.phase}`);
});
