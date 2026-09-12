import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    WEATHER_CYCLE,
    WEATHER_PREF_KEY,
    planWeatherFrame,
    readWeatherPreference,
    weatherHudLabel,
    weatherSnapshot,
    wrapCycleTime,
    writeWeatherPreference,
    type WeatherViewInput,
} from './cityWeather.ts';

const camera = { x: 8, y: 7, zoom: 1 };
const viewport = { x: 0, y: 0, width: 480, height: 384 };
const map = { x: 0, y: 0, width: 16, height: 14 };
const tileSize = 48;

/** Sample clocks inside the authored schedule, not on a phase boundary. */
const CLEAR = 60, CLOUDY = 130, OVERCAST = 220, SHOWER = 290, RAIN = 700, STORM = 760;

function frame(partial: Partial<WeatherViewInput> = {}): ReturnType<typeof planWeatherFrame> {
    return planWeatherFrame({
        elapsed: 0,
        enabled: true,
        reducedMotion: false,
        map,
        camera,
        viewport,
        tileSize,
        ...partial,
    });
}

function weightSum(elapsed: number): number {
    const w = weatherSnapshot(elapsed).weights;
    return w.clear + w.cloudy + w.rain;
}

test('a new city starts clear with no rain or shade', () => {
    const snap = weatherSnapshot(0);
    assert.equal(snap.kind, 'clear');
    assert.equal(snap.rainIntensity, 0);
    assert.equal(snap.cloudCover, 0);
    assert.equal(snap.shadeAlpha, 0);
    assert.equal(weatherHudLabel(0), 'Clear');
    assert.equal(frame().shade, null);
    assert.equal(frame().rain.length, 0);
    assert.equal(frame().clouds.length, 0);
});

test('the same elapsed time always yields the same sky, including after a simulated reload', () => {
    for (const elapsed of [0, 37.25, 119.9, 200, 359.7, 720.4]) {
        assert.deepEqual(weatherSnapshot(elapsed), weatherSnapshot(elapsed));
        assert.deepEqual(frame({ elapsed }), frame({ elapsed }));
        // A whole period later is the same sky, within float wrap error.
        const looped = weatherSnapshot(elapsed + WEATHER_CYCLE.periodSeconds);
        const here = weatherSnapshot(elapsed);
        assert.equal(looped.kind, here.kind);
        assert.ok(Math.abs(looped.shadeAlpha - here.shadeAlpha) < 1e-6);
        assert.ok(Math.abs(looped.rainIntensity - here.rainIntensity) < 1e-6);
    }
});

test('negative and non-finite clocks wrap or fall back without throwing', () => {
    assert.equal(wrapCycleTime(-1), WEATHER_CYCLE.periodSeconds - 1);
    assert.equal(weatherSnapshot(-20).kind, weatherSnapshot(WEATHER_CYCLE.periodSeconds - 20).kind);
    assert.equal(weatherSnapshot(Number.NaN).kind, 'clear');
    assert.equal(weatherSnapshot(Number.POSITIVE_INFINITY).kind, 'clear');
});

test('the schedule is an uneven run of fronts, not a repeating metronome', () => {
    const phases = WEATHER_CYCLE.phases;
    assert.ok(WEATHER_CYCLE.periodSeconds > 900, 'a loop long enough not to feel timed');
    assert.ok(new Set(phases.map(p => p.duration)).size >= 8, 'phase lengths vary');
    const rain = phases.filter(p => p.kind === 'rain');
    assert.ok(new Set(rain.map(p => p.intensity)).size >= 3, 'showers and downpours differ');
    for (let i = 1; i < phases.length; i++) {
        if (phases[i].kind === 'rain' && phases[i - 1].kind === 'rain') continue;
        assert.notEqual(phases[i].kind, phases[i - 1].kind, 'no phase repeats itself except swelling rain');
    }
    const share = (kind: string) =>
        phases.filter(p => p.kind === kind).reduce((t, p) => t + p.duration, 0) / WEATHER_CYCLE.periodSeconds;
    assert.ok(share('clear') > share('rain'), 'clear weather still dominates the clock');
    assert.ok(share('rain') > 0.15, 'rain is a real part of the loop, not a rumour');
});

