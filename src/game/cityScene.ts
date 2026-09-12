import {transitionVehiclePose} from './cityRoadTransitions.ts';
import {wideRoadArt} from './cityWideRoadArt.ts';
import {wideRoadTopology,wideRoadFootprint} from './cityWideRoads.ts';
import {busRiderCount, waitingBusRiders} from './cityBusRidership.ts';
import {walkingPath} from './cityJourneys.ts';
import {buyBus,sellBus,applyBusRoute,setBusRouteRunning,transitSummary,busStopIssue,busRoutePreview} from './cityTransit.ts';
import {roadEdgePoints} from './cityDirections.ts';
import {applyRoadDirections} from './cityDirectionEdits.ts';
import {starterToolAllowed} from './cityStarterTutorial.ts';
import {flowReport} from './cityFlow.ts';
import {withRoadPathRead} from './cityPathfinding.ts';
import {CITY_RULES} from './cityRules.ts';
import {cityDiagnostics} from './cityDiagnostics.ts';
import {homeRoadIssue} from './cityVisits.ts';
import {incidentServices} from './cityIncidents.ts';
import { Container, Graphics, Sprite, Text, Rectangle, type Application, type FederatedPointerEvent } from 'pixi.js';
import type { Stage } from './stage.ts';
import { buildingStatus, demandSummary, expandCity, footprint, entrance, place, stepCity, connectedHomes, income, routeForHome, averageTripSeconds, trafficMetrics, signalAxis, previewWideRoadPlacement, wideRoadWorkFootprint, type Point, type Building, type Tool, type City } from './cityModel.ts';
import {
    ensureCityArt, parkTexture, frame, groundFrame, scenery, buildingPieces, roadFrame, arrowFrame,
    vehicleView, facingFor, storeStall, ROAD_BIT, SIDE_STEP,
    VEHICLE_WIDTH, VEHICLE_LANE_OFFSET, COLORS, type Piece, type Side,
} from './cityArt.ts';
import { containsTile } from './cityMap.ts';
import {debugVehicles, roadIndex, emergencyLaneOffset, travelLaneOffset, isEmergencyResponse, type JunctionControl} from './cityTraffic.ts';
import {setFiretruckResponding,setPoliceResponding} from '../audio/vehicles.ts';
import {stepTrafficAudio,stopTrafficAudio} from '../audio/traffic.ts';
import {incidentSummary} from './cityIncidents.ts';
import {BUILDING_LABELS, isBuildingTool} from '../ui/cityLabels.ts';
import {areaTiles} from './junctionAreas.ts';
import {roundaboutIndex} from './cityRoundabouts.ts';
import { TILE_SIZE, screenToWorld, panCamera, zoomCamera, clampCamera, type Camera, type Viewport } from './cityCamera.ts';
import { onCityCommand } from './cityControls.ts';
import { getSave, flushSave as flushSandboxSave } from '../state/save.ts';
import { tutorialSnapshot, tutorialAction } from './cityTutorial.ts';
import {starterSnapshot, starterBypassTiles, starterDiversionPoint} from './cityStarterTutorial.ts';
import { externalNeedsRoad, finishTutorialAndConnect, connectExternalCity } from './cityExternal.ts';
import { missionSnapshot, refreshMissions } from './cityMissions.ts';
import { store } from '../state/store.ts';
export interface Scene { destroy(): void }

/**
 * Artwork consumes logical footprints; no texture size influences construction
 * or routing. Tile coordinates come from cityModel, frame names from cityArt,
 * and this file only turns one into the other.
 */
