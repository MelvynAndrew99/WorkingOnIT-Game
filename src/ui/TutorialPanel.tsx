import { useState } from 'react';
import { useStore } from '../state/store.ts';
import { getSave } from '../state/save.ts';
import { cityCommand } from '../game/cityControls.ts';
import { boundaryGatewayCandidates } from '../game/cityExternal.ts';

/** Optional connection/reference sheet; active teaching belongs to TutorialCoach on the map. */
export default function TutorialPanel({close}:{close:()=>void}) {
  const s=useStore(),t=s.tutorial,city=getSave().city;
  const [selected,setSelected]=useState('');
  if(!t)return null;
  const activeStarter=t.status==='active'&&!!city.tutorial?.hRoad;
  const canConnect=!activeStarter&&(t.status==='skipped'||t.status==='complete'||city.buildings.some(b=>b.kind==='home')&&city.buildings.some(b=>b.kind==='store'));
  const edges=boundaryGatewayCandidates(city),chosen=edges.find(p=>`${p.x},${p.y}`===selected)??edges[0];
  return <>
    <section className="mission-budget"><h3>Connect to the outside city</h3>
      {city.external?.gateway?<p>Connected at {city.external.gateway.x}, {city.external.gateway.y}. Outside visitors use real roads and parking. Arrivals grow with your town.</p>:<>
        <p>Invite more drivers when you are ready. Connecting keeps your town and ends active tutorial guidance.</p>
        {canConnect?chosen?<><label>Road at the map edge<select value={`${chosen.x},${chosen.y}`} onChange={e=>setSelected(e.target.value)}>{edges.map(p=><option key={`${p.x},${p.y}`} value={`${p.x},${p.y}`}>{p.x}, {p.y}</option>)}</select></label><button className="connection-primary" onClick={()=>{cityCommand({type:'connect',point:chosen});close();}}>Connect city</button></>:<p>Draw a road to any map edge, then choose it here. Connect a store or park to attract visitors.</p>:<p>{activeStarter?'Finish the guided road, diversion and rescue lessons to unlock the outside connection. Skip tutorial also unlocks it.':'Add a home and store, or exit the tutorial to make the connection available.'}</p>}
      </>}
    </section>
    <section className="mission-budget"><h3>Your tutorial</h3><p>{t.completed}/{t.total} lessons completed. {t.status==='active'?'The current instruction stays on your game screen.':'Review the lessons here, or resume the on-screen guide.'}</p>
      {t.status!=='active'&&<button onClick={()=>{cityCommand({type:'tutorial',action:t.status==='available'?'start':'resume'});close();}}>Show guide</button>}
      {t.lessons.map(l=><details key={l.id}><summary>{l.title}{l.done?' · Done':''}</summary><p>{l.body}</p><p className="mission-crew">{l.hint}</p></details>)}
    </section>
  </>;
}
