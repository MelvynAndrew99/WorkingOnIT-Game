import { entrance, type Building, type Point, type Trip } from './cityModel.ts';
import { wideRoadFootprint, wideRoadTopology, type WideRoadCity, type WideRoadSection, type WideRoadTopology } from './cityWideRoads.ts';

export type RoadTransition = { section: WideRoadSection; startOffset?: 0|1; endOffset?: 0|1 };
type TransitionCity = WideRoadCity & { buildings?: Building[] };
const key = (p:Point) => `${p.x},${p.y}`;
const sectionKey = (s:WideRoadSection) => `${key(s)},${s.axis}`;
const smooth = (v:number) => { const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t); };
type Cached = { buildings?:Building[]; count:number; transitions:Map<string,RoadTransition>; tiles:Map<string,RoadTransition> };
const cache = new WeakMap<WideRoadTopology,Cached>();

/** Only an unambiguous longitudinal narrow connection receives a taper. Actual
 * side junctions, wide crossings and building curb access retain their apron. */
export function roadTransitions(city:TransitionCity):Map<string,RoadTransition> {
    const topology=wideRoadTopology(city), old=cache.get(topology);
    if(old&&old.buildings===city.buildings&&old.count===(city.buildings?.length??0))return old.transitions;
    const transitions=new Map<string,RoadTransition>(),tiles=new Map<string,RoadTransition>();
    const source=city.roadPoints??city.roads;
    const roads:ReadonlySet<string>=Array.isArray(source)?new Set(source.map(key)):source??new Set();
    const sections=city.wideRoads??[], sectionsByKey=new Set(sections.map(sectionKey));
    const entrances=new Set((city.buildings??[]).map(b=>key(entrance(b))));
    for(const section of sections){
        const h=section.axis==='horizontal',pair=wideRoadFootprint(section);
        // A perpendicular overlap or a side connection is a real intersection.
        if(pair.some(p=>topology.tiles.get(key(p))?.direction===undefined))continue;
        if(pair.some(p=>[-1,1].some(d=>{
            const n=h?{x:p.x,y:p.y+d}:{x:p.x+d,y:p.y};
            return !pair.some(q=>key(q)===key(n))&&roads.has(key(n));
        })))continue;
        const transition:RoadTransition={section};
        for(const side of [-1,1] as const){
            const neighbor={...section,x:section.x+(h?side:0),y:section.y+(h?0:side)};
            if(sectionsByKey.has(sectionKey(neighbor)))continue;
            const connected=pair.map(p=>{
                const n={x:p.x+(h?side:0),y:p.y+(h?0:side)};
                return roads.has(key(n))&&!topology.tiles.has(key(n));
            });
            if(connected.filter(Boolean).length!==1)continue;
            const offset=(connected[0]?0:1) as 0|1;
            // Do not paint away the curb used by a destination on the added half.
            if(entrances.has(key(pair[1-offset])))continue;
            if(side===-1)transition.startOffset=offset;else transition.endOffset=offset;
        }
        if(transition.startOffset===undefined&&transition.endOffset===undefined)continue;
        // A one-section dogleg has no room for a taper and a vehicle's wheelbase.
        // Keep its full junction apron rather than drawing grass under the turn.
        if(transition.startOffset!==undefined&&transition.endOffset!==undefined&&transition.startOffset!==transition.endOffset)continue;
        transitions.set(sectionKey(section),transition);
        for(const p of pair)tiles.set(key(p),transition);
    }
    cache.set(topology,{buildings:city.buildings,count:city.buildings?.length??0,transitions,tiles});
    return transitions;
}

/** Local across-road pavement bounds; along is zero at the section's top/left. */
export function transitionBounds(t:RoadTransition,along:number):{low:number;high:number} {
    const both=t.startOffset!==undefined&&t.endOffset!==undefined;
    // A lone section is all transition: there is no length for four through lanes.
    if(both){
        const low=t.startOffset!+(t.endOffset!-t.startOffset!)*smooth(along);
        return {low,high:low+1};
    }
    const start=t.startOffset===undefined?0:1-smooth(along);
    const end=t.endOffset===undefined?0:1-smooth(1-along);
    return {low:(t.startOffset??0)*start+(t.endOffset??0)*end,
        high:2-(1-(t.startOffset??1))*start-(1-(t.endOffset??1))*end};
}

/** Presentation-only continuous passage across the reserved junction cells.
 * Saved cardinal progress/reservations remain authoritative. A bounded local
 * run also combines adjacent terminal sections, preventing a halfway jump. */
