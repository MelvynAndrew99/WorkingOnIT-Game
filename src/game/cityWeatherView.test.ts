import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Container, Graphics } from 'pixi.js';
import { createCityWeatherView } from './cityWeatherView.ts';
import { MAX_ZOOM, MIN_ZOOM, TILE_SIZE, screenToWorld } from './cityCamera.ts';
import {
    MAX_RAIN_STREAKS,
    RAIN_SLANT,
    intersectRects,
    mapPixelRect,
    planRainStreaks,
    planWeatherFrame,
    visibleWorldPixelRect,
} from './cityWeather.ts';

const tileSize = TILE_SIZE;
const viewport = { x: 14, y: 200, width: 692, height: 600 };

test('a falling downpour animates by transform, redraws on resize and releases graphics', () => {
    const shade = new Container(), rain = new Container();
    const view = createCityWeatherView({ shade, rain, tileSize });
    const input = { elapsed: 760, enabled: true, reducedMotion: false,
        map: { x: 0, y: 0, width: 64, height: 64 },
        camera: { x: 20, y: 20, zoom: 1 }, viewport };
    view.sync(input);
    const near = (rain.children[0] as Container).children[1] as Graphics;
    const original = near.context.instructions[0];
    const wasAt = near.y;
    view.sync({ ...input, elapsed: 760.1 });
    assert.equal(near.context.instructions[0], original, 'falling rain reuses its geometry');
    assert.notEqual(near.y, wasAt, 'it moves instead');
    view.sync({ ...input, viewport: { ...viewport, height: 350 } });
    assert.notEqual(near.context.instructions[0], original, 'a height change rebuilds the tile');
    view.sync({ ...input, enabled: false });
    assert.equal(near.visible, false);
    assert.equal(shade.children[0].visible, false);
    view.sync(input);
    assert.equal(near.visible, true);
    view.destroy();
    assert.equal(rain.children.length, 0);
    assert.equal(shade.children.length, 0);
    view.destroy();
    view.sync(input);
    assert.equal(rain.children.length, 0);
    shade.destroy(); rain.destroy();
});

test('rain is placed downwind and downwards: the tile scrolls the way dashes point', () => {
    const shade = new Container(), rain = new Container();
    const view = createCityWeatherView({ shade, rain, tileSize });
    const input = { elapsed: 760, enabled: true, reducedMotion: false,
        map: { x: 0, y: 0, width: 64, height: 64 },
        camera: { x: 20, y: 20, zoom: 1 }, viewport };
    view.sync(input);
    const frame = planWeatherFrame({ ...input, tileSize });
    const layerRoot = rain.children[0] as Container;
    for (const layer of [0, 1] as const) {
        const gfx = layerRoot.children[layer] as Graphics;
        const scroll = frame.rainScroll[layer];
        assert.ok(scroll > 0, 'the sheet is moving');
        // A dash points down-right (dx, dy both positive), so the tile that
        // carries it must travel down-right by the same slant.
        assert.ok(Math.abs(gfx.y - (scroll - frame.rainTile)) < 1e-6, 'tile falls by its scroll');
        assert.ok(Math.abs(gfx.x - scroll * RAIN_SLANT) < 1e-6, 'and drifts along the slant');
        assert.ok(frame.rain.every(s => s.layer !== layer || (s.dx > 0 && s.dy > 0)));
        // Two tiles one apart always cover the visible band, so no seam shows.
        assert.ok(gfx.y <= 0 && gfx.y + 2 * frame.rainTile >= frame.rainTile);
    }
    view.destroy(); shade.destroy(); rain.destroy();
});

