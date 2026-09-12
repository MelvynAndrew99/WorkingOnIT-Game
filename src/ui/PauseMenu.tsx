import {useEffect,useRef,type ReactNode} from 'react';
import {writeWeatherPreference,weatherHudLabel} from '../game/cityWeather.ts';
import {store,useStore} from '../state/store.ts';
import {flushSave} from '../state/save.ts';
import './pauseMenu.css';

/** Presentation of the existing pause state. Future radio controls fit in children. */
export default function PauseMenu({children}:{children?:ReactNode}){
 const paused=useStore(s=>s.paused),weatherEnabled=useStore(s=>s.weatherEnabled),dialog=useRef<HTMLDialogElement>(null);
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
 return <dialog ref={dialog} className="pause-menu" aria-labelledby="pause-menu-title" aria-describedby="pause-menu-description"
  onCancel={e=>{e.preventDefault();resume();}}>
  <h2 id="pause-menu-title">Paused</h2>
  <p id="pause-menu-description">Your city can wait.</p>
  <label className="pause-weather">
   <input type="checkbox" checked={weatherEnabled} onChange={e=>toggleWeather(e.target.checked)} />
   Weather
  </label>
  <div className="pause-menu-actions">
   <button type="button" className="pause-resume" autoFocus onClick={resume}>Resume game</button>
   {children}
   <button type="button" onClick={()=>{flushSave();store.patch({phase:'menu'});}}>Main menu</button>
  </div>
 </dialog>;
}
