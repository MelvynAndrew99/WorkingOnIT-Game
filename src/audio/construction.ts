/** Short feedback for successful player edits, including paused planning. */
import {sfxVolume} from './mix.ts';
import {store} from '../state/store.ts';
import {effectsSettings,subscribeEffects} from './vehicles.ts';

const DEMOLITION='audio/construction/demolition.mp3';
let demolition:HTMLAudioElement|null=null, sleeping=false, failed=false, active=false;
function allowed():boolean {
 const {phase}=store.get(), {volume,muted}=effectsSettings();
 return (phase==='playing'||phase==='challenge')&&!document.hidden&&!sleeping&&!muted&&volume>0;
}
export function stopConstructionAudio():void {
 active=false;
 if(demolition){demolition.pause();demolition.currentTime=0;}
}
function sync():void {
 if(!allowed())stopConstructionAudio();
 if(demolition)demolition.volume=sfxVolume(DEMOLITION,effectsSettings().volume);
}
export function initConstructionAudio():void {
 if(demolition)return;
 demolition=new Audio(DEMOLITION);demolition.preload='auto';
 demolition.addEventListener('ended',()=>{active=false;});
 demolition.addEventListener('error',()=>{failed=true;stopConstructionAudio();});
 store.subscribe(sync);subscribeEffects(sync);
 document.addEventListener('visibilitychange',sync);
 sync();
}
export function playDemolition():void {
 const el=demolition;
 if(!el||failed||!allowed())return;
 active=true;
 el.currentTime=0;el.volume=sfxVolume(DEMOLITION,effectsSettings().volume);
 el.play().then(()=>{if(!active||!allowed())el.pause();}).catch(()=>{/* Drop denied cues; never replay them later. */});
}
export function setConstructionAudioSleeping(value:boolean):void {sleeping=value;sync();}
