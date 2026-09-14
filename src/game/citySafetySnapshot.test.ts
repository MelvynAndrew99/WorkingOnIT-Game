import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity} from './cityModel.ts';
import {intersectionSafetySnapshot} from './cityIncidents.ts';
import {withRoadIndex} from './cityTraffic.ts';

function town(){
 const city=createCity();
 city.roads=[{x:2,y:2},{x:1,y:2},{x:3,y:2},{x:2,y:1},{x:2,y:3}];
 city.elapsed=10;
 city.incidents=[{id:1,x:2,y:2,severity:'minor',status:'active',createdAt:1,required:['police'],completedServices:[],rescueDeadline:null,outcome:'none'}];
 return city;
}

test('intersection report preserves state, composes with an existing scope and sees later edits',()=>{
 const city=town(),before=JSON.stringify(city);
 const expected=intersectionSafetySnapshot(city);
 assert.equal(expected.length,1);assert.equal(expected[0].state,'incident');
 assert.deepEqual(withRoadIndex(city,()=>intersectionSafetySnapshot(city)),expected);
 assert.equal(JSON.stringify(city),before);
 expected[0].state='quiet';assert.equal(intersectionSafetySnapshot(city)[0].state,'incident','returned report is independent');
 city.incidents[0].status='cleared';
 assert.equal(intersectionSafetySnapshot(city)[0].state,'quiet');
 city.controls=[{x:2,y:2,kind:'stop',preset:'balanced'}];
 assert.equal(intersectionSafetySnapshot(city)[0].control,'stop');
 city.roads[0].x=12;
 assert.deepEqual(intersectionSafetySnapshot(city),[],'same-count in-place road edits do not retain the old index');
});

test('a failed intersection report releases its read scope',()=>{
 const city=town();const risks=city.risks;
 Object.defineProperty(city,'risks',{configurable:true,get(){throw Error('interrupted read');}});
 assert.throws(()=>intersectionSafetySnapshot(city),/interrupted read/);
 Object.defineProperty(city,'risks',{configurable:true,writable:true,value:risks});
 city.roads[0].x=12;
 assert.deepEqual(intersectionSafetySnapshot(city),[]);
});
