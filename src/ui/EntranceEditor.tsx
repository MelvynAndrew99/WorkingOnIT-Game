import {cityCommand} from '../game/cityControls.ts';
import {useStore} from '../state/store.ts';

export default function EntranceEditor({id,entrances}:{id:number;entrances:number}) {
    const draft=useStore(s=>s.apartmentEntranceDraft),slot=useStore(s=>s.entranceEditSlot);
    const editing=draft===id&&slot!==null;
    if(!editing)return draft===id?null:<div className="direction-actions"><button onClick={()=>cityCommand({type:'building-entrance-edit',id})}>Edit entrances</button></div>;
    return <>
        <p className="place-card-hint">{slot==='primary'?'Choose a highlighted corner for the first entrance.':'Choose a highlighted edge tile for the second entrance.'} No charge.</p>
        <div className="direction-actions">
            <button aria-pressed={slot==='primary'} onClick={()=>cityCommand({type:'building-entrance-edit',id,slot:'primary'})}>First entrance</button>
            {entrances===2&&<button aria-pressed={slot==='secondary'} onClick={()=>cityCommand({type:'building-entrance-edit',id,slot:'secondary'})}>Second entrance</button>}
            <button onClick={()=>cityCommand({type:'building-entrance-edit',id,cancel:true})}>Cancel edit</button>
        </div>
    </>;
}
