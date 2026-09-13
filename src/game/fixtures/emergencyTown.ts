/** Authored incidents are visible starting conditions, serviced by ordinary dispatch/traffic. */
import {createCity, place, stepCity, type City, type Tool, type Point} from '../cityModel.ts';
import {applyRoadDirections} from '../cityDirectionEdits.ts';
import type {ServiceKind} from '../cityIncidents.ts';
import {neighborhoodTown} from './neighborhoodTown.ts';
const tools = ['road','stop','signal','closure','bulldoze'] as const;
export const EMERGENCY_LEVELS = [
 {id:'a-town-that-works',title:'Make room for police',homes:4,budget:1800,goal:'Connect the police approach and let the crew clear the crash.',lesson:'A station needs a connected road to the scene.',rules:'The police station south of the crash has an unfinished approach. Connect it to the main street or build another legal approach. Press Play to dispatch the crew and watch it arrive and finish work.',tools,objective:'emergency'},
 {id:'call-the-police',title:'A local police station',homes:4,budget:3000,goal:'Place a police station with road access and clear the crash.',lesson:'Place Police, then connect its entrance arrow.',rules:'A minor crash needs police. Choose a station site, connect its entrance to the road and run traffic. Placing the building alone does not complete this job.',tools:[...tools,'policeStation'],objective:'emergency'},
 {id:'clinic-access',title:'A clinic within reach',homes:4,budget:3500,goal:'Place a clinic and let police and EMS clear the collision.',lesson:'Different incidents need different crews.',rules:'Police are provided. Place a Clinic where its entrance can reach the serious collision. Both crews must physically arrive and finish their work. Pause freely to plan; the starting scene allows ample rescue time.',tools:[...tools,'hospital'],objective:'emergency'},
 {id:'fire-access',title:'Room for the fire crew',homes:4,budget:4000,goal:'Place a fire station and let all three crews clear the vehicle fire.',lesson:'Keep a usable approach for every required crew.',rules:'Police and a clinic are provided. Place Fire and connect its entrance. Police, EMS and fire must arrive and work at the marked scene. Extra road space and generous funds let you try different sites.',tools:[...tools,'fireStation'],objective:'emergency'},
 {id:'past-the-wreck',title:'A second entrance for rescue',homes:4,budget:3200,goal:'Build a second entrance, Divert the old approach, clear the crash and reopen.',lesson:'Give neighborhood traffic another way out so crews can get in.',rules:'A two-lane neighborhood street leaves the four-lane avenue. Spend the $3,200 budget on a second connection and connect the supplied police entrance at (21,9). Keep the original entrance. Select Divert, then tap the old approach at (8,10); cars use your new connection and responding crews can pass Divert. Keep Play running so existing traffic can move out. Leave Divert on until Police arrives and clears the crash. Tap Divert at (8,10) again to reopen, then bring every household home from a fresh shopping trip. Build roads while paused; choose your own second entrance.',tools,objective:'emergency'},
 {id:'another-approach',title:'Another legal approach',homes:4,budget:3200,goal:'Reach the crash legally and restore shopping journeys.',lesson:'Responders obey one-way arrows too.',rules:'The eastbound street prevents police on the east side from reaching the crash to their west. Add another road approach, or safely change directions. Clear the scene, then bring every household home from a new shopping trip. Permanent redesigns are welcome.',tools:[...tools,'direction'],objective:'emergency'},
 {id:'temporary-two-way',title:'Open, rescue, restore',homes:4,budget:3500,goal:'Divert → two-way → rescue → original arrows → reopen → journeys.',lesson:'Wait for occupied road space to clear before editing.',rules:'Divert the marked approach at (14,8). Let traffic clear. Select the eastbound street from (14,8) to (18,8) and Restore two-way while Divert stays on. Let police clear the crash at (13,8). Wait for crews to leave before restoring those same eastbound arrows. Remove Divert last, then observe shopping returns. A missing legal route needs a road fix; “traffic must clear” means wait with Play running.',tools:[...tools,'direction'],objective:'emergency'},
 {id:'paired-response',title:'Two crews, one recovery',homes:4,budget:6500,goal:'Place police and a clinic, clear the scene, then restore every home’s journeys.',lesson:'Plan service entrances and civilian routes together.',rules:'Place Police and Clinic with legal approaches to the collision. Both must dispatch, arrive and work. After clearance, every home must finish a new shopping trip. Use a detour or controls where traffic meets; any legal layout is welcome.',tools:[...tools,'direction','policeStation','hospital'],objective:'emergency'},
 {id:'fire-and-flow',title:'Fire and flow',homes:4,budget:7500,goal:'Build the three services, clear the fire and bring every home back from shopping.',lesson:'Separate busy civilian access from responder approaches.',rules:'Place Police, Clinic and Fire and connect their entrances. All three crews must finish clearing the fire. Then observe a new shopping return from every home, with legal emergency access maintained. Detours, road controls and permanent redesigns are all available.',tools:[...tools,'direction','wideRoad','policeStation','hospital','fireStation'],objective:'emergency'},
 {id:'district-recovery',title:'Recover the district',homes:4,budget:8500,goal:'Place all services, clear both marked scenes and restore household journeys.',lesson:'Check every scene and keep the recovered network usable.',rules:'Two existing scenes need help: a minor crash on the main street and a vehicle fire on the southern road. Place Police, Clinic and Fire. Crews must reach and clear both scenes, then all four homes must complete new shopping returns. Keep service access usable. Choose your own sites, detours and controls; no fixed road design is required.',tools:[...tools,'direction','wideRoad','policeStation','hospital','fireStation'],objective:'emergency'},
 {id:'what-a-jam',title:'What a Jam!',homes:4,budget:10000,goal:'Plan your rescue network, clear both scenes and get the neighborhood moving again.',lesson:'Use what you have learned. The road design is yours.',rules:'The eastbound main street and disconnected service street need a plan. Place Police, Clinic and Fire with legal routes to the two marked scenes. Build connections, use detours, change directions or widen where useful. All required crews must arrive and finish work. Then bring every household home from a fresh shopping trip while keeping service access open. Permanent redesigns count; you do not need to restore the starting layout or use every tool. No countdown. Finish to earn the free What A Jam song reward.',tools:[...tools,'direction','wideRoad','policeStation','hospital','fireStation'],objective:'emergency'},
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
  const c=neighborhoodTown();place(c,'policeStation',20,7);place(c,'road',21,9);
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
 if(id==='temporary-two-way'){for(let x=16;x<=20;x++)if(!c.roads.some(p=>p.x===x&&p.y===10))put('road',x,10);put('road',16,9);put('road',20,9);stepCity(c,4.5);}
 return c;
}
