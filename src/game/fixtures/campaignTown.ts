import {createLandState,STARTER_OWNED_PLOTS} from '../cityLand.ts';
import {EMERGENCY_LEVELS,emergencyDefinition,emergencyTown,type EmergencyId} from './emergencyTown.ts';
/** Authored set pieces and reference operations. No player saves or puzzle-only physics. */
import {createCity, place, entrance, type City, type Tool, type Point} from '../cityModel.ts';
import {flowTown} from './flowTown.ts';
import {applyRoadDirections} from '../cityDirectionEdits.ts';
export const CAMPAIGN_LEVELS = [
 {id:'shared-streets',title:'A longer connection',homes:4,budget:620,goal:'Bring all four households home from shopping.',lesson:'Two unfinished streets separate homes from shops.',rules:'Every home needs a usable road route to a shop and back. The road layout is yours to choose.',tools:['road','bulldoze'],objective:'shopping'},
 {id:'stop-and-share',title:'Take turns',homes:5,budget:180,goal:'Provide a stop-controlled crossing and safe shopping trips for all five households.',lesson:'Traffic from different directions meets at an uncontrolled crossing.',rules:'Five households share this crossing on their way to the shop. Every household must finish a shopping round trip without an accident. This puzzle requires stop control at the crossing as well as actual safe journeys.',tools:['road','stop','bulldoze'],objective:'stop'},
 {id:'green-for-the-queue',title:'Green for the queue',homes:9,budget:300,goal:'Bring all nine households home from shopping without an accident.',lesson:'More homes now depend on the same busy crossing.',rules:'All nine households need safe shopping round trips. Stops and Lights are available, along with road changes. The design is yours. Any accident ends this attempt; there is no countdown.',tools:['road','stop','signal','bulldoze'],objective:'signal'},
 {id:'one-way-home',title:'A way back',homes:3,budget:500,goal:'Get all three households to the shop and home again.',lesson:'The main street goes toward the shop, but cars have no way home.',rules:'The inherited main street must remain eastbound. Every household needs a legal shopping round trip. Find a road layout that gives them a way back. Your new roads may use whichever directions work.',tools:['road','direction','bulldoze'],objective:'direction'},
 {id:'around-the-island',title:'Around the island',homes:4,budget:240,goal:'Bring all four households home from shopping safely.',lesson:'Four road approaches meet an island that cannot be built over.',rules:'The center island must stay clear. Every household needs a shopping route out and back without an accident. Different safe connections around the island count; no particular loop or traffic control is required.',tools:['road','direction','stop','signal','bulldoze'],objective:'roundabout'},
 {id:'apartment-avenue',title:'Join the avenue',homes:4,budget:1000,goal:'Bring all four households to the shop and home across the broken avenue.',lesson:'A gap separates two stretches of four-lane avenue.',rules:'Every household needs a connected shopping route and a way home. Four-lane roads take two tiles of space, and ordinary roads are also available. Your connection must carry real trips; extra unused pavement earns nothing. No countdown.',tools:['road','wideRoad','stop','signal','bulldoze'],objective:'wide'},
 {id:'another-front-door',title:'Build an apartment complex',homes:0,budget:2600,goal:'Place two apartments, join their private lanes, and bring residents home from shopping.',lesson:'Nearby apartment blocks can share access through automatic private lanes.',rules:'Place two 4×4 apartment blocks near each other, leaving clear space around their entrance arrows. Each costs $800 and houses four residents. Select Inspect, click a block, choose Join complex, then click the other block. Review the route and price, then Build lanes & join. Connect a private lane to the shop street with Road. Press Play: a shopping round trip from each joined block completes the lesson. Pause freely; no countdown. Joining builds the internal lanes but does not connect the shop for you.',tools:['apartment','road','stop','signal','bulldoze'],objective:'complex'},
 {id:'shops-and-strolls',title:'Shops and strolls',homes:6,budget:1200,goal:'Bring every household home from both shopping and a park visit.',lesson:'A wider road cannot replace a missing destination.',rules:'Keep the homes. Add a park and connect its entrance. You may add a nearer shop or improve the roads. Every household must finish both kinds of round trip; the 5-second shop and 10-second park stays count as part of the journey. No countdown.',tools:['road','wideRoad','store','park','stop','signal','bulldoze'],objective:'mixed'},
 {id:'first-bus-service',title:'All aboard',homes:4,budget:600,goal:'Buy a bus and run an outing from each home to a destination and back.',lesson:'Tap the depot to buy a bus and choose its stops.',rules:'Tap the depot and Buy bus ($400). Choose the two roadside stops in travel order and Finish route. Select Start service, then press Play. Waiting passengers appear automatically once the service and traffic are running. All four homes need a completed bus passenger outing and a shopping return. Stop placement or an empty bus alone does not win. Bus passengers are additional riders; this lesson does not claim to reduce household car trips.',tools:['road','busStop','bulldoze'],objective:'bus'},
 {id:'keep-another-way',title:'Let shopping fund a park',homes:4,budget:160,goal:'Connect the shop, earn $300 from shopping, then add a usable park.',lesson:'Working journeys can pay for the next improvement.',rules:'Use your starting $160 to connect the shop. Each completed shopping visit pays $100 in this lesson; waiting alone pays nothing. Earn at least $300, then buy a park and connect its entrance. Every home must finish both a shopping trip and a park trip. Choose where to build; pause freely and refund your own construction if needed.',tools:['road','store','park','stop','signal','bulldoze'],objective:'income'},
 ...EMERGENCY_LEVELS,
] as const;
export type CampaignId=typeof CAMPAIGN_LEVELS[number]['id'];
export const campaignDefinition=(id:string)=>CAMPAIGN_LEVELS.find(d=>d.id===id);
export function fixturePlace(c:City,tool:Tool,x:number,y:number,rotation=0){
 const n=c.roads.length+c.buildings.length, message=place(c,tool,x,y,rotation);
 if(!['stop','signal'].includes(tool)&&c.roads.length+c.buildings.length!==n+1)throw Error(`${tool} (${x},${y}): ${message}`);
 return message;
}
function line(c:City,a:Point,b:Point){for(let x=Math.min(a.x,b.x);x<=Math.max(a.x,b.x);x++)for(let y=Math.min(a.y,b.y);y<=Math.max(a.y,b.y);y++)if(!c.roads.some(p=>p.x===x&&p.y===y))fixturePlace(c,'road',x,y);}
export const smallRing:Point[]=[[7,5],[8,5],[9,5],[9,6],[9,7],[8,7],[7,7],[7,6],[7,5]].map(([x,y])=>({x,y}));
export function campaignTown(id:CampaignId):City{
 if(emergencyDefinition(id))return emergencyTown(id as EmergencyId);
 if(id==='green-for-the-queue'){const c=flowTown();c.controls=[];return c;}
 const c=createCity();c.funds=100000;c.tutorial!.status='complete';
 if(id==='another-front-door'){
  c.land=createLandState(STARTER_OWNED_PLOTS);c.map={x:0,y:0,width:32,height:32};
  line(c,{x:2,y:12},{x:20,y:12});
  fixturePlace(c,'store',18,10);
 }else if(id==='apartment-avenue'){
  c.map={x:0,y:0,width:26,height:20};
  for(let x=2;x<=23;x++)if(x<9||x>14)place(c,'wideRoad',x,10);
  for(const x of [2,4,6,8])fixturePlace(c,'home',x,8);
  fixturePlace(c,'store',21,12,2);
 }else if(id==='keep-another-way'){
  line(c,{x:1,y:6},{x:9,y:6});
  for(const x of [1,3,5,7])fixturePlace(c,'home',x,4);
  fixturePlace(c,'store',12,4);fixturePlace(c,'road',13,6);
 }else if(id==='shared-streets'){
  for(const x of [1,4])fixturePlace(c,'home',x,1);
  for(const x of [9,12])fixturePlace(c,'home',x,9,2);
  fixturePlace(c,'store',10,1);fixturePlace(c,'store',1,9,2);
  line(c,{x:1,y:3},{x:5,y:3});line(c,{x:10,y:8},{x:13,y:8});
  for(const b of c.buildings){const p=entrance(b);if(!c.roads.some(q=>q.x===p.x&&q.y===p.y))fixturePlace(c,'road',p.x,p.y);}
 }else if(id==='stop-and-share'){
  line(c,{x:1,y:6},{x:14,y:6});line(c,{x:8,y:1},{x:8,y:5});
  for(const x of [1,3]){fixturePlace(c,'home',x,4);fixturePlace(c,'home',x,7,2);}
  fixturePlace(c,'home',9,1,1);fixturePlace(c,'store',11,4);
 }else if(id==='one-way-home'){
  line(c,{x:2,y:6},{x:13,y:6});for(const x of [2,4,6])fixturePlace(c,'home',x,4);fixturePlace(c,'store',10,4);
  applyRoadDirections(c,Array.from({length:12},(_,i)=>({x:i+2,y:6})),'forward');
 }else if(id==='around-the-island'){
  line(c,{x:0,y:6},{x:6,y:6});line(c,{x:10,y:6},{x:14,y:6});line(c,{x:8,y:0},{x:8,y:4});line(c,{x:8,y:8},{x:8,y:11});
  for(const x of [0,2,4])fixturePlace(c,'home',x,4);fixturePlace(c,'home',9,0,1);
  fixturePlace(c,'store',11,4);fixturePlace(c,'store',9,9,1);
 }else if(id==='shops-and-strolls'){
  line(c,{x:1,y:6},{x:14,y:6});
  for(const x of [1,3,5])fixturePlace(c,'home',x,4);
  for(const x of [1,3,5])fixturePlace(c,'home',x,7,2);
  fixturePlace(c,'store',11,4);
 }else if(id==='first-bus-service'){
  c.map={x:0,y:0,width:24,height:20};
  line(c,{x:3,y:5},{x:21,y:5});line(c,{x:3,y:15},{x:21,y:15});line(c,{x:3,y:5},{x:3,y:15});line(c,{x:21,y:5},{x:21,y:15});fixturePlace(c,'road',3,4);
  fixturePlace(c,'busStation',2,1);fixturePlace(c,'busStop',8,6,2);fixturePlace(c,'busStop',17,6,2);
  for(const x of [5,7,9,11])fixturePlace(c,'home',x,3);fixturePlace(c,'store',17,3);

 }else throw Error(`${id} is staged for the building update.`);
 return c;
}
