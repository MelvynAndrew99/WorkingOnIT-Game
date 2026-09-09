import { Container, Graphics, Sprite, Text, Rectangle, type Application, type FederatedPointerEvent } from 'pixi.js';
import type { Stage } from './stage.ts';
import { TILE_METERS, expandCity, footprint, entrance, place, stepCity, connectedHomes, income, routeForHome, averageTripSeconds, type Point, type Building, type Tool, type City } from './cityModel.ts';
import {
    ensureCityArt, frame, groundFrame, scenery, buildingPieces, roadFrame, arrowFrame,
    vehicleView, facingFor, storeStall, ROAD_BIT, SIDE_STEP,
    VEHICLE_WIDTH, VEHICLE_LANE_OFFSET, COLORS, type Piece, type Side,
} from './cityArt.ts';
import { containsTile } from './cityMap.ts';
import { TILE_SIZE, screenToWorld, panCamera, zoomCamera, clampCamera, type Camera, type Viewport } from './cityCamera.ts';
import { onCityCommand } from './cityControls.ts';
import { getSave, flushSave } from '../state/save.ts';
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
    const ghost = new Container();
    const outline = new Graphics();      // placement validity, drawn above the ghost art
    const labels = new Container();
    ghost.addChild(outline);
    cars.addChild(carShadows);
    root.addChild(ground, world, cars, ghost);
    const clip = new Graphics();
    const input = new Container();
    stage.root.addChild(root, clip, labels, input);
    root.mask = clip;
    root.eventMode = 'none';
    const tile = TILE_SIZE;
    const camera: Camera = {x: 8, y: 7, zoom: 1};
    let viewport: Viewport = {x:14,y:200,width:692,height:600};
    let groundKey = '';
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
        store.patch({
            map: city.map, funds: city.funds, income: income(city), connected: connectedHomes(city),
            tripSeconds: averageTripSeconds(city), homes: city.buildings.filter(b => b.kind === 'home').length,
            completed: city.completed, activeTrips: city.trips.length,
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

    function renderLabels() {
        labels.removeChildren().forEach(c => c.destroy());
        const caption = new Text({
            text: `${city.map.width} × ${city.map.height} tiles  ·  ${TILE_METERS} m per tile`,
            style: { fontFamily: 'system-ui', fontSize: 17.6 / stage.scale(), fill: 0xcfe3d2 },
        });
        caption.resolution = Math.max(2, 2 / stage.scale());
        caption.position.set((stage.width - caption.width) / 2, viewport.y - caption.height - 4);
        labels.addChild(caption);
    }

    function preview() {
        ghost.removeChildren().forEach(c => { if (c !== outline) c.destroy(); });
        ghost.addChild(outline);
        outline.clear();
        if (!hover || store.get().panning || gesture) return;
        const s = store.get();
        const candidate = structuredClone(city) as City;
        const before = candidate.funds;
        place(candidate, s.tool, hover.x, hover.y, s.rotation);
        const valid = before !== candidate.funds;
        const colour = s.tool === 'bulldoze' ? COLORS.remove : valid ? COLORS.valid : COLORS.invalid;
        let box = { x: hover.x, y: hover.y, w: 1, h: 1 };
        if (s.tool === 'home' || s.tool === 'store') {
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
            live.add(trip.id);
            const i = Math.min(Math.floor(trip.progress), trip.path.length - 1);
            const a = trip.path[i], b = trip.path[Math.min(i + 1, trip.path.length - 1)];
            const f = trip.progress - i;
            const dx = b.x - a.x, dy = b.y - a.y;
            const facing = facingFor(dx, dy, carFacing.get(trip.id) ?? 'S');
            carFacing.set(trip.id, facing);
            let sprite = carPool.get(trip.id);
            if (!sprite) {
                sprite = new Sprite();
                sprite.anchor.set(.5);
                cars.addChild(sprite);
                carPool.set(trip.id, sprite);
            }
            const view = vehicleView(trip.id, facing);
            sprite.texture = frame(view.name);
            sprite.tint = view.tint ?? 0xffffff;
            const w = VEHICLE_WIDTH[facing] * tile;
            sprite.setSize(w, w * sprite.texture.height / sprite.texture.width);
            // Keep to the right-hand side of the carriageway so opposing trips read apart.
            const x = px(a.x + dx * f + .5) - dy * tile * VEHICLE_LANE_OFFSET;
            const y = py(a.y + dy * f + .5) + dx * tile * VEHICLE_LANE_OFFSET;
            sprite.position.set(x, y);
            carShadows.ellipse(x, y + sprite.height * .36, sprite.width * .44, tile * .1)
                .fill({ color: 0x0d1614, alpha: .32 });
        }
        for (const [id, sprite] of carPool) if (!live.has(id)) {
            sprite.destroy(); carPool.delete(id); carFacing.delete(id);
        }
    }

    function updateCamera() {
        clampCamera(camera, city.map);
        root.scale.set(camera.zoom);
        root.position.set(viewport.x+viewport.width/2-camera.x*tile*camera.zoom, viewport.y+viewport.height/2-camera.y*tile*camera.zoom);
        renderGround(); preview(); paint();
    }
    function focusTown() {
        const points = city.buildings.length ? city.buildings.map(b => ({x:b.x+1,y:b.y+1})) : city.roads;
        camera.x = points.length ? points.reduce((n,p) => n+p.x,0)/points.length : 8;
        camera.y = points.length ? points.reduce((n,p) => n+p.y,0)/points.length : 7;
        camera.zoom = 1;
        hover = null; updateCamera();
    }
    function layout() {
        const scale = stage.scale();
        const top = (document.querySelector('.city-header')?.getBoundingClientRect().height ?? 160) / scale + 28 / scale;
        const bottom = (document.querySelector('.city-controls')?.getBoundingClientRect().height ?? 255) / scale + 8 / scale;
        viewport = {x:14,y:top,width:stage.width-28,height:Math.max(1,stage.designHeight()-top-bottom)};
        clip.clear().rect(viewport.x,viewport.y,viewport.width,viewport.height).fill(0xffffff);
        input.hitArea = new Rectangle(viewport.x,viewport.y,viewport.width,viewport.height);
        updateCamera(); renderWorld(); renderLabels(); preview(); renderCars(); paint();
    }
    /**
     * A paused game stops the ticker, and the ticker is what drives Pixi's
     * render loop — so anything built while paused needs an explicit repaint.
     */
    function paint() { if (!app.ticker.started && !root.destroyed) app.render(); }
    /** Model changed: everything but the terrain has to be rebuilt. */
    function refresh() { renderWorld(); preview(); renderCars(); paint(); }

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
        if(command.type==='expand'){
            const message=expandCity(city,command.direction);
            store.patch({message});report();flushSave();
            renderGround();renderLabels();updateCamera();
        }
    });

    function keyboard(e: KeyboardEvent) {
        if (document.querySelector('dialog[open]')) return;
        if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
        const shortcuts: Record<string, Tool> = { '1': 'home', '2': 'store', '3': 'road', '4': 'bulldoze' };
        if (shortcuts[e.key]) store.patch({ tool: shortcuts[e.key], panning: false });
        if (e.key.toLowerCase() === 'r') store.patch({ rotation: (store.get().rotation + 1) % 4 });
        if (e.code === 'Space' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); store.patch({ paused: !store.get().paused }); }
    }

    const tick = () => {
        const dt = Math.min(app.ticker.deltaMS / 1000, .1);
        stepCity(city, dt); renderCars();
        reportClock += dt; saveClock += dt;
        if (reportClock >= .5) { reportClock = 0; report(); }
        if (saveClock >= 2) { saveClock = 0; flushSave(); }
    };
    const unsub = store.subscribe(() => { preview(); paint(); });
    const unresize = stage.onResize(layout);
    const observer = new ResizeObserver(layout);
    for (const selector of ['.city-header', '.city-controls']) { const el = document.querySelector(selector); if (el) observer.observe(el); }
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
            clip.destroy(); labels.destroy({children:true}); input.destroy();
        },
    };
}
