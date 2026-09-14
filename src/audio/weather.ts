/** One rain recording at a time, following the visible weather's intensity. */
import {sfxVolume,type SfxSource} from './mix.ts';
import {store} from '../state/store.ts';
import {effectsSettings,subscribeEffects} from './vehicles.ts';

const clips=[2,3,5].map(n=>({src:`audio/weather/rain-${n}.mp3` as SfxSource,el:null as HTMLAudioElement|null,pending:false,blocked:false,failed:false}));
let intensity=0, sleeping=false, current=-1, last=-1;
const inGame=()=>['playing','challenge'].includes(store.get().phase);
const raining=()=>intensity>0&&store.get().weatherEnabled&&inGame();
function audible():boolean {
 const effects=effectsSettings();
 return raining()&&!store.get().paused&&!document.hidden&&!sleeping&&!effects.muted&&effects.volume>0;
}
function reset():void {
 current=-1;
 for(const clip of clips)if(clip.el){clip.el.pause();clip.el.currentTime=0;}
}
function sync():void {
 if(!raining()){reset();return;}
 if(!audible()){for(const clip of clips)clip.el?.pause();return;}
 if(current<0){
  const usable=clips.flatMap((clip,i)=>clip.el&&!clip.failed?[i]:[]);
  const choices=usable.length>1?usable.filter(i=>i!==last):usable;
  if(!choices.length)return;
  current=last=choices[Math.floor(Math.random()*choices.length)];
 }
 const index=current, clip=clips[index], el=clip.el!;
 // Normalized rain stays audible in light showers, fading to zero with the sky.
 el.volume=sfxVolume(clip.src,effectsSettings().volume,Math.sqrt(intensity));
 if(!el.paused||clip.pending||clip.blocked||clip.failed)return;
 clip.pending=true;
 el.play().then(()=>{if(current!==index||!audible())el.pause();}).catch(()=>{
  clip.blocked=true; // Retry after a gesture, never every frame.
 }).finally(()=>{clip.pending=false;});
}
export function initWeatherAudio():void {
 if(clips[0].el)return;
 for(const [index,clip] of clips.entries()){
  const el=new Audio(clip.src);clip.el=el;el.preload='metadata';
  el.addEventListener('ended',()=>{
   if(current!==index)return;
   el.currentTime=0;current=-1;sync();
  });
  el.addEventListener('error',()=>{
   clip.failed=true;el.pause();
   if(current===index){current=-1;sync();}
  });
 }
 store.subscribe(sync);subscribeEffects(sync);
 document.addEventListener('visibilitychange',sync);
 const gesture=()=>{for(const clip of clips)clip.blocked=false;sync();};
 window.addEventListener('pointerdown',gesture);window.addEventListener('keydown',gesture);
 sync();
}
export function setRainIntensity(value:number):void {
 intensity=Number.isFinite(value)?Math.min(1,Math.max(0,value)):0;
 sync();
}
export function stopWeatherAudio():void {intensity=0;reset();}
export function setWeatherAudioSleeping(value:boolean):void {sleeping=value;sync();}
