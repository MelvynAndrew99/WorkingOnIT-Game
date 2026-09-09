import type {Point} from './cityModel.ts';
/** Adjoining junction tiles form one intersection; ordinary road tiles separate intersections. */
export function junctionAreas(tiles: Set<string>): Map<string,string> {
  const areas=new Map<string,string>();
  for(const first of tiles) {
    if(areas.has(first))continue;
    const queue=[first];areas.set(first,first);
    for(let i=0;i<queue.length;i++) {
      const [x,y]=queue[i].split(',').map(Number);
      for(const n of [`${x-1},${y}`,`${x+1},${y}`,`${x},${y-1}`,`${x},${y+1}`]) {
        if(tiles.has(n) && !areas.has(n)){areas.set(n,first);queue.push(n);}
      }
    }
  }
  return areas;
}
export function areaTiles(areas:Map<string,string>,p:Point):Point[] {
  const area=areas.get(`${p.x},${p.y}`);
  if(area===undefined)return [];
  return [...areas].filter(([,id])=>id===area).map(([key])=>{
    const [x,y]=key.split(',').map(Number);return {x,y};
  });
}
