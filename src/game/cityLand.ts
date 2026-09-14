/** Finite sandbox envelope and purchasable 16×16 plots. Independent of artwork. */
import { containsTile, type ExpansionDirection, type MapBounds } from './cityMap.ts';

type Point = { x: number; y: number };
type PermitReceipt = { used: number; levels: number; briefingSeen?: boolean };

/** Jam envelope. Stored on each save so a later update can grow it without moving tiles. */
export const DEFAULT_ENVELOPE_WIDTH = 64;
export const DEFAULT_ENVELOPE_HEIGHT = 48;
export const PLOT_SIZE = 16;
export const PLOT_COLUMNS = DEFAULT_ENVELOPE_WIDTH / PLOT_SIZE;
export const PLOT_ROWS = DEFAULT_ENVELOPE_HEIGHT / PLOT_SIZE;
/** First cash price after free unlocks. Provisional; economy balancing is post-jam. */
export const PLOT_BASE_PRICE = 250;
export const PLOT_PRICE_STEP = 100;
/** H-road starter occupies 24×20; that is four 16×16 plots in the north-west 32×32. */
export const STARTER_OWNED_PLOTS = [0, 1, 4, 5] as const;

export interface LandState {
  version: 1;
  envelopeWidth: number;
  envelopeHeight: number;
  plotSize: number;
  origin: { x: number; y: number };
  owned: number[];
  freeUnlocks: number;
  purchased: number;
  briefingSeen: boolean;
}

const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);

export function plotColumns(land: LandState): number {
  return Math.floor(land.envelopeWidth / land.plotSize);
}
export function plotRows(land: LandState): number {
  return Math.floor(land.envelopeHeight / land.plotSize);
}
export function plotCount(land: LandState): number {
  return plotColumns(land) * plotRows(land);
}

export function landEnvelope(land: LandState): MapBounds {
  return { x: land.origin.x, y: land.origin.y, width: land.envelopeWidth, height: land.envelopeHeight };
}

export function plotRect(land: LandState, id: number): MapBounds {
  const cols = plotColumns(land);
  const col = ((id % cols) + cols) % cols;
  const row = Math.floor(id / cols);
  return {
    x: land.origin.x + col * land.plotSize,
    y: land.origin.y + row * land.plotSize,
    width: land.plotSize,
    height: land.plotSize,
  };
}

export function plotIdAt(land: LandState, p: Point): number | null {
  const col = Math.floor((p.x - land.origin.x) / land.plotSize);
  const row = Math.floor((p.y - land.origin.y) / land.plotSize);
  const cols = plotColumns(land), rows = plotRows(land);
  if (col < 0 || row < 0 || col >= cols || row >= rows) return null;
  const rect = plotRect(land, row * cols + col);
  return containsTile(rect, p) ? row * cols + col : null;
}

function rectsOverlap(a: MapBounds, b: MapBounds): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function ownedPlotBounds(land: LandState): MapBounds | null {
  if (!land.owned.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const id of land.owned) {
    const r = plotRect(land, id);
    x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.width); y1 = Math.max(y1, r.y + r.height);
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

export function plotOwned(land: LandState, id: number): boolean {
  return land.owned.includes(id);
}

export function tileOwnedByLand(land: LandState, p: Point): boolean {
  const id = plotIdAt(land, p);
  return id !== null && plotOwned(land, id);
}

function plotsAdjacent(land: LandState, a: number, b: number): boolean {
  const cols = plotColumns(land);
  const ac = a % cols, ar = Math.floor(a / cols);
  const bc = b % cols, br = Math.floor(b / cols);
  return Math.abs(ac - bc) + Math.abs(ar - br) === 1;
}

export function createLandState(owned: readonly number[] = [0], freeUnlocks = 2): LandState {
  const ids = [...new Set(owned)].filter(id => id >= 0 && id < PLOT_COLUMNS * PLOT_ROWS).sort((a, b) => a - b);
  return {
    version: 1,
    envelopeWidth: DEFAULT_ENVELOPE_WIDTH,
    envelopeHeight: DEFAULT_ENVELOPE_HEIGHT,
    plotSize: PLOT_SIZE,
    origin: { x: 0, y: 0 },
    owned: ids.length ? ids : [0],
    freeUnlocks,
    purchased: 0,
    briefingSeen: false,
  };
}

export function unusedPermitUnlocks(expansion: PermitReceipt | undefined): number {
  if (!expansion) return 2;
  const freeRemaining = Math.max(0, 2 - expansion.used);
  const permits = Math.max(0, expansion.levels - Math.max(0, expansion.used - 2));
  return freeRemaining + permits;
}

/** Existing rectangle becomes owned plots; envelope grows to the jam size when the town still fits. */
export function migrateLandFromMap(map: MapBounds, expansion?: PermitReceipt): LandState {
  const origin = { x: map.x, y: map.y };
  const envelopeWidth = Math.max(DEFAULT_ENVELOPE_WIDTH, map.width);
  const envelopeHeight = Math.max(DEFAULT_ENVELOPE_HEIGHT, map.height);
  const land: LandState = {
    version: 1,
    envelopeWidth,
    envelopeHeight,
    plotSize: PLOT_SIZE,
    origin,
    owned: [],
    freeUnlocks: unusedPermitUnlocks(expansion),
    purchased: expansion?.used ?? 0,
    briefingSeen: expansion?.briefingSeen ?? false,
  };
  const cols = plotColumns(land), rows = plotRows(land);
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const id = row * cols + col;
    if (rectsOverlap(plotRect(land, id), map)) land.owned.push(id);
  }
  if (!land.owned.length) land.owned.push(0);
  return land;
}

