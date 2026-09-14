/**
 * Renderer-side visual definitions for the city.
 *
 * Everything about HOW the town looks lives here: which atlas frames make a
 * roof, a wall, a shopfront, a road corner, a car. Nothing here knows about
 * funds, routes or save data, and nothing in cityModel.ts knows about atlas
 * coordinates. Scene code asks for pieces in TILE units and places them.
 *
 * Art: Kenney "Roguelike Modern City" (CC0), with approved service-building
 * compositions (docs/artwork/service-buildings/), baked home lots
 * (docs/artwork/housing/), bus stops and depots (docs/artwork/transit/). The untouched pack and
 * its licence stay in src/assets/source/kenny/, alongside the RPG Urban Pack,
 * which is present but unused. See docs/ASSET-MAPPING.md.
 */
import { Assets, Rectangle, Texture } from 'pixi.js';
import { ATLAS_URL, FRAMES, type FrameName } from './cityAtlas.ts';

export const ATLAS_ALIAS = 'city-atlas';

// ---------------------------------------------------------------------------
// Textures
// ---------------------------------------------------------------------------
let textures: Partial<Record<FrameName, Texture>> = {};

/**
 * Slice the loaded atlas into per-frame textures. Safe to call repeatedly.
 * Returns false when the atlas is unavailable, so the scene can fall back to
 * flat colours instead of failing to boot (the RUN posture: never brick).
 */
export function initCityArt(): boolean {
    if (Object.keys(textures).length > 0) return true;
    const sheet: Texture | undefined = Assets.get(ATLAS_ALIAS) ?? Assets.get(ATLAS_URL);
    if (!sheet) return false;
    // Pixel art: no smoothing when the 16px tiles are scaled up to ~40 units.
    sheet.source.scaleMode = 'nearest';
    const next: Partial<Record<FrameName, Texture>> = {};
    for (const [name, f] of Object.entries(FRAMES)) {
        next[name as FrameName] = new Texture({ source: sheet.source, frame: new Rectangle(f.x, f.y, f.w, f.h) });
    }
    textures = next;
    return true;
}

export function frame(name: FrameName): Texture {
    return textures[name] ?? Texture.WHITE;
}

/** Approved park art stays upright; variants change only the entrance path. */
export function parkTexture(side: Side): Texture | undefined {
    const texture: Texture | undefined = Assets.get(`park-${side}`);
    if(texture) texture.source.scaleMode='nearest';
    return texture;
}

/**
 * Run `ready` as soon as atlas textures exist. Normally the boot warm-up has
 * already loaded them; if it failed, load once here so a missing asset degrades
 * to a late repaint rather than a broken scene.
 */
export function ensureCityArt(ready: () => void): void {
    if (initCityArt()) { ready(); }
    for(const side of ['N','E','S','W']) if(!Assets.get(`park-${side}`))
        Assets.load({alias:`park-${side}`,src:`images/city/park-${side}.png`}).then(ready).catch(err=>console.warn('[cityArt] park unavailable',err));
    if(initCityArt()) return;
    Assets.load({ alias: ATLAS_ALIAS, src: ATLAS_URL })
        .then(() => { if (initCityArt()) ready(); })
        .catch((err) => console.warn('[cityArt] atlas unavailable', err));
}

// ---------------------------------------------------------------------------
// Placement helpers
// ---------------------------------------------------------------------------
/** One atlas frame placed in a footprint, measured in tiles from its corner. */
export interface Piece {
    name: FrameName;
    /** Left/top offset in tiles. */ tx: number; ty: number;
    /** Size in tiles. */ tw: number; th: number;
    tint?: number;
    alpha?: number;
}
export type Side = 'N' | 'E' | 'S' | 'W';

