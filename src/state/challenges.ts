import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import {sdkReady} from '../sdk/runSdk.ts';
import {createChallenge, parseChallenge, challengeUnlockedBy, challengePrerequisite, CHALLENGES, type ChallengeId, type ChallengeRun} from '../game/cityChallenges.ts';

const KEY='working-on-it:challenges:v1';
let runs:Partial<Record<ChallengeId,ChallengeRun>>={}, stars:Partial<Record<ChallengeId,boolean>>={};
let selected:ChallengeId='first-road';
let archivedRuns:Partial<Record<ChallengeId,ChallengeRun>>={};
let updatedAt=0, pending:string|null=null, writing=false;
function parse(raw:string|null) {
  try {const r=JSON.parse(raw??'null');if(!r || !Number.isFinite(r.updatedAt))return null;
    const loadedRuns:typeof runs={},loadedStars:typeof stars={};
    // Migrate the previous single FLOW run and receipt, without resetting either.
    if(!r.runs){const old=parseChallenge(r.run);if(old)loadedRuns['shopping-flow']=old;loadedStars['shopping-flow']=r.star===true||!!old?.earned;}
    else for(const {id} of CHALLENGES){const run=parseChallenge(r.runs[id]);if(run?.id===id)loadedRuns[id]=run;loadedStars[id]=r.stars?.[id]===true||!!run?.earned;}
    const archived:typeof archivedRuns={};for(const {id} of CHALLENGES){const old=parseChallenge(r.archivedRuns?.[id]);if(old?.id===id)archived[id]=old;}
    return {runs:loadedRuns,stars:loadedStars,archivedRuns:archived,updatedAt:r.updatedAt};
  } catch {return null;}
}
export async function loadChallenges() {
  let saved=null;
  if(sdkReady())try {saved=parse(await RundotGameAPI.appStorage.getItem(KEY));}catch {}
  try {const local=parse(localStorage.getItem(KEY));if(local&&(!saved||local.updatedAt>=saved.updatedAt))saved=local;}catch {}
  if(saved){runs=saved.runs;stars=saved.stars;archivedRuns=saved.archivedRuns;updatedAt=saved.updatedAt;}
}
export const challengeHasStar=(id:ChallengeId=selected)=>stars[id]===true||!!runs[id]?.earned;
export const challengeUnlocked=(id:ChallengeId)=>challengeUnlockedBy(id,challengeHasStar);
/** Permanent free-song entitlement follows the finale award, even after a retry. */
export const hasJamSongReward=()=>challengeHasStar('what-a-jam');
export const hasChallengeRun=(id:ChallengeId=selected)=>!!runs[id];
export function selectChallenge(id:ChallengeId){
  if(!challengeUnlocked(id))throw Error(`Complete ${challengePrerequisite(id)?.title??'the previous mission'} first.`);
  selected=id;
  if(runs[id]&&((id==='neighborhood-roads'&&runs[id]!.revision!==2)||(id==='a-town-that-works'&&runs[id]!.revision!==3)||(id==='past-the-wreck'&&runs[id]!.revision!==4)||(id==='another-front-door'&&runs[id]!.revision!==3))){stars[id]=challengeHasStar(id);archivedRuns[id]=runs[id];runs[id]=createChallenge(id);flushChallenges();}
  return getChallengeRun();}
export function getChallengeRun() {return runs[selected]??=createChallenge(selected);}
export function retryChallenge() {stars[selected]=challengeHasStar();runs[selected]=createChallenge(selected);flushChallenges();return runs[selected]!;}
export function flushChallenges() {
  if(!Object.keys(runs).length)return;
  for(const {id} of CHALLENGES)stars[id]=challengeHasStar(id);
  updatedAt=Math.max(Date.now(),updatedAt+1);
  const raw=JSON.stringify({runs,stars,archivedRuns,updatedAt});
  try {localStorage.setItem(KEY,raw);}catch {}
  if(sdkReady()){pending=raw;void drain();}
}
async function drain() {
  if(writing)return;writing=true;
  try {while(pending!==null){const raw=pending;pending=null;try {await RundotGameAPI.appStorage.setItem(KEY,raw);}catch {}}}
  finally {writing=false;}
}
