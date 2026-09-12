/** One loop per service, so additional vehicles do not multiply its volume. */
import {store} from '../state/store.ts';
export const FIRETRUCK_SIREN='audio/vehicles/FireTruckSiren_S08ER.232.mp3';
export const POLICE_SIREN='audio/vehicles/PoliceSiren_AP1.1061.mp3';
const SETTINGS_KEY='working-on-it:effects';
let volume=.25, muted=false, sleeping=false;
try {
 const saved=JSON.parse(localStorage.getItem(SETTINGS_KEY)??'null');
 if(typeof saved?.volume==='number'&&Number.isFinite(saved.volume))volume=Math.min(1,Math.max(0,saved.volume));
 if(typeof saved?.muted==='boolean')muted=saved.muted;
} catch { /* Optional preferences cannot block gameplay. */ }
type Siren = {src:string;el:HTMLAudioElement|null;responding:boolean;pending:boolean;failed:boolean;blocked:boolean};
const siren=(src:string):Siren=>({src,el:null,responding:false,pending:false,failed:false,blocked:false});
const fire=siren(FIRETRUCK_SIREN), police=siren(POLICE_SIREN);
const sirens=[fire,police];
const wanted=(s:Siren)=>s.responding&&store.get().phase==='playing'&&!store.get().paused&&!document.hidden&&!sleeping&&!muted&&volume>0;
function syncSiren(s:Siren):void {
 const el=s.el;
 if(!el)return;
 el.volume=volume;el.muted=muted;
 if(!wanted(s)){
  el.pause();
  if(!s.responding&&el.currentTime!==0)el.currentTime=0;
  return;
 }
 if(!el.paused||s.pending||s.failed||s.blocked)return;
 s.pending=true;
 el.play().then(()=>{if(!wanted(s))el.pause();}).catch(()=>{
  s.blocked=true; // Retry on a gesture, not on every simulation frame.
 }).finally(()=>{s.pending=false;});
}
function sync():void {sirens.forEach(syncSiren);}
export function initVehicleAudio():void {
 if(fire.el)return;
 for(const s of sirens){
  s.el=new Audio(s.src);s.el.loop=true;s.el.preload='metadata';
  s.el.addEventListener('error',()=>{s.failed=true;console.warn(`[audio] Siren unavailable (${s.src}); gameplay continues.`);});
 }
 store.subscribe(sync);
 const gesture=()=>{sirens.forEach(s=>{s.blocked=false;});sync();};
 window.addEventListener('pointerdown',gesture);
 window.addEventListener('keydown',gesture);
 document.addEventListener('visibilitychange',sync);
 sync();
}
export function setFiretruckResponding(value:boolean):void {fire.responding=value;syncSiren(fire);}
export function setPoliceResponding(value:boolean):void {police.responding=value;syncSiren(police);}
export function setVehicleAudioSleeping(value:boolean):void {sleeping=value;sync();}
export function effectsSettings(){return {volume,muted};}
const effectsListeners=new Set<()=>void>();
export function subscribeEffects(listener:()=>void):()=>void {effectsListeners.add(listener);return ()=>{effectsListeners.delete(listener);};}
export function setEffectsVolume(value:number):void {
 if(!Number.isFinite(value))return;
 volume=Math.min(1,Math.max(0,value));saveSettings();sync();effectsListeners.forEach(l=>l());
}
export function setEffectsMuted(value:boolean):void {muted=value;saveSettings();sync();effectsListeners.forEach(l=>l());}
function saveSettings():void {
 try {localStorage.setItem(SETTINGS_KEY,JSON.stringify({volume,muted}));}catch{ /* Session preference still works. */ }
}
