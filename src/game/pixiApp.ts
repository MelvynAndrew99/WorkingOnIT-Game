/**
 * Pixi v8 Application factory. One place owns renderer options so the rest of
 * the game never touches them.
 */
import { Application, TextureStyle } from 'pixi.js';

// The city art is 16px pixel art scaled up several times: bilinear filtering
// would smear every kerb line and window frame. Nearest keeps them crisp.
TextureStyle.defaultOptions.scaleMode = 'nearest';

/**
 * Create and mount a Pixi app inside a host element. The canvas auto-resizes
 * to the host (the device-frame div), so the game is sized by CSS — the same
 * `--game-w` column that sizes the DOM UI.
 *
 * @param host element the canvas fills (position: relative/absolute)
 */
export async function createPixiApp(host: HTMLElement): Promise<Application> {
    const app = new Application();
    await app.init({
        resizeTo: host,
        // Cap DPR at 2: on 3x phones full DPR triples fill cost for
        // imperceptible sharpness gain. ADAPT: raise/lower per art style.
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        // Transparent canvas: DOM background layers (CSS) show through, and
        // React UI stacks above. ADAPT: set a backgroundColor instead if the
        // scene paints every pixel — cheaper than compositing transparency.
        backgroundAlpha: 0,
        antialias: true,
        // Whole-pixel sprite positions stop tile seams shimmering while panning.
        roundPixels: true,
    });
    host.appendChild(app.canvas);
    return app;
}
