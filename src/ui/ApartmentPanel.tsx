import EntranceEditor from './EntranceEditor.tsx';
import {cityCommand} from '../game/cityControls.ts';
import {useStore} from '../state/store.ts';

/** Inspect a placed apartment without pushing the upgrade action off the dock. */
export default function ApartmentPanel() {
    const draft=useStore(s=>s.apartmentEntranceDraft);
    const panel=useStore(s=>s.apartmentPanel), funds=useStore(s=>s.funds);
    const editSlot=useStore(s=>s.entranceEditSlot);
    if(!panel)return null;
    const editing=draft===panel.id&&editSlot!==null;
    const choosing=draft===panel.id&&!editing;
    return <div className="direction-editor place-card" role="group" aria-label="Apartment">
        <p className="place-card-title">Apartment</p>
        <p className="place-card-stats">{panel.residents} residents · {panel.entrances} {panel.entrances===1?'entrance':'entrances'}</p>
        {choosing&&<p className="place-card-hint">Tap a highlighted tile on any side for the second entrance.</p>}
        {panel.entrances===1&&!editing&&<div className="direction-actions">
            {choosing
                ? <button onClick={()=>cityCommand({type:'apartment-upgrade',id:panel.id,cancel:true})}>Cancel upgrade</button>
                : <button className="place-primary" disabled={funds<panel.upgradeCost} onClick={()=>cityCommand({type:'apartment-upgrade',id:panel.id})}>
                    Upgrade · choose entrance + 6 residents · ${panel.upgradeCost}
                </button>}
        </div>}
        <EntranceEditor id={panel.id} entrances={panel.entrances}/>
    </div>;
}