test('conditions are reported at the strength the player can see', () => {
    assert.equal(weatherHudLabel(CLEAR), 'Clear');
    assert.equal(weatherHudLabel(CLOUDY), 'Cloudy');
    assert.equal(weatherHudLabel(OVERCAST), 'Overcast');
    assert.equal(weatherHudLabel(SHOWER), 'Rain');
    assert.equal(weatherHudLabel(STORM), 'Storm');
    assert.ok(weatherSnapshot(STORM).rainIntensity > weatherSnapshot(SHOWER).rainIntensity);
    assert.ok(weatherSnapshot(STORM).shadeAlpha > weatherSnapshot(CLOUDY).shadeAlpha);
});

test('phase holds and eased blends keep weights on a unit simplex', () => {
    assert.equal(weatherSnapshot(CLEAR).kind, 'clear');
    assert.equal(weatherSnapshot(CLOUDY).kind, 'cloudy');
    assert.equal(weatherSnapshot(RAIN).kind, 'rain');
    assert.ok(weatherSnapshot(STORM).rainIntensity > 0.9);
    const fade = weatherSnapshot(100);
    assert.ok(fade.weights.clear > 0 && fade.weights.cloudy > 0);
    assert.ok(fade.weights.rain < 1e-9);
    const rainFade = weatherSnapshot(320);
    assert.ok(rainFade.weights.cloudy > 0 && rainFade.weights.rain > 0);
    for (let t = 0; t <= WEATHER_CYCLE.periodSeconds; t += 2) {
        const sum = weightSum(t);
        assert.ok(Math.abs(sum - 1) < 1e-9, `weights at ${t}s sum to ${sum}`);
        const snap = weatherSnapshot(t);
        assert.ok(snap.weights.clear >= -1e-9 && snap.weights.cloudy >= -1e-9 && snap.weights.rain >= -1e-9);
        assert.ok(snap.shadeAlpha >= 0 && snap.shadeAlpha <= 0.35);
        assert.ok(snap.rainIntensity >= 0 && snap.rainIntensity <= 1);
        assert.ok(snap.cloudCover >= 0 && snap.cloudCover <= 1);
    }
});

test('shade changes continuously; there is no lightning spike', () => {
    let previous = weatherSnapshot(0).shadeAlpha;
    let maxStep = 0;
    for (let t = 0.5; t <= WEATHER_CYCLE.periodSeconds; t += 0.5) {
        const alpha = weatherSnapshot(t).shadeAlpha;
        maxStep = Math.max(maxStep, Math.abs(alpha - previous));
        previous = alpha;
    }
    assert.ok(maxStep < 0.02, `largest 0.5s shade step ${maxStep}`);
});

test('rain is heavy enough to read, and heavier weather brings more of it', () => {
    const shower = frame({ elapsed: SHOWER });
    const storm = frame({ elapsed: STORM });
    assert.ok(shower.rain.length > 40, `a shower draws ${shower.rain.length} streaks`);
    assert.ok(storm.rain.length > shower.rain.length);
    assert.ok(storm.rainAlpha > shower.rainAlpha);
    assert.ok(storm.shade && storm.shade.alpha > 0.25, 'a storm visibly darkens the map');
    // Both depth layers are present so the sheet is not one flat hatch.
    assert.ok(storm.rain.some(s => s.layer === 0) && storm.rain.some(s => s.layer === 1));
});

test('rain falls fast enough to look like rain', () => {
    // Scroll wraps inside one tile, so measure the speed it implies instead.
    const tile = frame({ elapsed: STORM }).rainTile;
    const step = 0.05;
    const a = frame({ elapsed: STORM }).rainScroll;
    const b = frame({ elapsed: STORM + step }).rainScroll;
    for (const layer of [0, 1] as const) {
        const speed = (((b[layer] - a[layer]) % tile) + tile) % tile / step;
        assert.ok(speed > 600, `layer ${layer} falls at only ${speed.toFixed(0)}px/s`);
    }
    assert.ok(frame({ elapsed: STORM }).rainScroll[1] !== frame({ elapsed: STORM }).rainScroll[0],
        'the two depth layers fall at different speeds');
});

