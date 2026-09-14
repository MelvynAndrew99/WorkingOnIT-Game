/** Verification-only operations, not hints or player-facing solutions. */
import {challengePlace,challengeDirections,type ChallengeRun} from '../../../src/game/cityChallenges.ts';
import {applyFlowSolution} from '../../../src/game/fixtures/flowTown.ts';
import {solveCampaign} from '../../../src/game/fixtures/campaignSolutions.ts';
import {smallRing} from '../../../src/game/fixtures/campaignTown.ts';
import type {Tool,Point} from '../../../src/game/cityModel.ts';
export function solveBeginnerPuzzle(r:ChallengeRun,alternative=false){
 const put=(tool:Tool,x:number,y:number)=>{const message=challengePlace(r.city,tool,x,y,0,r.id);if(/Not enough|cannot|occupied|Keep|outside|Wait/.test(message))throw Error(message);};
 const road=(x:number,y:number)=>{if(!r.city.roads.some(p=>p.x===x&&p.y===y))put('road',x,y);};
 switch(r.id){
 case 'first-road':for(let x=4;x<=9;x++)road(x,6);return;
 case 'neighborhood-roads':{
  const column=alternative?5:6;
  for(let y=3;y<=11;y++)road(column,y);
  for(const y of [3,7,11])for(let x=2;x<column;x++)road(x,y);
  for(let x=column+1;x<=12;x++)road(x,7);return;
 }
 case 'safe-crossing':for(const [x,y] of [[7,6],[8,6],[9,6],[8,5]])road(x,y);put(alternative?'signal':'stop',8,6);return;
 case 'shopping-flow':applyFlowSolution(r.city,alternative?'destinations':'retimed');return;
 case 'green-for-the-queue':if(alternative){put('stop',8,6);return;}break;
 case 'apartment-avenue':if(alternative){for(let x=9;x<=14;x++)road(x,10);return;}break;
 }
 solveCampaign(r,alternative);
 if(alternative&&['one-way-home','around-the-island'].includes(r.id)){
  const path:Point[]=[];
  if(r.id==='around-the-island')path.push(...smallRing);
  else {for(let y=6;y<=9;y++)path.push({x:13,y});for(let x=12;x>=2;x--)path.push({x,y:9});for(let y=8;y>=6;y--)path.push({x:2,y});}
  const result=challengeDirections(r.city,path,'two-way',r.id);if(!result.ok)throw Error(result.message);
 }
}
