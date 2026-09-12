/**
 * Visual weather only. Atmosphere is a function of saved simulation elapsed
 * time so pause and reload keep the same sky. It does not change traffic,
 * demand, economy, missions or the city save.
 */
import type { MapBounds } from './cityMap.ts';
import type { Camera, Viewport } from './cityCamera.ts';

export const WEATHER_PREF_KEY = 'working-on-it:weather';

export type WeatherKind = 'clear' | 'cloudy' | 'rain';
export interface WeatherPhase { kind: WeatherKind; duration: number; intensity: number }

/**
 * A ~20 minute run of uneven fronts rather than a metronome. Durations and
 * intensities vary so no two build-ups read the same, consecutive rain phases
 * let a shower swell into a downpour and ease off again, and clear spells
 * still hold the largest share of the clock.
 */
const PHASES: WeatherPhase[] = [
    { kind: 'clear', duration: 110, intensity: 0 },
    { kind: 'cloudy', duration: 50, intensity: 0.4 },
    { kind: 'clear', duration: 45, intensity: 0 },
    { kind: 'cloudy', duration: 55, intensity: 0.85 },
    { kind: 'rain', duration: 70, intensity: 0.55 },
    { kind: 'cloudy', duration: 45, intensity: 0.6 },
    { kind: 'clear', duration: 130, intensity: 0 },
    { kind: 'cloudy', duration: 40, intensity: 0.3 },
    { kind: 'clear', duration: 85, intensity: 0 },
    { kind: 'cloudy', duration: 60, intensity: 0.95 },
    { kind: 'rain', duration: 50, intensity: 0.8 },
    { kind: 'rain', duration: 55, intensity: 1 },
    { kind: 'rain', duration: 45, intensity: 0.45 },
    { kind: 'cloudy', duration: 70, intensity: 0.45 },
    { kind: 'clear', duration: 150, intensity: 0 },
    { kind: 'cloudy', duration: 45, intensity: 0.55 },
    { kind: 'rain', duration: 60, intensity: 0.7 },
    { kind: 'cloudy', duration: 55, intensity: 0.35 },
];

/** Longest crossfade, and the share of a short phase it may consume. */
const FADE_SECONDS = 22;
const FADE_FRACTION = 0.4;

export const WEATHER_CYCLE = {
    periodSeconds: PHASES.reduce((total, phase) => total + phase.duration, 0),
    fadeSeconds: FADE_SECONDS,
    phases: PHASES,
} as const;

/** Rain is a screen-space overlay, so these are screen pixels per second. */
export const MAX_RAIN_STREAKS = 260;
export const RAIN_FALL_SPEED = 700;
export const RAIN_FALL_SPEED_RANGE = 520;
/** One streak per this many screen pixels of visible map at full intensity. */
const RAIN_SCREEN_AREA_PER_STREAK = 2300;
export const RAIN_SLANT = 0.26;
const RAIN_LENGTH = 16;
const RAIN_LENGTH_RANGE = 30;
/** Two depth layers: a faint distant sheet and fewer bright near streaks. */
const NEAR_LAYER_DEPTH = 1;
const FAR_LAYER_DEPTH = 0.62;

/**
 * Patches are large translucent fills, so their count and ring count are the
 * whole overdraw budget for weather: eight two-ring patches is about one
 * screen of extra fill, and heavy rain drops them entirely.
 */
export const MAX_CLOUD_SHADOWS = 8;
const CLOUD_SHADOW_RINGS = [1, 0.62];
const CLOUD_RAIN_CUTOFF = 0.5;
/** Shared so the whole patch field is one translation, not per-blob motion. */
const CLOUD_DRIFT_SPEED = 16;
const CLOUD_DRIFT_RANGE = 30;

const SHADE_AT_FULL_COVER = 0.34;
const CLOUDY_COLOR = 0x2a3a52;
const RAIN_COLOR = 0x141d2e;

export type PixelRect = { x: number; y: number; width: number; height: number };
export interface RainStreak { x: number; y: number; dx: number; dy: number; layer: 0 | 1 }
export interface CloudShadow { x: number; y: number; rx: number; ry: number; alpha: number }
export interface WeatherWeights { clear: number; cloudy: number; rain: number }
export interface WeatherSnapshot {
    kind: WeatherKind;
    weights: WeatherWeights;
    /** Overcast fraction, 0 open sky to 1 fully socked in. */
    cloudCover: number;
    rainIntensity: number;
    shadeAlpha: number;
    shadeColor: number;
    cycleSeconds: number;
}
export interface WeatherViewInput {
    elapsed: number;
    enabled: boolean;
    reducedMotion: boolean;
    map: MapBounds;
    camera: Camera;
    viewport: Viewport;
    tileSize: number;
}
/**
 * Rain and cloud shadow are static tiles plus a scroll offset: the renderer
 * builds the geometry once and animates it by moving it, so a downpour costs
 * a transform per frame instead of re-tessellating hundreds of shapes.
 */
