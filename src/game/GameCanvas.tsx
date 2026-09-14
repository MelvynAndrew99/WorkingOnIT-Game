/**
 * React ↔ Pixi boundary. React owns WHEN the game exists (mount/unmount with
 * the 'playing' phase); Pixi owns everything inside the canvas. No React
 * state flows in per-frame — game → UI communication goes through the store.
 *
 * StrictMode-safe: dev double-mount is handled by the `disposed` flag (the
 * first mount's async init resolves, sees it was cancelled, and destroys its
 * app before the second mount's app appears).
 */
import { useEffect, useRef } from 'react';
import { TexturePool, type Application } from 'pixi.js';
import { createPixiApp } from './pixiApp.ts';
import { createStage, type Stage } from './stage.ts';
import { createCityScene, type Scene, type CitySceneSession } from './cityScene.ts';
import { store, useStore } from '../state/store.ts';

export default function GameCanvas({session}: {session?:CitySceneSession}) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const appRef = useRef<Application | null>(null);
    const paused = useStore((s) => s.paused);

    useEffect(() => {
        let disposed = false;
        let scene: Scene | null = null;
        let sizeObserver: ResizeObserver | null = null;
        let stage: Stage | null = null;
        (async () => {
            // hostRef is always attached by the time the effect runs.
            const app = await createPixiApp(hostRef.current!);
            if (disposed) {
                app.destroy({ removeView: true }, { children: true });
                return;
            }
            appRef.current = app;
            // CSS display-mode changes can resize the host without a window resize event.
            sizeObserver = new ResizeObserver(()=>{
                const host=hostRef.current;
                if(!disposed&&host&&(app.screen.width!==host.clientWidth||app.screen.height!==host.clientHeight))app.resize();
            });
            sizeObserver.observe(hostRef.current!);
            // Design-resolution stage: scenes position in design units, not
            // pixels, so layout is proportional on every device (stage.ts).
            stage = createStage(app);
            // ADAPT: replace the demo scene with the real game scene.
            scene = createCityScene(app, stage, session);
            // Respect a pause that landed while the canvas was initializing.
            if (store.get().paused) app.ticker.stop();
        })();
        return () => {
            disposed = true;
            sizeObserver?.disconnect();
            try { scene?.destroy(); } catch { /* scene already torn down */ }
            try { stage?.destroy(); } catch { /* stage already torn down */ }
            if (appRef.current) {
                // Scene teardown returns cached render textures to Pixi's shared pool.
                // Destroy those idle targets while their renderer callbacks are live:
                // Pixi 8.19 otherwise retains old renderers/canvases through the pool.
                // Borrowed textures and the shared artwork Assets are not in this pool.
                TexturePool.clear(true);
                appRef.current.destroy({ removeView: true }, { children: true });
                appRef.current = null;
            }
        };
    }, [session]);

    // Host lifecycle pause/resume → freeze/unfreeze the whole ticker.
    useEffect(() => {
        const app = appRef.current;
        if (!app) return;
        if (paused) app.ticker.stop();
        else app.ticker.start();
    }, [paused]);

    return <div ref={hostRef} className="absolute inset-0" />;
}
