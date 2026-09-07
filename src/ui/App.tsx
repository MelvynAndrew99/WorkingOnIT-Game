/**
 * Screen router. One phase visible at a time; the 'playing' phase stacks the
 * React HUD above the Pixi canvas.
 *
 * #app-frame (styled in styles/app.css) is the device frame: a centered
 * portrait column that fills phones edge-to-edge and letterboxes on desktop.
 * Everything — canvas and DOM UI — lives inside it, so they always align.
 */
import { useState } from 'react';
import { useStore } from '../state/store.ts';
import { isMusicMuted, toggleMusicMuted } from '../audio/music.ts';
import LoadingScreen from './LoadingScreen.tsx';
import MainMenu from './MainMenu.tsx';
import Hud from './Hud.tsx';
import GameCanvas from '../game/GameCanvas.tsx';

export default function App() {
    const phase = useStore((s) => s.phase);
    const [muted, setMuted] = useState(isMusicMuted());
    return (
        <div id="app-frame" className="bg-surface text-white">
            {phase === 'loading' && <LoadingScreen />}
            {phase === 'menu' && <MainMenu />}
            {phase === 'playing' && (
                <div className="absolute inset-0">
                    <GameCanvas />
                    <Hud />
                </div>
            )}
            {phase !== 'loading' && (
                <button
                    className="quiet-button absolute right-2 z-50"
                    style={{ top: 'calc(0.5rem + var(--safe-top))' }}
                    onClick={() => setMuted(toggleMusicMuted())}
                    aria-label={muted ? 'Unmute music' : 'Mute music'}
                >
                    {muted ? '🔇' : '🔊'}
                </button>
            )}
        </div>
    );
}
