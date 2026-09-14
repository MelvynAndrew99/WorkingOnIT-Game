import type { MapBounds } from './cityMap.ts';

/** Camera coordinates are continuous world tiles, independent of sprite dimensions. */
export type Point = { x: number; y: number };
export type Camera = Point & { zoom: number };
export type Viewport = Point & { width: number; height: number };
export const TILE_SIZE = 48;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3;

export function screenToWorld(camera: Camera, viewport: Viewport, point: Point): Point {
  const scale = TILE_SIZE * camera.zoom;
  return {
    x: camera.x + (point.x - viewport.x - viewport.width / 2) / scale,
    y: camera.y + (point.y - viewport.y - viewport.height / 2) / scale,
  };
}

export function worldToScreen(camera: Camera, viewport: Viewport, point: Point): Point {
  const scale = TILE_SIZE * camera.zoom;
  return {
    x: viewport.x + viewport.width / 2 + (point.x - camera.x) * scale,
    y: viewport.y + viewport.height / 2 + (point.y - camera.y) * scale,
  };
}

/** Pointer deltas use stage design units; dragging carries the world with the pointer. */
export function panCamera(camera: Camera, _viewport: Viewport, dx: number, dy: number): void {
  camera.x -= dx / (TILE_SIZE * camera.zoom);
  camera.y -= dy / (TILE_SIZE * camera.zoom);
}

/** Keep the world point under the anchor stationary, including at zoom limits. */
export function zoomCamera(camera: Camera, viewport: Viewport, nextZoom: number, anchor: Point = {
  x: viewport.x + viewport.width / 2,
  y: viewport.y + viewport.height / 2,
}): void {
  if (!Number.isFinite(nextZoom)) return;
  const before = screenToWorld(camera, viewport, anchor);
  camera.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
  const after = screenToWorld(camera, viewport, anchor);
  camera.x += before.x - after.x;
  camera.y += before.y - after.y;
}

/** Bound the center to land edges; do not shrink the map or change zoom to fit. */
export function clampCamera(camera: Camera, map: MapBounds): void {
  camera.x = Math.max(map.x, Math.min(map.x + map.width, camera.x));
  camera.y = Math.max(map.y, Math.min(map.y + map.height, camera.y));
}
