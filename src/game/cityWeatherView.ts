/**
 * Pooled map-space weather drawing.
 *
 * Rain and cloud shadow geometry is built once per camera/condition change and
 * then animated by moving the container it lives in, so a downpour costs a few
 * transforms per frame rather than re-tessellating hundreds of shapes. Each
 * pattern is drawn twice, one tile apart, and scrolled within one tile so the
 * seam never enters the view. A mask trims the overhang to the town.
 */
import { Container, Graphics } from 'pixi.js';
import { CLOUD_SHADOW_RINGS, RAIN_SLANT, planWeatherFrame, type WeatherViewInput } from './cityWeather.ts';

export interface CityWeatherView {
    sync(input: Omit<WeatherViewInput, 'tileSize'>): void;
    /** Remove effects immediately, including while the ticker is stopped. */
    hide(): void;
    destroy(): void;
}

export function createCityWeatherView(layers: { shade: Container; rain: Container; tileSize: number }): CityWeatherView {
    const shadeGfx = new Graphics();
    const cloudGfx = new Graphics();
    // One Graphics per depth layer: each falls at its own speed, so each needs
    // its own transform.
    const rainGfx = [new Graphics(), new Graphics()] as const;
    const cloudMask = new Graphics();
    const rainMask = new Graphics();
    // One masked wrapper per drifting pattern: the flat shade needs no clip
    // because it already is the map rectangle.
    const cloudRoot = new Container();
    const rainRoot = new Container();
    for (const gfx of [shadeGfx, cloudGfx, cloudMask, rainMask, ...rainGfx]) gfx.eventMode = 'none';
    layers.shade.eventMode = 'none';
    layers.rain.eventMode = 'none';
    cloudRoot.addChild(cloudGfx);
    rainRoot.addChild(...rainGfx);
    layers.shade.addChild(shadeGfx, cloudRoot, cloudMask);
    layers.rain.addChild(rainRoot, rainMask);
    cloudRoot.mask = cloudMask;
    rainRoot.mask = rainMask;
    let shadeKey = '';
    let cloudKey = '';
    let rainKey = '';
    let clipKey = '';
    let destroyed = false;

    function hide(): void {
        if (destroyed) return;
        for (const gfx of [shadeGfx, cloudGfx, ...rainGfx]) { gfx.clear(); gfx.visible = false; }
        shadeKey = '';
        cloudKey = '';
        rainKey = '';
    }

    return {
        sync(input) {
            if (destroyed) return;
            if (!input.enabled) {
                hide();
                return;
            }
            const frame = planWeatherFrame({ ...input, tileSize: layers.tileSize });
            const { camera, viewport, map } = input;
            // The visible-map intersection moves with the camera and with the
            // reserved region, so both belong in every pattern cache key.
            const view = `${camera.x}:${camera.y}:${camera.zoom}:${viewport.width}:${viewport.height}:${map.x}:${map.y}:${map.width}:${map.height}`;

            const nextClip = frame.clip ? `${frame.clip.x},${frame.clip.y},${frame.clip.width},${frame.clip.height}` : '';
            if (nextClip !== clipKey) {
                clipKey = nextClip;
                for (const mask of [cloudMask, rainMask]) {
                    mask.clear();
                    if (frame.clip) mask.rect(frame.clip.x, frame.clip.y, frame.clip.width, frame.clip.height).fill(0xffffff);
                }
            }

            const nextShade = frame.shade
                ? `${frame.shade.x},${frame.shade.y},${frame.shade.width},${frame.shade.height},${frame.shade.color},${frame.shade.alpha.toFixed(3)}`
                : '';
            if (nextShade !== shadeKey) {
                shadeKey = nextShade;
                shadeGfx.clear();
                if (frame.shade) {
                    shadeGfx.rect(frame.shade.x, frame.shade.y, frame.shade.width, frame.shade.height)
                        .fill({ color: frame.shade.color, alpha: frame.shade.alpha });
                    shadeGfx.visible = true;
                } else shadeGfx.visible = false;
            }

            const nextCloud = frame.clouds.length
                ? `${frame.clouds.length}:${frame.cloudColor}:${frame.cloudSpan.toFixed(2)}:${view}`
                : '';
            if (nextCloud !== cloudKey) {
                cloudKey = nextCloud;
                cloudGfx.clear();
                cloudGfx.visible = frame.clouds.length > 0;
                for (const repeat of [0, frame.cloudSpan]) {
                    for (const cloud of frame.clouds) {
                        // Concentric rings stand in for a soft edge without a blur filter.
                        for (const ring of CLOUD_SHADOW_RINGS) {
                            cloudGfx.ellipse(cloud.x + repeat, cloud.y, cloud.rx * ring, cloud.ry * ring)
                                .fill({ color: frame.cloudColor, alpha: cloud.alpha / CLOUD_SHADOW_RINGS.length });
                        }
                    }
                }
            }
            cloudGfx.position.set(frame.cloudScroll - frame.cloudSpan, 0);

            const nextRain = frame.rain.length
                ? `${frame.rain.length}:${frame.rainAlpha.toFixed(3)}:${frame.rainWidth.toFixed(4)}:${frame.rainTile.toFixed(2)}:${view}`
                : '';
            if (nextRain !== rainKey) {
                rainKey = nextRain;
                const draw = frame.rain.length > 0 && frame.rainAlpha > 0;
                for (const layer of [0, 1] as const) {
                    const gfx = rainGfx[layer];
                    gfx.clear();
                    gfx.visible = draw;
                    if (!draw) continue;
                    let drew = false;
                    for (const repeat of [0, frame.rainTile]) {
                        for (const streak of frame.rain) {
                            if (streak.layer !== layer) continue;
                            gfx.moveTo(streak.x, streak.y + repeat)
                                .lineTo(streak.x + streak.dx, streak.y + repeat + streak.dy);
                            drew = true;
                        }
                    }
                    if (!drew) { gfx.visible = false; continue; }
                    // The near sheet is thicker and brighter, so rain has depth.
                    gfx.stroke({
                        width: layer === 1 ? frame.rainWidth * 1.6 : frame.rainWidth,
                        color: layer === 1 ? 0xe4f1fb : 0xc2d8ea,
                        alpha: layer === 1 ? frame.rainAlpha : frame.rainAlpha * 0.55,
                        cap: 'round',
                    });
                }
            }
            for (const layer of [0, 1] as const) {
                const scroll = frame.rainScroll[layer];
                // Follow the slant so a dash travels along its own direction.
                rainGfx[layer].position.set(scroll * RAIN_SLANT, scroll - frame.rainTile);
            }
        },
        hide,
        destroy() {
            if (destroyed) return;
            hide();
            destroyed = true;
            cloudRoot.mask = null;
            rainRoot.mask = null;
            for (const gfx of [shadeGfx, cloudMask, rainMask]) gfx.destroy();
            cloudRoot.destroy({ children: true });
            rainRoot.destroy({ children: true });
        },
    };
}
