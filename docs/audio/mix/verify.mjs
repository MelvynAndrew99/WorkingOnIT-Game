// Functional audio checks, isolated from player storage and the game model.
// Run: node --experimental-strip-types docs/audio/mix/verify.mjs
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
const state={phase:'playing',paused:false,weatherEnabled:true};
const listeners=new Set();
globalThis.__audioTestStore={get:()=>state,subscribe:fn=>{listeners.add(fn);return ()=>listeners.delete(fn);}};
registerHooks({load(url,context,next){
 if(url.endsWith('/src/state/store.ts'))return {format:'module',shortCircuit:true,source:'export const store=globalThis.__audioTestStore;'};
 return next(url,context);
}});
globalThis.document=Object.assign(new EventTarget(),{hidden:false});
globalThis.window=new EventTarget();
const saved=new Map();
globalThis.localStorage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
const elements=[];
globalThis.Audio=class extends EventTarget {
 constructor(src){super();this.src=src;this.volume=1;this.paused=true;this.currentTime=0;elements.push(this);}
 play(){this.paused=false;return Promise.resolve();}
 pause(){this.paused=true;}
};
const v=await import('../../../src/audio/vehicles.ts');
const t=await import('../../../src/audio/traffic.ts');
const c=await import('../../../src/audio/crashes.ts');
const b=await import('../../../src/audio/construction.ts');
const w=await import('../../../src/audio/weather.ts');
const {SFX_MIX,sfxVolume}=await import('../../../src/audio/mix.ts');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const measurements=JSON.parse(readFileSync(new URL('./source-measurements.json',import.meta.url)));
for(const [src,{target}] of Object.entries(SFX_MIX)){
 const gain=sfxVolume(src,1);
 assert.ok(gain>0&&gain<=1);
 near(Number(measurements[`public/${src}`].input_i)+20*Math.log10(gain),target);
 for(const value of [0,.1,.25,.5,.75,1])near(sfxVolume(src,value),gain*value);
 assert.equal(sfxVolume(src,NaN),0);
}
v.initVehicleAudio();t.initTrafficAudio();c.initCrashAudio();b.initConstructionAudio();w.initWeatherAudio();
assert.deepEqual(new Set(elements.map(el=>el.src)),new Set(Object.keys(SFX_MIX)));
v.setEffectsVolume(1);
v.setFiretruckResponding(true);v.setPoliceResponding(true);v.setAmbulanceResponding(true);
w.setRainIntensity(1);t.stepTrafficAudio(10,1);b.playDemolition();
const active=elements.filter(el=>!el.paused);
assert.equal(active.length,6); // Three sirens, rain, traffic and demolition.
const full=new Map(active.map(el=>[el,el.volume]));
v.setEffectsVolume(.5);
for(const el of active)near(el.volume,full.get(el)*.5);
v.setEffectsVolume(1);
for(const el of active)near(el.volume,full.get(el));
// Deterministic random choices keep coverage reproducible.
let seed=42;
Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const seen=new Set();
for(let i=0;i<40;i++){
 c.playMinorCrash();
 const crash=elements.find(el=>el.src.includes('/crashes/')&&!el.paused);
 assert.ok(crash);seen.add(crash.src);
 near(crash.volume,sfxVolume(crash.src,1));
 v.setEffectsVolume(.5);near(crash.volume,sfxVolume(crash.src,1)*.5);
 v.setEffectsVolume(1);near(crash.volume,sfxVolume(crash.src,1));
 crash.pause();crash.dispatchEvent(new Event('ended'));
}
assert.equal(seen.size,6);
v.setEffectsMuted(true);
assert.ok(elements.every(el=>el.paused));
v.setEffectsMuted(false);
v.setEffectsVolume(0);
assert.ok(elements.every(el=>el.paused));
v.setEffectsVolume(.6);
assert.equal(v.effectsSettings().volume,.6);
assert.equal(JSON.parse(saved.get('working-on-it:effects')).volume,.6);
state.paused=true;listeners.forEach(fn=>fn());
assert.ok(elements.every(el=>el.paused));
b.playDemolition();assert.equal(elements.find(el=>el.src.includes('/construction/')).paused,false);
document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));
assert.ok(elements.every(el=>el.paused));
c.stopCrashAudio();t.stopTrafficAudio();w.stopWeatherAudio();b.stopConstructionAudio();
console.log('PASS: 17 calibrated clips; proportional fader including live traffic and all crash variants; mute/zero; preferences; pause/hidden lifecycle.');
