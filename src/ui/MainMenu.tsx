import { useEffect, useRef, useState } from 'react';
import { store, type DisplayMode } from '../state/store.ts';
import { tutorialAction } from '../game/cityTutorial.ts';
import { getSave, startNewCity, flushSave } from '../state/save.ts';
import './titleScreen.css';

export default function MainMenu() {
    const city = getSave().city;
    const untouchedStarter = city.tutorial?.hRoad?.stage === 0 && city.buildings.length === 0 && city.elapsed === 0;
    const hasTown = !untouchedStarter && (city.buildings.length > 0 || city.roads.length > 0 || city.elapsed > 0);
    const [panel, setPanel] = useState<'new' | 'settings' | null>(null);
    const [artAvailable, setArtAvailable] = useState(true);
    const [displayMode,setDisplayMode] = useState<DisplayMode>(store.get().displayMode);
    const [showTips, setShowTips] = useState(store.get().showTips);
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        if (panel) dialog.current?.showModal();
        else dialog.current?.close();
    }, [panel]);
    const resetTools = () => store.patch({ tool: null, rotation: 0, panning: false, toolSelection: store.get().toolSelection + 1 });
    const play = () => { if (!hasTown) resetTools(); store.patch({ phase: 'playing', paused: false }); };
    const newGame = () => { startNewCity(); resetTools(); setPanel(null); play(); };
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
                {city.tutorial?.status!=='skipped'&&city.tutorial?.status!=='complete'&&<button className="tutorial-skip" onClick={()=>{tutorialAction(city,'skip');flushSave();play();}}>Skip tutorial</button>}
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
                <label className="display-mode-setting">Game display
                    <select value={displayMode} onChange={e=>{
                        const value=e.target.value as DisplayMode;setDisplayMode(value);store.patch({displayMode:value});
                        try { localStorage.setItem('working-on-it:display-mode',value); } catch { /* session preference still works */ }
                    }}>
                        <option value="auto">Automatic (match the screen)</option>
                        <option value="wide">Desktop (wide view)</option>
                        <option value="portrait">Mobile (portrait view)</option>
                    </select>
                </label>
                <p>Automatic uses a wide view in larger landscape windows and portrait on smaller screens. This changes your view, not your town.</p>
                <label><input type="checkbox" checked={showTips} onChange={e => {
                    const value = e.target.checked; setShowTips(value); store.patch({ showTips: value });
                    try { localStorage.setItem('working-on-it:show-tips', String(value)); } catch { /* settings remain usable in memory */ }
                }} /> Show gameplay control tips</label>
                <p>Place homes and stores. Connect their entrance markers with roads. Drag to draw roads, or use keys 1–6 to choose a tool and R to rotate.</p>
                <p>Unsigned intersections give east–west traffic priority; north–south drivers wait for a gap. Use All-way stop or Traffic lights to share access. Adjoining junction tiles share one controller. Tap lights again to favor north/south or east/west. Watch waiting cars and completed trips to judge your changes.</p>
                <p>Removing construction refunds what you paid. Free construction refunds $0. Your town saves automatically.</p>
                <button className="title-dialog-close" onClick={() => setPanel(null)}>Done</button>
            </>}
        </dialog>
    </main>;
}
