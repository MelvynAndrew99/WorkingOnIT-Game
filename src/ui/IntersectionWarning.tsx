import {cityCommand} from '../game/cityControls.ts';
import {useStore} from '../state/store.ts';

/** Same actionable safety warning in challenges; the model owns its threshold. */
export default function IntersectionWarning(){
  const s=useStore();
  const warning=s.incidentInfo.warnings[0];
  const text=warning?.text||s.incidentInfo.warning;
  return <>
    {text&&(warning
      ?<button className="intersection-warning" onClick={()=>cityCommand({type:'focus',point:{x:warning.x,y:warning.y}})}>{text} · Show</button>
      :<p className="intersection-warning" role="status">{text}</p>)}
    {s.busStopNotices.length>0&&<button className="city-warning bus-stop-warning" onClick={()=>cityCommand({type:'bus-stop',action:'inspect',id:s.busStopNotices[0].id})}>
      {s.busStopNotices.length} bus stop{s.busStopNotices.length===1?'':'s'} cannot be served · Show
    </button>}
  </>;
}
