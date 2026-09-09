import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCity, parseCity, place, stepCity, expandCity, constructionPriceForCity, entrance, type City, type Tool} from './cityModel.ts';
import {starterSnapshot, starterToolAllowed, starterManagerReady, starterBypassTiles, starterDiversionPoint} from './cityStarterTutorial.ts';
import {stageTutorialIncident, incidentServices} from './cityIncidents.ts';
import {spawnTrips, homeRoadIssue} from './cityVisits.ts';
import {roadIndex, bodyTile} from './cityTraffic.ts';
import {tutorialAction} from './cityTutorial.ts';
const stage=(c:City)=>c.tutorial!.hRoad!.stage;
function until(c:City,predicate:()=>boolean,seconds:number){for(let t=0;t<seconds*4&&!predicate();t++)stepCity(c,.25);assert.ok(predicate(),`condition not reached after ${seconds}s; stage=${stage(c)}, elapsed=${c.elapsed}`);}
function firstCustomer(){const c=createCity(true);place(c,'home',3,2);assert.equal(stage(c),1);place(c,'store',13,8);assert.equal(stage(c),2);until(c,()=>stage(c)===3,60);return c;}

test('H starter contains only inherited zero-refund infrastructure; legacy factory remains empty',()=>{
 const c=createCity(true);assert.deepEqual(c.map,{x:0,y:0,width:24,height:20});assert.equal(c.buildings.length,0);assert.equal(c.roads.length,43);assert.equal(new Set(c.roads.map(p=>`${p.x},${p.y}`)).size,43);
 for(const p of c.roads)assert.equal(c.roadPaid?.[`${p.x},${p.y}`],0);
 assert.equal(stage(c),0);const legacy=createCity();assert.equal(legacy.buildings.length,0);assert.equal(legacy.roads.length,0);assert.equal(legacy.tutorial?.hRoad,undefined);
});
test('starter locked and wrong-region construction is a no-op; skip unlocks existing town',()=>{
 const c=createCity(true);
 for(const [tool,x,y] of [['road',20,5],['store',13,8],['hospital',17,2],['stop',10,10],['closure',10,9],['bulldoze',10,10],['home',13,2]] as const){const before=structuredClone(c);place(c,tool,x,y);assert.deepEqual(c,before,tool);}
 const roads=structuredClone(c.roads);tutorialAction(c,'skip');assert.equal(c.tutorial?.status,'skipped');assert.deepEqual(c.roads,roads);
 for(const tool of ['road','store','hospital','stop','closure','bulldoze','home','park','fireStation','policeStation'] as const)assert.ok(starterToolAllowed(c,tool));
 place(c,'road',20,5);assert.equal(c.roads.length,44);
 const loaded=parseCity(JSON.parse(JSON.stringify(c)))!;assert.ok(loaded);assert.equal(loaded.tutorial?.status,'skipped');assert.equal(loaded.roads.length,44);
});
test('starter first real shopping visit earns progression and saves without adding buildings',()=>{
 const c=firstCustomer();assert.equal(c.buildings.length,2);assert.ok(c.missions!.shoppers.length>0);assert.ok(c.funds>=400);
 const loaded=parseCity(JSON.parse(JSON.stringify(c)))!;assert.ok(loaded);assert.deepEqual(loaded.tutorial?.hRoad,c.tutorial?.hRoad);assert.deepEqual(loaded.buildings,c.buildings);assert.deepEqual(loaded.roadPaid,c.roadPaid);
});
test('H town scripted impaired driver, player bypass, optional diversion and EMS complete tutorial',()=>{
 let c=firstCustomer();c.funds=10000; // Isolate routing/dispatch from economy tuning; first customer above is earned.
 place(c,'home',3,8);place(c,'home',5,8);place(c,'park',13,1);
 until(c,()=>stage(c)>=4,120);const incidentStart=c.elapsed;until(c,()=>stage(c)>=5,120);assert.ok(c.elapsed-incidentStart<=120);
 assert.equal(c.accidentCount,1);assert.equal(c.incidents.length,1);assert.equal(c.incidents[0].x,10);assert.equal(c.incidents[0].y,10,'the advertised right-side bypass must serve the actual crash location');
 assert.equal(c.incidents[0].cause,'impaired-driving');assert.deepEqual(incidentServices(c.incidents[0]),['ems']);assert.equal(c.incidents[0].outcome,'pending');
 const incidentId=c.incidents[0].id;stepCity(c,120);assert.equal(c.fatalities,0,'locked services must not create an unwinnable rescue deadline');
 c=parseCity(JSON.parse(JSON.stringify(c)))!;assert.ok(c);assert.equal(stage(c),5);assert.equal(c.tutorial!.hRoad!.incidentId,incidentId);assert.equal(c.incidents[0].cause,'impaired-driving');const savedCount=c.accidentCount;assert.equal(stageTutorialIncident(c,{x:10,y:10}),false);stepCity(c,5);assert.equal(c.accidentCount,savedCount);const skipped=structuredClone(c);tutorialAction(skipped,'skip');assert.equal(stageTutorialIncident(skipped,{x:10,y:10}),false);assert.equal(skipped.accidentCount,savedCount);
 for(const x of [2,20])for(let y=5;y<=9;y++)place(c,'road',x,y);
 until(c,()=>stage(c)===7,1);assert.equal(c.closures.length,0,'diversion is optional');
 place(c,'hospital',17,2);
 until(c,()=>stage(c)===8,240);
 const incident=c.incidents.find(i=>i.id===incidentId)!;assert.equal(incident.status,'cleared');assert.deepEqual([...incident.completedServices].sort(),['ems']);assert.equal(c.fatalities,0);assert.equal(c.rescuedCount,1);
 place(c,'stop',10,4);stepCity(c,.25);assert.equal(stage(c),8,'protect the actual crash junction, not an unrelated crossing');place(c,'stop',10,10);until(c,()=>stage(c)===9,1);assert.equal(c.tutorial?.status,'active');
 const town=structuredClone({roads:c.roads,buildings:c.buildings,trips:c.trips,funds:c.funds});
 expandCity(c,'west');assert.equal(stage(c),9);assert.equal(c.tutorial?.status,'active');
 c=parseCity(JSON.parse(JSON.stringify(c)))!;assert.ok(c);expandCity(c,'east');assert.equal(stage(c),10);assert.equal(c.tutorial?.status,'complete');
 assert.deepEqual({roads:c.roads,buildings:c.buildings,trips:c.trips,funds:c.funds},town);
 const loaded=parseCity(JSON.parse(JSON.stringify(c)))!;assert.ok(loaded);assert.equal(loaded.tutorial?.status,'complete');assert.equal(stage(loaded),10);
});

