import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity,findPath,plannedRoadPath,parseCity,place,type Point} from './cityModel.ts';
import {allowsRoadStep,roadEdgeKey,roadDirectionForStep,directionSignature,parseRoadDirections} from './cityDirections.ts';
import {routingSnapshot,weightedRoute,routeCost,responseRoute} from './cityRouting.ts';
const p=(x:number,y=5):Point=>({x,y});
function line(){const c=createCity();c.roads=[p(4),p(5),p(6),p(7)];return c;}
function direct(c:ReturnType<typeof createCity>,a:Point,b:Point){(c.roadDirections??={})[roadEdgeKey(a,b)]=roadDirectionForStep(a,b);}
test('every routing view obeys one-way connections including custom avoidance and planned closures',()=>{
 const c=line();direct(c,p(5),p(6));
 const check=()=>{
  for(const responding of [false,true])for(const avoid of [new Set<string>(),new Set(['99,99'])])assert.equal(findPath(c,p(7),p(4),responding,avoid),null);
  assert.equal(plannedRoadPath(c,p(7),p(4)),null);
  for(const response of [false,true])assert.equal(weightedRoute(routingSnapshot(c,undefined,response),p(7),p(4)),null);
 };
 check();assert.deepEqual(findPath(c,p(4),p(7)),c.roads);
 c.closures=[p(6)];check();assert.equal(findPath(c,p(4),p(7)),null);
 assert.deepEqual(plannedRoadPath(c,p(4),p(7)),c.roads);
 assert.deepEqual(findPath(c,p(4),p(7),true),c.roads);
 assert.equal(responseRoute(routingSnapshot(c,undefined,true),p(7),p(3)),null);
});
test('bends and ring branches retain legal exits with a distinct legal return journey',()=>{
 const c=createCity(),ring=[p(4,4),p(5,4),p(6,4),p(6,5),p(6,6),p(5,6),p(4,6),p(4,5)];
 c.roads=[...ring,p(5,3),p(5,7),p(3,5),p(7,5)];
 for(let i=0;i<ring.length;i++)direct(c,ring[i],ring[(i+1)%ring.length]);
 for(const a of c.roads)for(const b of c.roads){
  const path=findPath(c,a,b)!;assert.ok(path);for(let i=1;i<path.length;i++)assert.ok(allowsRoadStep(c,path[i-1],path[i]));
 }
 assert.equal(findPath(c,ring[1],ring[0])!.length,8);
 assert.deepEqual(findPath(c,p(5,3),p(7,5)),[p(5,3),p(5,4),p(6,4),p(6,5),p(7,5)]);
 assert.notDeepEqual(findPath(c,p(7,5),p(5,3)),findPath(c,p(5,3),p(7,5))!.reverse());
});
test('same-count direction reversal invalidates BFS views and weighted snapshots are isolated',()=>{
 const c=line();direct(c,p(5),p(6));const signature=directionSignature(c),snapshot=routingSnapshot(c);
 assert.ok(findPath(c,p(4),p(7)));assert.ok(plannedRoadPath(c,p(4),p(7)));
 direct(c,p(6),p(5));assert.notEqual(directionSignature(c),signature);
 for(const responding of [false,true])assert.equal(findPath(c,p(4),p(7),responding),null);
 assert.equal(plannedRoadPath(c,p(4),p(7)),null);assert.ok(findPath(c,p(7),p(4)));
 assert.ok(weightedRoute(snapshot,p(4),p(7)),'old snapshot stays immutable');
 const current=routingSnapshot(c);assert.notEqual(current.revision,snapshot.revision);
 assert.equal(weightedRoute(current,p(4),p(7)),null);assert.equal(routeCost(current,c.roads).total,Infinity);
});
test('optional save metadata roundtrips; malformed directions fail explicitly; demolition removes edges',()=>{
 const c=line();direct(c,p(5),p(6));const loaded=parseCity(JSON.parse(JSON.stringify(c)))!;
 assert.ok(loaded);assert.deepEqual(loaded.roadDirections,c.roadDirections);assert.equal(findPath(loaded,p(7),p(4)),null);
 const old=line();assert.equal(parseCity(JSON.parse(JSON.stringify(old)))!.roadDirections,undefined);
 for(const raw of [null,[],{'5,5>6,5':'east'},{'6,5>5,5':'reverse'},{'5,5>7,5':'forward'},{'7,5>8,5':'forward'},{'05,5>6,5':'forward'}]){
  assert.equal(parseRoadDirections(raw,new Set(c.roads.map(p=>`${p.x},${p.y}`))),null);
  assert.equal(parseCity({...c,roadDirections:raw}),null);
 }
 place(c,'bulldoze',5,5);assert.equal(c.roadDirections,undefined);place(c,'road',5,5);
 assert.ok(findPath(c,p(7),p(4)));
});

test('patrols take a legal ring home and never dispatch into a one-way dead end',async()=>{
 const {patrolRoute}=await import('./cityPatrols.ts');
 const c=createCity(),station={id:1,kind:'policeStation' as const,x:4,y:1,rotation:0};c.buildings=[station];
 const ring=[p(5,3),p(6,3),p(7,3),p(7,4),p(7,5),p(6,5),p(5,5),p(5,4)];c.roads=ring;
 for(let i=0;i<ring.length;i++)direct(c,ring[i],ring[(i+1)%ring.length]);
 const path=patrolRoute(c,station)!;assert.ok(path);assert.deepEqual(path[0],p(5,3));assert.deepEqual(path.at(-1),p(5,3));
 for(let i=1;i<path.length;i++)assert.ok(allowsRoadStep(c,path[i-1],path[i]));
 c.roads=ring.slice(0,3);assert.equal(patrolRoute(c,station),null);
});

test('home access and passenger choice require a real return and show its actual distance',async()=>{
 const {connectedHomes,averageTripSeconds}=await import('./cityModel.ts');
 const {chooseDestination}=await import('./cityVisits.ts');
 const {TRAVEL_TILES_PER_SECOND}=await import('./cityTraffic.ts');
 const c=createCity(),home={id:1,kind:'home' as const,x:4,y:2,rotation:0},store={id:2,kind:'store' as const,x:5,y:2,rotation:0};
 c.buildings=[home,store];const ring=[p(4,4),p(5,4),p(6,4),p(6,5),p(6,6),p(5,6),p(4,6),p(4,5)];c.roads=ring;
 for(let i=0;i<ring.length;i++)direct(c,ring[i],ring[(i+1)%ring.length]);
 assert.equal(connectedHomes(c),1);assert.ok(chooseDestination(c,home,'shopping'));
 assert.equal(averageTripSeconds(c),8/TRAVEL_TILES_PER_SECOND);
 c.roads=ring.slice(0,3);assert.equal(connectedHomes(c),0);assert.equal(chooseDestination(c,home,'shopping'),null);assert.equal(averageTripSeconds(c),null);
});
