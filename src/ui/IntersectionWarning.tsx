import {useStore} from '../state/store.ts';

/** Same actionable safety warning in sandbox and challenges; the model owns its threshold. */
export default function IntersectionWarning(){
  const warning=useStore(s=>s.incidentInfo.warning);
  return warning?<p className="intersection-warning" role="status">{warning}</p>:null;
}