test('suggested alternate lower-home spacing still reaches the crash lesson',()=>{
 const c=firstCustomer();c.funds=10000;place(c,'home',3,8);place(c,'home',6,8);place(c,'park',13,1);until(c,()=>stage(c)>=4,120);until(c,()=>stage(c)>=5,120);
});
test('widely spaced legal lower homes do not leave the crash lesson waiting indefinitely',()=>{
 const c=firstCustomer();c.funds=10000;place(c,'home',2,8);place(c,'home',8,8);place(c,'park',13,1);until(c,()=>stage(c)>=4,120);until(c,()=>stage(c)>=5,180);
});

test('900 starting funds and ordinary earnings or finite waivers fund the full tutorial',()=>{
 const c=createCity(true);assert.equal(c.funds,900);
 const buy=(tool:Tool,x:number,y:number)=>{until(c,()=>c.funds>=constructionPriceForCity(c,tool),180);const price=constructionPriceForCity(c,tool);const before=c.funds;const message=place(c,tool,x,y);assert.match(message,/built|placed|closed/i);assert.equal(c.funds,before-price);assert.ok(c.funds>=0);};
 buy('home',3,2);buy('store',13,8);until(c,()=>stage(c)===3,60);
 buy('home',3,8);buy('home',6,8);buy('park',13,1);until(c,()=>stage(c)>=5,180);
 for(const x of [2,20])for(let y=5;y<=9;y++)buy('road',x,y);until(c,()=>stage(c)===7,1);
 buy('hospital',17,2);until(c,()=>stage(c)===8,240);
 assert.equal(c.rescuedCount,1);assert.equal(c.fatalities,0);buy('stop',10,10);assert.equal(c.tutorial?.status,'active');expandCity(c,'north');expandCity(c,'south');assert.equal(c.tutorial?.status,'complete');assert.equal(stage(c),10);
 assert.ok(c.missions!.shoppers.length>0);assert.equal(c.buildings.length,6);
});