export interface WeatherFrame {
    shade: { x: number; y: number; width: number; height: number; color: number; alpha: number } | null;
    clouds: CloudShadow[];
    /** Pattern width; the renderer repeats the field at +cloudSpan to wrap. */
    cloudSpan: number;
    cloudScroll: number;
    cloudColor: number;
    rain: RainStreak[];
    /** Pattern height; the renderer repeats the tile at +rainTile to wrap. */
    rainTile: number;
    /** Downward scroll per depth layer, already wrapped into [0, rainTile). */
    rainScroll: [number, number];
    rainAlpha: number;
    rainWidth: number;
    rainMotion: boolean;
    /** Everything weather draws is masked to this rectangle. */
    clip: PixelRect | null;
}

export function wrapCycleTime(elapsed: number, period = WEATHER_CYCLE.periodSeconds): number {
    if (!Number.isFinite(elapsed)) return 0;
    const periodSeconds = period > 0 ? period : 1;
    return ((elapsed % periodSeconds) + periodSeconds) % periodSeconds;
}

function mixColor(a: number, b: number, t: number): number {
    const u = t < 0 ? 0 : t > 1 ? 1 : t;
    const mix = (shift: number) => {
        const av = (a >> shift) & 255, bv = (b >> shift) & 255;
        return Math.round(av + (bv - av) * u);
    };
    return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

/** Eased crossfade so a front arrives and settles instead of ramping linearly. */
function smoothstep(t: number): number {
    const u = t < 0 ? 0 : t > 1 ? 1 : t;
    return u * u * (3 - 2 * u);
}

interface Sky { cloud: number; rain: number }

/** Rain always carries heavy cover, so a shower never looks like open sky. */
function skyOf(phase: WeatherPhase): Sky {
    if (phase.kind === 'clear') return { cloud: 0, rain: 0 };
    if (phase.kind === 'cloudy') return { cloud: phase.intensity, rain: 0 };
    return { cloud: 0.62 + 0.38 * phase.intensity, rain: phase.intensity };
}

function fadeOf(phase: WeatherPhase): number {
    return Math.min(FADE_SECONDS, phase.duration * FADE_FRACTION);
}

/** Reported condition is read off the sky itself, not off the authored phase. */
function kindOf(sky: Sky): WeatherKind {
    if (sky.rain > 0.08) return 'rain';
    if (sky.cloud > 0.22) return 'cloudy';
    return 'clear';
}

function snapshotOf(sky: Sky): WeatherSnapshot {
    const cloudy = sky.cloud * (1 - sky.rain);
    return {
        kind: kindOf(sky),
        weights: { clear: 1 - sky.rain - cloudy, cloudy, rain: sky.rain },
        cloudCover: sky.cloud,
        rainIntensity: sky.rain,
        shadeAlpha: sky.cloud * SHADE_AT_FULL_COVER,
        shadeColor: mixColor(CLOUDY_COLOR, RAIN_COLOR, sky.rain),
        cycleSeconds: WEATHER_CYCLE.periodSeconds,
    };
}

/** Deterministic sky at a simulation clock. Reloads with the same elapsed match. */
export function weatherSnapshot(elapsed: number): WeatherSnapshot {
    const t = wrapCycleTime(elapsed);
    let acc = 0;
    for (let i = 0; i < PHASES.length; i++) {
        const phase = PHASES[i];
        if (t >= acc + phase.duration && i < PHASES.length - 1) { acc += phase.duration; continue; }
        const local = Math.min(phase.duration, Math.max(0, t - acc));
        const fade = fadeOf(phase);
        const sky = skyOf(phase);
        if (fade > 0 && local > phase.duration - fade) {
            const next = skyOf(PHASES[(i + 1) % PHASES.length]);
            const u = smoothstep((local - (phase.duration - fade)) / fade);
            return snapshotOf({ cloud: sky.cloud + (next.cloud - sky.cloud) * u, rain: sky.rain + (next.rain - sky.rain) * u });
        }
        return snapshotOf(sky);
    }
    return snapshotOf({ cloud: 0, rain: 0 });
}

export function weatherHudLabel(elapsed: number, enabled = true): string {
    if (!enabled) return 'Off';
    const snap = weatherSnapshot(elapsed);
    if (snap.rainIntensity >= 0.85) return 'Storm';
    if (snap.rainIntensity >= 0.5) return 'Rain';
    if (snap.rainIntensity > 0.08) return 'Showers';
    if (snap.cloudCover >= 0.62) return 'Overcast';
    if (snap.cloudCover > 0.22) return 'Cloudy';
    return 'Clear';
}

export function readWeatherPreference(storage?: { getItem(key: string): string | null }): boolean {
    try {
        const source = storage ?? globalThis.localStorage;
        return source?.getItem(WEATHER_PREF_KEY) !== 'false';
    } catch {
        return true;
    }
}

export function writeWeatherPreference(enabled: boolean, storage?: { setItem(key: string, value: string): void }): void {
    try {
        (storage ?? globalThis.localStorage)?.setItem(WEATHER_PREF_KEY, String(enabled));
    } catch { /* Session preference still works. */ }
}

export function prefersReducedMotion(): boolean {
    try {
        return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    } catch {
        return false;
    }
}

export function mapPixelRect(map: MapBounds, tileSize: number): PixelRect {
    return { x: map.x * tileSize, y: map.y * tileSize, width: map.width * tileSize, height: map.height * tileSize };
}

export function visibleWorldPixelRect(camera: Camera, viewport: Viewport, tileSize: number, marginPx = tileSize): PixelRect {
    const zoom = camera.zoom > 0 ? camera.zoom : 1;
    const width = viewport.width / zoom;
    const height = viewport.height / zoom;
    return {
        x: camera.x * tileSize - width / 2 - marginPx,
        y: camera.y * tileSize - height / 2 - marginPx,
        width: width + marginPx * 2,
        height: height + marginPx * 2,
    };
}

export function intersectRects(a: PixelRect, b: PixelRect): PixelRect | null {
    const x = Math.max(a.x, b.x);
    const y = Math.max(a.y, b.y);
    const right = Math.min(a.x + a.width, b.x + b.width);
    const bottom = Math.min(a.y + a.height, b.y + b.height);
    if (right <= x || bottom <= y) return null;
    return { x, y, width: right - x, height: bottom - y };
}

function unit(seed: number): number {
    let t = seed | 0;
    t = Math.imul(t ^ (t >>> 16), 2246822519);
    t = Math.imul(t ^ (t >>> 13), 3266489917);
    return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}

function wrap(value: number, span: number): number {
    if (span <= 0) return 0;
    return ((value % span) + span) % span;
}

/** Downward scroll of each depth layer, wrapped into the tile height. */
export function rainScrollOffsets(opts: {
    intensity: number;
    elapsed: number;
    reducedMotion: boolean;
    zoom: number;
    tileHeight: number;
}): [number, number] {
    if (opts.reducedMotion || opts.intensity <= 0) return [0, 0];
    const speed = (layer: number) =>
        (RAIN_FALL_SPEED + RAIN_FALL_SPEED_RANGE * opts.intensity) * (layer === 1 ? NEAR_LAYER_DEPTH : FAR_LAYER_DEPTH) / opts.zoom;
    return [wrap(opts.elapsed * speed(0), opts.tileHeight), wrap(opts.elapsed * speed(1), opts.tileHeight)];
}

/**
 * A motionless tile of dashes covering the visible map. Dashes are sized in
 * screen pixels and converted to world pixels, so rain reads the same at every
 * zoom instead of thinning out when the camera pulls back. Count follows the
 * visible area; MAX_RAIN_STREAKS caps a tile's line segments.
 */
export function planRainStreaks(opts: {
    map: PixelRect;
    visible: PixelRect;
    intensity: number;
    zoom?: number;
}): RainStreak[] {
    if (opts.intensity <= 0) return [];
    const area = intersectRects(opts.map, opts.visible);
    if (!area || area.width <= 0 || area.height <= 0) return [];
    const zoom = opts.zoom && opts.zoom > 0 ? opts.zoom : 1;
    const screenArea = area.width * area.height * zoom * zoom;
    const density = (0.3 + 0.7 * opts.intensity) * screenArea / RAIN_SCREEN_AREA_PER_STREAK;
    const count = Math.max(1, Math.min(MAX_RAIN_STREAKS, Math.round(density)));
    const streaks: RainStreak[] = [];
    for (let i = 0; i < count; i++) {
        // Two in every five dashes are near-camera: brighter, longer, faster.
        const layer: 0 | 1 = i % 5 < 2 ? 1 : 0;
        const depth = layer === 1 ? NEAR_LAYER_DEPTH : FAR_LAYER_DEPTH;
        const length = (RAIN_LENGTH + RAIN_LENGTH_RANGE * opts.intensity) * depth
            * (0.8 + 0.4 * unit(i * 3 + 61)) / zoom;
        streaks.push({
            x: area.x + unit(i * 2 + 17) * area.width,
            y: area.y + unit(i * 2 + 31) * area.height,
            dx: RAIN_SLANT * length,
            dy: length,
            layer,
        });
    }
    return streaks;
}

/**
 * A motionless field of shadow patches under broken cloud. Every patch drifts
 * at one shared speed, so the renderer scrolls the whole field as a unit. They
 * fade out under heavy rain, where the sky is uniformly overcast and a flat
 * wash reads better.
 */
export function planCloudShadows(opts: {
    map: PixelRect;
    visible: PixelRect;
    cloudCover: number;
    rainIntensity: number;
}): CloudShadow[] {
    if (opts.cloudCover <= 0.05 || opts.rainIntensity > CLOUD_RAIN_CUTOFF) return [];
    const patchiness = 1 - opts.rainIntensity / CLOUD_RAIN_CUTOFF;
    if (patchiness <= 0.05) return [];
    const area = intersectRects(opts.map, opts.visible);
    if (!area || area.width <= 0 || area.height <= 0) return [];
    const count = Math.max(1, Math.min(MAX_CLOUD_SHADOWS, Math.round(3 + 5 * opts.cloudCover)));
    const shadows: CloudShadow[] = [];
    for (let i = 0; i < count; i++) {
        const rx = 150 + 170 * unit(i * 5 + 7);
        shadows.push({
            x: area.x + unit(i * 5 + 23) * area.width,
            y: area.y + unit(i * 5 + 37) * area.height,
            rx,
            ry: rx * (0.42 + 0.22 * unit(i * 5 + 13)),
            alpha: (0.07 + 0.15 * opts.cloudCover) * patchiness * (0.6 + 0.4 * unit(i * 5 + 41)),
        });
    }
    return shadows;
}

export function planWeatherFrame(input: WeatherViewInput): WeatherFrame {
    const empty: WeatherFrame = {
        shade: null, clouds: [], cloudSpan: 0, cloudScroll: 0, cloudColor: CLOUDY_COLOR,
        rain: [], rainTile: 0, rainScroll: [0, 0], rainAlpha: 0, rainWidth: 1, rainMotion: false, clip: null,
    };
    if (!input.enabled) return empty;
    const snap = weatherSnapshot(input.elapsed);
    const zoom = input.camera.zoom > 0 ? input.camera.zoom : 1;
    const mapPx = mapPixelRect(input.map, input.tileSize);
    const visible = visibleWorldPixelRect(input.camera, input.viewport, input.tileSize);
    const area = intersectRects(mapPx, visible);
    const rain = planRainStreaks({ map: mapPx, visible, intensity: snap.rainIntensity, zoom });
    const rainTile = area ? area.height : 0;
    const cloudSpan = area ? area.width : 0;
    const cloudDrift = CLOUD_DRIFT_SPEED + CLOUD_DRIFT_RANGE * snap.cloudCover;
    return {
        shade: snap.shadeAlpha <= 0.002 ? null : { ...mapPx, color: snap.shadeColor, alpha: snap.shadeAlpha },
        clouds: planCloudShadows({
            map: mapPx, visible, cloudCover: snap.cloudCover, rainIntensity: snap.rainIntensity,
        }),
        cloudSpan,
        cloudScroll: input.reducedMotion || cloudSpan <= 0 ? 0 : wrap(input.elapsed * cloudDrift, cloudSpan),
        cloudColor: snap.shadeColor,
        rain,
        rainTile,
        rainScroll: rainTile > 0
            ? rainScrollOffsets({
                intensity: snap.rainIntensity, elapsed: input.elapsed,
                reducedMotion: input.reducedMotion, zoom, tileHeight: rainTile,
            })
            : [0, 0],
        rainAlpha: 0.3 + 0.36 * snap.rainIntensity,
        // Constant on-screen thickness regardless of camera zoom.
        rainWidth: 1.3 / zoom,
        rainMotion: !input.reducedMotion && snap.rainIntensity > 0,
        clip: mapPx,
    };
}

export { CLOUD_SHADOW_RINGS };
