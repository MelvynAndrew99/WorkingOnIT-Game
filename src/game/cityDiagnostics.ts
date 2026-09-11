/** Read-only observations: no spawning, rerouting or rewards belong here. */
import {entrance, findPath, type City} from './cityModel.ts';
import {visitorSlots} from './cityVisits.ts';
import {bodyTile} from './cityTraffic.ts';
import {CITY_RULES} from './cityRules.ts';
import {intersectionSafetySnapshot} from './cityIncidents.ts';
export type DiagnosticView = 'normal' | 'traffic' | 'access' | 'capacity';
export function cityDiagnostics(city: City) {
  const destinations = city.buildings.filter(b => b.kind === 'store' || b.kind === 'park')
    .map(b => ({id:b.id,x:b.x,y:b.y,kind:b.kind,...visitorSlots(city,b)}));
  const traffic = city.trips.filter(t => !['visiting','working','crashed'].includes(t.phase ?? '') && t.hold >= CITY_RULES.diagnostics.stoppedSeconds)
    .map(t => ({id:t.id,...t.path[bodyTile(t)],hold:t.hold}));
  const homes = city.buildings.filter(b=>b.kind==='home').map(home => {
    const household=city.households.find(h=>h.homeId===home.id);
    const trip=city.trips.find(t=>t.homeId===home.id&&!t.service&&!t.external);
    let status: 'ready'|'access'|'capacity'|'traffic'|'idle'='ready', reason='Shopping access both ways';
    const wantedKind=trip?.purpose==='leisure'||(!household?.shopping&&!!household?.leisure)?'park':'store';
    const choices=city.buildings.filter(b=>b.kind===wantedKind);
    const reachable=choices.filter(b=>findPath(city,entrance(home),entrance(b))&&findPath(city,entrance(b),entrance(home)));
    if(!choices.length){status='access';reason=`No ${wantedKind==='store'?'store':'park'} built`;}
    else if(!reachable.length){status='access';reason=`No usable route to ${wantedKind==='store'?'store':'park'} and home`;}
    else if(trip&&traffic.some(t=>t.id===trip.id)){status='traffic';reason=`Car waiting ${trip.hold.toFixed(0)}s`;}
    else if(!trip && ((household?.shopping??0)+(household?.leisure??0)>0) && reachable.every(b=>{const v=visitorSlots(city,b);return v.occupied+v.inbound>=v.capacity;})){
      status='capacity';reason=`Reachable ${wantedKind==='store'?'stores':'parks'} full (including inbound)`;
    } else if(trip){reason=trip.phase==='visiting'?'Visiting destination': 'Journey in progress';}
    else if(!household||!(household.shopping+household.leisure)){status='idle';reason='No trip needed now';}
    return {id:home.id,x:home.x,y:home.y,status,reason,shopping:household?.shopping??0,leisure:household?.leisure??0};
  });
  return {homes,destinations,traffic,intersections:intersectionSafetySnapshot(city)};
}
export type CityDiagnostics = ReturnType<typeof cityDiagnostics>;
