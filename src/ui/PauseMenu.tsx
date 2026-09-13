import {useEffect,useRef,useState,type ReactNode} from 'react';
import {musicSettings,setMusicVolume,setMusicMuted} from '../audio/music.ts';
import {effectsSettings,setEffectsVolume,setEffectsMuted} from '../audio/vehicles.ts';
import {writeWeatherPreference,weatherHudLabel} from '../game/cityWeather.ts';
import {store,useStore} from '../state/store.ts';
import {flushSave} from '../state/save.ts';
import {IconMusic,IconSpeaker,MenuOption,MenuToggle,VolumeMixer} from './menuControls.tsx';
import './menuPanel.css';
import './pauseMenu.css';

/**
 * In-game pause board. Keep play-time options here, not on the title Settings dialog.
 *
 * Add Arcade / Simulator (or other rows) as `children` inside Game options:
 *   <PauseMenu>
 *     <MenuOption title="Simulation style" hint="Applies to new road upgrades.">
 *       <div className="menu-segments menu-segments-2">...</div>
 *     </MenuOption>
 *   </PauseMenu>
 * Add a whole extra card (radio, etc.) with `panels`.
 */
export default function PauseMenu({children, panels}:{children?:ReactNode; panels?:ReactNode}){
 const paused=useStore(s=>s.paused),weatherEnabled=useStore(s=>s.weatherEnabled),dialog=useRef<HTMLDialogElement>(null);
 const [music,setMusic]=useState(musicSettings);
 const [effects,setEffects]=useState(effectsSettings);
 const resume=()=>store.patch({paused:false});
 const toggleWeather=(value:boolean)=>{
  writeWeatherPreference(value);
  store.patch({weatherEnabled:value,weatherLabel:weatherHudLabel(store.get().elapsedSeconds,value)});
 };
 useEffect(()=>{
  const el=dialog.current;if(!el)return;
  // A briefing may pause simulation while owning its own modal. Queue the pause
  // menu until that dialog closes instead of covering its acknowledgement.
  const update=()=>{
   const other=[...document.querySelectorAll('dialog[open]')].some(d=>d!==el);
   if(paused&&!other&&!el.open)el.showModal();
   else if((!paused||other)&&el.open)el.close();
  };
  const observer=new MutationObserver(update);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
  update();
  return ()=>observer.disconnect();
 },[paused]);
 useEffect(()=>{
  if(!paused)return;
  setMusic(musicSettings());
  setEffects(effectsSettings());
 },[paused]);
 return <dialog ref={dialog} className="pause-menu menu-dialog menu-dialog--pause" aria-labelledby="pause-menu-title" aria-describedby="pause-menu-description"
  onCancel={e=>{e.preventDefault();resume();}}>
  <header className="menu-head">
   <p className="menu-kicker">City works</p>
   <div className="menu-head-row">
    <h2 id="pause-menu-title">Paused</h2>
    <button type="button" className="menu-x" aria-label="Close pause menu" onClick={resume}>
     <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
    </button>
   </div>
   <p id="pause-menu-description" className="menu-lede">Your city can wait.</p>
  </header>
  <div className="menu-body">
   <section className="menu-card" aria-labelledby="pause-audio-heading">
    <h3 id="pause-audio-heading">Audio</h3>
    <VolumeMixer
     icon={<IconMusic />}
     label="Background music"
     volumeLabel="Music volume"
     muted={music.muted}
     volume={music.volume}
     onMuted={value=>{setMusicMuted(value);setMusic(musicSettings());}}
     onVolume={value=>{setMusicVolume(value);setMusic(musicSettings());}}
    />
    <VolumeMixer
     icon={<IconSpeaker />}
     label="Sound effects"
     volumeLabel="Effects volume"
     muted={effects.muted}
     volume={effects.volume}
     onMuted={value=>{setEffectsMuted(value);setEffects(effectsSettings());}}
     onVolume={value=>{setEffectsVolume(value);setEffects(effectsSettings());}}
    />
   </section>
   <section className="menu-card" aria-labelledby="pause-options-heading">
    <h3 id="pause-options-heading">Game options</h3>
    <MenuToggle
     label="Weather"
     hint="Atmosphere only. Traffic is unchanged."
     checked={weatherEnabled}
     onChange={toggleWeather}
    />
    {children}
   </section>
   {panels}
  </div>
  <footer className="menu-foot pause-menu-actions">
   <button type="button" className="pause-resume" autoFocus onClick={resume}>Resume game</button>
   <button type="button" className="pause-leave" onClick={()=>{flushSave();store.patch({phase:'menu'});}}>Main menu</button>
  </footer>
 </dialog>;
}

export {MenuOption};
