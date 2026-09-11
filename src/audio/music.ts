/** Background music. Independent of trips, artwork, and saved-city data. */
import {store} from '../state/store.ts';
export const MUSIC_TRACK='audio/music/tranquil-city.mp3';
export const MENU_TRACK='audio/music/TitleTheme.mp3';
const SETTINGS_KEY='working-on-it:music';
let volume=.3, muted=false, sleeping=false;
try {
 const saved=JSON.parse(localStorage.getItem(SETTINGS_KEY)??'null');
 if(typeof saved?.volume==='number'&&Number.isFinite(saved.volume))volume=Math.min(1,Math.max(0,saved.volume));
 if(typeof saved?.muted==='boolean')muted=saved.muted;
} catch { /* Optional settings cannot block the game. */ }
interface Track {src:string; active:()=>boolean; el:HTMLAudioElement|null; pending:boolean; failed:boolean}
const tracks:Track[]=[
 // Main menu only.
 {src:MENU_TRACK,el:null,pending:false,failed:false,active:()=>store.get().phase==='menu'},
 // Challenge selection/planning/results share the gameplay loop.
 {src:MUSIC_TRACK,el:null,pending:false,failed:false,active:()=>{
  const {phase,paused}=store.get();
  return ['challenges','challenge'].includes(phase)||(phase==='playing'&&!paused);
 }},
];
const audible=()=>!document.hidden&&!sleeping&&!muted&&volume>0;
function syncTrack(t:Track):void {
 const el=t.el;
 if(!el)return;
 el.volume=volume;el.muted=muted;
 const wanted=()=>t.active()&&audible();
 if(!wanted()){el.pause();return;}
 if(!el.paused||t.pending||t.failed)return;
 if(!el.src){el.preload='auto';el.src=t.src;}
 t.pending=true;
 el.play().then(()=>{if(!wanted())el.pause();}).catch(()=>{
  // Autoplay denial is retried by the next gesture; no duplicate listeners.
 }).finally(()=>{t.pending=false;});
}
function sync():void {for(const t of tracks)syncTrack(t);}
/** Idempotent; starts after loading when the browser permits playback. */
export function initMusic():void {
 if(tracks[0].el)return;
 for(const t of tracks){
  const el=new Audio();el.loop=true;el.preload='none';
  el.addEventListener('error',()=>{t.failed=true;console.warn(`[music] ${t.src} unavailable; gameplay continues.`);});
  t.el=el;
 }
 // Buffer the menu theme first, then the gameplay loop, so they don't split bandwidth.
 const [menu,game]=tracks.map(t=>t.el!);
 const loadGame=()=>{if(!game.src){game.preload='auto';game.src=MUSIC_TRACK;}};
 menu.addEventListener('canplaythrough',loadGame,{once:true});
 menu.addEventListener('error',loadGame,{once:true});
 menu.preload='auto';menu.src=MENU_TRACK;
 // Fallback: start the gameplay loop's fetch once the menu is up, even if the menu theme is still buffering.
 const unsub=store.subscribe(()=>{if(store.get().phase!=='loading'){unsub();setTimeout(loadGame,8000);}});
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