test('shade covers the full map rectangle rather than scanning tiles or only the viewport', () => {
    const map = { x: -8, y: -8, width: 64, height: 64 };
    const frame = planWeatherFrame({
        elapsed: 760,
        enabled: true,
        reducedMotion: true,
        map,
        camera: { x: 0, y: 0, zoom: 2 },
        viewport,
        tileSize,
    });
    assert.ok(frame.shade);
    assert.deepEqual(
        { x: frame.shade.x, y: frame.shade.y, width: frame.shade.width, height: frame.shade.height },
        mapPixelRect(map, tileSize),
    );
    assert.equal(frame.shade.width, 64 * tileSize);
    assert.equal(frame.shade.height, 64 * tileSize);
});

test('the rain tile is bounded and sits inside the visible map even on a 64x64 town', () => {
    const map = { x: 0, y: 0, width: 64, height: 64 };
    const camera = { x: 10, y: 8, zoom: 1 };
    const visible = visibleWorldPixelRect(camera, viewport, tileSize);
    const mapPx = mapPixelRect(map, tileSize);
    const area = intersectRects(mapPx, visible);
    assert.ok(area);
    const streaks = planRainStreaks({ map: mapPx, visible, intensity: 1, zoom: camera.zoom });
    assert.ok(streaks.length > 0);
    assert.ok(streaks.length <= MAX_RAIN_STREAKS);
    for (const streak of streaks) {
        assert.ok(streak.x >= area.x - 1e-6 && streak.x <= area.x + area.width + 1e-6);
        assert.ok(streak.y >= area.y - 1e-6 && streak.y <= area.y + area.height + 1e-6);
    }
    const wide = planRainStreaks({ map: mapPx, visible: mapPx, intensity: 1 });
    assert.ok(wide.length <= MAX_RAIN_STREAKS);
});

test('visible weather coverage follows pan and zoom using the existing camera math', () => {
    const camera = { x: -4, y: 3, zoom: 1 };
    const rect = visibleWorldPixelRect(camera, viewport, tileSize, 0);
    const topLeft = screenToWorld(camera, viewport, { x: viewport.x, y: viewport.y });
    assert.ok(Math.abs(rect.x - topLeft.x * tileSize) < 1e-6);
    assert.ok(Math.abs(rect.y - topLeft.y * tileSize) < 1e-6);
    const zoomed = { ...camera, zoom: MAX_ZOOM };
    const tight = visibleWorldPixelRect(zoomed, viewport, tileSize, 0);
    assert.ok(tight.width < rect.width);
    const overview = visibleWorldPixelRect({ ...camera, zoom: MIN_ZOOM }, viewport, tileSize, 0);
    assert.ok(overview.width > rect.width);
});

test('turning weather off at a raining clock clears the draw plan used by the view', () => {
    const raining = planWeatherFrame({
        elapsed: 760,
        enabled: true,
        reducedMotion: false,
        map: { x: 0, y: 0, width: 16, height: 14 },
        camera: { x: 8, y: 7, zoom: 1 },
        viewport,
        tileSize,
    });
    const off = planWeatherFrame({
        elapsed: 760,
        enabled: false,
        reducedMotion: false,
        map: { x: 0, y: 0, width: 16, height: 14 },
        camera: { x: 8, y: 7, zoom: 1 },
        viewport,
        tileSize,
    });
    assert.ok(raining.rain.length > 0);
    assert.ok(raining.shade);
    assert.equal(off.shade, null);
    assert.deepEqual(off.rain, []);
    assert.equal(off.rainMotion, false);
});

test('reduced-motion rain is a static atmosphere, not a moving overlay', () => {
    const input = {
        elapsed: 745,
        enabled: true,
        reducedMotion: true,
        map: { x: 0, y: 0, width: 16, height: 14 },
        camera: { x: 8, y: 7, zoom: 1 },
        viewport,
        tileSize,
    };
    const a = planWeatherFrame(input);
    const b = planWeatherFrame({ ...input, elapsed: 752 });
    assert.equal(a.rainMotion, false);
    assert.deepEqual(a.rain, b.rain);
    assert.deepEqual(a.rainScroll, [0, 0]);
    assert.deepEqual(b.rainScroll, [0, 0]);
});
