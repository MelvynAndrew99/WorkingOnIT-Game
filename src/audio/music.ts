/** Gameplay music only. Independent of trips, artwork, and saved-city data. */
import {store} from '../state/store.ts';
export const MUSIC_TRACK='audio/music/tranquil-city.mp3';
const SETTINGS_KEY='working-on-it:music';
let volume=.3, muted=false, sleeping=false;
try {
 const saved=JSON.parse(localStorage.getItem(SETTINGS_KEY)??'null');
 if(typeof saved?.volume==='number'&&Number.isFinite(saved.volume))volume=Math.min(1,Math.max(0,saved.volume));
 if(typeof saved?.muted==='boolean')muted=saved.muted;
} catch { /* Optional settings cannot block the game. */ }
let el:HTMLAudioElement|null=null, pending=false, failed=false;
const wanted=()=>store.get().phase==='playing'&&!store.get().paused&&!document.hidden&&!sleeping&&!muted&&volume>0;
function sync():void {
 if(!el)return;
 el.volume=volume;el.muted=muted;
 if(!wanted()){el.pause();return;}
 if(!el.paused||pending||failed)return;
 pending=true;
 el.play().then(()=>{if(!wanted())el?.pause();}).catch(()=>{
  // Autoplay denial is retried by the next gesture; no duplicate listeners.
 }).finally(()=>{pending=false;});
}
/** Idempotent; streaming starts on gameplay, not during the loading screen. */
export function initMusic():void {
 if(el)return;
 el=new Audio(MUSIC_TRACK);el.loop=true;el.preload='metadata';
 el.addEventListener('error',()=>{failed=true;console.warn('[music] Track unavailable; gameplay continues.');});
 store.subscribe(sync);
 window.addEventListener('pointerdown',sync);
 window.addEventListener('keydown',sync);
 document.addEventListener('visibilitychange',sync);
 sync();
}
export function musicSettings(){return {volume,muted};}
export function setMusicVolume(value:number):void {
 if(!Number.isFinite(value))return;
 volume=Math.min(1,Math.max(0,value));saveSettings();sync();
}
export function setMusicMuted(value:boolean):void {muted=value;saveSettings();sync();}
export function setMusicSleeping(value:boolean):void {sleeping=value;sync();}
function saveSettings():void {
 try {localStorage.setItem(SETTINGS_KEY,JSON.stringify({volume,muted}));}catch{ /* Session settings still work. */ }
}
