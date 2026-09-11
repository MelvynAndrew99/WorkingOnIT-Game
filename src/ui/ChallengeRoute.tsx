import {useEffect,useRef,useState,type CSSProperties,type PointerEvent} from 'react';
import {CHALLENGES,type ChallengeId} from '../game/cityChallenges.ts';
import {challengeHasStar,hasChallengeRun} from '../state/challenges.ts';
import {store} from '../state/store.ts';
import {AwardRibbon} from './ChallengeAwards.tsx';
import './challengeRoute.css';

const WIDTH=960,HEIGHT=1440;
// One continuous street itinerary, southwest to the town hall. No district gates.
const sites=Array.from({length:25},(_,i)=>{
  const row=Math.floor(i/5),column=row%2===0?i%5:4-i%5;
  return {number:i+1,x:WIDTH*(.17+column*.168),y:HEIGHT*[.96,.751,.561,.343,.151][row]};
});
function streetLeg(from:typeof sites[number],to:typeof sites[number]){
  // The right-hand blocks have no continuous north/south street: use the central avenue.
  return from.y!==to.y&&from.x>WIDTH*.7?[{...from,x:WIDTH*.506},{...to,x:WIDTH*.506},to]:[to];
}
const itinerary=sites.flatMap((p,i)=>i?streetLeg(sites[i-1],p):[p]);
const route=itinerary.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ');
const hints=[
  {x:15,y:1200,quote:'“If this queue vanished, who would need me?”',reply:'Crew: They still need the crossing, sir.',landmark:'Coffee corner'},
  {x:655,y:1210,quote:'“A plaque? For this tiny curb? Make it bigger.”',reply:'Crew: The curb or the plaque?',landmark:'Works yard'},
  {x:365,y:930,quote:'“A shortcut! Put my name on it.”',reply:'Crew: Let’s check where it comes out first.',landmark:'School run'},
  {x:100,y:680,quote:'“They got to the shops. Excellent leadership.”',reply:'Crew: They still have to get home.',landmark:'Neighborhood shops'},
  {x:610,y:570,quote:'“More parking. More progress. More me.”',reply:'Crew: First, a way into the car park.',landmark:'Supermarket approach'},
  {x:335,y:300,quote:'“The detour’s open. Shall I cut the ribbon?”',reply:'Crew: After the ambulance gets through.',landmark:'Clinic approach'},
  {x:600,y:70,quote:'“Room for another award? I planned ahead.”',reply:'Crew: Now let’s plan the roads.',landmark:'Town hall'},
];
let previousSuggested:number|null=null;
export default function ChallengeRoute({select}:{select:(id:ChallengeId)=>void}){
  const scroll=useRef<HTMLDivElement>(null),board=useRef<HTMLDivElement>(null),traveller=useRef<HTMLImageElement>(null);
  const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
  const [notice,setNotice]=useState('Levels 1–4 ready. Level 5 is in the works.');
  const awards=CHALLENGES.filter(d=>challengeHasStar(d.id)).length;
  const first=CHALLENGES.findIndex(d=>!challengeHasStar(d.id));
  const suggested=first<0?CHALLENGES.length+1:first+1;
  const target=sites[suggested-1],definition=CHALLENGES[suggested-1];
  const markerTop=(p:typeof target)=>p.y>HEIGHT*.9?p.y-112:p.y+36;
  function centerCurrent(){const host=scroll.current,city=board.current;if(host&&city){const bounds=city.getBoundingClientRect(),view=host.getBoundingClientRect();host.scrollTo({left:bounds.left-view.left+host.scrollLeft+target.x-host.clientWidth/2,top:bounds.top-view.top+host.scrollTop+target.y-host.clientHeight*.45});}}
  useEffect(()=>{
    centerCurrent();
    const before=previousSuggested;previousSuggested=suggested;
    if(before!==null&&before<suggested&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const leg=sites.slice(before-1,suggested);
      const path=leg.flatMap((p,i)=>i?streetLeg(leg[i-1],p):[p]).map(p=>({left:`${p.x}px`,top:`${markerTop(p)}px`}));
      const animation=traveller.current?.animate(path,{duration:Math.min(2400,(suggested-before)*900),easing:'ease-in-out'});
      return ()=>animation?.cancel();
    }
  },[]);
  function pointerDown(e:PointerEvent<HTMLDivElement>){if(e.pointerType!=='mouse'||e.button!==0||(e.target as HTMLElement).closest('button'))return;drag.current={x:e.clientX,y:e.clientY,left:e.currentTarget.scrollLeft,top:e.currentTarget.scrollTop};e.currentTarget.setPointerCapture(e.pointerId);}
  function pointerMove(e:PointerEvent<HTMLDivElement>){const start=drag.current;if(start){e.currentTarget.scrollLeft=start.left-(e.clientX-start.x);e.currentTarget.scrollTop=start.top-(e.clientY-start.y);}}
  return <main className="journey-screen" aria-label="Mission progression">
    <header className="journey-header">
      <button onClick={()=>store.patch({phase:'menu'})} className="journey-back" aria-label="Main menu">‹ <span>Menu</span></button>
      <div className="journey-brand">WORKING <strong>ON IT!</strong></div>
      <div className="journey-awards" aria-label={`${awards} completion awards`}><AwardRibbon/> <strong>{awards}</strong><small>/ {CHALLENGES.length}</small></div>
      <button className="journey-sandbox" onClick={()=>store.patch({phase:'playing',paused:false,tool:null,panning:false,rotation:0})}>Sandbox ↗</button>
    </header>
    <div className="journey-mapbar"><span><strong>ONE TOWN. 25 JOBS.</strong><small>Fix the commute. Take the credit.</small></span><button onClick={centerCurrent}>Find The Man <span aria-hidden="true">↗</span></button></div>
    <div className="journey-scroll" ref={scroll} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} aria-label="City map. Drag or scroll to explore.">
      <div className="commute-map" ref={board} style={{width:WIDTH,height:HEIGHT}}>
        <img src="images/challenges/starter-town.png" className="commute-art" alt="" draggable={false}/>
        <svg className="journey-road" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true"><path d={route} className="journey-road-shadow"/><path d={route} className="journey-road-dots"/></svg>
        <ol className="journey-levels" aria-label="Challenge levels">
          {sites.map(point=>{const level=CHALLENGES[point.number-1],earned=!!level&&challengeHasStar(level.id),active=point.number===suggested;
            return <li key={point.number} className={`journey-stop${active?' is-current':''}${earned?' is-complete':''}${!level?' is-upcoming':''}`} style={{left:point.x,top:point.y} as CSSProperties}>
              <button className="journey-node" aria-label={`Level ${point.number}${earned?', completed':!level?', coming soon':', playable'}`} aria-disabled={!level} aria-current={active?'step':undefined} onClick={()=>{if(level)select(level.id);else setNotice(`Level ${point.number}: survey crew still out. Coming soon.`);}}>
                <span className="node-face">{earned?<img src="images/challenges/the-man-portrait.png" alt="" draggable={false}/>:<span className="node-number">{point.number}</span>}</span>
                {earned&&<AwardRibbon className="node-ribbon" number={point.number}/>}
              </button>
              {!level&&point.number===5&&<span className="node-coming">IN THE WORKS</span>}
            </li>;
          })}
        </ol>
        <img ref={traveller} src="images/challenges/the-man-walker.png" className="route-traveller" alt={`The Man at level ${suggested}`} style={{left:target.x,top:markerTop(target)}} draggable={false}/>
        <div className={`journey-current${target.x>WIDTH*.7?' is-left':''}`} style={{left:target.x+(target.x>WIDTH*.7?-34:34),top:markerTop(target)+29}}>{definition?<button className="journey-continue" onClick={()=>select(definition.id)}>{hasChallengeRun(definition.id)?'Continue':'Work this site'} →</button>:<span className="journey-frontier">Crews assembling…</span>}</div>
        {hints.map(hint=><button className="map-hint" key={hint.landmark} style={{left:hint.x,top:hint.y}} aria-label={`${hint.landmark}: hear The Man and the crew`} onClick={()=>setNotice(`${hint.quote} ${hint.reply}`)}><span>{hint.landmark}</span><strong aria-hidden="true">“…”</strong></button>)}
        <div className="map-workzone"><i aria-hidden="true"/><strong>More work. Same town.</strong><span>Levels 5–25 are planned sites.</span></div>
      </div>
    </div>
    <footer className="journey-footer"><span role="status">{notice}</span><small>Drag the map to explore · Ribbons mark completed jobs</small></footer>
  </main>;
}
