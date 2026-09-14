import {useState} from 'react';
import {store,useStore} from '../state/store.ts';
import {cityCommand} from '../game/cityControls.ts';
import './vehicleDebug.css';
export default function VehicleDebugPanel(){
 const s=useStore(),[snapshot,setSnapshot]=useState(''),[copyStatus,setCopyStatus]=useState('');
 if(!s.vehicleDebugOpen)return null;
 const cars=[...s.vehicleDebug].sort((a,b)=>Number(!!b.stationId)-Number(!!a.stationId)||b.stoppedSeconds-a.stoppedSeconds||a.id-b.id);
 const selected=cars.find(t=>t.id===s.selectedVehicleId);
 async function capture(){
  const text=JSON.stringify({schema:1,capturedAt:new Date().toISOString(),paused:s.paused,selectedVehicleId:s.selectedVehicleId,vehicles:s.vehicleDebug,incidents:s.incidentInfo},null,2);
  setSnapshot(text);try{await navigator.clipboard.writeText(text);setCopyStatus('Copied. Paste this into our chat.');}catch{setCopyStatus('Select and copy the report below.');}
 }
 return <section className="vehicle-debug" aria-label="Vehicle debug">
  <div className="vehicle-debug-heading"><strong>Vehicle debug</strong><button onClick={()=>store.patch({vehicleDebugOpen:false})}>Close debug</button></div>
  <p>Tap a car on the map or choose below. Live data; cyan shows its route.</p>
  <label>Vehicle <select value={selected?.id??''} onChange={e=>{const id=Number(e.target.value);store.patch({selectedVehicleId:id});const car=cars.find(t=>t.id===id);if(car)cityCommand({type:'focus',point:car.position});}}>
   <option value="">Choose a vehicle ({cars.length})</option>{cars.map(t=><option key={t.id} value={t.id}>{t.label} #{t.id} · {t.phase} · stopped {t.stoppedSeconds.toFixed(1)}s</option>)}
  </select></label>
  {selected?<><h3>{selected.label} #{selected.id}</h3><p className="vehicle-debug-reason">{selected.reason}</p>
   <dl><dt>Assignment</dt><dd>{selected.patrol?'Local patrol':selected.emergency?'Emergency response':selected.sceneParked?'Scene parking':selected.stationId?'Routine return (obeys traffic)':'Civilian trip'}</dd>
    <dt>State / intent</dt><dd>{selected.phase} / {selected.intent}</dd><dt>Stopped / total wait</dt><dd>{selected.stoppedSeconds.toFixed(1)}s / {selected.totalWaitSeconds.toFixed(1)}s</dd>
    <dt>Position → target</dt><dd>{selected.position.x},{selected.position.y} → {selected.target?`${selected.target.x},${selected.target.y}`:'none'}</dd>
    <dt>Station / incident</dt><dd>{selected.stationId??'—'} / {selected.incidentId??'—'}</dd>
    <dt>Work remaining</dt><dd>{selected.workRemaining??'—'}</dd><dt>Blocking vehicles</dt><dd>{selected.blockerIds.length?selected.blockerIds.map(id=><button key={id} onClick={()=>store.patch({selectedVehicleId:id})}>#{id}</button>):'No conflicting lane reservation detected'}</dd></dl>
  </>:<p>{s.selectedVehicleId?'That vehicle has finished its trip. Choose another.':'Choose the stuck ambulance or police car.'}</p>}
  <button onClick={capture}>Copy debug report</button><span role="status">{copyStatus}</span>
  {snapshot&&<details><summary>Captured report</summary><textarea aria-label="Debug report" readOnly value={snapshot} onFocus={e=>e.target.select()}/></details>}
 </section>;
}
