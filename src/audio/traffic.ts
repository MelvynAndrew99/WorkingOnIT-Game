/** Background pass-bys: a few overlapping clips while civilian cars are driving. */
import {sfxVolume,type SfxSource} from './mix.ts';
import {store} from '../state/store.ts';
import {effectsSettings,subscribeEffects} from './vehicles.ts';
const CLIPS:SfxSource[]=[
 'audio/vehicles/CarPassBy_BW.62241.mp3',
 'audio/vehicles/CarPassBy_S011TM.11.mp3',
 'audio/vehicles/CarPassBy_S011TM.17.mp3',
 'audio/vehicles/CarPassBy_S011TM.18.mp3',
];
const MAX_LAYERS=3;
type Layer={src:SfxSource;level:number;el:HTMLAudioElement|null;active:boolean;failed:boolean};
const layers:Layer[]=CLIPS.map(src=>({src,level:1,el:null,active:false,failed:false}));
let sleeping=false, cooldown=2, last=-1;
function allowed():boolean {
 const {volume,muted}=effectsSettings(), s=store.get();
 return s.phase==='playing'&&!s.paused&&!document.hidden&&!sleeping&&!muted&&volume>0;
}
function sync():void {
 const ok=allowed(), {volume}=effectsSettings();
 for(const l of layers){
  const el=l.el;
  if(!el||!l.active)continue;
  el.volume=sfxVolume(l.src,volume,l.level);
  if(!ok)el.pause();
  else if(el.paused)el.play().catch(()=>{l.active=false;});
 }
}
export function initTrafficAudio():void {
 if(layers[0].el)return;
 for(const l of layers){
  const el=new Audio(l.src);el.preload='auto';el.preservesPitch=false;
  el.addEventListener('ended',()=>{l.active=false;});
  el.addEventListener('error',()=>{l.failed=true;l.active=false;console.warn(`[audio] Traffic clip unavailable (${l.src}); gameplay continues.`);});
  l.el=el;
 }
 store.subscribe(sync);subscribeEffects(sync);
 document.addEventListener('visibilitychange',sync);
}
/** Called each simulation frame with the number of civilian cars on the road. */
export function stepTrafficAudio(dt:number,moving:number):void {
 if(!moving||!allowed())return;
 cooldown-=dt;
 const limit=Math.min(MAX_LAYERS,moving>=8?3:moving>=3?2:1);
 if(cooldown>0||layers.filter(l=>l.active).length>=limit)return;
 const free=layers.flatMap((l,i)=>l.el&&!l.active&&!l.failed&&i!==last?[i]:[]);
 if(!free.length)return;
 const i=free[Math.floor(Math.random()*free.length)], l=layers[i], el=l.el!;
 last=i;l.active=true;l.level=.75+Math.random()*.25;
 el.currentTime=0;el.playbackRate=.92+Math.random()*.16;
 sync(); // Autoplay denial clears the layer; a later start retries after a gesture.
 cooldown=(moving>=8?3:5)+Math.random()*4;
}
export function stopTrafficAudio():void {
 for(const l of layers){l.active=false;if(l.el){l.el.pause();l.el.currentTime=0;}}
 cooldown=2;
}
export function setTrafficAudioSleeping(value:boolean):void {sleeping=value;sync();}
