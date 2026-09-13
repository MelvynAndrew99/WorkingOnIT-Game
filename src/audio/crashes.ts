/** One-shot minor impacts; presentation only, never part of saved simulation state. */
import {sfxVolume,type SfxSource} from './mix.ts';
import {store} from '../state/store.ts';
import {effectsSettings,subscribeEffects,setCrashImpactActive} from './vehicles.ts';

const clips=Array.from({length:6},(_,i)=>({
 src:`audio/crashes/crash-minor-${String(i+1).padStart(2,'0')}.mp3` as SfxSource,
 el:null as HTMLAudioElement|null, active:false, failed:false,
}));
let sleeping=false, last=-1;
const syncImpact=()=>setCrashImpactActive(clips.some(clip=>clip.active));
function allowed():boolean {
 const s=store.get(), effects=effectsSettings();
 return (s.phase==='playing'||s.phase==='challenge')&&!s.paused&&!document.hidden&&!sleeping&&!effects.muted&&effects.volume>0;
}
function sync():void {
 if(!allowed()){stopCrashAudio();return;}
 for(const clip of clips)if(clip.el)clip.el.volume=sfxVolume(clip.src,effectsSettings().volume);
}
export function initCrashAudio():void {
 if(clips[0].el)return;
 for(const clip of clips){
  const el=new Audio(clip.src);el.preload='auto';clip.el=el;
  el.addEventListener('ended',()=>{clip.active=false;syncImpact();});
  el.addEventListener('error',()=>{clip.failed=true;clip.active=false;syncImpact();});
 }
 store.subscribe(sync);subscribeEffects(sync);
 document.addEventListener('visibilitychange',sync);
 sync();
}
export function playMinorCrash():void {
 if(!allowed()||clips.filter(c=>c.active).length>=3)return;
 const free=clips.flatMap((c,i)=>c.el&&!c.active&&!c.failed&&i!==last?[i]:[]);
 if(!free.length)return;
 const index=free[Math.floor(Math.random()*free.length)], clip=clips[index], el=clip.el!;
 last=index;clip.active=true;el.currentTime=0;el.volume=sfxVolume(clip.src,effectsSettings().volume);
 syncImpact();
 // Denied/hidden impacts are dropped, never replayed later after a gesture.
 el.play().then(()=>{if(!clip.active||!allowed())el.pause();}).catch(()=>{clip.active=false;syncImpact();});
}
export function stopCrashAudio():void {
 for(const clip of clips){clip.active=false;if(clip.el){clip.el.pause();clip.el.currentTime=0;}}
 syncImpact();
}
export function setCrashAudioSleeping(value:boolean):void {sleeping=value;sync();}
