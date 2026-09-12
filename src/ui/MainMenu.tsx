import {musicSettings,setMusicVolume,setMusicMuted} from '../audio/music.ts';
import {effectsSettings,setEffectsVolume,setEffectsMuted} from '../audio/vehicles.ts';
import {finishTutorialAndConnect} from '../game/cityExternal.ts';
import { useEffect, useRef, useState } from 'react';
import { writeWeatherPreference, weatherHudLabel } from '../game/cityWeather.ts';
import { store, type DisplayMode } from '../state/store.ts';
import { getSave, startNewCity, flushSave } from '../state/save.ts';
import './titleScreen.css';

export default function MainMenu() {
    const city = getSave().city;
    const untouchedStarter = city.tutorial?.hRoad?.stage === 0 && city.buildings.length === 0 && city.elapsed === 0;
    const hasTown = !untouchedStarter && (city.buildings.length > 0 || city.roads.length > 0 || city.elapsed > 0);
    const [panel, setPanel] = useState<'new' | 'settings' | null>(null);
    const [artAvailable, setArtAvailable] = useState(true);
    const [displayMode,setDisplayMode] = useState<DisplayMode>(store.get().displayMode);
    const [music,setMusic]=useState(musicSettings);
    const [effects,setEffects]=useState(effectsSettings);
    const [showTips, setShowTips] = useState(store.get().showTips);
    const [weatherEnabled, setWeatherEnabled] = useState(store.get().weatherEnabled);
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
            <header className="title-brand">
                <div className="title-kicker"><span aria-hidden="true" /> CITY WORKS · YOU’RE IN CHARGE</div>
                <h1>WORKING<span>ON IT<span className="title-bang">!</span></span></h1>
                <p>Fix the commute.</p>
            </header>
            <div className="title-art" aria-hidden="true">
                {artAvailable && <img src="images/title/working-on-it.png" alt="" fetchPriority="high" onError={() => setArtAvailable(false)} />}
                <div className="title-scene-caption"><span className="title-manager-label"><span className="title-manager-worn">CI</span>TY MAN<span className="title-manager-worn">AGER</span></span><p>Good as new!</p></div>
            </div>
            <nav className="title-navigation" aria-label="Main menu">
                <p className="title-route-label">YOUR NEXT MOVE</p>
                <button className="title-road-button title-play" aria-label={hasTown ? 'Continue commute' : 'Start your city'} onClick={play}>
                    <span className="title-route-icon" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M8 28 12 4h8l4 24M16 5v5m0 4v5m0 4v5" /></svg></span>
                    <span className="title-button-copy"><strong>{hasTown ? 'Continue commute' : 'Start your city'}</strong><small>{hasTown ? 'Your town. Your next big idea.' : 'Build a town. Get things moving.'}</small></span>
                    <span className="title-arrow" aria-hidden="true">➜</span>
                </button>
                <button className="title-road-button title-challenges" aria-label="Challenges" onClick={()=>store.patch({phase:'challenges',paused:false})}>
                    <span className="title-route-icon" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M7 29V4m0 1c6-5 12 5 19 0v14c-7 5-13-5-19 0" /><path d="M13 5v13m7-12v13M8 11c6-4 12 5 18 0" /></svg></span>
                    <span className="title-button-copy"><strong>Challenges</strong><small>Small maps. Big traffic ideas.</small></span>
                    <span className="title-arrow" aria-hidden="true">➜</span>
                </button>
                <div className="title-utilities">
                    {hasTown && <button className="title-road-button" onClick={() => setPanel('new')}><span className="title-utility-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></span> New city</button>}
                    <button className="title-road-button" onClick={() => setPanel('settings')}><span className="title-utility-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M21.00,12.00 L20.83,13.76 L18.47,14.68 L17.82,15.89 L18.36,18.36 L17.00,19.48 L14.68,18.47 L13.37,18.87 L12.00,21.00 L10.24,20.83 L9.32,18.47 L8.11,17.82 L5.64,18.36 L4.52,17.00 L5.53,14.68 L5.13,13.37 L3.00,12.00 L3.17,10.24 L5.53,9.32 L6.18,8.11 L5.64,5.64 L7.00,4.52 L9.32,5.53 L10.63,5.13 L12.00,3.00 L13.76,3.17 L14.68,5.53 L15.89,6.18 L18.36,5.64 L19.48,7.00 L18.47,9.32 L18.87,10.63 Z" /><circle cx="12" cy="12" r="3" /></svg></span> Settings</button>
                </div>
            </nav>
            <footer className="title-footer"><span aria-hidden="true" className="title-stripes" /><span>A better commute starts with you.</span></footer>
        </div>
        <dialog ref={dialog} className="title-dialog" onCancel={() => setPanel(null)} onClose={() => setPanel(null)} aria-labelledby="title-dialog-heading">
            {panel === 'new' ? <>
                <h2 id="title-dialog-heading">Start a new city?</h2>
                <p>This replaces your current town. Your existing roads, buildings, and funds will be reset.</p>
                <button className="commute-button" onClick={newGame}>Start new city</button>
                <button className="title-dialog-close" onClick={() => setPanel(null)}>Keep current city</button>
            </> : <>
                <h2 id="title-dialog-heading">Settings</h2>
                <label><input type="checkbox" checked={!music.muted} onChange={e=>{setMusicMuted(!e.target.checked);setMusic(musicSettings());}} /> Background music</label>
                <label className="display-mode-setting">Music volume · {Math.round(music.volume*100)}%
                    <input aria-label="Music volume" type="range" min="0" max="100" step="1" value={Math.round(music.volume*100)} onChange={e=>{setMusicVolume(Number(e.target.value)/100);setMusic(musicSettings());}} />
                </label>
                <p>Tranquil City · Loops throughout Challenges and while your city is running.</p>
                <label><input type="checkbox" checked={!effects.muted} onChange={e=>{setEffectsMuted(!e.target.checked);setEffects(effectsSettings());}} /> Sound effects</label>
                <label className="display-mode-setting">Effects volume · {Math.round(effects.volume*100)}%
                    <input aria-label="Effects volume" type="range" min="0" max="100" step="1" value={Math.round(effects.volume*100)} onChange={e=>{setEffectsVolume(Number(e.target.value)/100);setEffects(effectsSettings());}} />
                </label>
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
                <label><input type="checkbox" checked={weatherEnabled} onChange={e => {
                    const value = e.target.checked; setWeatherEnabled(value); writeWeatherPreference(value);
                    store.patch({ weatherEnabled: value, weatherLabel: weatherHudLabel(getSave().city.elapsed, value) });
                }} /> Weather</label>
                <p>Slow visual cycle of clear, cloudy and rain over the town map. Atmosphere only; traffic is unchanged. Reduced-motion systems keep shading without falling rain.</p>
                <label><input type="checkbox" checked={showTips} onChange={e => {
                    const value = e.target.checked; setShowTips(value); store.patch({ showTips: value });
                    try { localStorage.setItem('working-on-it:show-tips', String(value)); } catch { /* settings remain usable in memory */ }
                }} /> Show gameplay control tips</label>
                <p>Place homes and stores. Connect their entrance markers with roads. Drag to draw roads, or use keys 1–6 to choose a tool and R to rotate.</p>
                <p>Unsigned intersections give east–west traffic priority; north–south drivers wait for a gap. Use All-way stop or Traffic lights to share access. Adjoining junction tiles share one controller. Tap lights again to favor north/south or east/west. Watch waiting cars and completed trips to judge your changes.</p>
                <p>Removing construction refunds what you paid. Free construction refunds $0. Your town saves automatically.</p>
                {city.tutorial?.status!=='skipped'&&city.tutorial?.status!=='complete'&&<button className="tutorial-skip" onClick={()=>{if(!window.confirm('Skip the tutorial and connect automatically to outside traffic? A free access road may be added.'))return;finishTutorialAndConnect(city);flushSave();setPanel(null);play();}}>Skip tutorial</button>}
                <button className="title-dialog-close" onClick={() => setPanel(null)}>Done</button>
            </>}
        </dialog>
    </main>;
}
