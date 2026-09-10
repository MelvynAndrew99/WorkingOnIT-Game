import {cityCommand} from '../game/cityControls.ts';
import {store,useStore} from '../state/store.ts';
import type {DiagnosticView} from '../game/cityDiagnostics.ts';
const VIEWS: {id:DiagnosticView;label:string}[]=[{id:'normal',label:'Normal'},{id:'traffic',label:'Traffic'},{id:'access',label:'Access'},{id:'capacity',label:'Visitors'}];
/** Controls change presentation only; they never pause or alter trips. */
export default function DiagnosticViews({onDebug}: {onDebug?: () => void}){
 const {diagnosticView:view,diagnostics:d,vehicleDebugOpen}=useStore();
 const issues=d?.homes.filter(h=>view==='access'?h.status==='access':view==='capacity'?h.status==='capacity':h.status==='traffic')??[];
 return <div className="diagnostic-views">
  <div role="group" aria-label="Map diagnostic views">{VIEWS.map(v=><button key={v.id} aria-pressed={view===v.id} onClick={()=>store.patch({diagnosticView:v.id})}>{v.label}</button>)}<button aria-pressed={vehicleDebugOpen} onClick={()=>{if(onDebug)onDebug();else store.patch({vehicleDebugOpen:!vehicleDebugOpen,panning:false,tool:null});}}>Open debug</button></div>
  {view!=='normal'&&<div className="diagnostic-summary">
   <span>{view==='traffic'?`${d?.traffic.length??0} stopped vehicles · amber marks waiting` :view==='access'?'Cyan: access both ways · orange: route missing':'Parked + arriving / visitor slots · yellow: full'}</span>
   {issues[0]?<button onClick={()=>cityCommand({type:'focus',point:issues[0]})}>{issues.length} home{issues.length===1?'':'s'} · {issues[0].reason} · Show</button>:<span>{view==='capacity'?'No households waiting for visitor space':view==='access'?'No missing destination routes':''}</span>}
  </div>}
 </div>;
}

/** Always visible outside the Dashboard when a diagnostic map is selected. */
export function DiagnosticLegend() {
 const view=useStore(s=>s.diagnosticView);
 if(view==='normal')return null;
 return <p className="map-view-legend">{view==='traffic'?'Traffic view: amber marks stopped vehicles.':view==='access'?'Access: cyan has routes both ways; orange is missing a route.':'Visitors: parked + arriving / slots. Yellow means full.'}</p>;
}
