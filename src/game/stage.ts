/**
 * Scenes use design units. Phones fit the 720-unit baseline to their width;
 * larger windows cap scale at 1 and expose additional world space.
 * Re-read width and designHeight() on resize for viewport and input geometry.
 * The app frame chooses automatic, wide or portrait presentation separately.
 */
import { Container, type Application } from 'pixi.js';

/** Portrait baseline; artwork and simulation geometry remain independent. */
export const DESIGN_WIDTH = 720;

/** What createStage returns — the surface scenes build against. */
export interface Stage {
    /** Add all scene content here (NOT app.stage), positioned in design units. */
    root: Container;
    /** Current width in design units; re-read after resizes. */
    width: number;
    /** Current screen height in design units — re-read after resizes. */
    designHeight(): number;
    /** Current design-unit → pixel factor (rarely needed directly). */
    scale(): number;
    /** Subscribe to resizes (re-anchor bottom/center content). Returns unsubscribe. */
    onResize(cb: () => void): () => void;
    destroy(): void;
}

/**
 * Create the stage on a Pixi app. Add all scene content to `stage.root`
 * (NOT app.stage) and position/size it in design units.
 */
export function createStage(app: Application): Stage {
    const root = new Container();
    app.stage.addChild(root);

    const resizeCbs = new Set<() => void>();
    let _designHeight = 0;
    let _designWidth = DESIGN_WIDTH;

    const layout = () => {
        // Phones retain their original scale; wide screens show more world, not giant sprites.
        const s = Math.min(app.screen.width / DESIGN_WIDTH, 1);
        _designWidth = app.screen.width / s;
        root.scale.set(s);
        _designHeight = app.screen.height / s;
        for (const cb of resizeCbs) cb();
    };

    // app.screen is in CSS pixels regardless of resolution/autoDensity, so
    // the design mapping is unaffected by devicePixelRatio.
    app.renderer.on('resize', layout);
    layout();

    return {
        root,
        get width() { return _designWidth; },
        designHeight: () => _designHeight,
        scale: () => root.scale.x,
        onResize(cb) {
            resizeCbs.add(cb);
            return () => resizeCbs.delete(cb);
        },
        destroy() {
            app.renderer.off('resize', layout);
            resizeCbs.clear();
            root.destroy({ children: true });
        },
    };
}
