import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {parseCity,stepCity} from './cityModel.ts';
import {isYielding,roadIndex,validEmergencyPasses} from './cityTraffic.ts';
const fixture=()=>{
 const city=parseCity(JSON.parse(readFileSync(new URL('./fixtures/police-junction-jam.json',import.meta.url),'utf8')).city);
 assert.ok(city);return city;
};
test('returning EMS may clear a junction when the responding police exit is blocked',()=>{
 const c=fixture(),ems=c.trips.find(t=>t.id===8007)!;
 assert.equal(isYielding(c,ems,roadIndex(c)),false);
 // Removing the stranded exit car restores normal siren priority.
 c.trips=c.trips.filter(t=>t.id!==7994);
 assert.equal(isYielding(c,ems,roadIndex(c)),true);
});
test('saved police junction jam clears through another approach without editing the town',()=>{
 let c=fixture();const geometry=JSON.stringify({roads:c.roads,buildings:c.buildings,closures:c.closures});
 const fatalities=c.fatalities;let passed=false,seconds=0;
 for(;seconds<60&&c.incidents.find(i=>i.id===8006)?.status==='active';seconds++){
  stepCity(c,1);
  if(c.trips.some(t=>t.id===8003&&t.emergencyPass)){
   passed=true;assert.ok(validEmergencyPasses(c),'passing keeps exclusive corridor reservations');
  }
  if(seconds===5){const loaded=parseCity(JSON.parse(JSON.stringify(c)));assert.ok(loaded);c=loaded;}
 }
 const incident=c.incidents.find(i=>i.id===8006)!;
 assert.equal(incident.status,'cleared');assert.equal(incident.outcome,'rescued');
 assert.ok(incident.completedServices.includes('police'));assert.ok(passed,'police physically pass the alternate queue');
 assert.equal(c.fatalities,fatalities);
 assert.equal(JSON.stringify({roads:c.roads,buildings:c.buildings,closures:c.closures}),geometry);
 assert.ok(parseCity(JSON.parse(JSON.stringify(c))));
});