export function transitionVehiclePose(city:TransitionCity,trip:Trip,laneOffset=.16):{x:number;y:number;dx:number;dy:number}|undefined {
    if(!city.wideRoads?.length||trip.path.length<3||trip.sceneParked)return undefined;
    roadTransitions(city);
    const topology=wideRoadTopology(city),tiles=cache.get(topology)!.tiles;
    const i=Math.min(trip.path.length-1,Math.max(0,Math.floor(trip.progress)));
    const candidate=tiles.get(key(trip.path[i]))??(i+1<trip.path.length?tiles.get(key(trip.path[i+1])):undefined)
        ??(i>0?tiles.get(key(trip.path[i-1])):undefined);
    if(!candidate)return undefined;
    const h=candidate.section.axis==='horizontal';
    const compatible=(n:number)=>n>=0&&n<trip.path.length&&tiles.get(key(trip.path[n]))?.section.axis===candidate.section.axis;
    let left=compatible(i)?i:compatible(i+1)?i+1:i-1,right=left;
    while(left>0&&left>i-5&&compatible(left-1))left--;
    while(right<trip.path.length-1&&right<i+5&&compatible(right+1))right++;
    if(left===0||right===trip.path.length-1||compatible(left-1)||compatible(right+1))return undefined;
    const first=trip.path[left-1],last=trip.path[right+1];
    const along=(p:Point)=>h?p.x:p.y,across=(p:Point)=>h?p.y:p.x;
    const start=along(first)+.5,finish=along(last)+.5,sign=Math.sign(finish-start);
    if(!sign||trip.progress<left-1||trip.progress>right+1)return undefined;
    const descriptors=new Set<RoadTransition>();
    for(let n=left;n<=right;n++)descriptors.add(tiles.get(key(trip.path[n]))!);
    const min=Math.min(...[...descriptors].map(t=>along(t.section))),max=Math.max(...[...descriptors].map(t=>along(t.section)))+1;
    if(Math.min(start,finish)!==min-.5||Math.max(start,finish)!==max+.5)return undefined;
    const base=across(candidate.section);
    if([...descriptors].some(t=>across(t.section)!==base))return undefined;
    const shift=trip.emergencyPass?.shift??(trip.laneChange?trip.laneChange.from+(trip.laneChange.to-trip.laneChange.from)*trip.laneChange.shift:trip.trafficLane??0);
    const lane=laneOffset*(1-2*shift)*sign*(h?1:-1);
    const from=across(first)+.5+lane,to=across(last)+.5+lane;
    const u=(trip.progress-(left-1))/(right-left+2),a=start+(finish-start)*u;
    const lowAcross=sign>0?from:to,highAcross=sign>0?to:from;
    const lowWide=topology.tiles.has(key(sign>0?first:last)),highWide=topology.tiles.has(key(sign>0?last:first));
    let c=lowAcross+(highAcross-lowAcross)*smooth((a-min)/(max-min));
    const bounds=(v:number)=>{
        if(v<min)return lowWide?{low:base,high:base+2}:{low:Math.floor(lowAcross),high:Math.floor(lowAcross)+1};
        if(v>max)return highWide?{low:base,high:base+2}:{low:Math.floor(highAcross),high:Math.floor(highAcross)+1};
        const t=[...descriptors].find(d=>v>=along(d.section)&&v<=along(d.section)+1);
        const b=t?transitionBounds(t,v-along(t.section)):{low:0,high:2};
        return {low:base+b.low,high:base+b.high};
    };
    // A small planar wheel/contact envelope, not the sprite rectangle: the
    // four-view art includes elevated roofs and substantial visual overhang.
    // Fitting that full rectangle would collapse opposite lanes in a short S.
    const halfLength=.22,halfWidth=.12;
    const body=[-halfLength,0,halfLength].map(d=>bounds(a+d));
    const low=Math.max(...body.map(b=>b.low))+halfWidth,high=Math.min(...body.map(b=>b.high))-halfWidth;
    if(low<=high)c=Math.max(low,Math.min(high,c));
    else {
        // Retain the signed lane separation even in an unusually tight shape.
        const b=bounds(a);c=Math.max(b.low+.12,Math.min(b.high-.12,(low+high)/2+lane));
    }
    return h?{x:a,y:c,dx:sign,dy:0}:{x:c,y:a,dx:0,dy:sign};
}
