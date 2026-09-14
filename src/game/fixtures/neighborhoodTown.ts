import {createCity,place,type City,type Tool} from '../cityModel.ts';

export const originalEntrance={x:8,y:10};
export function neighborhoodTown():City {
 const c=createCity();c.map={x:0,y:0,width:26,height:20};c.funds=100000;c.tutorial!.status='complete';
 const put=(t:Tool,x:number,y:number,r=0)=>{const message=place(c,t,x,y,r);if(/cannot|occupied|outside|Wait|Not enough/.test(message))throw Error(`${t} ${x},${y}: ${message}`);};
 for(let x=2;x<=23;x++)put('wideRoad',x,12);
 for(let x=4;x<=16;x++)put('road',x,5);
 for(let y=6;y<=11;y++)put('road',8,y);
 for(const x of [4,6,10,12])put('home',x,3);
 put('store',20,14,2);
 put('signal',8,12);
 return c;
}
