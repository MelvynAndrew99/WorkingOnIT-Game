import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity, entrance, isResidential, parseCity, stepCity, type City} from './cityModel.ts';
import {buildingStatus, homeRoadIssue, homeRoadIssues} from './cityVisits.ts';

function town() {
 const c = createCity();
 c.buildings = [{id:1,kind:'home',x:0,y:0,rotation:0}, {id:2,kind:'store',x:5,y:0,rotation:0}];
 const a = entrance(c.buildings[0]), b = entrance(c.buildings[1]);
 c.roads = [];
 for(let x=a.x;x<=b.x;x++)c.roads.push({x,y:a.y});
 for(let y=a.y+1;y<=b.y;y++)c.roads.push({x:b.x,y});
 c.closures=[];c.incidents=[];delete c.roadDirections;delete c.wideRoadWorks;delete c.wideRoads;
 return c;
}
function check(c:City) {
 const before=JSON.stringify(c);
 const issues=homeRoadIssues(c);
 assert.deepEqual([...issues],c.buildings.filter(isResidential).map(b=>[b.id,homeRoadIssue(c,b)]));
 for(const b of c.buildings.filter(isResidential))assert.deepEqual(buildingStatus(c,b,issues),buildingStatus(c,b));
 assert.equal(JSON.stringify(c),before,'reading warnings never changes saved state');
 return issues;
}
test('warnings update immediately for road edits, diversions, crashes, directions and roadwork',()=>{
 const c=town();assert.equal(check(c).get(1),null);
 const p=c.roads[2],old={...p};p.y+=10;assert.equal(check(c).get(1),'No route to Store');
 Object.assign(p,old);assert.equal(check(c).get(1),null);
 c.roads[2]={x:p.x,y:p.y+10};check(c);c.roads[2]=old;check(c);
 c.closures.push({...old});assert.equal(check(c).get(1),'No route to Store');
 c.closures[0].y+=10;assert.equal(check(c).get(1),null);c.closures=[];
 c.incidents=[{id:1,...old,status:'active',severity:'minor',required:['police'],completedServices:[],createdAt:0,rescueDeadline:null,outcome:'none'}];
 assert.equal(check(c).get(1),'No route to Store');c.incidents[0].status='cleared';assert.equal(check(c).get(1),null);
 const next=c.roads[3];c.roadDirections={[`${old.x},${old.y}>${next.x},${next.y}`]:'forward'};
 assert.equal(check(c).get(1),'Return route blocked');
 c.roadDirections[Object.keys(c.roadDirections)[0]]='reverse';assert.equal(check(c).get(1),'No route to Store');
 delete c.roadDirections;
 c.wideRoadWorks=[{section:{...old,axis:'horizontal'},remaining:3,paid:40}];check(c);
 c.wideRoadWorks[0].section.y+=10;assert.equal(check(c).get(1),null);
 c.wideRoadWorks=[];c.closures=[{...c.roads[0]}];assert.equal(check(c).get(1),'Return route blocked','blocked start may escape but cannot receive a return');
});
test('warnings track stores and every apartment entrance, including in-place building edits',()=>{
 const c=town();check(c);const shop=c.buildings.pop()!;
 assert.equal(check(c).get(1),'No Store built');c.buildings.push(shop);assert.equal(check(c).get(1),null);
 shop.x+=10;assert.equal(check(c).get(1),'No route to Store');shop.x-=10;check(c);
 const home=c.buildings[0];home.rotation=1;check(c);home.rotation=0;check(c);
 home.kind='apartment';home.entranceCount=2;home.secondEntrance={...c.roads[0]};assert.equal(check(c).get(1),null);
 home.secondEntrance.y+=10;assert.equal(check(c).get(1),'Entrance needs a road');
 home.secondEntrance={...c.roads[0]};check(c);home.entranceCount=1;check(c);
 c.buildings.shift();assert.equal(check(c).size,0);
});
test('unchanged access reuses results despite time, funds and completions; cities stay isolated',()=>{
 const c=town(),cached=check(c);c.elapsed+=1;c.funds+=1;c.completed+=1;
 assert.equal(check(c),cached);
 const copy=structuredClone(c);assert.notEqual(check(copy),cached);
 copy.roads=[];check(copy);assert.equal(check(c),cached);
 const loaded=parseCity(JSON.parse(JSON.stringify(createCity())));assert.ok(loaded);check(loaded);
});
test('warning reads preserve a live simulation through edits and reload',()=>{
 let a=createCity(),b=structuredClone(a);
 for(let i=0;i<180;i++){
  if(i===40){a.closures.push({...a.roads[0]});b.closures.push({...b.roads[0]});}
  if(i===80){a.closures=[];b.closures=[];}
  if(i===120){a=parseCity(JSON.parse(JSON.stringify(a)))!;b=parseCity(JSON.parse(JSON.stringify(b)))!;assert.ok(a&&b);}
  check(a);stepCity(a,1/30);stepCity(b,1/30);assert.deepEqual(a,b);
 }
});
