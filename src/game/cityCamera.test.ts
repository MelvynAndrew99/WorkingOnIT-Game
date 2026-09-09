import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clampCamera, MAX_ZOOM, MIN_ZOOM, panCamera, screenToWorld, worldToScreen, zoomCamera } from './cityCamera.ts';
import type { Point } from './cityCamera.ts';

const viewport = { x: 16, y: 150, width: 688, height: 620 };
function close(actual: Point, expected: Point): void {
  assert.ok(Math.abs(actual.x - expected.x) < 1e-9, `${actual.x} != ${expected.x}`);
  assert.ok(Math.abs(actual.y - expected.y) < 1e-9, `${actual.y} != ${expected.y}`);
}

test('camera transforms roundtrip at signed world positions and offset viewports', () => {
  for (const zoom of [MIN_ZOOM, 1, 1.75, MAX_ZOOM]) {
    const camera = { x: -7.5, y: 4.25, zoom };
    for (const point of [{ x: -16, y: -8 }, { x: 0, y: 0 }, { x: 48.5, y: 37.5 }]) {
      close(screenToWorld(camera, viewport, worldToScreen(camera, viewport, point)), point);
    }
    close(worldToScreen(camera, viewport, camera), { x: 360, y: 460 });
  }
});

test('pan carries the world with the pointer at each zoom and reverses without drift', () => {
  for (const zoom of [MIN_ZOOM, 1, MAX_ZOOM]) {
    const camera = { x: -4, y: -3, zoom };
    const world = { x: -2.5, y: 7 };
    const before = worldToScreen(camera, viewport, world);
    panCamera(camera, viewport, 73, -41);
    close(worldToScreen(camera, viewport, world), { x: before.x + 73, y: before.y - 41 });
    panCamera(camera, viewport, -73, 41);
    close(camera, { x: -4, y: -3 });
  }
});

test('anchored zoom preserves world position, reverses, and honors limits', () => {
  const camera = { x: -8, y: 4, zoom: 1 };
  const anchor = { x: 127, y: 630 };
  const world = screenToWorld(camera, viewport, anchor);
  for (const zoom of [2.5, 100, 0.01, 1]) {
    zoomCamera(camera, viewport, zoom, anchor);
    close(screenToWorld(camera, viewport, anchor), world);
    assert.equal(camera.zoom, Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)));
  }
  close(camera, { x: -8, y: 4 });
  zoomCamera(camera, viewport, 2);
  close(camera, { x: -8, y: 4 });
});

test('clamping uses signed map edges without shifting valid focus or changing zoom', () => {
  const map = { x: -16, y: -8, width: 32, height: 22 };
  const camera = { x: -200, y: 200, zoom: 2 };
  clampCamera(camera, map);
  assert.deepEqual(camera, { x: -16, y: 14, zoom: 2 });
  camera.x = 200; camera.y = -200;
  clampCamera(camera, map);
  assert.deepEqual(camera, { x: 16, y: -8, zoom: 2 });
  camera.x = -3.5; camera.y = -2;
  clampCamera(camera, map);
  assert.deepEqual(camera, { x: -3.5, y: -2, zoom: 2 });
});
