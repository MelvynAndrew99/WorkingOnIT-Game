/** Background music. Independent of trips, artwork, and saved-city data. */
import {store} from '../state/store.ts';
export const MUSIC_TRACK='audio/music/tranquil-city.mp3';
export const MENU_TRACK='audio/music/TitleTheme.mp3';
export const PAUSE_TRACK='audio/music/pause-menu.mp3';
const SETTINGS_KEY='working-on-it:music';
let volume=.3, muted=false, sleeping=false, radioHold=false;
try {
 const saved=JSON.parse(localStorage.getItem(SETTINGS_KEY)??'null');
 if(typeof saved?.volume==='number'&&Number.isFinite(saved.volume))volume=Math.min(1,Math.max(0,saved.volume));
 if(typeof saved?.muted==='boolean')muted=saved.muted;
} catch { /* Optional settings cannot block the game. */ }
interface Track {src:string; active:()=>boolean; el:HTMLAudioElement|null; pending:boolean; failed:boolean}
const tracks:Track[]=[
 // Main menu and challenge selection, until a dedicated missions track exists.
 {src:MENU_TRACK,el:null,pending:false,failed:false,active:()=>['menu','challenges'].includes(store.get().phase)},
 {src:PAUSE_TRACK,el:null,pending:false,failed:false,active:()=>store.get().phase==='playing'&&store.get().paused},
 // Challenge planning/results share the gameplay loop.
 {src:MUSIC_TRACK,el:null,pending:false,failed:false,active:()=>{
  const {phase,paused}=store.get();
  return phase==='challenge'||(phase==='playing'&&!paused);
 }},
];
const audible=()=>!document.hidden&&!sleeping&&!muted&&volume>0;
const CROSSFADE_MS=1000;
const gains=new Map<Track,number>();
let target:Track|null=null, fadeFrame:number|null=null, fadeStarted=0;
let fadeFrom=new Map<Track,number>();
function applyMix():void {
 for(const t of tracks){
  if(!t.el)continue;
  const gain=gains.get(t)??0;
  t.el.volume=volume*gain;t.el.muted=muted;
  if(gain===0&&t!==target&&!t.active())t.el.pause();
 }
}
function fade(now:number):void {
 fadeFrame=null;
 const progress=Math.min(1,Math.max(0,(now-fadeStarted)/CROSSFADE_MS));
 const eased=progress*progress*(3-2*progress);
 for(const t of tracks){
  const from=fadeFrom.get(t)??0, to=t===target?1:0;
  gains.set(t,from+(to-from)*eased);
 }
 applyMix();
 if(progress<1)fadeFrame=requestAnimationFrame(fade);
}
function transition(next:Track):void {
 if(next===target)return;
 if(fadeFrame!==null)cancelAnimationFrame(fadeFrame);
 target=next;fadeFrom=new Map(gains);fadeStarted=performance.now();
 fadeFrame=requestAnimationFrame(fade);
}
function silence():void {
 if(fadeFrame!==null)cancelAnimationFrame(fadeFrame);
 fadeFrame=null;target=null;gains.clear();
 for(const t of tracks)if(t.el){t.el.pause();t.el.volume=0;t.el.muted=muted;}
}
function sync():void {
 const next=tracks.find(t=>t.active());
 // Mute, hidden tabs, host sleep and the radio desk stop immediately, even midway through a fade.
 if(radioHold||!audible()||!next){silence();return;}
 applyMix();
 const el=next.el;
 if(!el||next.failed)return;
 if(next.pending)return;
 if(!el.paused){transition(next);return;}
 if(!el.src){el.preload='auto';el.src=next.src;}
 next.pending=true;
 // Keep the outgoing music until the incoming recording actually starts.
 el.play().then(()=>{
  next.pending=false;
  if(!audible()||!next.active())el.pause();
  sync();
 }).catch(()=>{
  next.pending=false;
  // Retry on the next gesture/state change, never in the animation loop.
 });
}
/** Idempotent; starts after loading when the browser permits playback. */
export function initMusic():void {
 if(tracks[0].el)return;
 for(const t of tracks){
  const el=new Audio();el.loop=true;el.preload='none';el.volume=0;
  el.addEventListener('error',()=>{t.failed=true;console.warn(`[music] ${t.src} unavailable; gameplay continues.`);});
  t.el=el;
 }
 // Buffer the menu theme first, then the gameplay loop, so they don't split bandwidth.
 const menu=tracks.find(t=>t.src===MENU_TRACK)!.el!, game=tracks.find(t=>t.src===MUSIC_TRACK)!.el!;
 const loadGame=()=>{if(!game.src){game.preload='auto';game.src=MUSIC_TRACK;}};
 const pause=tracks.find(t=>t.src===PAUSE_TRACK)!.el!;
 game.addEventListener('canplaythrough',()=>{if(!pause.src){pause.preload='auto';pause.src=PAUSE_TRACK;}},{once:true});
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
/** City Radio owns the speakers while a clip is playing. */
export function setRadioHold(value:boolean):void {radioHold=value;sync();}
function saveSettings():void {
 try {localStorage.setItem(SETTINGS_KEY,JSON.stringify({volume,muted}));}catch{ /* Session settings still work. */ }
}
