/** Authored incidents are visible starting conditions, serviced by ordinary dispatch/traffic. */
import {createCity, place, type City, type Tool, type Point} from '../cityModel.ts';
import {applyRoadDirections} from '../cityDirectionEdits.ts';
import type {ServiceKind} from '../cityIncidents.ts';
import {neighborhoodTown} from './neighborhoodTown.ts';
const tools = ['road','stop','signal','closure','bulldoze'] as const;
export const EMERGENCY_LEVELS = [
 {id:'a-town-that-works',title:'Make room for police',homes:4,budget:1800,goal:'Connect the police approach and let the crew clear the crash.',lesson:'A station needs a connected road to the scene.',rules:'The police station south of the crash has an unfinished approach. Connect it to the main street or build another legal approach. Press Play to dispatch the crew and watch it arrive and finish work.',tools,objective:'emergency'},
 {id:'call-the-police',title:'A local police station',homes:4,budget:3000,goal:'Place a police station with road access and clear the crash.',lesson:'Place Police, then connect its entrance arrow.',rules:'A minor crash needs police. Choose a station site, connect its entrance to the road and run traffic. Placing the building alone does not complete this job.',tools:[...tools,'policeStation'],objective:'emergency'},
 {id:'clinic-access',title:'A clinic within reach',homes:4,budget:3500,goal:'Place a clinic and let police and EMS clear the collision.',lesson:'Different incidents need different crews.',rules:'Police are provided. Place a Clinic where its entrance can reach the serious collision. Both crews must physically arrive and finish their work. Pause freely to plan; the starting scene allows ample rescue time.',tools:[...tools,'hospital'],objective:'emergency'},
 {id:'fire-access',title:'Room for the fire crew',homes:4,budget:4000,goal:'Place a fire station and let all three crews clear the vehicle fire.',lesson:'Keep a usable approach for every required crew.',rules:'Police and a clinic are provided. Place Fire and connect its entrance. Police, EMS and fire must arrive and work at the marked scene. Extra road space and generous funds let you try different sites.',tools:[...tools,'fireStation'],objective:'emergency'},
 {id:'past-the-wreck',title:'Reopen the shortcut',homes:4,budget:3200,goal:'Let police clear the crash, then remove Divert to open the shorter route.',lesson:'Divert sends cars around the long road on the left. Reopen the shortcut after the rescue.',rules:'The roads, police station, crash and Divert are already set up. Press Play: cars take the long road on the left while police reach and clear the crash. Responding police can pass Divert. After the crash clears, click Show Divert; this selects the Divert tool and highlights the blocked road tile. Tap that tile to reopen the shorter route. Keep Play running until a household finishes a new shopping trip and gets home. No construction is needed, and there is no countdown.',tools:['closure'],objective:'emergency'},
 {id:'another-approach',title:'Another legal approach',homes:4,budget:3200,goal:'Clear the crash and restore shopping for all four households.',lesson:'One-way arrows keep the police from reaching the crash.',rules:'The crash is west of the police approach, and the street runs east. Police must obey those arrows. Success means actual police clearance and a new shopping round trip from each of the four homes, with emergency access still available. The road layout is yours to solve; permanent changes count.',tools:[...tools,'direction'],objective:'emergency'},
 {id:'temporary-two-way',title:'The wrong side of the crash',homes:4,budget:3500,goal:'Clear the crash and get the neighborhood moving again.',lesson:'Police are on the wrong side of the one-way street.',rules:'A crash is blocking the main street. The police station is connected, but the one-way arrows prevent officers from reaching the scene. Find a working road layout. Success means police reach and clear the crash, then a household completes a new shopping trip and returns home. Police obey the road directions. Your changes can stay. Pause whenever you like; there is no countdown.',tools:[...tools,'direction'],objective:'emergency'},
 {id:'paired-response',title:'Two crews, one recovery',homes:4,budget:6500,goal:'Clear the collision and restore shopping for all four households.',lesson:'This collision needs both police and an ambulance. Neither service is available yet.',rules:'A serious collision blocks the route between the homes and the shop. The town needs police and ambulance service with usable access to the scene. Both crews must reach it and finish their work. All four households must then complete new shopping round trips. Service locations and the road layout are up to you.',tools:[...tools,'direction','policeStation','hospital'],objective:'emergency'},
 {id:'fire-and-flow',title:'Fire and flow',homes:4,budget:7500,goal:'Clear the vehicle fire and restore shopping for all four households.',lesson:'A vehicle fire blocks the main street. Three emergency services are needed.',rules:'Police, ambulance and fire crews are needed at the vehicle fire, but the town has none of those services yet. All three must reach the scene and finish their work. Success also requires a new shopping round trip from each home and continued emergency access. Your service locations and road changes can stay.',tools:[...tools,'direction','wideRoad','policeStation','hospital','fireStation'],objective:'emergency'},
 {id:'district-recovery',title:'Recover the district',homes:4,budget:8500,goal:'Clear both incidents and restore shopping for all four households.',lesson:'A crash on the main street and a fire on the southern road need help.',rules:'The main street crash needs police. The southern road fire needs police, ambulance and fire crews. The town has no emergency services yet. Both incidents must be cleared through actual responder visits, then all four households must complete new shopping round trips. Keep emergency access available. Choose your own working layout.',tools:[...tools,'direction','wideRoad','policeStation','hospital','fireStation'],objective:'emergency'},
 {id:'what-a-jam',title:'What a Jam!',homes:4,budget:10000,goal:'Clear both incidents and get the neighborhood moving again.',lesson:'Two incidents, a one-way main street and a disconnected southern road.',rules:'A crash blocks the main street and a fire blocks the southern road. Police, ambulance and fire services are missing, the streets are disconnected, and the one-way arrows limit access. Success means both scenes are cleared and all four households complete new shopping round trips, with emergency access maintained. Your layout is the solution; permanent changes count. No countdown.',tools:[...tools,'direction','wideRoad','policeStation','hospital','fireStation'],objective:'emergency'},
] as const;
export type EmergencyId=typeof EMERGENCY_LEVELS[number]['id'];
export const emergencyDefinition=(id:string)=>EMERGENCY_LEVELS.find(d=>d.id===id);
export const recoveryStreet:Point[]=Array.from({length:5},(_,i)=>({x:14+i,y:8}));
export const requiredPlacements=(id:string):Tool[]=> id==='call-the-police'?['policeStation']:id==='clinic-access'?['hospital']:id==='fire-access'?['fireStation']:id==='paired-response'?['policeStation','hospital']:['fire-and-flow','district-recovery','what-a-jam'].includes(id)?['policeStation','hospital','fireStation']:[];
export const needsRecovery=(id:string)=>['another-approach','temporary-two-way','paired-response','fire-and-flow','district-recovery','what-a-jam'].includes(id);
export function emergencyTown(id:EmergencyId):City {
 if(id==='what-a-jam'){
  const c=emergencyTown('district-recovery');place(c,'bulldoze',18,9);place(c,'bulldoze',18,10);
  applyRoadDirections(c,recoveryStreet,'forward');return c;
 }
 if(id==='past-the-wreck'){
  const c=neighborhoodTown();place(c,'closure',8,10);place(c,'policeStation',20,7);place(c,'road',21,9);
  for(let x=2;x<=3;x++)place(c,'road',x,5);
  for(let y=6;y<=11;y++)place(c,'road',2,y);
  place(c,'signal',2,12);
  for(let y=10;y<=11;y++)place(c,'road',21,y);
  place(c,'signal',21,12);
  c.incidents.push({id:c.nextId++,x:13,y:5,severity:'minor',status:'active',createdAt:0,required:['police'],completedServices:[],rescueDeadline:null,outcome:'none'});c.accidentCount=1;
  return c;
 }
 const c=createCity();c.map={x:0,y:0,width:26,height:18};c.funds=100000;c.tutorial!.status='complete';
 const put=(tool:Tool,x:number,y:number,r=0)=>{const result=place(c,tool,x,y,r);if(/cannot|occupied|outside|Wait/.test(result))throw Error(result);};
 for(let x=2;x<=23;x++)put('road',x,8);
 for(const x of (id==='temporary-two-way'?[2,4,16,18]:[2,4,6,8]))put('home',x,6);
 put('store',21,6);
 for(let x=12;x<=23;x++)put('road',x,11);
 const gap=['a-town-that-works','past-the-wreck'].includes(id);
 if(!gap)for(let y=9;y<=10;y++)put('road',18,y);
 const required:ServiceKind[]= ['clinic-access','paired-response'].includes(id)?['police','ems']:['fire-access','fire-and-flow','district-recovery'].includes(id)?['police','ems','fire']:['police'];
 const kinds={police:'policeStation',ems:'hospital',fire:'fireStation'} as const;
 required.forEach((s,i)=>{if(!requiredPlacements(id).includes(kinds[s]))put(kinds[s],12+i*4,12,2);});
 const addScene=(x:number,y:number,roster:ServiceKind[])=>{c.incidents.push({id:c.nextId++,x,y,severity:roster.length===3?'fire':roster.length===2?'serious':'minor',status:'active',createdAt:0,required:roster,completedServices:[],rescueDeadline:roster.length>1?3600:null,outcome:roster.length>1?'pending':'none'});c.accidentCount++;};
 addScene(13,8,id==='district-recovery'?['police']:required);
 if(id==='district-recovery')addScene(22,11,required);
 if(['another-approach','temporary-two-way'].includes(id))applyRoadDirections(c,recoveryStreet,'forward');
 if(id==='temporary-two-way'){for(let x=16;x<=20;x++)if(!c.roads.some(p=>p.x===x&&p.y===10))put('road',x,10);put('road',16,9);put('road',20,9);}
 return c;
}

export const isRoadPuzzle=(id:string)=>['first-road','neighborhood-roads','shared-streets','stop-and-share','safe-crossing','green-for-the-queue','shopping-flow','one-way-home','around-the-island','apartment-avenue','another-approach','temporary-two-way','paired-response','fire-and-flow','district-recovery','what-a-jam'].includes(id);
