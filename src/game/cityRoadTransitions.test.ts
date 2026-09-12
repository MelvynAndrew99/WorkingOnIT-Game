import test from 'node:test';
import assert from 'node:assert/strict';
import { roadTransitions, transitionBounds, transitionVehiclePose } from './cityRoadTransitions.ts';
import { wideRoadFootprint, type WideRoadSection } from './cityWideRoads.ts';
import type { Building, Point, Trip } from './cityModel.ts';

const point=(axis:'horizontal'|'vertical',along:number,across:number):Point=>axis==='horizontal'?{x:along,y:across}:{x:across,y:along};
function corridor(axis:'horizontal'|'vertical',length=3){
    const wideRoads:WideRoadSection[]=Array.from({length},(_,n)=>({...point(axis,n,0),axis}));
    return {wideRoads,roads:wideRoads.flatMap(wideRoadFootprint),buildings:[] as Building[]};
}
const trip=(path:Point[],progress:number):Trip=>({id:1,homeId:0,storeId:0,wait:0,hold:0,path,progress});
const rawPose=(t:Trip)=>{
    const i=Math.min(Math.floor(t.progress),t.path.length-2),a=t.path[i],b=t.path[i+1],f=t.progress-i;
    const dx=b.x-a.x,dy=b.y-a.y;
    return {x:a.x+.5+dx*f-dy*.16,y:a.y+.5+dy*f+dx*.16};
};

test('tapers recognize both offsets at both ends in horizontal and vertical roads',()=>{
    for(const axis of ['horizontal','vertical'] as const)for(const end of [0,1])for(const offset of [0,1] as const){
        const city=corridor(axis);city.roads.push(point(axis,end?3:-1,offset));
        const transitions=roadTransitions(city);assert.equal(transitions.size,1);
        const t=[...transitions.values()][0];
        assert.equal(end?t.endOffset:t.startOffset,offset);
        assert.deepEqual(transitionBounds(t,end?1:0),{low:offset,high:offset+1});
        assert.deepEqual(transitionBounds(t,end?0:1),{low:0,high:2});
        assert.equal(roadTransitions(city),transitions,'unchanged topology reuses descriptors');
    }
});

test('a single section stays straight or retains a full apron for an offset dogleg',()=>{
    for(const axis of ['horizontal','vertical'] as const)for(const left of [0,1] as const)for(const right of [0,1] as const){
        const city=corridor(axis,1);city.roads.push(point(axis,-1,left),point(axis,1,right));
        if(left!==right){assert.equal(roadTransitions(city).size,0);continue;}
        const t=[...roadTransitions(city).values()][0];
        assert.deepEqual(transitionBounds(t,0),{low:left,high:left+1});
        assert.deepEqual(transitionBounds(t,1),{low:right,high:right+1});
        assert.deepEqual(transitionBounds(t,.5),{low:(left+right)/2,high:1+(left+right)/2});
    }
});

test('actual side roads, wide intersections and added-half building entrances retain their pavement',()=>{
    const city=corridor('horizontal');city.roads.push({x:-1,y:0});
    assert.equal(roadTransitions(city).size,1);
    city.roads.push({x:0,y:-1});assert.equal(roadTransitions(city).size,0);
    const overlap=corridor('horizontal');overlap.roads.push({x:-1,y:0});
    overlap.wideRoads.push({x:0,y:0,axis:'vertical'});
    assert.equal(roadTransitions(overlap).size,0);
    const building=corridor('horizontal');building.roads.push({x:-1,y:0});
    assert.equal(roadTransitions(building).size,1);
    // A north-facing home at (0,2) has its entrance on added carriageway (0,1).
    building.buildings.push({id:1,kind:'home',x:-1,y:2,rotation:2});
    assert.equal(roadTransitions(building).size,0);
});

