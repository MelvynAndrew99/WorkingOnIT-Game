import { useEffect, useRef, useState } from 'react';
import { store } from '../state/store.ts';
import { getSave, startNewCity } from '../state/save.ts';
import './titleScreen.css';

export default function MainMenu() {
    const city = getSave().city;
    const hasTown = city.buildings.length > 0 || city.roads.length > 0 || city.elapsed > 0;
    const [panel, setPanel] = useState<'new' | 'settings' | null>(null);
    const [artAvailable, setArtAvailable] = useState(true);
    const [showTips, setShowTips] = useState(store.get().showTips);
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        if (panel) dialog.current?.showModal();
        else dialog.current?.close();
    }, [panel]);
    const play = () => store.patch({ phase: 'playing', paused: false });
    const newGame = () => { startNewCity(); setPanel(null); play(); };
    return <main className="title-screen" aria-label="Working ON IT! title screen">
        <div className="title-composition">
            <h1 className="sr-only">Working ON IT!</h1>
            <p className="sr-only">Fix the commute. Take the credit.</p>
            <div className="title-art">
                {artAvailable ? <img src="images/title/working-on-it.png" alt="A confident city worker presents a road repair beside a busy city commute." fetchPriority="high" onError={() => setArtAvailable(false)} />
                    : <div className="title-fallback"><strong>Working<br />ON IT!</strong><p>Fix the commute.<br />Take the credit.</p></div>}
            </div>
            <nav className="title-navigation" aria-label="Main menu">
                <button className="commute-button" onClick={play}>{hasTown ? 'Continue commute' : 'Start your city'} <span aria-hidden="true">→</span></button>
                <div className="title-links">
                    <button onClick={() => hasTown ? setPanel('new') : newGame()}>New game</button>
                    <span aria-hidden="true" />
                    <button onClick={() => setPanel('settings')}>Settings</button>
                </div>
                <p>A better commute starts here.</p>
            </nav>
        </div>
        <dialog ref={dialog} className="title-dialog" onCancel={() => setPanel(null)} onClose={() => setPanel(null)} aria-labelledby="title-dialog-heading">
            {panel === 'new' ? <>
                <h2 id="title-dialog-heading">Start a new city?</h2>
                <p>This replaces your current town. Your existing roads, buildings, and funds will be reset.</p>
                <button className="commute-button" onClick={newGame}>Start new city</button>
                <button className="title-dialog-close" onClick={() => setPanel(null)}>Keep current city</button>
            </> : <>
                <h2 id="title-dialog-heading">Settings</h2>
                <label><input type="checkbox" checked={showTips} onChange={e => {
                    const value = e.target.checked; setShowTips(value); store.patch({ showTips: value });
                    try { localStorage.setItem('working-on-it:show-tips', String(value)); } catch { /* settings remain usable in memory */ }
                }} /> Show gameplay control tips</label>
                <p>Place homes and stores. Connect their entrance markers with roads. Drag to draw roads, or use keys 1–4 to choose a tool and R to rotate.</p>
                <p>Construction receives a full refund when removed. Your town saves automatically.</p>
                <button className="title-dialog-close" onClick={() => setPanel(null)}>Done</button>
            </>}
        </dialog>
    </main>;
}
