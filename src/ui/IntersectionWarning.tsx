import {cityCommand} from '../game/cityControls.ts';
import {useStore} from '../state/store.ts';

/** Same actionable safety warning in sandbox and challenges; the model owns its threshold. */
export default function IntersectionWarning(){
  const s=useStore(),warning=s.incidentInfo.warning;
  return <>
    {warning&&<p className="intersection-warning" role="status">{warning}</p>}
    {s.busStopNotices.length>0&&<button className="city-warning bus-stop-warning" onClick={()=>cityCommand({type:'bus-stop',action:'inspect',id:s.busStopNotices[0].id})}>
      {s.busStopNotices.length} bus stop{s.busStopNotices.length===1?'':'s'} cannot be served · Show
    </button>}
  </>;
}
