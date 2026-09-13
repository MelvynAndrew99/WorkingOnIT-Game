/** Reference player operations, including waiting for real responders to vacate editable roads. */
import {challengePlace,challengeDirections,stepChallenge,type ChallengeRun} from '../cityChallenges.ts';
import {observeEmergency} from '../cityEmergencyChallenges.ts';
import {requiredPlacements,recoveryStreet} from './emergencyTown.ts';
import type {Tool} from '../cityModel.ts';
export function solveEmergency(run:ChallengeRun,alternative=false,checkpoint:(run:ChallengeRun)=>void=()=>{}){
 const c=run.city;
 const put=(t:Tool,x:number,y:number,r=0)=>{const result=challengePlace(c,t,x,y,r,run.id);if(/Not enough|cannot|occupied|Keep|outside|Wait/.test(result))throw Error(`${t} ${x},${y}: ${result}`);};
 const road=(x:number,y:number)=>{if(!c.roads.some(p=>p.x===x&&p.y===y))put('road',x,y);};
 const wait=(predicate:()=>boolean)=>{for(let i=0;i<2400&&!predicate();i++)stepChallenge(run,.25);if(!predicate())throw Error(`Waiting in ${run.id}: ${JSON.stringify(run.emergency)}`);};
 if(run.id==='past-the-wreck'&&run.revision===4){
  const x=alternative?12:10;
  for(let y=6;y<=11;y++)road(x,y);
  for(let n=x;n<=21;n++)road(n,9);
  put('signal',x,12);put('signal',x,9);
  put('closure',8,10);observeEmergency(run);checkpoint(run);
  wait(()=>run.emergency!.neighborhoodCleared!==undefined);checkpoint(run);
  put('closure',8,10);observeEmergency(run);checkpoint(run);
  return;
 }
 // Different service sites and a northern/southern civilian bypass, not just a timing variation.
 for(const [i,t] of requiredPlacements(run.id).entries()){
  const slot=['policeStation','hospital','fireStation'].indexOf(t);
  const x=alternative?2+i*4:12+slot*4;
  put(t,x,alternative?14:12,2);
  if(alternative){for(let y=11;y<=13;y++)road(x+1,y);for(let n=x+1;n<=18;n++)road(n,11);}
 }
 const bypass=()=>{
  const y=alternative?(run.id==='past-the-wreck'?3:10):4;
  const right=['temporary-two-way','what-a-jam'].includes(run.id)?20:16;
  for(let n=Math.min(8,y);n<=Math.max(8,y);n++){road(11,n);road(right,n);}
  for(let x=11;x<=right;x++)road(x,y);
  put('signal',11,8);put('signal',right,8);
 };
 if(['past-the-wreck','another-approach','paired-response','fire-and-flow','district-recovery','what-a-jam'].includes(run.id))bypass();
 if(run.id==='past-the-wreck')wait(()=>!!run.emergency!.detourReturns.length);
 if(['a-town-that-works','past-the-wreck'].includes(run.id)){
  const x=alternative?23:18;for(let y=8;y<=11;y++)road(x,y);
 }
 if(run.id==='another-approach'||run.id==='what-a-jam'){
  // Reach the west side via the southern road without changing the inherited eastbound street.
  for(let y=8;y<=11;y++)road(alternative?10:11,y);
  for(let x=alternative?10:11;x<=18;x++)road(x,11);
 }
 if(run.id==='temporary-two-way'){
  put('closure',14,8);observeEmergency(run);checkpoint(run);
  wait(()=>{const r=challengeDirections(c,recoveryStreet,'two-way',run.id);if(r.ok){observeEmergency(run);return true;}return false;});
  checkpoint(run);
  wait(()=>run.emergency!.clearedAt!==undefined);
  checkpoint(run);
  wait(()=>{const r=challengeDirections(c,recoveryStreet,'forward',run.id);if(r.ok){observeEmergency(run);return true;}return false;});
  checkpoint(run);
  put('closure',14,8);observeEmergency(run);checkpoint(run);
  bypass();
 }
 observeEmergency(run);
}
