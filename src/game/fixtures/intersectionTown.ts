import {createChallenge,challengePlace} from '../cityChallenges.ts';
import {createCity,place,type City} from '../cityModel.ts';
import type {ControlKind} from '../cityTraffic.ts';

/** Real household demand; extra homes extend the same two approaches, never injected cars. */
export function intersectionTown(extra=0,control?:ControlKind):City {
  const c=createChallenge('safe-crossing').city;c.funds=100000;
  for(const [x,y] of [[7,6],[8,6],[9,6],[8,5]])place(c,'road',x,y);
  c.map={x:-24,y:-24,width:48,height:38};
  for(let x=-extra*2;x<0;x++)place(c,'road',x,6);
  for(let y=-extra*2;y<0;y++)place(c,'road',8,y);
  for(let n=1;n<=extra;n++){
    place(c,'home',-n*2,4);place(c,'home',-n*2,7,2);
    place(c,'home',9,-n*2,1);place(c,'home',6,-n*2,3);
  }
  if(extra){
    for(let x=15;x<=23;x++)place(c,'road',x,6);
    place(c,'store',18,4);place(c,'store',21,7,2);
  }
  if(control)place(c,control,8,6);
  return c;
}
export function quietIntersectionTown():City {
  const r=createChallenge('neighborhood-roads');
  for(let y=3;y<=11;y++)challengePlace(r.city,'road',6,y,0,r.id);
  for(const y of [3,7,11])for(let x=2;x<6;x++)challengePlace(r.city,'road',x,y,0,r.id);
  for(let x=7;x<=12;x++)challengePlace(r.city,'road',x,7,0,r.id);
  return r.city;
}
export function separateApproaches(city:City):void {
  place(city,'bulldoze',8,5);
  const north=Math.min(...city.roads.filter(p=>p.x===8).map(p=>p.y))-1;
  const end=Math.max(...city.roads.filter(p=>p.y===6).map(p=>p.x));
  for(let x=8;x<=end;x++)place(city,'road',x,north);
  for(let y=north+1;y<=6;y++)place(city,'road',end,y);
}

/** Both sides feed northbound shops: opposing left/through-lane turns share an EW green. */
export function turningIntersectionTown():City {
  const c=createCity();c.funds=100000;c.map={x:0,y:0,width:32,height:32};c.tutorial!.status='complete';
  for(let x=0;x<32;x++)place(c,'road',x,16);
  for(let y=0;y<32;y++)place(c,'road',16,y);
  for(const x of [0,2,4,6,8,10,20,22,24,26,28,30]){
    place(c,'home',x,14);place(c,'home',x,17,2);
  }
  for(const y of [0,4,8,12])place(c,'store',17,y,1);
  place(c,'signal',16,16);
  return c;
}
