import {homeRoadIssue} from './cityVisits.ts';
import {incidentServices} from './cityIncidents.ts';
import { Container, Graphics, Sprite, Text, Rectangle, type Application, type FederatedPointerEvent } from 'pixi.js';
import type { Stage } from './stage.ts';
import { buildingStatus, demandSummary, expandCity, footprint, entrance, place, stepCity, connectedHomes, income, routeForHome, averageTripSeconds, trafficMetrics, signalAxis, type Point, type Building, type Tool, type City } from './cityModel.ts';
import {
    ensureCityArt, frame, groundFrame, scenery, buildingPieces, roadFrame, arrowFrame,
    vehicleView, facingFor, storeStall, ROAD_BIT, SIDE_STEP,
    VEHICLE_WIDTH, VEHICLE_LANE_OFFSET, COLORS, type Piece, type Side,
} from './cityArt.ts';
import { containsTile } from './cityMap.ts';
import {roadIndex, emergencyLaneOffset, isEmergencyResponse, type JunctionControl} from './cityTraffic.ts';
import {incidentSummary} from './cityIncidents.ts';
import {BUILDING_LABELS, isBuildingTool} from '../ui/cityLabels.ts';
import {areaTiles} from './junctionAreas.ts';
import { TILE_SIZE, screenToWorld, panCamera, zoomCamera, clampCamera, type Camera, type Viewport } from './cityCamera.ts';
import { onCityCommand } from './cityControls.ts';
import { getSave, flushSave } from '../state/save.ts';
import { tutorialSnapshot, tutorialAction } from './cityTutorial.ts';
import {starterSnapshot, starterBypassTiles, starterDiversionPoint} from './cityStarterTutorial.ts';
import { connectExternalCity } from './cityExternal.ts';
import { missionSnapshot, refreshMissions } from './cityMissions.ts';
import { store } from '../state/store.ts';
export interface Scene { destroy(): void }

/**
 * Artwork consumes logical footprints; no texture size influences construction
 * or routing. Tile coordinates come from cityModel, frame names from cityArt,
 * and this file only turns one into the other.
 */
