import { useState } from 'react';
import { useStore } from '../state/store.ts';
import { getSave } from '../state/save.ts';
import { cityCommand } from '../game/cityControls.ts';

/** Optional connection/reference sheet; active teaching belongs to TutorialCoach on the map. */
export default function TutorialPanel({close}:{close:()=>void}) {
  const s=useStore(),t=s.tutorial,city=getSave().city;
  const [confirmEnd,setConfirmEnd]=useState(false);
  if(!t)return null;
  return <>
    <section className="mission-budget"><h3>Outside traffic</h3>
      {city.external?.gateway?<p>Connected at {city.external.gateway.x}, {city.external.gateway.y}. Outside visitors use real roads and parking. Arrivals grow with your town.</p>:<>
        {city.external?.autoConnectRequested?<p>Outside traffic is enabled. It will connect automatically once your roads have a clear route to the map edge.</p>:<>
          <p>Finish the tutorial when you are ready for outside visitors. Your town stays intact and its city link is arranged automatically.</p>
          {confirmEnd?<div role="group" aria-label="Finish tutorial confirmation"><p>Finish the tutorial and invite outside traffic? A short, free access road is added if needed, without replacing your buildings.</p><button className="connection-primary" onClick={()=>{cityCommand({type:'finish-tutorial'});close();}}>Finish and welcome visitors</button><button onClick={()=>setConfirmEnd(false)}>Keep learning</button></div>:<button className="connection-primary" onClick={()=>setConfirmEnd(true)}>{t.status==='complete'?'Ready for outside visitors':'Finish tutorial'}</button>}
        </>}
      </>}
    </section>
    <section className="mission-budget"><h3>Your tutorial</h3><p>{t.completed}/{t.total} lessons completed. {t.status==='active'?'The current instruction stays on your game screen.':'Review the lessons here, or resume the on-screen guide.'}</p>
      {t.status!=='active'&&<button onClick={()=>{cityCommand({type:'tutorial',action:t.status==='available'?'start':'resume'});close();}}>Show guide</button>}
      {t.lessons.map(l=><details key={l.id}><summary>{l.title}{l.done?' · Done':''}</summary><p>{l.body}</p><p className="mission-crew">{l.hint}</p></details>)}
    </section>
  </>;
}