test('after the first Home and Store, growth placements are player chosen and recoverable',()=>{
 const c=createCity(true);place(c,'home',3,2);place(c,'store',13,8);c.funds=10000;
 assert.equal(stage(c),2);
 for(const tool of ['home','park','bulldoze'] as const)assert.ok(starterToolAllowed(c,tool));
 place(c,'home',17,2);place(c,'park',17,7);
 assert.equal(c.buildings.length,4,'upper-right homes and lower-right parks are allowed');
 const before=c.funds;place(c,'home',2,15);assert.equal(c.buildings.length,5);
 place(c,'bulldoze',2,15);assert.equal(c.buildings.length,4);assert.equal(c.funds,before,'an unconnected building can be refunded and repositioned');
 const roads=structuredClone(c.roads);place(c,'bulldoze',10,9);assert.deepEqual(c.roads,roads,'starter roads stay intact until road tools unlock');
 until(c,()=>stage(c)===3,60);assert.equal(starterSnapshot(c)?.focus,undefined,'growth does not prescribe a lot');
 place(c,'home',6,2);until(c,()=>stage(c)>=5,180);
 assert.equal(c.incidents.length,1,'a freely chosen growth layout still reaches the scripted emergency');
});

test('crash advice waits for inaction, services unlock immediately, and bypass suggestions are optional',()=>{
 const c=firstCustomer();c.funds=10000;place(c,'home',3,8);place(c,'home',6,8);place(c,'park',13,1);
 until(c,()=>stage(c)===5,180);
 for(const tool of ['hospital','policeStation','fireStation','closure'] as const)assert.ok(starterToolAllowed(c,tool));
 assert.equal(starterManagerReady(c),false);
 assert.deepEqual(starterBypassTiles(c),[2,20].flatMap(x=>[5,6,7,8,9].map(y=>({x,y}))));
 stepCity(c,29);assert.equal(starterManagerReady(c),false);
 place(c,'road',20,5);stepCity(c,2);assert.equal(starterManagerReady(c),false,'building resets the advice wait');
 assert.equal(starterBypassTiles(c).length,9);
 const loaded=parseCity(JSON.parse(JSON.stringify(c)))!;stepCity(loaded,29);assert.equal(starterManagerReady(loaded),true);
 loaded.tutorial!.hRoad!.managerBriefed=true;assert.equal(starterManagerReady(loaded),false);
 const legacy=structuredClone(c);legacy.tutorial!.hRoad!.stage=6;stepCity(legacy,.25);assert.equal(stage(legacy),7,'saved diversion lesson cannot trap a player');
 for(let y=6;y<=9;y++)place(c,'road',20,y);
 for(let y=5;y<=9;y++)place(c,'road',2,y);
 assert.equal(stage(c),7);assert.equal(c.closures.length,0);assert.deepEqual(starterBypassTiles(c),[]);assert.equal(starterManagerReady(c),false);
});

test('tutorial emergency keeps next trips shopping after existing journeys, even with a reachable park',()=>{
 const c=firstCustomer();c.funds=10000;place(c,'home',3,8);place(c,'home',6,8);place(c,'park',13,1);
 until(c,()=>stage(c)===5,180);
 const existing=structuredClone(c.trips);spawnTrips(c,roadIndex(c));
 for(const trip of existing)assert.deepEqual(c.trips.find(t=>t.id===trip.id),trip,'existing visits and returns are not rewritten');
 // Isolate a household that has returned home while both needs are outstanding.
 c.trips=[];for(const h of c.households){h.shopping=3;h.leisure=1;}
 const home=c.buildings.find(b=>b.kind==='home')!;
 const loaded=parseCity(JSON.parse(JSON.stringify(c)))!;
 spawnTrips(loaded,roadIndex(loaded));
 assert.equal(loaded.trips.find(t=>t.homeId===home.id)?.purpose,'shopping','blocked shopping starts a real journey instead of substituting the park');
 assert.ok(loaded.trips.every(t=>t.purpose==='shopping'));
 for(let y=5;y<=9;y++)place(loaded,'road',20,y);
 until(loaded,()=>loaded.trips.some(t=>t.homeId===home.id),30);
 assert.equal(loaded.trips.find(t=>t.homeId===home.id)!.purpose,'shopping','bypass serves the retained shopping demand');
 const skipped=structuredClone(c);tutorialAction(skipped,'skip');spawnTrips(skipped,roadIndex(skipped));
 assert.equal(skipped.trips.find(t=>t.homeId===home.id)?.purpose,'leisure','Skip restores normal destination choice');
});