export function createCityScene(app: Application, stage: Stage): Scene {
    const city = getSave().city;
    const root = new Container();
    const ground = new Container();      // terrain + scenery, rebuilt on resize only
    const world = new Container();       // roads, markers and buildings
    const cars = new Container();
    const carShadows = new Graphics();   // contact shadows keep elevation art on the road
    const controls = new Graphics(); // operational controls, independent of the artwork atlas
    const activity = new Graphics();
    const activityLabels = new Container();
    const statusLabels = new Map<string, Text>();
    const responderBadges = new Map<string, {container:Container; text:Text}>();
    let inspectedId: number | null = null;
    const ghost = new Container();
    const outline = new Graphics();      // placement validity, drawn above the ghost art
    ghost.addChild(outline);
    cars.addChild(carShadows);
    root.addChild(ground, world, cars, controls, activity, activityLabels, ghost);
    const clip = new Graphics();
    const input = new Container();
    stage.root.addChild(root, clip, input);
    root.mask = clip;
    root.eventMode = 'none';
    const tile = TILE_SIZE;
    const camera: Camera = {x: 8, y: 7, zoom: 1};
    let viewport: Viewport = {x:14,y:200,width:692,height:600};
    let groundKey = '';
    let controlAreas: {control:JunctionControl;tiles:Point[];members:Set<string>}[]=[];
    let controlRoads = new Set<string>();
    const pointers = new Map<number, Point>();
    let gesture = false;
    let panStart: Point | null = null;
    let downPoint: Point | null = null;
    let hover: Point | null = null;
    let last: Point | null = null;
    let drawing = false;
    let artReady = false;
    let reportClock = 0, saveClock = 0;
    const carPool = new Map<number, Sprite>();
    const carFacing = new Map<number, Side>();
    const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
    const roadSet = () => new Set(city.roads.map(p => `${p.x},${p.y}`));
    const px = (x: number) => x * tile;
    const py = (y: number) => y * tile;

    /** Place one visual piece, sized and positioned in tile units. */
    function put(layer: Container, piece: Piece, tx: number, ty: number): Sprite {
        const s = new Sprite(frame(piece.name));
        s.position.set(px(tx + piece.tx), py(ty + piece.ty));
        s.setSize(piece.tw * tile, piece.th * tile);
        if (piece.tint !== undefined) s.tint = piece.tint;
        if (piece.alpha !== undefined) s.alpha = piece.alpha;
        layer.addChild(s);
        return s;
    }
    const cell = (layer: Container, name: Parameters<typeof frame>[0], x: number, y: number, tint?: number, alpha?: number) =>
        put(layer, { name, tx: 0, ty: 0, tw: 1, th: 1, tint, alpha }, x, y);

    function report() {
        refreshMissions(city);
        store.patch({
            missions: missionSnapshot(city), tutorial: tutorialSnapshot(city),
            roadIssues: city.buildings.filter(b=>b.kind==='home').flatMap(b=>{const reason=homeRoadIssue(city,b);return reason?[{homeId:b.id,x:b.x,y:b.y,reason}]:[]}),
            map: city.map, funds: city.funds, income: income(city), connected: connectedHomes(city),
            tripSeconds: averageTripSeconds(city), homes: city.buildings.filter(b => b.kind === 'home').length,
            completed: city.completed, activeTrips: city.trips.filter(t=>!t.service && t.phase!=='visiting' && t.phase!=='crashed').length,
            demand: demandSummary(city), incidentInfo: incidentSummary(city), rescued: city.rescuedCount, fatalities: city.fatalities,
            inspected: (()=>{const b=city.buildings.find(b=>b.id===inspectedId);if(!b)return null;const status=buildingStatus(city,b),visitors=city.trips.filter(t=>!t.service&&t.storeId===b.id&&t.phase==='visiting');const next=visitors.length?Math.ceil(Math.min(...visitors.map(t=>t.visitRemaining??0))):null;return {id:b.id,name:BUILDING_LABELS[b.kind],...status,capacity:b.kind==='store'||b.kind==='park'?status.capacity:0,label:status.label+(next===0?' · Ready to leave; waiting for road access':next!==null?` · Next visit finishes in ${next}s`:'')};})(),
            ...trafficMetrics(city), longestStop: Math.max(0,...city.trips.filter(t=>t.phase!=='visiting'&&t.phase!=='working'&&t.phase!=='crashed').map(t=>t.hold)),
        });
    }

    // -----------------------------------------------------------------------
    // Building geometry, derived from the model rather than assumed
    // -----------------------------------------------------------------------
    /** Footprint box plus the tile and face that actually touch the entrance. */
    function shape(b: Building) {
        const cells = footprint(b);
        const e = entrance(b);
        const x0 = Math.min(...cells.map(p => p.x)), y0 = Math.min(...cells.map(p => p.y));
        const w = Math.max(...cells.map(p => p.x)) - x0 + 1, h = Math.max(...cells.map(p => p.y)) - y0 + 1;
        const anchor = cells.find(p => Math.abs(p.x - e.x) + Math.abs(p.y - e.y) === 1) ?? cells[0];
        const side: Side = e.y < anchor.y ? 'N' : e.y > anchor.y ? 'S' : e.x > anchor.x ? 'E' : 'W';
        return { cells, entrance: e, x0, y0, w, h, anchor, side, access: { x: anchor.x - x0, y: anchor.y - y0 } };
    }
    /** The way a driver would look at the building from its access tile. */
    const towardsBuilding = (side: Side): Side => ({ N: 'S', S: 'N', E: 'W', W: 'E' } as const)[side];

    function drawBuilding(layer: Container, b: Building, alpha?: number, tint?: number) {
        const s = shape(b);
        if (b.kind === 'park') {
            for (const p of s.cells) cell(layer, 'grassA', p.x, p.y, tint, alpha);
            const path = new Graphics();
            path.moveTo(px(s.anchor.x+.5),py(s.anchor.y+.5)).lineTo(px(s.x0+s.w/2),py(s.y0+s.h/2))
                .stroke({color:0xd4c89b,width:tile*.32,alpha:alpha??1});
            path.circle(px(s.x0+s.w/2),py(s.y0+s.h/2),tile*.4).fill({color:0xd4c89b,alpha:alpha??1});
            layer.addChild(path);
            for(const [tx,ty] of [[.05,.05],[s.w-.9,.1],[.1,s.h-.95]])
                put(layer,{name:'tree_green',tx,ty,tw:.85,th:.95,tint,alpha},s.x0,s.y0);
            return;
        }
        for (const p of s.cells) cell(layer, 'plot', p.x, p.y, tint, alpha);
        for (const piece of buildingPieces(b.kind, b.id, s.w, s.h, s.access, s.side))
            put(layer, { ...piece, tint: tint ?? piece.tint, alpha: alpha ?? piece.alpha }, s.x0, s.y0);
    }

    /**
     * The access marker is the whole point of the entrance: it sits on the real
     * road tile, points at the building, and turns amber when no road is there.
     */
    function drawAccess(layer: Container, b: Building, roads: Set<string>) {
        const s = shape(b);
        const hasRoad = roads.has(`${s.entrance.x},${s.entrance.y}`);
        const linked = b.kind === 'home' ? !!routeForHome(city, b) : hasRoad;
        const colour = linked ? COLORS.connected : COLORS.needsRoad;
        const g = new Graphics();
        if (!hasRoad) {
            // No road yet: show the tile the road has to reach. Never a door —
            // a door on a tile with no road would promise access that is absent.
            cell(layer, 'dirt', s.entrance.x, s.entrance.y, colour, .45);
            g.rect(px(s.entrance.x) + 1, py(s.entrance.y) + 1, tile - 2, tile - 2)
                .stroke({ color: colour, width: Math.max(1.5, tile * .06), alpha: .9 });
        }
        // A dark pad keeps the marker legible on both grass and asphalt.
        g.roundRect(px(s.entrance.x + .12), py(s.entrance.y + .12), tile * .76, tile * .76, tile * .18)
            .fill({ color: 0x14201d, alpha: hasRoad ? .42 : .3 });
        layer.addChild(g);
        put(layer, { name: arrowFrame(towardsBuilding(s.side)), tx: .1, ty: .1, tw: .8, th: .8, tint: colour },
            s.entrance.x, s.entrance.y);
        if (b.kind === 'store' && hasRoad)
            put(layer, { name: storeStall(b.id), tx: .56, ty: .52, tw: .38, th: .38, alpha: .9 }, s.anchor.x, s.anchor.y);
    }

    // -----------------------------------------------------------------------
    // Layers
    // -----------------------------------------------------------------------
    function renderGround() {
        const m = city.map;
        const a = screenToWorld(camera, viewport, viewport);
        const b = screenToWorld(camera, viewport, {x:viewport.x+viewport.width,y:viewport.y+viewport.height});
        const x0 = Math.max(m.x, Math.floor(a.x)-2), y0 = Math.max(m.y, Math.floor(a.y)-2);
        const x1 = Math.min(m.x+m.width, Math.ceil(b.x)+2), y1 = Math.min(m.y+m.height, Math.ceil(b.y)+2);
        const key = [m.x,m.y,m.width,m.height,x0,y0,x1,y1].join(',');
        if (key === groundKey) return;
        groundKey = key;
        ground.removeChildren().forEach(c => c.destroy());
        const bed = new Graphics();
        bed.roundRect(px(m.x) - 6, py(m.y) - 6, tile * m.width + 12, tile * m.height + 12, 8)
            .fill(COLORS.mapEdge).stroke({ color: COLORS.grassEdge, width: 3 });
        ground.addChild(bed);
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) cell(ground, groundFrame(x, y), x, y);
        // Scenery is added top row first so trees overlap the tile behind them.
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
            const s = scenery(x, y);
            if (!s) continue;
            // Grass and foliage are close in value; a contact shadow separates them.
            const shadow = new Graphics();
            shadow.ellipse(px(x + s.tx + s.tw / 2), py(y + s.ty + s.th) - tile * .1, tile * s.tw * .42, tile * .13)
                .fill({ color: 0x1d3f30, alpha: .35 });
            ground.addChild(shadow);
            put(ground, s, x, y);
        }
    }

    function renderWorld() {
        const index=roadIndex(city), areas=index.areas;
        controlRoads=index.roads;
        controlAreas=city.controls.map(control=>{const tiles=areaTiles(areas,control);return {control,tiles,members:new Set(tiles.map(p=>`${p.x},${p.y}`))};});
        world.removeChildren().forEach(c => c.destroy());
        const roads = roadSet();
        for (const p of city.roads) {
            let mask = 0;
            for (const [side, [dx, dy]] of Object.entries(SIDE_STEP))
                if (roads.has(`${p.x + dx},${p.y + dy}`)) mask |= ROAD_BIT[side as Side];
            cell(world, roadFrame(mask), p.x, p.y);
        }
        // Buildings paint over any scenery on their plot; access markers sit on
        // the road, so they are drawn first and never hidden by a facade.
        for (const b of city.buildings) drawAccess(world, b, roads);
        for (const b of [...city.buildings].sort((a, c) => a.y - c.y)) drawBuilding(world, b);
    }

    function renderControls() {
        controls.clear();
        for (const {control,tiles,members} of controlAreas) {
            const axis=signalAxis(city,control);
            // A connected junction area has one controller, visible on every external approach.
            for(const p of tiles) for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
                const neighbor=`${p.x+dx},${p.y+dy}`;
                if(!controlRoads.has(neighbor) || members.has(neighbor))continue;
                const cx=px(p.x+.5+dx*.37),cy=py(p.y+.5+dy*.37);
                if(control.kind==='stop') {
                    controls.moveTo(cx-(dy?tile*.16:0),cy-(dx?tile*.16:0))
                        .lineTo(cx+(dy?tile*.16:0),cy+(dx?tile*.16:0)).stroke({color:0xffe4cc,width:3});
                } else {
                    controls.circle(cx,cy,tile*.105).fill(0x102820).stroke({color:0xf5e4bb,width:1});
                    controls.circle(cx,cy,tile*.065).fill(axis===(dx?'ew':'ns')?0x8af49c:0xff6658);
                }
            }
            const x=px(control.x),y=py(control.y);
            if(control.kind==='stop') {
                const cx=x+tile*.82,cy=y+tile*.16,r=tile*.15;
                const points=Array.from({length:8},(_,i)=>[cx+Math.cos(Math.PI/8+i*Math.PI/4)*r,cy+Math.sin(Math.PI/8+i*Math.PI/4)*r]).flat();
                controls.poly(points).fill(0xb43132).stroke({color:0xffeed6,width:1.5});
                controls.moveTo(cx-r*.55,cy).lineTo(cx+r*.55,cy).stroke({color:0xffffff,width:2});
            } else if(control.preset!=='balanced') {
                const ns=control.preset==='ns';
                controls.moveTo(x+tile*(ns?.5:.3),y+tile*(ns?.3:.5))
                    .lineTo(x+tile*(ns?.5:.7),y+tile*(ns?.7:.5)).stroke({color:0xffd779,width:3});
            }
        }
    }

    function preview() {
        ghost.removeChildren().forEach(c => { if (c !== outline) c.destroy(); });
        ghost.addChild(outline);
        outline.clear();
        if (!hover || store.get().panning || gesture) return;
        const s = store.get();
        if(s.tool===null)return;
        const candidate = structuredClone(city) as City;
        const before = candidate.funds;
        place(candidate, s.tool, hover.x, hover.y, s.rotation);
        const valid = before !== candidate.funds || candidate.buildings.length !== city.buildings.length || candidate.roads.length !== city.roads.length || JSON.stringify(candidate.controls) !== JSON.stringify(city.controls) || JSON.stringify(candidate.closures)!==JSON.stringify(city.closures);
        const colour = s.tool === 'bulldoze' ? COLORS.remove : valid ? COLORS.valid : COLORS.invalid;
        if(s.tool==='stop' || s.tool==='signal') {
            const areas=roadIndex(city).areas;
            for(const p of areaTiles(areas,hover)) outline.rect(px(p.x)+1,py(p.y)+1,tile-2,tile-2)
                .fill({color:colour,alpha:.16}).stroke({color:colour,width:2});
        }
        let box = { x: hover.x, y: hover.y, w: 1, h: 1 };
        if (isBuildingTool(s.tool)) {
            const b: Building = { id: 0, kind: s.tool, ...hover, rotation: s.rotation };
            const g = shape(b);
            box = { x: g.x0, y: g.y0, w: g.w, h: g.h };
            drawBuilding(ghost, b, valid ? .68 : .4, valid ? 0xffffff : COLORS.invalid);
            // The access tile is part of the decision, so preview it as loudly as the footprint.
            outline.rect(px(g.entrance.x) + 1, py(g.entrance.y) + 1, tile - 2, tile - 2)
                .fill({ color: colour, alpha: .22 }).stroke({ color: colour, width: Math.max(2, tile * .06), alpha: .9 });
            put(ghost, { name: arrowFrame(towardsBuilding(g.side)), tx: .12, ty: .12, tw: .76, th: .76, tint: colour },
                g.entrance.x, g.entrance.y);
        } else {
            outline.rect(px(hover.x) + 1, py(hover.y) + 1, tile - 2, tile - 2).fill({ color: colour, alpha: .3 });
        }
        // Dark backing keeps the footprint edge readable over both grass and asphalt.
        const rect = [px(box.x) + 1, py(box.y) + 1, box.w * tile - 2, box.h * tile - 2] as const;
        outline.rect(...rect).stroke({ color: 0x16241f, width: Math.max(4, tile * .12), alpha: .5 });
        outline.rect(...rect).stroke({ color: colour, width: Math.max(2, tile * .06), alpha: .95 });
        if (!valid) {
            // A cross over the whole footprint beats a colour change alone on a phone.
            const [x, y, w, h] = rect;
            outline.moveTo(x + 3, y + 3).lineTo(x + w - 3, y + h - 3)
                .moveTo(x + w - 3, y + 3).lineTo(x + 3, y + h - 3)
                .stroke({ color: COLORS.invalid, width: Math.max(3, tile * .09), alpha: .95 });
        }
    }

    function renderCars() {
        carShadows.clear();
        const live = new Set<number>();
        for (const trip of city.trips) {
            if(trip.phase==='visiting' || !trip.path.length)continue;
            live.add(trip.id);
            const i = Math.min(Math.floor(trip.progress), trip.path.length - 1);
            const a = trip.path[i], b = trip.path[Math.min(i + 1, trip.path.length - 1)];
            const f = trip.progress - i;
            const dx = b.x - a.x, dy = b.y - a.y;
            const previous = trip.path[Math.max(0,i-1)];
            const laneDx = dx || dy ? dx : a.x-previous.x;
            const laneDy = dx || dy ? dy : a.y-previous.y;
            const facing = facingFor(laneDx, laneDy, carFacing.get(trip.id) ?? 'S');
            carFacing.set(trip.id, facing);
            let sprite = carPool.get(trip.id);
            if (!sprite) {
                sprite = new Sprite();
                sprite.anchor.set(.5);
                cars.addChild(sprite);
                carPool.set(trip.id, sprite);
            }
            const view = vehicleView(trip.id, facing, trip.service);
            sprite.texture = frame(view.name);
            sprite.tint = trip.phase==='crashed'?0x80665a:view.tint ?? 0xffffff;
            const w = VEHICLE_WIDTH[facing] * tile;
            sprite.setSize(w, w * sprite.texture.height / sprite.texture.width);
            // The simulation owns passing and its lateral transition, including across saves.
            const lane = VEHICLE_LANE_OFFSET * (1 - 2 * emergencyLaneOffset(trip));
            const x = px(a.x + dx * f + .5) - laneDy * tile * lane;
            const y = py(a.y + dy * f + .5) + laneDx * tile * lane;
            sprite.position.set(x, y);
            carShadows.ellipse(x, y + sprite.height * .36, sprite.width * .44, tile * .1)
                .fill({ color: 0x0d1614, alpha: .32 });
        }
        for (const [id, sprite] of carPool) if (!live.has(id)) {
            sprite.destroy(); carPool.delete(id); carFacing.delete(id);
        }
    }

    function renderActivity() {
        activity.clear();
        const live = new Set<string>();
        const liveBadges = new Set<string>();
        function label(key:string,text:string,x:number,y:number,color=0xffeed6) {
            live.add(key);
            let t=statusLabels.get(key);
            if(!t){t=new Text({text,style:{fontFamily:'system-ui',fontSize:12,fontWeight:'bold',fill:color,stroke:{color:0x122d26,width:3}}});t.anchor.set(.5);activityLabels.addChild(t);statusLabels.set(key,t);}
            t.text=text;t.style.fill=color;t.style.fontSize=17.6/(stage.scale()*camera.zoom);t.style.stroke={color:0x122d26,width:3/(stage.scale()*camera.zoom)};t.position.set(px(x),py(y));
        }
        const guide=city.tutorial?.status==='active'?starterSnapshot(city):null;
        const bypass=starterBypassTiles(city);
        for(const p of bypass)activity.rect(px(p.x)+2,py(p.y)+2,tile-4,tile-4).fill({color:0xffd22e,alpha:.18}).stroke({color:0xffd22e,width:2});
        for(const side of [true,false]){const p=bypass.find(p=>side?p.x<10:p.x>10);if(p)label(`tutorial-bypass-${side}`,'LINK',p.x+.5,4.7,0xffd22e);}
        const divert=store.get().tool==='closure'?starterDiversionPoint(city):null;
        if(divert){activity.rect(px(divert.x)+1,py(divert.y)+1,tile-2,tile-2).fill({color:0x6ce6ef,alpha:.25}).stroke({color:0x6ce6ef,width:3});label('tutorial-divert','DIVERT HERE · OPTIONAL',divert.x+.5,divert.y-.3,0x6ce6ef);}
        if(guide?.focus&&guide.tool&&isBuildingTool(guide.tool)) {
            const candidate={id:0,kind:guide.tool,x:guide.focus.x,y:guide.focus.y,rotation:0} as Building;
            for(const p of footprint(candidate))activity.rect(px(p.x)+1,py(p.y)+1,tile-2,tile-2).fill({color:0xffd22e,alpha:.16}).stroke({color:0xffd22e,width:2});
            label('tutorial-lot','PLACE HERE',guide.focus.x+1,guide.focus.y-.35,0xffd22e);
        } else if(guide?.focus&&(guide.tool==='closure'||guide.tool==='stop')) {
            activity.rect(px(guide.focus.x)+1,py(guide.focus.y)+1,tile-2,tile-2).fill({color:0xffd22e,alpha:.16}).stroke({color:0xffd22e,width:3});
            label('tutorial-control',guide.tool==='closure'?'DIVERT HERE':'CONTROL HERE',guide.focus.x+.5,guide.focus.y-.35,0xffd22e);
        }
        for(const b of city.buildings) {
            if(b.kind==='home'){if(homeRoadIssue(city,b)&&city.buildings.some(b=>b.kind==='store')){for(const p of footprint(b))activity.rect(px(p.x)+1,py(p.y)+1,tile-2,tile-2).stroke({color:0xffb75e,width:2});label(`access-${b.id}`,'!',b.x+1,b.y-.25,0xffb75e);}continue;}
            const s=shape(b), status=buildingStatus(city,b);
            const name=b.kind==='hospital'?'Clinic':b.kind==='fireStation'?'FIRE':b.kind==='policeStation'?'POLICE':b.kind==='park'?'PARK':'SHOP';
            const destination = b.kind==='store'||b.kind==='park';
            // Keep service names above the roof at every zoom, clear of their identity symbols.
            const labelY = destination ? s.y0+.4 : s.y0-(s.side==='N'?1:0)-12/(tile*stage.scale()*camera.zoom);
            label(`b${b.id}`,destination?`${stage.scale()*camera.zoom>=.8?`${name} `:''}${status.occupied}/${status.capacity}${status.inbound?` +${status.inbound}`:''}`:name,s.x0+s.w/2,labelY);
            // Parked visitors stay on the plot, clear of the carriageway.
            for(let i=0;i<Math.min(b.kind==='store'||b.kind==='park'?status.occupied:0,8);i++)activity.roundRect(px(s.x0+.2+i%4*.38),py(s.y0+s.h-.35-Math.floor(i/4)*.28),tile*.25,tile*.18,2).fill(0xffd779);
        }
        const roads = new Set(city.roads.map(p => `${p.x},${p.y}`));
        for(const p of city.closures) {
            const eastWest = roads.has(`${p.x-1},${p.y}`) || roads.has(`${p.x+1},${p.y}`);
            const northSouth = roads.has(`${p.x},${p.y-1}`) || roads.has(`${p.x},${p.y+1}`);
            // Barriers span the carriageway. At bends/junctions mark both road axes.
            for(const vertical of [false, true]) {
                if(vertical ? !eastWest : !northSouth && eastWest)continue;
                const x = (u:number,v:number) => px(p.x+(vertical?v:u));
                const y = (u:number,v:number) => py(p.y+(vertical?u:v));
                activity.rect(x(.12,.36),y(.12,.36),tile*(vertical?.28:.76),tile*(vertical?.76:.28))
                    .fill(0x342d23).stroke({color:0xffd779,width:2});
                for(let i=0;i<3;i++)activity.moveTo(x(.2+i*.23,.4),y(.2+i*.23,.4))
                    .lineTo(x(.3+i*.23,.6),y(.3+i*.23,.6)).stroke({color:0xffd779,width:3});
            }
        }
        if(city.external?.gateway) {
            const p=city.external.gateway;
            activity.circle(px(p.x+.5),py(p.y+.5),tile*.42).stroke({color:0x8edbfa,width:3});
            label('gateway','CITY',p.x+.5,p.y-.1,0x8edbfa);
        }
        for(const r of city.risks) {
            activity.circle(px(r.x+.5),py(r.y+.5),tile*.46).stroke({color:0xffcb61,width:2,alpha:.65+.25*Math.sin(city.elapsed*5)});
            label(`r${r.x},${r.y}`,'!',r.x+.5,r.y+.1,0xffcb61);
        }
        for(const incident of city.incidents)if(incident.status==='active') {
            activity.rect(px(incident.x+.04),py(incident.y+.04),tile*.92,tile*.92).fill({color:0xb73c2c,alpha:.25}).stroke({color:0xff8860,width:3});
            label(`i${incident.id}`,incident.severity==='fire'&&!incident.tutorialEmsOnly?'FIRE':'CRASH',incident.x+.5,incident.y+.1,0xffc080);
            // A fixed screen-size badge explains the actual outstanding crew, without
            // replacing the wreck or drawing a pretend responder on the road.
            const needed=incidentServices(incident).filter(kind=>!incident.completedServices.includes(kind));
            const screenScale=stage.scale()*camera.zoom;
            for(const [row,kind] of needed.entries()) {
                const key=`${incident.id}:${kind}`;
                liveBadges.add(key);
                let badge=responderBadges.get(key);
                if(!badge) {
                    const container=new Container();
                    const background=new Graphics().roundRect(-98,-16,196,32,7).fill({color:0x102333,alpha:.96}).stroke({color:0xffd22e,width:1.5});
                    const icon=new Sprite(frame(vehicleView(0,'E',kind).name));
                    icon.anchor.set(.5);icon.position.set(-75,0);
                    const iconScale=Math.min(35/icon.texture.width,23/icon.texture.height);
                    icon.scale.set(iconScale);
                    const text=new Text({text:'',style:{fontFamily:'system-ui',fontSize:14,fontWeight:'bold',fill:0xffeed6}});
                    text.anchor.set(0,.5);text.position.set(-50,0);
                    container.addChild(background,icon,text);activityLabels.addChild(container);
                    badge={container,text};responderBadges.set(key,badge);
                }
                const stationKind=kind==='ems'?'hospital':kind==='fire'?'fireStation':'policeStation';
                const serviceName=kind==='ems'?'EMS':kind==='fire'?'Fire':'Police';
                const trip=city.trips.find(t=>t.incidentId===incident.id&&t.service===kind);
                badge.text.text=trip?.phase==='working'?`${serviceName} on scene`
                    :trip?.phase==='waiting'||(trip&&trip.hold>=3)?`${serviceName} waiting`
                    :trip?`${serviceName} en route`
                    :!city.buildings.some(b=>b.kind===stationKind)?`Build ${kind==='ems'?'Clinic':serviceName}`
                    :`${serviceName} needed`;
                badge.container.scale.set(1/screenScale);
                badge.container.position.set(px(incident.x+.5),py(incident.y)-(34+(needed.length-1-row)*35)/screenScale);
            }
        }
        for(const t of city.trips)if(t.service) {
            const sprite=carPool.get(t.id);if(!sprite)continue;
            if(isEmergencyResponse(t)||t.phase==='working')
                activity.circle(sprite.x-4,sprite.y-5,3).fill(Math.floor(city.elapsed*5)%2?0x7bdfff:0xff6a60);
            const passing = emergencyLaneOffset(t)>0;
            const labelY = (sprite.y-sprite.height/2)/tile-12/(tile*stage.scale()*camera.zoom);
            label(`t${t.id}`,t.service.toUpperCase(),sprite.x/tile,labelY,passing?0xffd779:0xffeed6);
        }
        for(const [key,t] of statusLabels)if(!live.has(key)){t.destroy();statusLabels.delete(key);}
        for(const [key,badge] of responderBadges)if(!liveBadges.has(key)){badge.container.destroy({children:true});responderBadges.delete(key);}
    }

    function updateCamera() {
        clampCamera(camera, city.map);
        root.scale.set(camera.zoom);
        root.position.set(viewport.x+viewport.width/2-camera.x*tile*camera.zoom, viewport.y+viewport.height/2-camera.y*tile*camera.zoom);
        renderGround(); preview(); renderActivity(); paint();
    }
    function focusTown() {
        const points = city.buildings.length ? city.buildings.map(b => ({x:b.x+1,y:b.y+1})) : city.roads;
        camera.x = points.length ? points.reduce((n,p) => n+p.x,0)/points.length : 8;
        camera.y = points.length ? points.reduce((n,p) => n+p.y,0)/points.length : 7;
        camera.zoom = city.tutorial?.hRoad && !city.buildings.length ? .5 : 1;
        hover = null; updateCamera();
    }
    function layout() {
        const scale = stage.scale();
        const top = (document.querySelector('.city-header')?.getBoundingClientRect().height ?? 160) / scale + 6 / scale;
        const bottom = (document.querySelector('.city-controls')?.getBoundingClientRect().height ?? 255) / scale + 6 / scale;
        const railWidth = (selector:string) => (document.querySelector(selector)?.getBoundingClientRect().width ?? 0) / scale;
        const leftRail = railWidth('.city-rail-left'), rightRail = railWidth('.city-rail-right');
        const left = 14 + (leftRail ? leftRail + 8 / scale : 0);
        const right = 14 + (rightRail ? rightRail + 8 / scale : 0);
        viewport = {x:left,y:top,width:Math.max(1,stage.width-left-right),height:Math.max(1,stage.designHeight()-top-bottom)};
        clip.clear().rect(viewport.x,viewport.y,viewport.width,viewport.height).fill(0xffffff);
        input.hitArea = new Rectangle(viewport.x,viewport.y,viewport.width,viewport.height);
        updateCamera(); renderWorld();  preview(); renderCars(); renderControls(); renderActivity(); paint();
    }
    /**
     * A paused game stops the ticker, and the ticker is what drives Pixi's
     * render loop — so anything built while paused needs an explicit repaint.
     */
    function paint() { if (!app.ticker.started && !root.destroyed) app.render(); }
    /** Model changed: everything but the terrain has to be rebuilt. */
    function refresh() { renderWorld(); preview(); renderCars(); renderControls(); renderActivity(); paint(); }

    function screenPoint(e: FederatedPointerEvent): Point { return stage.root.toLocal(e.global); }
    function inside(p: Point): boolean { return p.x >= viewport.x && p.y >= viewport.y && p.x < viewport.x+viewport.width && p.y < viewport.y+viewport.height; }
    function point(e: FederatedPointerEvent): Point | null {
        const p = screenPoint(e);
        if (!inside(p)) return null;
        const worldPoint = screenToWorld(camera,viewport,p);
        const tilePoint = {x:Math.floor(worldPoint.x),y:Math.floor(worldPoint.y)};
        return containsTile(city.map,tilePoint) ? tilePoint : null;
    }
    function build(p: Point) {
        const s = store.get();
        if(s.tool===null){store.patch({message:'Select a building or road tool from the menu first.'});return;}
        if(isBuildingTool(s.tool)) {
            const existing=city.buildings.find(b=>footprint(b).some(q=>same(p,q)));
            if(existing){inspectedId=existing.id;const status=buildingStatus(city,existing);store.patch({message:`${BUILDING_LABELS[existing.kind]}: ${status.label}. Open City report for details.`});report();return;}
        }
        const message = place(city, s.tool, p.x, p.y, s.rotation);
        store.patch({ message }); report(); flushSave(); refresh();
    }
    const midpoint = (points: Point[]) => ({x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2});
    const distance = (points: Point[]) => Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
    function move(e: FederatedPointerEvent) {
        const p = screenPoint(e);
        if (pointers.has(e.pointerId)) {
            const before = [...pointers.values()];
            pointers.set(e.pointerId,p);
            if (pointers.size >= 2) {
                const after = [...pointers.values()];
                const a = midpoint(before), b = midpoint(after);
                panCamera(camera,viewport,b.x-a.x,b.y-a.y);
                if (distance(before) > 0) zoomCamera(camera,viewport,camera.zoom*distance(after)/distance(before),b);
                gesture = true; drawing = false; hover = null; updateCamera(); return;
            }
            if (gesture) return;
            if (panStart) {
                panCamera(camera,viewport,p.x-panStart.x,p.y-panStart.y);
                panStart = p; hover = null; updateCamera(); return;
            }
        }
        hover = point(e);
        if (pointers.has(e.pointerId) && hover && last && store.get().tool === 'road') {
            if (!drawing && downPoint && Math.hypot(p.x-downPoint.x,p.y-downPoint.y)>8) {drawing=true;build(last);}
            if (drawing && !same(last,hover)) {
                const cursor = {...last};
                while (!same(cursor,hover)) {
                    if (cursor.x !== hover.x) cursor.x += Math.sign(hover.x-cursor.x);
                    else cursor.y += Math.sign(hover.y-cursor.y);
                    build(cursor);
                }
                last = hover;
            }
        }
        preview(); paint();
    }
    function down(e: FederatedPointerEvent) {
        const p=screenPoint(e);pointers.set(e.pointerId,p);
        if(pointers.size>1){gesture=true;drawing=false;hover=null;preview();paint();return;}
        downPoint=p; hover=point(e);last=hover;
        panStart=store.get().panning || e.button===1 ? p : null;
        if(!panStart && hover && e.pointerType!=='touch' && store.get().tool==='road'){drawing=true;build(hover);}
        preview();paint();
    }
    function up(e?: FederatedPointerEvent) {
        if(e && pointers.has(e.pointerId) && !gesture && !panStart && !drawing) {
            const p=point(e);if(p && last && same(p,last))build(p);
        }
        if(e)pointers.delete(e.pointerId);else pointers.clear();
        if(!pointers.size){gesture=false;drawing=false;last=null;panStart=null;downPoint=null;}
        hover=null;preview();paint();
    }
    const cancel = () => up();
    const outsideUp = (e: PointerEvent) => {if(e.target!==app.canvas)cancel();};
    input.eventMode = 'static';
    input.on('pointerdown',down).on('globalpointermove',move).on('pointerup',up).on('pointerupoutside',up)
        .on('pointerleave',()=>{hover=null;preview();paint();});
    function wheel(e: WheelEvent) {
        const rect=app.canvas.getBoundingClientRect();
        const p={x:(e.clientX-rect.left)/stage.scale(),y:(e.clientY-rect.top)/stage.scale()};
        if(!inside(p))return;
        e.preventDefault();hover=null;
        zoomCamera(camera,viewport,camera.zoom*Math.exp(-e.deltaY*.0015),p);updateCamera();
    }
    app.canvas.addEventListener('wheel',wheel,{passive:false});
    const uncommand=onCityCommand(command=>{
        cancel();
        if(command.type==='zoom'){zoomCamera(camera,viewport,camera.zoom*command.factor);updateCamera();}
        if(command.type==='home')focusTown();
        if(command.type==='focus'){camera.x=command.point.x+.5;camera.y=command.point.y+.5;if(city.tutorial?.hRoad)camera.zoom=command.point.x===11&&command.point.y===7?.5:1;updateCamera();}
        if(command.type==='tutorial'){
            const noticed=city.tutorial?.noticedIncident;
            const result=tutorialAction(city,command.action);
            const notice=city.tutorial?.status==='active'&&!city.tutorial.hRoad&&!noticed&&city.tutorial.noticedIncident;
            store.patch({message:result.message,...(result.pause!==undefined?{paused:result.pause}:{}),...(notice?{tutorialNotice:true}:{})});
            if(result.focus){camera.x=result.focus.x+.5;camera.y=result.focus.y+.5;}
            report();flushSave();renderGround();updateCamera();refresh();
        }
        if(command.type==='connect'){
            const t=city.tutorial;
            const allowed=t?.status==='skipped'||t?.status==='complete'||!t?.hRoad&&city.buildings.some(b=>b.kind==='home')&&city.buildings.some(b=>b.kind==='store');
            const message=allowed?connectExternalCity(city,command.point):'Build a home and store, or skip the tutorial, before connecting.';
            if(city.external?.gateway&&t?.status!=='complete')tutorialAction(city,'skip');
            store.patch({message});report();flushSave();refresh();
        }
        if(command.type==='expand'){
            const message=expandCity(city,command.direction);
            store.patch({message});report();flushSave();
            renderGround();updateCamera();
        }
    });

    function keyboard(e: KeyboardEvent) {
        if (document.querySelector('dialog[open]')) return;
        if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
        const shortcuts: Record<string, Tool> = { '1': 'home', '2': 'store', '3': 'road', '4': 'bulldoze', '5': 'stop', '6': 'signal', '7': 'closure' };
        if (shortcuts[e.key]) store.patch({ tool: shortcuts[e.key], panning: false });
        if (e.key.toLowerCase() === 'r') store.patch({ rotation: (store.get().rotation + 1) % 4 });
        if (e.code === 'Space' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); store.patch({ paused: !store.get().paused }); }
    }

    const tick = () => {
        const dt = Math.min(app.ticker.deltaMS / 1000, .1);
        const noticed=city.tutorial?.noticedIncident;
        stepCity(city, dt); renderCars(); renderControls(); renderActivity();
        if(city.tutorial?.status==='active'&&!city.tutorial.hRoad&&!noticed&&city.tutorial.noticedIncident){
            store.patch({tutorialNotice:true,message:'A crash needs attention. Traffic is running; build another route and keep emergency access open.'});
            report();flushSave();
        }
        reportClock += dt; saveClock += dt;
        if (reportClock >= .5) { reportClock = 0; report(); }
        if (saveClock >= 2) { saveClock = 0; flushSave(); }
    };
    const unsub = store.subscribe(() => { preview(); paint(); });
    const unresize = stage.onResize(layout);
    const observer = new ResizeObserver(layout);
    const observedPanels = new Set<Element>();
    function observePanels() {
        const panels = new Set(document.querySelectorAll('.city-header, .city-controls, .city-rail-left, .city-rail-right'));
        for (const el of observedPanels) if (!panels.has(el)) { observer.unobserve(el); observedPanels.delete(el); }
        for (const el of panels) if (!observedPanels.has(el)) { observer.observe(el); observedPanels.add(el); }
    }
    observePanels();
    // Responsive UI mounts/unmounts the objective rail without remounting the scene.
    const panelObserver = new MutationObserver(() => { observePanels(); layout(); });
    const uiStage = document.querySelector('.city-stage');
    if (uiStage) panelObserver.observe(uiStage, {childList:true});
    window.addEventListener('keydown', keyboard);
    window.addEventListener('blur', cancel);
    window.addEventListener('pointerup', outsideUp);
    window.addEventListener('pointercancel', cancel);
    app.ticker.add(tick);
    report();
    // Initialize frames before any camera movement can populate the terrain cache.
    // Also invalidate it when a late atlas replaces placeholder textures: unchanged
    // viewport bounds do not mean that the cached sprite textures are current.
    ensureCityArt(() => {
        artReady = true;
        if (!root.destroyed) { groundKey = ''; layout(); }
    });
    if (!artReady) layout();
    focusTown();
    return {
        destroy() {
            flushSave(); observer.disconnect(); panelObserver.disconnect(); unsub(); unresize();
            window.removeEventListener('keydown', keyboard);
            window.removeEventListener('blur', cancel);
            window.removeEventListener('pointerup', outsideUp);
            window.removeEventListener('pointercancel', cancel);
            app.canvas.removeEventListener('wheel', wheel);
            uncommand();
            app.ticker.remove(tick);
            carPool.clear(); carFacing.clear();
            root.destroy({ children: true });
            clip.destroy(); input.destroy();
        },
    };
}