export function parseLand(raw: unknown, map: MapBounds, expansion?: PermitReceipt): LandState {
  if (raw === undefined) return migrateLandFromMap(map, expansion);
  if (!raw || typeof raw !== 'object') return migrateLandFromMap(map, expansion);
  const r = raw as LandState;
  const origin = r.origin;
  if (r.version !== 1 || !origin || !integer(origin.x) || !integer(origin.y)
    || !integer(r.envelopeWidth) || !integer(r.envelopeHeight) || !integer(r.plotSize)
    || r.plotSize < 8 || r.plotSize > 32 || r.envelopeWidth < r.plotSize || r.envelopeHeight < r.plotSize
    || r.envelopeWidth > 256 || r.envelopeHeight > 256
    || r.envelopeWidth % r.plotSize !== 0 || r.envelopeHeight % r.plotSize !== 0
    || origin.x > map.x || origin.y > map.y
    || origin.x + r.envelopeWidth < map.x + map.width || origin.y + r.envelopeHeight < map.y + map.height
    || !Array.isArray(r.owned) || !integer(r.freeUnlocks) || r.freeUnlocks < 0 || r.freeUnlocks > 64
    || !integer(r.purchased) || r.purchased < 0 || r.purchased > 128 || typeof r.briefingSeen !== 'boolean') {
    return migrateLandFromMap(map, expansion);
  }
  const count = (r.envelopeWidth / r.plotSize) * (r.envelopeHeight / r.plotSize);
  if (r.owned.length < 1 || r.owned.length > count || r.owned.some(id => !integer(id) || id < 0 || id >= count)
    || new Set(r.owned).size !== r.owned.length) return migrateLandFromMap(map, expansion);
  return {
    version: 1,
    envelopeWidth: r.envelopeWidth,
    envelopeHeight: r.envelopeHeight,
    plotSize: r.plotSize,
    origin: { x: origin.x, y: origin.y },
    owned: [...r.owned].sort((a, b) => a - b),
    freeUnlocks: r.freeUnlocks,
    purchased: r.purchased,
    briefingSeen: r.briefingSeen,
  };
}

export function plotPrice(land: LandState, _id = 0): number {
  if (land.freeUnlocks > 0) return 0;
  return PLOT_BASE_PRICE + PLOT_PRICE_STEP * Math.max(0, land.purchased - 2);
}

export function plotsShareEdge(land: LandState, a: number, b: number): boolean {
  return plotsAdjacent(land, a, b);
}

export function connectionBlockedPlot(land: LandState, id: number, edge: ExpansionDirection | null, gateway: Point | null): boolean {
  if (!edge || !gateway) return false;
  const r = plotRect(land, id);
  if (edge === 'west') return r.x + r.width - 1 < gateway.x;
  if (edge === 'east') return r.x > gateway.x;
  if (edge === 'north') return r.y + r.height - 1 < gateway.y;
  return r.y > gateway.y;
}

export function purchasablePlots(land: LandState, edge: ExpansionDirection | null = null, gateway: Point | null = null): number[] {
  const ids: number[] = [];
  const count = plotCount(land);
  for (let id = 0; id < count; id++) {
    if (plotOwned(land, id) || connectionBlockedPlot(land, id, edge, gateway)) continue;
    if (land.owned.some(owned => plotsAdjacent(land, owned, id))) ids.push(id);
  }
  return ids;
}

/** 2×2 tile board in the plot centre; pan across the rest of the plot does not buy. */
export function plotSignTiles(land: LandState, id: number): Point[] {
  const r = plotRect(land, id);
  const x = r.x + Math.floor(r.width / 2) - 1;
  const y = r.y + Math.floor(r.height / 2) - 1;
  return [{ x, y }, { x: x + 1, y }, { x, y: y + 1 }, { x: x + 1, y: y + 1 }];
}

export function plotIdForSignTile(land: LandState, p: Point, purchasable: number[]): number | null {
  const id = plotIdAt(land, p);
  return id !== null && purchasable.includes(id) ? id : null;
}

export function adjacentPlotInDirection(land: LandState, direction: ExpansionDirection, edge: ExpansionDirection | null = null, gateway: Point | null = null): number | null {
  const open = purchasablePlots(land, edge, gateway);
  if (!open.length) return null;
  const box = ownedPlotBounds(land);
  if (!box) return open[0];
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  let best: number | null = null, score = Infinity;
  for (const id of open) {
    const r = plotRect(land, id);
    const px = r.x + r.width / 2, py = r.y + r.height / 2;
    const aligned = direction === 'east' ? px > cx : direction === 'west' ? px < cx : direction === 'south' ? py > cy : py < cy;
    if (!aligned) continue;
    const d = Math.abs(px - cx) + Math.abs(py - cy);
    if (d < score) { score = d; best = id; }
  }
  return best;
}

export function growMapToPlots(map: MapBounds, land: LandState): MapBounds {
  const box = ownedPlotBounds(land);
  if (!box) return map;
  const x = Math.min(map.x, box.x);
  const y = Math.min(map.y, box.y);
  return {
    x, y,
    width: Math.max(map.x + map.width, box.x + box.width) - x,
    height: Math.max(map.y + map.height, box.y + box.height) - y,
  };
}

/** Tests and challenge fixtures often enlarge `city.map` without plot records. */
export function tileOwned(land: LandState | undefined, map: MapBounds, p: Point): boolean {
  if (!land) return containsTile(map, p);
  if (tileOwnedByLand(land, p)) return true;
  const plotsBox = ownedPlotBounds(land);
  if (!plotsBox) return containsTile(map, p);
  if (map.x !== plotsBox.x || map.y !== plotsBox.y || map.width !== plotsBox.width || map.height !== plotsBox.height)
    return containsTile(map, p);
  return false;
}