// ---------------------------------------------------------------------------
// Ground
// ---------------------------------------------------------------------------
/** Stable per-tile pseudo-random value; identical every render, never saved. */
export function tileNoise(x: number, y: number, salt = 0): number {
    let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function groundFrame(x: number, y: number): FrameName {
    return tileNoise(x, y, 1) < 0.5 ? 'grassA' : 'grassB';
}

/** Scenery for an empty grass tile, or null to leave it plain. */
export function scenery(x: number, y: number): Piece | null {
    const n = tileNoise(x, y, 2);
    if (n < 0.045) return { name: (['tree_green', 'tree_pine', 'tree_amber'] as const)[Math.floor(tileNoise(x, y, 3) * 3)], tx: 0.06, ty: -0.9, tw: 0.88, th: 1.76 };
    if (n < 0.10) return { name: 'bush', tx: 0.2, ty: 0.2, tw: 0.6, th: 0.6 };
    return null;
}

// ---------------------------------------------------------------------------
// Roads — one baked frame per cardinal-neighbour mask
// ---------------------------------------------------------------------------
export const ROAD_BIT: Record<Side, number> = { N: 1, E: 2, S: 4, W: 8 };
export const SIDE_STEP: Record<Side, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

/** @param mask bitfield of ROAD_BIT for each side that continues as road. */
export function roadFrame(mask: number): FrameName {
    return `road${mask & 15}` as FrameName;
}

/** Arrow painted on the access tile, pointing at the building it belongs to. */
export function arrowFrame(towardsBuilding: Side): FrameName {
    return `arrow${towardsBuilding}` as FrameName;
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------
type RoofFamily = 'red' | 'grey' | 'pale' | 'tan';
type WallFamily = 'brick' | 'stone' | 'sand';

interface Skin {
    roof: RoofFamily;
    wall: WallFamily;
    awning?: 'awningGreen' | 'awningOrange';
    sign?: 'signBar' | 'signDots';
}
/** Deterministic variety: the same building always looks the same. */
const STORE_SKINS: Skin[] = [
    { roof: 'grey', wall: 'stone', awning: 'awningGreen', sign: 'signBar' },
    { roof: 'pale', wall: 'sand', awning: 'awningOrange', sign: 'signDots' },
    { roof: 'grey', wall: 'sand', awning: 'awningOrange', sign: 'signBar' },
];
/** House styles baked by docs/artwork/housing/generate.mjs (cottage, bungalow, townhouse, garage). */
const HOME_STYLES = 4;

const roofSlice = (i: number, w: number, j: number, rows: number): string => {
    // The wall hides the roof's bottom edge, so a single roof row uses the top slices.
    const h = w === 1 ? 'l' : i === 0 ? 'l' : i === w - 1 ? 'r' : 'm';
    const v = rows === 1 || j === 0 ? 't' : j === rows - 1 ? 'b' : 'm';
    if (v === 'm' && h === 'm') return 'mid';
    if (v === 'm') return h;
    return h === 'm' ? v : `${v}${h}`;
};

/**
 * Lay out one building's artwork over its footprint bounding box.
 *
 * Artwork is always upright: the roof occupies every row but the last and the
 * facade is the last row, whatever the building's rotation. Rotation only
 * decides which footprint tile carries the access apron, and the front door
 * appears ONLY when that access is on the south face — a door on any other
 * wall would advertise an entrance the simulation does not have.
 *
 * Homes are whole baked lots instead: an upright house set back on its own
 * lawn, with a garden path that leaves the lot at the real entrance tile, so
 * rows of homes read as separate houses rather than one continuous block.
 *
 * @param w,h footprint size in tiles, already rotated by the model
 * @param access tile offset inside the footprint that touches the entrance
 * @param side which face of that tile the entrance sits against
 */
export function buildingPieces(
    kind: 'home' | 'store' | 'busStop' | 'busStation' | 'hospital' | 'fireStation' | 'policeStation', id: number, w: number, h: number,
    access: { x: number; y: number }, side: Side,
): Piece[] {
    // Bus stops bake their shelter, sign and painted boarding curb against the entrance side.
    if (kind === 'busStop') return [{ name: `busStop_${side}` as FrameName, tx: 0, ty: 0, tw: w, th: h }];
    if (kind === 'busStation') return [{ name: `busStation_${side}` as FrameName, tx: 0, ty: 0, tw: w, th: h }];
    if (kind === 'home') return [{ name: `home_${id % HOME_STYLES}_${side}` as FrameName, tx: 0, ty: 0, tw: w, th: h }];
    if (kind !== 'store') {
        return [
            { name: `building_${kind}_${side}`, tx: 0, ty: 0, tw: w, th: h },
            entranceApron(access, side),
        ];
    }
    const skin = STORE_SKINS[id % STORE_SKINS.length];
    const pieces: Piece[] = [];
    const roofRows = Math.max(1, h - 1);
    const wallRow = h - 1;
    for (let j = 0; j < wallRow; j++)
        for (let i = 0; i < w; i++)
            pieces.push({ name: `roof_${skin.roof}_${roofSlice(i, w, j, roofRows)}` as FrameName, tx: i, ty: j, tw: 1, th: 1 });
    for (let i = 0; i < w; i++) {
        const slice = w === 1 ? 'one' : i === 0 ? 'l' : i === w - 1 ? 'r' : 'm';
        pieces.push({ name: `wall_${skin.wall}_${slice}` as FrameName, tx: i, ty: wallRow, tw: 1, th: 1 });
    }

    const doorHere = side === 'S' && access.y === wallRow;
    // Shopfront glazing across the facade, with the awning tucked under the roof.
    for (let i = 0; i < w; i++) {
        if (doorHere && i === access.x) continue;
        const glass: FrameName = w === 1 ? 'shopGlass' : i === 0 ? 'shopGlassL' : i === w - 1 ? 'shopGlassR' : 'shopGlass';
        pieces.push({ name: glass, tx: i, ty: wallRow, tw: 1, th: 1 });
    }
    if (skin.awning) for (let i = 0; i < w; i++)
        pieces.push({ name: skin.awning, tx: i, ty: wallRow - 0.34, tw: 1, th: 0.42 });
    if (skin.sign && wallRow >= 1) pieces.push({ name: skin.sign, tx: w / 2 - 0.7, ty: wallRow - 0.86, tw: 1.4, th: 0.4 });
    if (doorHere) pieces.push({ name: 'doorStore', tx: access.x + 0.16, ty: wallRow + 0.06, tw: 0.68, th: 0.94 });

    // Paved apron on the plot, flush with the face the entrance touches, so the
    // way out of the building is visible even when there is no door on it.
    pieces.push(entranceApron(access, side));
    return pieces;
}

function entranceApron(access: { x: number; y: number }, side: Side): Piece {
    const apron: Record<Side, [number, number, number, number]> = {
        N: [access.x + 0.16, access.y, 0.68, 0.3],
        S: [access.x + 0.16, access.y + 0.7, 0.68, 0.3],
        W: [access.x, access.y + 0.16, 0.3, 0.68],
        E: [access.x + 0.7, access.y + 0.16, 0.3, 0.68],
    };
    const [ax, ay, aw, ah] = apron[side];
    return { name: 'plot', tx: ax, ty: ay, tw: aw, th: ah };
}

/**
 * Where the baked depot art puts its two parking bays (bus centres) and its rider platform
 * (top-left of the marker grid), in tiles from the 3×3 lot corner, per entrance side.
 * Must match LAYOUT in docs/artwork/transit/bus-depot/generate.mjs (16 px per tile).
 */
const px16 = (v: number) => v / 16;
export const DEPOT_LAYOUT: Record<Side, { bays: [number, number][]; riders: [number, number] }> = {
    S: { bays: [[px16(12), px16(25.5)], [px16(36), px16(25.5)]], riders: [px16(2), px16(37)] },
    N: { bays: [[px16(12), px16(23.5)], [px16(36), px16(23.5)]], riders: [px16(2), px16(4)] },
    W: { bays: [[px16(12), px16(39.5)], [px16(36), px16(39.5)]], riders: [px16(32), px16(20)] },
    E: { bays: [[px16(12), px16(39.5)], [px16(36), px16(39.5)]], riders: [px16(3), px16(20)] },
};

/** Small dressing placed on the pavement outside a store's entrance. */
export function storeStall(id: number): FrameName {
    return id % 2 === 0 ? 'crateFruit' : 'crateVeg';
}

// ---------------------------------------------------------------------------
// Vehicles
//
// The town is drawn as upright facades on a flat ground plane, so vehicles are
// drawn from the same fixed viewpoint: a car crossing the screen shows its
// side, and a car driving away or towards the player shows its back or front.
// Rotating a top-down sprite would be the only other option, and neither pack
// has true overhead cars — see docs/ASSET-MAPPING.md.
// ---------------------------------------------------------------------------
interface VehicleSkin { colour: 'green' | 'silver' | 'amber'; tint?: number }
const VEHICLE_SKINS: VehicleSkin[] = [
    { colour: 'green' },
    { colour: 'silver' },
    { colour: 'amber' },
    { colour: 'silver', tint: 0x8fb6ff },
    { colour: 'silver', tint: 0xff9d9d },
    { colour: 'silver', tint: 0xf0d47a },
];

export function vehicleView(tripId: number, facing: Side, service?: 'police' | 'ems' | 'fire'): { name: FrameName; tint?: number } {
    if (service) return { name: `car_${service}_${facing}` };
    const skin = VEHICLE_SKINS[tripId % VEHICLE_SKINS.length];
    return { name: `car_${skin.colour}_${facing}` as FrameName, tint: skin.tint };
}

/** Which way a vehicle is pointing; a stalled step keeps the previous facing. */
export function facingFor(dx: number, dy: number, previous: Side): Side {
    if (dx !== 0) return dx > 0 ? 'E' : 'W';
    if (dy !== 0) return dy > 0 ? 'S' : 'N';
    return previous;
}

/**
 * Rendered width in tiles. The across-screen views are a whole car long; the
 * towards/away views are only a car wide, so they get a narrower box.
 */
export const VEHICLE_WIDTH: Record<Side, number> = { E: 0.98, W: 0.98, N: 0.58, S: 0.58 };
/** Lane width as a fraction of a tile, so two-way traffic stays inside the road. */
export const VEHICLE_LANE_OFFSET = 0.16;

// ---------------------------------------------------------------------------
// Feedback colours (also used by the HUD palette in styles/app.css)
// ---------------------------------------------------------------------------
export const COLORS = {
    connected: 0x8ce99a,
    needsRoad: 0xffc861,
    valid: 0xd8f5b0,
    invalid: 0xef6f57,
    remove: 0xf5a06f,
    grassEdge: 0x2f5b45,
    mapEdge: 0x1d3b33,
} as const;
