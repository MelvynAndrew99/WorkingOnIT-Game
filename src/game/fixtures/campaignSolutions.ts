import {buildPrivateComplex} from '../cityPrivateLanes.ts';
import {solveEmergency} from './emergencySolutions.ts';
/** Reviewable player operations, used by simulation and browser checks. */
import {challengePlace,challengeDirections,stepChallenge,type ChallengeRun} from '../cityChallenges.ts';
import {smallRing} from './campaignTown.ts';
import {applyBusRoute,buyBus,setBusRouteRunning} from '../cityTransit.ts';
import type {Tool,Point} from '../cityModel.ts';
export function solveCampaign(run:ChallengeRun,alternative=false){
 if(run.emergency){solveEmergency(run,alternative);return;}
 const c=run.city;
 const put=(tool:Tool,x:number,y:number,r=0)=>{
  const result=challengePlace(c,tool,x,y,r,run.id);
  if(/Not enough|cannot|occupied|Keep|outside|Wait/.test(result))throw Error(`${tool} ${x},${y}: ${result}`);
 };
 const road=(x:number,y:number)=>{if(!c.roads.some(p=>p.x===x&&p.y===y))put('road',x,y);};
 const direct=(path:Point[],mode:'forward'|'reverse'='forward')=>{const result=challengeDirections(c,path,mode,run.id);if(!result.ok)throw Error(result.message);};
 switch(run.id){
 case 'apartment-avenue':
  for(let x=9;x<=14;x++)put('wideRoad',x,10);
  if(alternative){for(let x=15;x<=19;x++)road(x,15);}
  break;
 case 'another-front-door':{
  if(run.revision===3){
   const offset=alternative?3:0;
   for(const x of [2+offset,8+offset])put('apartment',x,2);
   const blocks=c.buildings.filter(b=>b.kind==='apartment');
   const result=buildPrivateComplex(c,blocks[0].id,blocks[1].id);if(!result.startsWith('Complex joined'))throw Error(result);
   for(let y=7;y<12;y++)road(2+offset,y);
   break;
  }
  const x=alternative?18:16;
  for(let n=16;n<=x;n++)road(n,5);
  for(let y=6;y<=11;y++)road(x,y);
  put('signal',x,12);put('closure',8,10);
  for(let n=0;n<800&&(run.routeServed?.length??0)<4;n++)stepChallenge(run,.25);
  if(run.routeServed?.length!==4)throw Error('Second entrance did not carry all shopping returns');
  put('closure',8,10);break;
 }
 case 'keep-another-way':
  for(let x=10;x<=12;x++)road(x,6);
  for(let n=0;n<400&&(run.shoppingIncome??0)<300;n++)stepChallenge(run,.25);
  if((run.shoppingIncome??0)<300)throw Error('Connected shopping did not earn park funds');
  put('park',alternative?9:6,7,2);
  break;
 case 'shared-streets':
  for(let x=1;x<=13;x++)road(x,alternative?8:3);
  for(let y=3;y<=8;y++)road(alternative?4:10,y);
  for(let x=1;x<=13;x++)if(alternative?x<=4:x>=10)road(x,alternative?3:8);
  road(2,8);if(!alternative)for(let x=2;x<=10;x++)road(x,8);
  road(11,3);if(alternative)for(let x=4;x<=11;x++)road(x,3);
  break;
 case 'stop-and-share':
  put('stop',8,6);break;
 case 'green-for-the-queue':
  put('signal',8,6);if(alternative)put('signal',8,6);break;
 case 'one-way-home':{
  const y=alternative?9:10,path:Point[]=[];
  for(let n=6;n<=y;n++){road(13,n);path.push({x:13,y:n});}
  for(let x=12;x>=2;x--){road(x,y);path.push({x,y});}
  for(let n=y-1;n>=6;n--){road(2,n);path.push({x:2,y:n});}
  direct(path);break;}
 case 'around-the-island':
  for(const p of smallRing)road(p.x,p.y);direct(smallRing,alternative?'reverse':'forward');break;
 case 'shops-and-strolls':
  if(alternative){put('park',8,8,2);road(9,7);}else{put('park',8,7,2);}
  if(alternative)put('store',11,7,2);
  break;
 case 'first-bus-service':{
  const depot=c.buildings.find(b=>b.kind==='busStation')!,stops=c.buildings.filter(b=>b.kind==='busStop');
  const order=alternative?[...stops].reverse():stops;
  const route=applyBusRoute(c,depot.id,order.map(b=>b.id));if(!route.includes('ready'))throw Error(route);
  const purchased=buyBus(c,depot.id);if(!purchased.includes('purchased'))throw Error(purchased);
  const started=setBusRouteRunning(c,depot.id,true);if(!started.includes('started'))throw Error(started);
  break;}
 default:throw Error('No playable campaign solution for '+run.id);
 }
}