test('long terminal curves preserve continuity, orientation, pavement clearance and saved state',()=>{
    for(const axis of ['horizontal','vertical'] as const)for(const end of [0,1])for(const offset of [0,1] as const){
        const city=corridor(axis),sign=end?-1:1,terminal=end?2:0,outside=end?3:-1,inside=1;
        const row=axis==='horizontal'?(sign>0?1:0):(sign>0?0:1);
        city.roads.push(point(axis,outside,offset),point(axis,outside+sign*-1,offset));
        const path=[point(axis,outside-sign,offset),point(axis,outside,offset),point(axis,terminal,offset)];
        if(row!==offset)path.push(point(axis,terminal,row));
        path.push(point(axis,inside,row));
        const descriptor=[...roadTransitions(city).values()][0],before=JSON.stringify(city);
        let previous:{x:number;y:number}|undefined;
        for(let n=0;n<=(path.length-1)*200;n++){
            const t=trip(path,n/200),saved=JSON.stringify(t),pose=transitionVehiclePose(city,t),p=pose??rawPose(t);
            if(previous)assert.ok(Math.hypot(p.x-previous.x,p.y-previous.y)<.04,`continuous ${axis}/${end}/${offset} at ${t.progress}`);
            if(pose){
                assert.equal(axis==='horizontal'?pose.dx:pose.dy,sign);
                const a=(axis==='horizontal'?p.x:p.y)-terminal,c=axis==='horizontal'?p.y:p.x;
                const halfLength=.22,halfWidth=.12;
                for(const delta of [-halfLength,0,halfLength]){
                    const sample=a+delta;
                    const b=sample<0?(end?{low:0,high:2}:{low:offset,high:offset+1}):sample>1?(end?{low:offset,high:offset+1}:{low:0,high:2}):transitionBounds(descriptor,sample);
                    assert.ok(c-halfWidth>=b.low-1e-6&&c+halfWidth<=b.high+1e-6,`body inside ${axis}/${end}/${offset} at ${a},${c}`);
                }
            }
            assert.equal(JSON.stringify(t),saved);previous=p;
        }
        assert.equal(JSON.stringify(city),before);
    }
});

test('one-section same-offset journeys stay straight in both axes and directions',()=>{
    for(const axis of ['horizontal','vertical'] as const)for(const offset of [0,1])for(const reverse of [false,true]){
        const city=corridor(axis,1);city.roads.push(point(axis,-1,offset),point(axis,1,offset));
        const path=[-1,0,1].map(n=>point(axis,n,offset));if(reverse)path.reverse();
        for(let n=0;n<=200;n++){
            const t=trip(path,n/100),p=transitionVehiclePose(city,t);assert.ok(p);
            assert.deepEqual({x:p.x,y:p.y},rawPose(t));
        }
    }
});

test('two-section offset changes remain continuous and keep centres on pavement',()=>{
    for(const axis of ['horizontal','vertical'] as const)for(const length of [2])for(const start of [0,1])for(const reverse of [false,true]){
        const end=1-start,city=corridor(axis,length);city.roads.push(point(axis,-1,start),point(axis,length,end));
        const path=[point(axis,-1,start),point(axis,0,start),point(axis,0,end)];
        if(length===2)path.push(point(axis,1,end));path.push(point(axis,length,end));if(reverse)path.reverse();
        let previous:{x:number;y:number}|undefined;
        for(let n=0;n<=(path.length-1)*200;n++){
            const t=trip(path,n/200),p=transitionVehiclePose(city,t);assert.ok(p);
            if(previous)assert.ok(Math.hypot(p.x-previous.x,p.y-previous.y)<.04,`no jump ${axis}/${length}/${start}/${reverse} ${n}`);
            const a=axis==='horizontal'?p.x:p.y,c=axis==='horizontal'?p.y:p.x;
            if(a>=0&&a<=length){
                const s=Math.min(length-1,Math.floor(a)),descriptor=[...roadTransitions(city).values()].find(t=>(axis==='horizontal'?t.section.x:t.section.y)===s)!;
                const b=transitionBounds(descriptor,a-s);assert.ok(c>=b.low&&c<=b.high);
            }
            previous=p;
        }
    }
});

test('opposing traffic retains distinct lanes through all offset transitions',()=>{
    for(const axis of ['horizontal','vertical'] as const)for(const length of [1,2,3])for(const start of [0,1])for(const end of [0,1]){
        if(length===1&&start!==end)continue;
        const city=corridor(axis,length);city.roads.push(point(axis,-1,start));
        if(length<3)city.roads.push(point(axis,length,end));
        const forwardRow=axis==='horizontal'?1:0,backRow=1-forwardRow;
        const makePath=(row:number)=>{
            const p=[point(axis,-1,start),point(axis,0,start)];
            if(length===3){if(row!==start)p.push(point(axis,0,row));p.push(point(axis,1,row));}
            else {if(end!==start)p.push(point(axis,0,end));if(length===2)p.push(point(axis,1,end));p.push(point(axis,length,end));}
            return p;
        };
        const forward=makePath(forwardRow),backward=makePath(backRow).reverse();
        for(let n=0;n<=200;n++){
            const u=n/200,a=transitionVehiclePose(city,trip(forward,u*(forward.length-1)))!,b=transitionVehiclePose(city,trip(backward,(1-u)*(backward.length-1)))!;
            assert.ok(a&&b);
            assert.ok(Math.abs((axis==='horizontal'?a.y-b.y:b.x-a.x))>=.32-1e-6,`lane gap ${axis}/${length}/${start}/${end} at ${u}`);
        }
    }
});