test('weather is clipped to the town, not to the whole canvas', () => {
    const f = frame({ elapsed: STORM });
    assert.deepEqual(f.clip, { x: 0, y: 0, width: map.width * tileSize, height: map.height * tileSize });
});

test('rain keeps its on-screen size and density when the camera zooms', () => {
    const out = frame({ elapsed: STORM, camera: { ...camera, zoom: 0.5 } });
    const inClose = frame({ elapsed: STORM, camera: { ...camera, zoom: 2 } });
    const screenLength = (f: ReturnType<typeof planWeatherFrame>, zoom: number) =>
        Math.hypot(f.rain[0].dx, f.rain[0].dy) * zoom;
    assert.ok(Math.abs(screenLength(out, 0.5) - screenLength(inClose, 2)) < 1e-6);
    assert.ok(Math.abs(out.rainWidth * 0.5 - inClose.rainWidth * 2) < 1e-6);
});

test('broken cloud drifts across the town and gives way to a flat wash in a storm', () => {
    const cloudy = frame({ elapsed: OVERCAST });
    assert.ok(cloudy.clouds.length > 0);
    const later = frame({ elapsed: OVERCAST + 4 });
    assert.deepEqual(later.clouds, cloudy.clouds, 'the patch field itself is a motionless tile');
    assert.notEqual(later.cloudScroll, cloudy.cloudScroll, 'it is animated by scrolling that tile');
    assert.ok(cloudy.cloudScroll >= 0 && cloudy.cloudScroll < cloudy.cloudSpan);
    const storm = frame({ elapsed: STORM });
    const stormAlpha = storm.clouds.reduce((t, c) => t + c.alpha, 0);
    const cloudyAlpha = cloudy.clouds.reduce((t, c) => t + c.alpha, 0);
    assert.ok(stormAlpha < cloudyAlpha, 'heavy rain reads as uniform overcast');
    assert.equal(frame({ elapsed: CLEAR }).clouds.length, 0);
});

test('pause is elapsed-only: a frozen clock does not advance weather', () => {
    const a = weatherSnapshot(SHOWER);
    const b = weatherSnapshot(SHOWER);
    assert.deepEqual(a, b);
    assert.notEqual(weatherSnapshot(SHOWER + 90).kind, a.kind);
});

test('Weather off returns an empty frame even at peak rain and even if elapsed would otherwise animate', () => {
    const raining = frame({ elapsed: STORM, enabled: false, reducedMotion: false });
    assert.equal(raining.shade, null);
    assert.deepEqual(raining.rain, []);
    assert.deepEqual(raining.clouds, []);
    assert.equal(raining.rainAlpha, 0);
    assert.equal(raining.rainMotion, false);
    assert.equal(raining.clip, null);
    assert.equal(weatherHudLabel(STORM, false), 'Off');
});

test('reduced motion keeps static rain atmosphere and does not use the fall clock', () => {
    const moving = frame({ elapsed: STORM, reducedMotion: false });
    const still = frame({ elapsed: STORM, reducedMotion: true });
    const later = frame({ elapsed: STORM + 3, reducedMotion: true });
    assert.ok(moving.rainMotion);
    assert.equal(still.rainMotion, false);
    assert.ok(still.rain.length > 0);
    assert.ok(still.shade && still.shade.alpha > 0);
    assert.deepEqual(still.rainScroll, [0, 0]);
    assert.equal(still.cloudScroll, 0);
    assert.deepEqual(still.rain.map(s => [s.x, s.y]), later.rain.map(s => [s.x, s.y]));
    assert.ok(moving.rainScroll[0] > 0);
});

test('preference defaults on, treats only the string false as off, and round-trips through storage', () => {
    const mem = new Map<string, string>();
    const storage = {
        getItem: (key: string) => mem.get(key) ?? null,
        setItem: (key: string, value: string) => { mem.set(key, value); },
    };
    assert.equal(readWeatherPreference(storage), true);
    writeWeatherPreference(false, storage);
    assert.equal(mem.get(WEATHER_PREF_KEY), 'false');
    assert.equal(readWeatherPreference(storage), false);
    writeWeatherPreference(true, storage);
    assert.equal(readWeatherPreference(storage), true);
    mem.set(WEATHER_PREF_KEY, 'nope');
    assert.equal(readWeatherPreference(storage), true);
});
