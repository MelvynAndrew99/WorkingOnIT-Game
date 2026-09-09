/** Explicit onboarding points to real controls; it is not unsolicited crisis advice. */
import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';
import {toolPrices, type City, type Tool} from '../game/cityModel.ts';
import {starterDiversionPoint} from '../game/cityStarterTutorial.ts';
import {getSave} from '../state/save.ts';
import {useStore, type AppState} from '../state/store.ts';
import './tutorialGuidance.css';

export type BuildCategory = 'roads'|'places'|'services';
export function buildCategory(tool:Tool|null):BuildCategory {
    if(tool===null)return 'places';
    if(['home','store','park','bulldoze'].includes(tool))return 'places';
    if(['hospital','fireStation','policeStation'].includes(tool))return 'services';
    return 'roads';
}
/** Shared with the objective so the locator follows the same first-visit substeps. */
export function tutorialBuildTarget(s:AppState,city:City):Tool|undefined {
    const t=s.tutorial;
    if(t?.status!=='active')return undefined;
    if(t.currentId.startsWith('h-'))return s.tool==='closure'&&starterDiversionPoint(city)?'closure':t.tool;
    if(t.currentId==='first-visit'){
        if(!city.buildings.some(b=>b.kind==='home'))return 'home';
        if(!city.buildings.some(b=>b.kind==='store'))return 'store';
        return s.connected===0?'road':undefined;
    }
    if(t.currentId==='park-visit')return city.buildings.some(b=>b.kind==='park')?undefined:'park';
    if(t.currentId==='junction-control')return 'stop';
    if(t.currentId==='detour')return 'road';
    return undefined;
}
const LABEL:Partial<Record<Tool,string>>={home:'Home',store:'Store',park:'Park',road:'Road',stop:'Stops',signal:'Lights',closure:'Divert',hospital:'Clinic',policeStation:'Police',fireStation:'Fire'};
const CATEGORY:Record<BuildCategory,string>={roads:'Roads',places:'Places',services:'Services'};
type Guidance={category:BuildCategory;setCategory:(category:BuildCategory)=>void;tool?:Tool;categoryTarget?:BuildCategory;text:string;dismiss:()=>void};
const Context=createContext<Guidance|null>(null);
export function useTutorialGuidance(){const value=useContext(Context);if(!value)throw Error('Tutorial guidance requires its HUD provider');return value;}

export function TutorialGuidanceProvider({children,wide,blocked}:{children:ReactNode;wide:boolean;blocked:boolean}){
    const s=useStore(),city=getSave().city;
    const [category,setCategory]=useState<BuildCategory>(()=>buildCategory(s.tool));
    const [dismissed,setDismissed]=useState('');
    const [modal,setModal]=useState(false);
    useEffect(()=>{setCategory(buildCategory(s.tool));},[s.tool,s.toolSelection]);
    useEffect(()=>{
        const update=()=>setModal(!!document.querySelector('dialog[open]'));
        const observer=new MutationObserver(update);
        observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
        update();return ()=>observer.disconnect();
    },[]);
    const target=tutorialBuildTarget(s,city);
    const key=`${s.tutorial?.currentId??''}:${target??''}`;
    useEffect(()=>{setDismissed('');},[key]);
    const starter=s.tutorial?.status==='active'&&s.tutorial.currentId.startsWith('h-');
    const visible=!!target&&s.showTips&&!blocked&&!modal&&(starter||s.incidentInfo.active===0)
        &&(starter||!s.missions?.items.some(j=>j.done&&!j.claimed))&&s.phase==='playing'&&dismissed!==key;
    const tool=visible?target:undefined;
    const categoryTarget=tool&&!wide&&category!==buildCategory(tool)?buildCategory(tool):undefined;
    const selected=tool===s.tool&&!s.panning;
    const prices=toolPrices(city);
    const price=tool&&Object.hasOwn(prices,tool)?prices[tool as keyof typeof prices]:undefined;
    const label=tool?`${LABEL[tool]??tool}${price===undefined?'':price===0?' · Free':` · $${price}`}`:'';
    let text=categoryTarget?`Open ${CATEGORY[categoryTarget]} to find ${LABEL[tool!]??tool}.`
        :selected?tool==='road'?'Road ready. Drag to join the entrances.'
        :tool==='stop'?'Stops ready. Tap a junction.'
        :`${LABEL[tool!]??tool} ready. Tap empty land.`
        :`Select ${label} below.`;
    if(starter&&selected&&!categoryTarget&&tool)text=['home','store','park','hospital','policeStation','fireStation'].includes(tool) ? s.tutorial?.focus ? `${LABEL[tool]??tool} ready. Tap the highlighted lot. Show lesson area brings it into view.` : `${LABEL[tool]??tool} ready. Choose your own lot and keep the entrance connected.` : s.tutorial?.hint||`${LABEL[tool]??tool} ready. Use Show lesson area to find the lesson area.`;
    if(starter&&selected&&!categoryTarget&&tool==='closure')text='Divert ready. Tap the highlighted road to close it. Tap again to reopen.';
    if(starter&&selected&&!categoryTarget&&tool==='road'&&s.tutorial?.currentId==='h-bypass')text='Connect both ends using the yellow tiles. Other routes work too.';
    if(!tool)text='';
    return <Context.Provider value={{category,setCategory,tool,categoryTarget,text,dismiss:()=>setDismissed(key)}}>{children}</Context.Provider>;
}

export function TutorialToast(){
    const guide=useTutorialGuidance();
    if(!guide.tool)return null;
    return <div className="tutorial-locator" data-guide-tool={guide.tool}>
        <div className="tutorial-locator-copy" role="status" aria-live="polite" aria-atomic="true">
            <strong><span aria-hidden="true">➜ </span>Your next step</strong>
            <p id="tutorial-locator-instruction">{guide.text}</p>
        </div>
        <button type="button" className="tutorial-locator-close" aria-label="Dismiss tutorial hint" onClick={guide.dismiss}>×</button>
    </div>;
}
