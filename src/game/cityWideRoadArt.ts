import { Graphics } from 'pixi.js';
import type { City, Point } from './cityModel.ts';
import { wideRoadTopology, wideRoadFootprint } from './cityWideRoads.ts';
import {roadTransitions,transitionBounds,type RoadTransition} from './cityRoadTransitions.ts';

/** Road paint and curb contours use the same terminal geometry as moving vehicles.
 * Existing Kenney asphalt/curb colours; the reserved footprint remains two whole tiles.
 */
export function wideRoadArt(city:City, tile:number, px:(x:number)=>number, py:(y:number)=>number, only?:Set<string>):Graphics {
    const g=new Graphics(), topology=wideRoadTopology(city), transitions=roadTransitions(city);
    const key=(p:Point)=>`${p.x},${p.y}`;
    const roads=new Set(city.roads.map(key));
    const sections=city.wideRoads??[];
    const transitionTiles=new Set([...transitions.values()].flatMap(t=>wideRoadFootprint(t.section).map(key)));
    const curb=0xd6dbe6, white=0xd6dbe6, yellow=0xe3c66e;
    const line=(points:Point[],color=white,width=.0625)=>{
        if(points.length<2)return;
        g.moveTo(px(points[0].x),py(points[0].y));
        for(const p of points.slice(1))g.lineTo(px(p.x),py(p.y));
        g.stroke({color,width:tile*width,cap:'butt',join:'round'});
    };
    const at=(s:typeof sections[number],along:number,across:number):Point=>s.axis==='horizontal'?{x:s.x+along,y:s.y+across}:{x:s.x+across,y:s.y+along};
    const curve=(s:typeof sections[number],from:number,to:number,across:(a:number)=>number)=>Array.from({length:17},(_,i)=>{const a=from+(to-from)*i/16;return at(s,a,across(a));});
    // Wide tiles must not have rectangular ordinary-road sprites underneath: those
    // would remain visible in the grass triangles outside a tapered curb.
    for(const [id,t] of topology.tiles){
        if(transitionTiles.has(id)||only&&!only.has(id))continue;
        const p=t.point;
        g.rect(px(p.x),py(p.y),tile,tile).fill(0x404040);
        for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]])if(!roads.has(`${p.x+dx},${p.y+dy}`)){
            const c={x:p.x+.5+dx*.4375,y:p.y+.5+dy*.4375};
            line([{x:c.x-dy*.5,y:c.y-dx*.5},{x:c.x+dy*.5,y:c.y+dx*.5}],curb,.125);
        }
    }
    function drawTransition(t:RoadTransition){
        const s=t.section;
        const upper=curve(s,0,1,a=>transitionBounds(t,a).low),lower=curve(s,1,0,a=>transitionBounds(t,a).high);
        g.poly([...upper,...lower].flatMap(p=>[px(p.x),py(p.y)])).fill(0x404040);
        line(curve(s,0,1,a=>transitionBounds(t,a).low+.0625),curb,.125);
        line(curve(s,0,1,a=>transitionBounds(t,a).high-.0625),curb,.125);
        // Only a genuine dead end gets an end cap. Narrow entrances stay open and
        // meet the ordinary road's curb at its existing offset, including rotations.
        for(const end of [0,1]){
            const outside=wideRoadFootprint(s).map(p=>s.axis==='horizontal'?{x:p.x+(end?1:-1),y:p.y}:{x:p.x,y:p.y+(end?1:-1)});
            if(!outside.some(p=>roads.has(key(p)))){
                const a=end?.9375:.0625,{low,high}=transitionBounds(t,a);
                line([at(s,a,low+.0625),at(s,a,high-.0625)],curb,.125);
            }
        }
        if(t.startOffset!==undefined&&t.endOffset!==undefined){
            // One short stamp is all transition: don't advertise four independent
            // lanes with a disconnected yellow island and four orphan white dashes.
            const start=t.startOffset+.5,end=t.endOffset+.5;
            const center=(a:number)=>start+(end-start)*(a*a*(3-2*a));
            line(curve(s,.25,.75,center),white,.125);
            return;
        }
        const front=t.startOffset!==undefined;
        const center=(a:number)=>{const b=transitionBounds(t,a);return (b.low+b.high)/2;};
        const range=(a:number,b:number):[number,number]=>front?[a,b]:[1-b,1-a];
        // The ordinary centre dash leads into the wide road's centre line. Extra
        // lane dividers appear only toward the full-width end of the transition.
        line(curve(s,...range(.05,.35),center),white,.125);
        for(const delta of [-.025,.025])line(curve(s,...range(.5,1),a=>center(a)+delta),yellow,.025);
        for(const cross of [.5,1.5])line(curve(s,...range(.78,.96),()=>cross));
    }
    for(const s of sections){
        const pair=wideRoadFootprint(s);
        if(only&&!pair.some(p=>only.has(key(p))))continue;
        const transition=transitions.get(`${s.x},${s.y},${s.axis}`);
        if(transition){drawTransition(transition);continue;}
        if(pair.some(p=>topology.tiles.get(key(p))?.junction))continue;
        for(const across of [.5,1.5])line([at(s,.25,across),at(s,.75,across)]);
        for(const across of [.975,1.025])line([at(s,0,across),at(s,1,across)],yellow,.025);
    }
    return g;
}