export interface CitySceneSession {
    city: City;
    save: () => void;
    step: (seconds: number) => void;
    place: typeof place;
}
export function createCityScene(app: Application, stage: Stage, session?: CitySceneSession): Scene {
    const city = session?.city ?? getSave().city;
    const flushSave = session?.save ?? flushSandboxSave;
    const placeInCity = session?.place ?? place;
    // The map is its own clipped compositing layer. Scrolling dock surfaces must
    // never paint over it; native dialogs retain their top-layer modal behavior.
    app.canvas.style.position = 'relative';
    app.canvas.style.transform = 'translateZ(0)';
    app.canvas.style.zIndex = '1';
    const root = new Container();
    const ground = new Container();      // terrain + scenery, rebuilt on resize only
    const world = new Container();       // roads, markers and buildings
    // These layers change only through renderGround/renderWorld. Reuse their pixels between
    // edits instead of submitting every tree shadow, road and building piece each frame.
    // Native 48px tiles keep pixel art crisp and bound each texture below 4096px at max map size.
    ground.cacheAsTexture({resolution:1, antialias:false});
    world.cacheAsTexture({resolution:1, antialias:false});
    const cars = new Container();
    const carShadows = new Graphics();   // contact shadows keep elevation art on the road
    const controls = new Graphics(); // operational controls, independent of the artwork atlas
    const activity = new Graphics();
    const activityLabels = new Container();
    const statusLabels = new Map<string, Text>();
    const responderBadges = new Map<string, {container:Container; text:Text}>();
    let directionPoints: Point[] = [];
    store.patch({directionSelection:0,transitPanel:null,transitDraft:null});
    const transitIssueByStop=new Map<number,string>();
    let routePreviewPaths:Point[][]=[];
    let previewDraft:number[]|null=null;
    let inspectedId: number | null = null;
    let inspectedRoad: Point | null = null;
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
    let renderedWideRoads=city.wideRoads;
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
    const parkedBodies=new Map<number,Sprite>();
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
        withRoadPathRead(city, reportSnapshot);
    }
    function reportSnapshot() {
        refreshMissions(city);
        transitIssueByStop.clear();for(const b of city.buildings)if(b.kind==='busStop'){const issue=busStopIssue(city,b);if(issue)transitIssueByStop.set(b.id,issue);}
        if(store.get().transitDraft&&inspectedId!==null)routePreviewPaths=busRoutePreview(city,inspectedId,store.get().transitDraft!).paths;
        store.patch({
            transitPanel:(()=>{const b=city.buildings.find(b=>b.id===inspectedId&&b.kind==='busStation');if(!b)return null;const route=city.transit?.routes.find(r=>r.stationId===b.id);return {stationId:b.id,fleet:(city.transit?.fleet??[]).filter(v=>v.stationId===b.id).map(v=>({id:v.id,parked:v.tripId===undefined,riders:busRiderCount(v),paid:v.paid})),stops:route?.stopIds??[],running:route?.running??false,blocked:route?.blocked??'',summary:transitSummary(city)};})(),
            vehicleDebug:store.get().vehicleDebugOpen?debugVehicles(city):[],
            flow: flowReport(city, inspectedRoad),
            diagnostics: cityDiagnostics(city), missions: missionSnapshot(city), tutorial: tutorialSnapshot(city),
            roadIssues: city.buildings.filter(b=>b.kind==='home').flatMap(b=>{const reason=homeRoadIssue(city,b);return reason?[{homeId:b.id,x:b.x,y:b.y,reason}]:[]}),
            elapsedSeconds: Math.floor(city.elapsed),
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
        if(b.kind==='busStation'||b.kind==='busStop') {
            for(const p of s.cells)cell(layer,'plot',p.x,p.y,tint,alpha);
            const g=new Graphics();g.alpha=alpha??1;
            if(b.kind==='busStation'){
                // Existing Kenney architecture forms a modest office; bays remain empty static geometry.
                for(const piece of buildingPieces('store',0,3,2,{x:1,y:1},'S'))put(layer,{...piece,th:piece.th*.55,ty:piece.ty*.55,tint:tint??piece.tint,alpha},s.x0,s.y0);
                for(let i=0;i<2;i++)g.rect(px(s.x0+.25+i*1.35),py(s.y0+1.6),tile*1.1,tile*.85).stroke({color:0xf8efd4,width:2});
            }else{
                g.rect(px(s.x0+.12),py(s.y0+.15),tile*.65,tile*.24).fill(0x54857d);
            }
            g.roundRect(px(s.x0+.3),py(s.y0+.3),tile*.4,tile*.4,2).fill(tint??0x46c4b7).stroke({color:0xf8efd4,width:1});
            g.rect(px(s.x0+.38),py(s.y0+.37),tile*.24,tile*.15).fill(0x193947);
            g.circle(px(s.x0+.4),py(s.y0+.61),tile*.035).fill(0x193947).circle(px(s.x0+.6),py(s.y0+.61),tile*.035).fill(0x193947);
            // Mark actual frontage inside the lot, never a second flow arrow on the road.
            const x=s.anchor.x+.5,y=s.anchor.y+.5,dx=s.entrance.x-s.anchor.x,dy=s.entrance.y-s.anchor.y;
            g.moveTo(px(x+dx*.42-dy*.32),py(y+dy*.42+dx*.32)).lineTo(px(x+dx*.42+dy*.32),py(y+dy*.42-dx*.32)).stroke({color:0x46c4b7,width:4});
            layer.addChild(g);return;
        }
        if (b.kind === 'park') {
            const texture=parkTexture(s.side);
            if(texture){
                const sprite=new Sprite(texture);sprite.position.set(px(s.x0),py(s.y0));sprite.setSize(px(s.w),py(s.h));
                sprite.alpha=alpha??1;sprite.tint=tint??0xffffff;layer.addChild(sprite);return;
            }
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
        if(b.kind==='busStop')return; // Its boarding curb is marked inside its own square.
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
        ground.updateCacheTexture();
    }

    // Arrows straddle the controlled connection, so corners and branches are unambiguous.
    // Static arrows belong to the cached world; only edit previews are redrawn.
    function directionArrow(g:Graphics,a:Point,b:Point,color:number) {
        const dx=b.x-a.x,dy=b.y-a.y;
        const cx=px((a.x+b.x)/2+.5),cy=py((a.y+b.y)/2+.5);
        const length=tile*.22,wing=tile*.10;
        g.moveTo(cx-dx*length,cy-dy*length).lineTo(cx+dx*length,cy+dy*length)
          .moveTo(cx+dx*length-dx*wing-dy*wing,cy+dy*length-dy*wing+dx*wing)
          .lineTo(cx+dx*length,cy+dy*length)
          .lineTo(cx+dx*length-dx*wing+dy*wing,cy+dy*length-dy*wing-dx*wing)
          .stroke({color,width:tile*.075,cap:'round',join:'round'});
    }
    function renderWorld() {
        renderedWideRoads=city.wideRoads;
        const index=roadIndex(city), areas=index.areas, roundabouts=roundaboutIndex(city);
        controlRoads=index.roads;
        controlAreas=city.controls.map(control=>{const tiles=areaTiles(areas,control);return {control,tiles,members:new Set(tiles.map(p=>`${p.x},${p.y}`))};}).filter(({control,tiles})=>!roundabouts.byTile.has(`${control.x},${control.y}`)&&!tiles.some(p=>roundabouts.byTile.has(`${p.x},${p.y}`)));
        world.removeChildren().forEach(c => c.destroy());
        const roads = roadSet();
        const wideTiles=wideRoadTopology(city).tiles;
        for (const p of city.roads) {
            if(wideTiles.has(`${p.x},${p.y}`))continue;
            let mask = 0;
            for (const [side, [dx, dy]] of Object.entries(SIDE_STEP))
                if (roads.has(`${p.x + dx},${p.y + dy}`)) mask |= ROAD_BIT[side as Side];
            cell(world, roadFrame(mask), p.x, p.y);
        }
        world.addChild(wideRoadArt(city,tile,px,py));
        // Buildings paint over any scenery on their plot; access markers sit on
        // the road, so they are drawn first and never hidden by a facade.
        for (const b of city.buildings) drawAccess(world, b, roads);
        for (const b of [...city.buildings].sort((a, c) => a.y - c.y)) drawBuilding(world, b);
        if (artReady) for (const p of city.closures) {
            // Divert is a traffic restriction, not excavation. Keep asphalt
            // visible and use upright roadside furniture; responding crews
            // retain their existing physical passage through this tile.
            const northSouth = roads.has(`${p.x},${p.y - 1}`) || roads.has(`${p.x},${p.y + 1}`);
            const eastWest = roads.has(`${p.x - 1},${p.y}`) || roads.has(`${p.x + 1},${p.y}`);
            if (northSouth)
                put(world, { name: 'barrierWarning', tx: .03, ty: -.12, tw: .7, th: .45 }, p.x, p.y);
            if (eastWest || !northSouth)
                put(world, { name: 'barrierWarningVertical', tx: -.18, ty: .02, tw: .7, th: .9 }, p.x, p.y);
            const corners = northSouth && !eastWest ? [[.04, .61], [.72, .61]] : [[.69, .05], [.69, .69]];
            for (const [tx, ty] of corners)
                put(world, { name: 'cone', tx, ty, tw: .28, th: .28 }, p.x, p.y);
        }
        const arrows = new Graphics();
        for(const [key,direction] of Object.entries(city.roadDirections??{})) {
            const pair=roadEdgePoints(key);if(!pair)continue;
            const [a,b]=pair;
            if(wideRoadTopology(city).tiles.has(`${a.x},${a.y}`)||wideRoadTopology(city).tiles.has(`${b.x},${b.y}`))continue;
            directionArrow(arrows,direction==='forward'?a:b,direction==='forward'?b:a,0xffe179);
        }
        // Give-way triangles mark only incoming approaches; circulating roads retain priority.
        for(const ring of roundabouts.rings)for(const {from,to} of ring.entries){
            const dx=to.x-from.x,dy=to.y-from.y;
            const cx=px(from.x+.5+dx*.25),cy=py(from.y+.5+dy*.25),r=tile*.15;
            arrows.poly([cx+dx*r,cy+dy*r,cx-dx*r-dy*r,cy-dy*r+dx*r,cx-dx*r+dy*r,cy-dy*r-dx*r])
                .closePath().fill(0xfff3dc).stroke({color:0xc43d34,width:tile*.055,join:'round'});
        }
        world.addChild(arrows);
        world.updateCacheTexture();
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
        if(store.get().tool==='direction') {
            for(const p of directionPoints)outline.rect(px(p.x)+2,py(p.y)+2,tile-4,tile-4).fill({color:0x60e8ff,alpha:.18}).stroke({color:0x60e8ff,width:2});
            for(let i=1;i<directionPoints.length;i++){
                directionArrow(outline,directionPoints[i-1],directionPoints[i],0x60e8ff);
                if(store.get().directionRestore)directionArrow(outline,directionPoints[i],directionPoints[i-1],0x60e8ff);
            }
            if(hover&&!store.get().panning&&!gesture)outline.rect(px(hover.x)+2,py(hover.y)+2,tile-4,tile-4).stroke({color:0xffffff,width:2});
            return;
        }
        if(store.get().transitDraft!==null)return;
        if (!hover || store.get().panning || gesture) return;
        const s = store.get();
        if(s.tool===null||s.vehicleDebugOpen)return;
        if(s.tool==='wideRoad') {
            const result=previewWideRoadPlacement(city,hover.x,hover.y,s.rotation);
            const colour=result.ok?COLORS.valid:COLORS.invalid;
            if(city.roads.some(p=>result.tiles.some(q=>same(p,q))))for(const p of wideRoadWorkFootprint(result.section)) {
                if(result.tiles.some(q=>same(p,q))||!city.roads.some(q=>same(p,q)))continue;
                outline.rect(px(p.x)+2,py(p.y)+2,tile-4,tile-4).fill({color:0xffcb61,alpha:.14}).stroke({color:0xffcb61,width:2});
            }
            const proposed={...city,roads:[...city.roads,...result.tiles.filter(p=>!city.roads.some(q=>same(p,q)))],wideRoads:[...(city.wideRoads??[]),result.section]};
            const art=wideRoadArt(proposed,tile,px,py,new Set(result.tiles.map(p=>`${p.x},${p.y}`)));
            art.alpha=.7;ghost.addChildAt(art,0);
            for(const p of result.tiles) {
                outline.rect(px(p.x)+1,py(p.y)+1,tile-2,tile-2).fill({color:colour,alpha:.16}).stroke({color:0x16241f,width:5}).stroke({color:colour,width:2});
                if(!result.ok)outline.moveTo(px(p.x+.15),py(p.y+.15)).lineTo(px(p.x+.85),py(p.y+.85)).moveTo(px(p.x+.85),py(p.y+.15)).lineTo(px(p.x+.15),py(p.y+.85)).stroke({color:colour,width:3});
            }
            const label=new Text({text:result.message,style:{fontFamily:'sans-serif',fontSize:14/(stage.scale()*camera.zoom),fill:0xffffff,stroke:{color:0x142237,width:3/(stage.scale()*camera.zoom)},wordWrap:true,wordWrapWidth:220/(stage.scale()*camera.zoom),align:'center'}});
            label.anchor.set(.5,1);label.position.set(px(hover.x+(s.rotation%2?1:.5)),py(hover.y)-4);ghost.addChild(label);
            return;
        }
        const candidate = structuredClone(city) as City;
        const before = candidate.funds;
        placeInCity(candidate, s.tool, hover.x, hover.y, s.rotation);
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
            if(b.kind==='busStop'||b.kind==='busStation'){
                // Eligibility comes from actual connected sidewalks, not a distance circle.
                for(const destination of city.buildings)if(['home','store','park'].includes(destination.kind)){
                    const path=walkingPath(city,g.entrance,entrance(destination));if(!path)continue;
                    for(let i=1;i<path.length;i++)outline.moveTo(px(path[i-1].x+.18),py(path[i-1].y+.18)).lineTo(px(path[i].x+.18),py(path[i].y+.18)).stroke({color:0xbaf4a4,width:3,alpha:.85});
                }
            }
            if(b.kind==='policeStation')outline.circle(px(g.entrance.x+.5),py(g.entrance.y+.5),CITY_RULES.policePatrol.radiusTiles*tile).fill({color:0x7bdfff,alpha:.06}).stroke({color:0x7bdfff,width:2,alpha:.8});
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
            const transition=city.wideRoads?.length?transitionVehiclePose(city,trip,VEHICLE_LANE_OFFSET):undefined;
            const facing = facingFor(transition?.dx??laneDx, transition?.dy??laneDy, carFacing.get(trip.id) ?? 'S');
            carFacing.set(trip.id, facing);
            let sprite = carPool.get(trip.id);
            if (!sprite) {
                sprite = new Sprite();
                sprite.anchor.set(.5);
                cars.addChild(sprite);
                carPool.set(trip.id, sprite);
            }
            const view = vehicleView(trip.id, facing, trip.service);
            sprite.texture = frame(trip.busId!==undefined?`bus_${facing}`:view.name);
            sprite.tint = trip.phase==='crashed'?0x80665a:view.tint ?? 0xffffff;
            const w = VEHICLE_WIDTH[facing] * tile;
            sprite.setSize(w, w * sprite.texture.height / sprite.texture.width);
            // The simulation owns passing and its lateral transition, including across saves.
            const lane = VEHICLE_LANE_OFFSET * (1 - 2 * travelLaneOffset(trip));
            let x = transition?px(transition.x):px(a.x + dx * f + .5) - laneDy * tile * lane;
            let y = transition?py(transition.y):py(a.y + dy * f + .5) + laneDx * tile * lane;
            if(trip.sceneParked){
                const scene=city.incidents.find(i=>i.id===trip.incidentId);
                if(scene){
                    const slot=trip.service==='police'?-1:trip.service==='ems'?0:1;
                    const vx=scene.x-a.x,vy=scene.y-a.y;
                    x=px(a.x+.5+vx*.28-vy*slot*.25);
                    y=py(a.y+.5+vy*.28+vx*slot*.25);
                    sprite.setSize(w*.7,w*.7*sprite.texture.height/sprite.texture.width);
                }
            }
            sprite.position.set(x, y);
            carShadows.ellipse(x, y + sprite.height * .36, sprite.width * .44, tile * .1)
                .fill({ color: 0x0d1614, alpha: .32 });
        }
        const parked=new Set<number>();
        const offRoadBuses=new Set(city.trips.filter(t=>t.busId!==undefined&&t.phase==='visiting').map(t=>t.busId!));
        const fleetByStation=new Map<number,NonNullable<City['transit']>['fleet']>();
        for(const bus of city.transit?.fleet??[]){let fleet=fleetByStation.get(bus.stationId);if(!fleet){fleet=[];fleetByStation.set(bus.stationId,fleet);}fleet.push(bus);}
        for(const station of city.buildings)if(station.kind==='busStation'){
            const fleet=fleetByStation.get(station.id)??[];
            for(const [bay,bus] of fleet.entries())if(bus.tripId===undefined||offRoadBuses.has(bus.id)){
                parked.add(bus.id);let sprite=parkedBodies.get(bus.id);
                if(!sprite){sprite=new Sprite(frame('bus_E'));sprite.anchor.set(.5);cars.addChild(sprite);parkedBodies.set(bus.id,sprite);}
                sprite.texture=frame('bus_E');const w=VEHICLE_WIDTH.E*tile;
                sprite.setSize(w,w*sprite.texture.height/sprite.texture.width);
                sprite.position.set(px(station.x+.8+bay*1.35),py(station.y+2.02));
            }
        }
        for(const [id,g] of parkedBodies)if(!parked.has(id)){g.destroy();parkedBodies.delete(id);}
        for (const [id, sprite] of carPool) if (!live.has(id)) {
            sprite.destroy(); carPool.delete(id); carFacing.delete(id);
        }
    }

    function renderActivity() {
        withRoadPathRead(city, renderActivitySnapshot);
    }
    function renderActivitySnapshot() {
        activity.clear();
        const live = new Set<string>();
        const liveBadges = new Set<string>();
        function label(key:string,text:string,x:number,y:number,color=0xffeed6) {
            live.add(key);
            let t=statusLabels.get(key);
            if(!t){t=new Text({text,style:{fontFamily:'system-ui',fontSize:12,fontWeight:'bold',fill:color,stroke:{color:0x122d26,width:3}}});t.anchor.set(.5);activityLabels.addChild(t);statusLabels.set(key,t);}
            const fontSize=17.6/(stage.scale()*camera.zoom);
            if(t.text!==text)t.text=text;
            if(t.style.fill!==color)t.style.fill=color;
            if(t.style.fontSize!==fontSize){
                t.style.fontSize=fontSize;
                t.style.stroke={color:0x122d26,width:3/(stage.scale()*camera.zoom)};
            }
            t.position.set(px(x),py(y));
        }
        for(const work of city.wideRoadWorks??[]) {
            for(const p of wideRoadWorkFootprint(work.section))if(city.roads.some(q=>same(p,q)))activity.rect(px(p.x)+2,py(p.y)+2,tile-4,tile-4).fill({color:0xffcb61,alpha:.14}).stroke({color:0xffcb61,width:2});
            for(const p of wideRoadFootprint(work.section)) {
                activity.rect(px(p.x)+1,py(p.y)+1,tile-2,tile-2).fill({color:0xc88632,alpha:.55}).stroke({color:0xffcb61,width:2});
                for(const d of [.25,.7])activity.moveTo(px(p.x+d-.12),py(p.y+.2)).lineTo(px(p.x+d+.12),py(p.y+.45)).stroke({color:0xffd779,width:4});
            }
            label(`wide-work-${work.section.x},${work.section.y}`,`${work.cancelling?'RESTORING':'ROADWORKS'} ${Math.ceil(work.remaining)}s`,work.section.x+(work.section.axis==='vertical'?1:.5),work.section.y-.2,0xffcb61);
        }
        const draft=store.get().transitDraft;
        if(draft&&inspectedId!==null){
            for(const path of routePreviewPaths)for(const p of path)activity.rect(px(p.x)+3,py(p.y)+3,tile-6,tile-6).fill({color:0x46c4b7,alpha:.2});
            for(const [i,id] of draft.entries()){const stop=city.buildings.find(b=>b.id===id);if(stop)label(`route-order-${i}`,String(i+1),stop.x+.5,stop.y+.5,0x74fff0);}
        }
        for(const bus of city.transit?.fleet??[]){const sprite=bus.tripId===undefined?null:carPool.get(bus.tripId);if(sprite)label(`bus-${bus.id}`,`${busRiderCount(bus)}/8`,sprite.x/tile,sprite.y/tile-.5,0x74fff0);}
        if(inspectedRoad && city.roads.some(p=>same(p,inspectedRoad!)))activity.rect(px(inspectedRoad.x)+1,py(inspectedRoad.y)+1,tile-2,tile-2).stroke({color:0x42d9e8,width:3,alpha:.9});
        const station=city.buildings.find(b=>b.id===inspectedId&&b.kind==='policeStation');
        if(station){const e=entrance(station);activity.circle(px(e.x+.5),py(e.y+.5),CITY_RULES.policePatrol.radiusTiles*tile).fill({color:0x7bdfff,alpha:.06}).stroke({color:0x7bdfff,width:2,alpha:.8});}
        const selected=store.get().vehicleDebugOpen&&city.trips.find(t=>t.id===store.get().selectedVehicleId);
        if(selected){
            for(const p of selected.path)activity.rect(px(p.x)+2,py(p.y)+2,tile-4,tile-4).stroke({color:0x42d9e8,width:2,alpha:.75});
            const sprite=carPool.get(selected.id);if(sprite)activity.circle(sprite.x,sprite.y,tile*.45).stroke({color:0xffd22e,width:3});
        }
        const mode=store.get().diagnosticView, diagnostics=store.get().diagnostics;
        if(diagnostics && mode!=='normal') {
            if(mode==='traffic') for(const t of diagnostics.traffic){
                activity.rect(px(t.x)+2,py(t.y)+2,tile-4,tile-4).fill({color:0xffa24b,alpha:.3}).stroke({color:0xffa24b,width:2});
                label(`wait-${t.id}`,`${t.hold.toFixed(0)}s`,t.x+.5,t.y+.2,0xffd779);
            }
            if(mode==='access') for(const h of diagnostics.homes){
                const color=h.status==='access'?0xff8866:0x42d9e8;
                activity.rect(px(h.x)+2,py(h.y)+2,tile*2-4,tile*2-4).stroke({color,width:3});
                label(`access-${h.id}`,h.status==='access'?'NO ROUTE':'ACCESS',h.x+1,h.y+.4,color);
            }
            if(mode==='capacity') for(const d of diagnostics.destinations){
                const full=d.inbound+d.occupied>=d.capacity,color=full?0xffd22e:0x42d9e8;
                label(`capacity-${d.id}`,`${d.occupied} parked + ${d.inbound} arriving / ${d.capacity}`,d.x+1.5,d.y+.65,color);
            }
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
        const waitingByStop=waitingBusRiders(city);
        for(const j of city.transit?.journeys??[]){const id=j.state==='waiting-out'?j.boardStopId:j.state==='waiting-back'?j.returnBoardStopId:undefined;if(id!==undefined)waitingByStop.set(id,(waitingByStop.get(id)??0)+1);}
        for(const b of city.buildings) {
            if(b.kind==='busStop'||b.kind==='busStation'){
                const waiting=waitingByStop.get(b.id)??0;
                label(`transit-${b.id}`,`${b.kind==='busStation'?'BUS DEPOT':'BUS'} ${b.id}${waiting?` · ${waiting} waiting`:''}${transitIssueByStop.has(b.id)?' !':''}`,b.x+.5,b.y-.2,0x74fff0);
                // Match the existing yellow visitor markers, contained inside the stop plot.
                const depot=b.kind==='busStation',s=shape(b);
                for(let i=0;i<Math.min(waiting,8);i++)activity.roundRect(
                    px(s.x0+(depot?.2:.08)+i%4*(depot?.38:.22)),
                    py(s.y0+s.h-(depot?.35:.22)-Math.floor(i/4)*(depot?.28:.24)),
                    tile*(depot?.25:.18),tile*.18,2).fill(0xffd779);
                continue;
            }
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
            if (artReady) {
                // Small overview cue supplements the pixel props when zoomed
                // out. Do not draw a solid barricade over the usable road.
                activity.rect(px(p.x + .04), py(p.y + .04), tile * .92, tile * .92)
                    .stroke({ color: 0xffbb55, width: 1.5, alpha: .8 });
                continue;
            }
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
            const needsRoad=externalNeedsRoad(city),colour=needsRoad?0xffd22e:0x8edbfa;
            activity.circle(px(p.x+.5),py(p.y+.5),tile*.42).stroke({color:colour,width:needsRoad?5:3});
            label('gateway',needsRoad?'CONNECT TO CITY':'CITY',p.x+.5,p.y-.1,colour);
        }
        for(const r of city.risks) if(r.exposure>=CITY_RULES.intersectionSafety.warningExposure) {
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
                const trip=city.trips.find(t=>t.incidentId===incident.id&&t.service===kind&&!t.responseCancelled);
                badge.text.text=trip?.phase==='working'?`${serviceName} on scene`
                    :trip?.phase==='waiting'||(trip&&trip.hold>=3)?`${serviceName} waiting`
                    :trip?`${serviceName} en route`
                    :!city.buildings.some(b=>b.kind===stationKind)?`Build ${kind==='ems'?'Clinic':serviceName}`
                    :`${serviceName} needed`;
                badge.container.scale.set(1/screenScale);
                badge.container.position.set(px(incident.x+.5),py(incident.y)-(64+(needed.length-1-row)*35)/screenScale);
            }
        }
        for(const t of city.trips)if(t.service) {
            const sprite=carPool.get(t.id);if(!sprite)continue;
            if(isEmergencyResponse(t)||t.phase==='working')
                activity.circle(sprite.x-4,sprite.y-5,3).fill(Math.floor(city.elapsed*5)%2?0x7bdfff:0xff6a60);
            if(t.sceneParked)continue; // The scene badges already identify these tightly parked crews.
            const passing = emergencyLaneOffset(t)>0;
            const labelY = (sprite.y-sprite.height/2)/tile-12/(tile*stage.scale()*camera.zoom);
            label(`t${t.id}`,t.patrol?'PATROL':t.service.toUpperCase(),sprite.x/tile,labelY,passing?0xffd779:0xffeed6);
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
        // React owns one reserved rectangle. Convert its actual CSS bounds through
        // the canvas into stage units, including letterboxing and display modes.
        const region = document.querySelector('.city-map-viewport')?.getBoundingClientRect();
        if (!region) return;
        const canvas = app.canvas.getBoundingClientRect();
        const sx = app.screen.width / canvas.width / stage.scale();
        const sy = app.screen.height / canvas.height / stage.scale();
        const next = {x:(region.left-canvas.left)*sx, y:(region.top-canvas.top)*sy,
            width:region.width*sx, height:region.height*sy};
        if (next.x !== viewport.x || next.y !== viewport.y || next.width !== viewport.width || next.height !== viewport.height) {
            // A resize during a drag must not connect the old pointer to a new tile.
            pointers.clear(); gesture=false; drawing=false; last=null; panStart=null; downPoint=null; hover=null;
        }
        viewport = next;
        app.canvas.style.clipPath = `inset(${Math.max(0,region.top-canvas.top)}px ${Math.max(0,canvas.right-region.right)}px ${Math.max(0,canvas.bottom-region.bottom)}px ${Math.max(0,region.left-canvas.left)}px)`;
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
    function finishDirection(mode: 'forward'|'reverse'|'two-way' = store.get().directionRestore?'two-way':'forward') {
        const result=applyRoadDirections(city,directionPoints,mode);
        const ringReady=result.ok&&directionPoints.some(p=>roundaboutIndex(city).byTile.has(`${p.x},${p.y}`));
        if(result.ok)directionPoints=[];
        store.patch({directionSelection:directionPoints.length,message:result.message+(ringReady?' Roundabout: entering cars yield to circulating traffic.':'')});
        report();if(result.ok)flushSave();refresh();
    }
    function build(p: Point) {
        const s = store.get();
        if(s.transitDraft!==null){
            const stop=city.buildings.find(b=>(b.kind==='busStop'||b.kind==='busStation'&&b.id===inspectedId)&&footprint(b).some(q=>same(p,q)));
            if(!stop){store.patch({message:'Tap a bus stop or this depot platform.'});return;}
            if(s.transitDraft.includes(stop.id)){store.patch({message:stop.id===inspectedId?'The depot is always the route start and return.':'Each stop can appear once. Use Undo tap to change the order.'});return;}
            const next=stop.id===inspectedId?[stop.id,...s.transitDraft]:[...s.transitDraft,stop.id];const check=busRoutePreview(city,inspectedId!,next);
            store.patch({transitDraft:next,message:stop.id===inspectedId?'The depot is always the route start and return; its platform is served there.':check.error??'Route connected. Finish when the stop order is ready.'});paint();return;
        }
        if(s.vehicleDebugOpen){
            const choices=city.trips.filter(t=>t.path.length).map(t=>({t,p:t.path[Math.min(t.path.length-1,Math.max(0,Math.ceil(t.progress-.5-1e-9)))]}))
              .filter(c=>Math.hypot(c.p.x-p.x,c.p.y-p.y)<=1.1).sort((a,b)=>Math.hypot(a.p.x-p.x,a.p.y-p.y)-Math.hypot(b.p.x-p.x,b.p.y-p.y));
            if(choices[0])store.patch({selectedVehicleId:choices[0].t.id});
            report();return;
        }
        if(s.tool==='direction') {
            if(session || !starterToolAllowed(city,'direction')){store.patch({message:'One-way editing is not available in this lesson.'});return;}
            if(!city.roads.some(q=>same(p,q))){store.patch({message:'Select existing road squares for a one-way route.'});return;}
            const tail=directionPoints.at(-1);
            if(tail&&same(tail,p)){if(!drawing&&directionPoints.length>1)finishDirection();return;}
            if(directionPoints.length>1&&same(directionPoints[directionPoints.length-2],p)){
                directionPoints.pop();store.patch({directionSelection:directionPoints.length});preview();paint();return;
            }
            if(tail&&Math.abs(tail.x-p.x)+Math.abs(tail.y-p.y)!==1){store.patch({message:'Choose a road square next to the last selected square.'});return;}
            if(directionPoints.length>2&&same(directionPoints[0],tail!)){store.patch({message:'The loop is ready. Finish when traffic is clear, or step back.'});return;}
            if(directionPoints.slice(1).some(q=>same(q,p))){store.patch({message:'Tap the previous square to step back.'});return;}
            directionPoints.push({...p});
            store.patch({directionSelection:directionPoints.length,message:'Follow the arrows. Tap the last square again to finish, or the first to close a loop.'});
            if(!drawing&&directionPoints.length>2&&same(directionPoints[0],p)){finishDirection();return;}
            preview();paint();return;
        }
        if(s.tool === 'road' && city.roads.some(q=>same(p,q))) {
            inspectedRoad = {...p};
            store.patch({message:roundaboutIndex(city).byTile.has(`${p.x},${p.y}`)?'Roundabout: entering cars yield to circulating traffic.':`Road approach (${p.x}, ${p.y}) selected. ${session?'Waiting is shown above the map.':'Flow details are in the Dashboard.'}`});
            report(); return;
        }
        const depot=city.buildings.find(b=>b.kind==='busStation'&&footprint(b).some(q=>same(p,q)));
        if(depot&&s.tool!=='bulldoze'&&s.tool!=='wideRoad'){inspectedId=depot.id;store.patch({tool:null,message:'Choose stops in order, buy a bus, then start service.'});report();return;}
        const busStop=city.buildings.find(b=>b.kind==='busStop'&&footprint(b).some(q=>same(p,q)));
        if(busStop&&s.tool!=='bulldoze'&&s.tool!=='wideRoad'){inspectedId=busStop.id;const issue=busStopIssue(city,busStop);store.patch({message:`Bus stop ${busStop.id}: ${issue??`boards ${['west','north','east','south'][busStop.rotation]}bound traffic. Riders walk along connected sidewalks.`}`});report();return;}
        if(s.tool===null){store.patch({message:'Select a building or road tool from the menu first.'});return;}
        if(isBuildingTool(s.tool)) {
            const existing=city.buildings.find(b=>footprint(b).some(q=>same(p,q)));
            if(existing){inspectedId=existing.id;const status=buildingStatus(city,existing);store.patch({message:`${BUILDING_LABELS[existing.kind]}: ${status.label}.${session?'':' Open Dashboard for details.'}`});report();return;}
        }
        const message = placeInCity(city, s.tool, p.x, p.y, s.rotation);
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
        if (pointers.has(e.pointerId) && hover && last && (store.get().tool === 'road'||store.get().tool === 'wideRoad'||store.get().tool === 'direction')) {
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
        if(e && pointers.has(e.pointerId) && drawing && !gesture && !panStart && store.get().tool==='direction' && directionPoints.length>1)finishDirection();
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
        if(session && !['zoom','home','focus'].includes(command.type)) return;
        if(command.type==='transit'){
            if(command.action==='close'){inspectedId=null;store.patch({transitDraft:null});report();return;}
            const station=city.buildings.find(b=>b.id===inspectedId&&b.kind==='busStation');if(!station)return;
            if(command.action==='edit'){store.patch({transitDraft:[],tool:null,panning:false,message:'Tap bus stops in travel order, then Finish route.'});preview();return;}
            if(command.action==='cancel'){store.patch({transitDraft:null,message:'Route draft canceled.'});paint();return;}
            if(command.action==='undo'){store.patch({transitDraft:store.get().transitDraft?.slice(0,-1)??[]});paint();return;}
            let message='';
            if(command.action==='finish'){
                const ids=store.get().transitDraft??[];const check=busRoutePreview(city,station.id,ids);
                if(check.error){store.patch({message:check.error});return;}
                message=applyBusRoute(city,station.id,ids);store.patch({transitDraft:null});
            }
            if(command.action==='buy')message=buyBus(city,station.id);
            if(command.action==='sell'&&command.busId!==undefined)message=sellBus(city,command.busId);
            if(command.action==='start'||command.action==='stop')message=setBusRouteRunning(city,station.id,command.action==='start');
            store.patch({message});report();flushSave();refresh();return;
        }
        if(command.type==='road-direction') {
            if(store.get().tool!=='direction')return;
            if(command.mode==='undo'){directionPoints.pop();store.patch({directionSelection:directionPoints.length});preview();paint();return;}
            if(command.mode==='cancel'){directionPoints=[];store.patch({directionSelection:0,message:'Direction edit canceled.'});preview();paint();return;}
            finishDirection(command.mode);return;
        }
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
        if(command.type==='finish-tutorial'){
            store.patch({message:finishTutorialAndConnect(city)});report();flushSave();paint();
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
        const shortcuts: Record<string, Tool> = { '1': 'home', '2': 'store', '3': 'road', '4': 'bulldoze', '5': 'stop', '6': 'signal', '7': 'closure', '8':'direction', '9':'wideRoad' };
        if (shortcuts[e.key] && (!session || shortcuts[e.key]!=='direction') && starterToolAllowed(city,shortcuts[e.key])) store.patch({ tool: shortcuts[e.key], panning: false });
        if(e.key==='Escape'&&store.get().transitDraft!==null)store.patch({transitDraft:null,message:'Route draft canceled.'});
        if(e.key==='Escape'&&store.get().tool==='direction'){directionPoints=[];store.patch({directionSelection:0,message:'Direction edit canceled.'});}
        if (e.key.toLowerCase() === 'r') store.patch({ rotation: (store.get().rotation + 1) % 4 });
        if (e.code === 'Space' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); store.patch({ paused: !store.get().paused }); }
    }

    const tick = () => {
        const dt = Math.min(app.ticker.deltaMS / 1000, .1);
        const noticed=city.tutorial?.noticedIncident;
        if(session)session.step(dt);else stepCity(city, dt);
        if(city.wideRoads!==renderedWideRoads)renderWorld();
        renderCars(); renderControls(); renderActivity();
        setFiretruckResponding(city.trips.some(t=>t.service==='fire'&&!t.patrol&&!t.responseCancelled&&isEmergencyResponse(t)));
        setPoliceResponding(city.trips.some(t=>t.service==='police'&&!t.patrol&&!t.responseCancelled&&isEmergencyResponse(t)));
        stepTrafficAudio(dt,city.trips.filter(t=>!t.service&&t.path.length&&(!t.phase||t.phase==='legacy'||t.phase==='outbound'||t.phase==='returning')).length);
        if(city.tutorial?.status==='active'&&!city.tutorial.hRoad&&!noticed&&city.tutorial.noticedIncident){
            store.patch({tutorialNotice:true,message:'A crash needs attention. Traffic is running; build another route and keep emergency access open.'});
            report();flushSave();
        }
        reportClock += dt; saveClock += dt;
        if (reportClock >= .5) { reportClock = 0; report(); }
        if (saveClock >= 2) { saveClock = 0; flushSave(); }
    };
    const unsub = store.subscribe(() => {
        const draft=store.get().transitDraft;
        if(draft!==previewDraft){previewDraft=draft;routePreviewPaths=draft&&inspectedId!==null?busRoutePreview(city,inspectedId,draft).paths:[];renderActivity();}

        if(store.get().tool!=='direction' && directionPoints.length){directionPoints=[];store.patch({directionSelection:0});return;}
        preview(); paint();
    });
    const unresize = stage.onResize(layout);
    const observer = new ResizeObserver(layout);
    // Observe the region AND its allocating bands: a band's change can move the
    // rectangle without resizing it. The region stays mounted across panel changes.
    for (const el of document.querySelectorAll('.city-map-viewport, .city-header, .city-controls, .city-stage')) observer.observe(el);
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
            setFiretruckResponding(false);
            setPoliceResponding(false);
            stopTrafficAudio();
            flushSave(); observer.disconnect(); unsub(); unresize();
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
