import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,place,stepCity,parseCity,type City,type Point} from './cityModel.ts';
import {allowsRoadStep,roadEdgeKey} from './cityDirections.ts';
import {applyRoadDirections} from './cityDirectionEdits.ts';

const ring:Point[]=[[14,14],[15,14],[16,14],[16,15],[16,16],[15,16],[14,16],[14,15],[14,14]].map(([x,y])=>({x,y}));
/** Each case makes the actual home travel across the ring; no same-arm destination shortcut. */
function ringTown(arm:number):City {
  const c=createCity();c.funds=100000;c.tutorial!.status='complete';c.map={x:0,y:0,width:32,height:32};
  for(const p of ring)place(c,'road',p.x,p.y);
  for(let a=4;a<=26;a++)if(a<14||a>16){place(c,'road',a,15);place(c,'road',15,a);}
  const homes=[[5,13,0],[22,16,2],[16,5,1],[13,22,3]],stores=[[24,13,0],[4,16,2],[16,24,1],[13,3,3]];
  const [hx,hy,hr]=homes[arm],[sx,sy,sr]=stores[arm];
  place(c,'home',hx,hy,hr);place(c,'store',sx,sy,sr);
  assert.equal(c.buildings.length,2);
  assert.equal(applyRoadDirections(c,ring,'forward').ok,true);
  return c;
}
function observe(c:City,seconds:number){
  let visited=false,returned=false;const crossed=new Set<string>();
  for(let i=0;i<seconds*40;i++){
    const before=new Map(c.trips.map(t=>[t.id,{path:t.path,progress:t.progress}]));
    stepCity(c,.025);
    for(const t of c.trips){
      if(t.phase==='visiting')visited=true;
      for(let n=1;n<t.path.length;n++)assert.ok(allowsRoadStep(c,t.path[n-1],t.path[n]),'adopted path respects every directed connection');
      const old=before.get(t.id);
      if(old&&old.path===t.path&&Math.floor(old.progress)!==Math.floor(t.progress)){
        const a=t.path[Math.floor(old.progress)],b=t.path[Math.floor(t.progress)];
        assert.ok(allowsRoadStep(c,a,b),'actual boundary movement respects direction');
        const edge=roadEdgeKey(a,b);if(c.roadDirections?.[edge])crossed.add(edge);
      }
    }
    returned ||= c.history.some(h=>h.service?.purpose==='shopping'&&h.service.homeId===c.buildings[0].id);
  }
  return {visited,returned,crossed};
}
for(let arm=0;arm<4;arm++)test(`one-way eight-tile ring serves and returns a real household from arm ${arm+1}`,()=>{
  const c=ringTown(arm),result=observe(c,180);
  assert.ok(result.visited);assert.ok(result.returned);assert.equal(result.crossed.size,8,'outbound plus homeward journey uses the whole ring');
  assert.equal(c.accidentCount,0);assert.ok(c.completed>=3);
});

test('closed one-way ring preserves journeys and directions through reload, then recovers actual service',()=>{
  let c=ringTown(0);observe(c,6);
  const geometry=structuredClone([c.roads,c.buildings]);const directions=structuredClone(c.roadDirections);
  c.closures.push({x:15,y:14});observe(c,15);
  const before=structuredClone(c.trips);const loaded=parseCity(JSON.parse(JSON.stringify(c)));assert.ok(loaded);c=loaded;
  assert.deepEqual(c.trips,before,'reload preserves blocked real journeys');assert.deepEqual(c.roadDirections,directions);
  c.closures=[];const result=observe(c,180);
  assert.ok(result.returned,'opening the closure must restore real returns');assert.equal(c.accidentCount,0);
  assert.deepEqual([c.roads,c.buildings],geometry);assert.deepEqual(c.roadDirections,directions);
});

test('three simultaneous arms share the ring and every household completes shopping returns',()=>{
  const c=ringTown(0);place(c,'home',16,5,1);place(c,'home',13,22,3);
  const homes=c.buildings.filter(b=>b.kind==='home').map(b=>b.id),returned=new Set<number>();
  for(let i=0;i<24000;i++){
    stepCity(c,.025);
    for(const h of c.history)if(h.service?.purpose==='shopping')returned.add(h.service.homeId);
    for(const t of c.trips)for(let n=1;n<t.path.length;n++)assert.ok(allowsRoadStep(c,t.path[n-1],t.path[n]));
  }
  assert.deepEqual([...returned].sort(),homes.sort(),'safe service must not starve any entering arm');
  assert.equal(c.accidentCount,0);assert.ok(c.completed>30);
});

for(const service of ['police','ems','fire'] as const)test(`${service} follows the ring to a real scene, works, reloads and returns legally`,()=>{
  let c=ringTown(0);c.buildings=[];
  place(c,service==='police'?'policeStation':service==='ems'?'hospital':'fireStation',4,13);
  c.incidents.push({id:c.nextId++,x:25,y:15,severity:'fire',status:'active',createdAt:0,required:['police','ems','fire'],completedServices:[],rescueDeadline:90,outcome:'pending'});
  c.accidentCount=1;let dispatched:number|undefined;
  for(let i=0;i<7200;i++){
    stepCity(c,.025);
    for(const t of c.trips){
      if(t.service===service)dispatched??=t.id;
      for(let n=1;n<t.path.length;n++)assert.ok(allowsRoadStep(c,t.path[n-1],t.path[n]),'response and routine return both respect one-way flow');
    }
    if(i===240){const loaded=parseCity(JSON.parse(JSON.stringify(c)));assert.ok(loaded);assert.deepEqual(loaded.trips,c.trips);c=loaded;}
  }
  assert.ok(dispatched!==undefined);assert.ok(c.incidents[0].completedServices.includes(service));
  assert.ok(!c.trips.some(t=>t.id===dispatched),'original assigned crew must return physically to its station');
});