test('old tutorial fire saves need only EMS and retain existing crew journeys safely',()=>{
 let c=firstCustomer();c.funds=10000;place(c,'home',3,8);place(c,'home',6,8);place(c,'park',13,1);until(c,()=>stage(c)===5,180);
 const incident=c.incidents[0];incident.severity='fire';incident.required=['police','ems','fire'];delete incident.tutorialEmsOnly;
 place(c,'policeStation',17,8);place(c,'fireStation',17,2);
 // A historical save already contains a real dispatched crew before migration.
 tutorialAction(c,'skip');stepCity(c,1);c.tutorial!.status='active';
 c=parseCity(JSON.parse(JSON.stringify(c)))!;assert.ok(c);stepCity(c,.25);
 assert.deepEqual(incidentServices(c.incidents[0]),['ems']);assert.ok(parseCity(JSON.parse(JSON.stringify(c))));
 for(const x of [2,20])for(let y=5;y<=9;y++)place(c,'road',x,y);place(c,'hospital',6,2);
 until(c,()=>stage(c)===8,240);assert.ok(parseCity(JSON.parse(JSON.stringify(c))),'optional old crews remain valid after EMS clears the crash');
});

test('both H ends restore lower-left households and real shopping continues during the crash',()=>{
 const c=firstCustomer();c.funds=10000;place(c,'home',3,8);place(c,'home',6,8);place(c,'park',13,1);until(c,()=>stage(c)===5,180);
 const homes=c.buildings.filter(b=>b.kind==='home'),bottom=homes.find(b=>b.y===8)!;
 assert.equal(homeRoadIssue(c,bottom),'No route to Store');
 for(let y=5;y<=9;y++)place(c,'road',20,y);
 assert.equal(stage(c),5,'first Home recovery does not conceal blocked lower-left homes');
 assert.equal(homeRoadIssue(c,bottom),'No route to Store');
 assert.ok(starterBypassTiles(c).every(p=>p.x===2));
 for(let y=5;y<=9;y++)place(c,'road',2,y);
 assert.equal(stage(c),7);for(const home of homes)assert.equal(homeRoadIssue(c,home),null);
 const divert=starterDiversionPoint(c)!;assert.deepEqual(divert,{x:10,y:9});place(c,'closure',divert.x,divert.y);
 for(const home of homes)assert.equal(homeRoadIssue(c,home),null,'optional diversion preserves all household loops');
 const crashedHomes=new Set(c.trips.filter(t=>t.phase==='crashed').map(t=>t.homeId));
 const visits=new Set<number>();
 until(c,()=>{for(const t of c.trips)if(t.phase==='visiting'&&t.purpose==='shopping')visits.add(t.homeId);return homes.filter(h=>!crashedHomes.has(h.id)).every(h=>visits.has(h.id));},180);
 assert.equal(c.incidents[0].status,'active','customers circulate before EMS clears the crash');
 assert.ok(parseCity(JSON.parse(JSON.stringify(c))));
});

test('new shopping trips advance to the crash, queue, reload and resume the same journey around a bypass',()=>{
 const c=firstCustomer();c.funds=10000;place(c,'home',3,8);place(c,'home',6,8);place(c,'park',13,1);until(c,()=>stage(c)===5,180);
 // Isolate households just returned home with outstanding shopping demand.
 c.trips=[];for(const h of c.households){h.shopping=3;h.leisure=1;}
 spawnTrips(c,roadIndex(c));assert.equal(c.trips.length,3);
 const ids=new Set(c.trips.map(t=>t.id)),shop=c.buildings.find(b=>b.kind==='store')!;
 for(let n=0;n<160;n++){
  stepCity(c,.25);
  for(const t of c.trips.filter(t=>ids.has(t.id))){const p=t.path[bodyTile(t)];assert.notDeepEqual(p,{x:10,y:10},'cars never enter the blocked wreck tile');assert.equal(t.storeId,shop.id);}
 }
 for(const t of c.trips.filter(t=>ids.has(t.id))){const home=c.buildings.find(b=>b.id===t.homeId)!;assert.notDeepEqual(t.path[bodyTile(t)],entrance(home),'cars visibly advance beyond home');assert.ok(t.hold>1,`cars form a visible queue: ${JSON.stringify(t)}`);}
 const loaded=parseCity(JSON.parse(JSON.stringify(c)))!;assert.ok(loaded);
 for(const x of [2,20])for(let y=5;y<=9;y++)place(loaded,'road',x,y);
 const arrived=new Set<number>();until(loaded,()=>{for(const t of loaded.trips)if(ids.has(t.id)&&t.phase==='visiting')arrived.add(t.id);return arrived.size===ids.size;},180);
 assert.equal(loaded.incidents[0].status,'active','bypass releases queued customers before medical clearance');
});
