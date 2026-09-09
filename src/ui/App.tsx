/**
 * Screen router. One phase visible at a time; the 'playing' phase stacks the
 * React HUD above the Pixi canvas.
 *
 * #app-frame (styled in styles/app.css) is the device frame: a centered
 * frame that follows the saved game display preference while playing.
 * Everything — canvas and DOM UI — lives inside it, so they always align.
 */
import { useStore } from '../state/store.ts';
import LoadingScreen from './LoadingScreen.tsx';
import MainMenu from './MainMenu.tsx';
import Hud from './Hud.tsx';
import GameCanvas from '../game/GameCanvas.tsx';

export default function App() {
    const phase = useStore((s) => s.phase);
    const displayMode = useStore(s => s.displayMode);
    const showTips = useStore((s) => s.showTips);
    return (
        <div id="app-frame" data-phase={phase} data-display-mode={displayMode} className={`bg-surface text-white${showTips ? '' : ' hide-gameplay-tips'}`}>
            {phase === 'loading' && <LoadingScreen />}
            {phase === 'menu' && <MainMenu />}
            {phase === 'playing' && (
                <div className="absolute inset-0">
                    <GameCanvas />
                    <Hud />
                </div>
            )}

        </div>
    );
}
