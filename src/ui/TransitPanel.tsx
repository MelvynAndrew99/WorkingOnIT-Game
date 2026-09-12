import {cityCommand} from '../game/cityControls.ts';
import {useStore} from '../state/store.ts';

/** Fleet and ordered map taps share one compact inspector, with no route menus. */
export default function TransitPanel(){
    const s=useStore(), panel=s.transitPanel;
    if(!panel||s.phase==='challenge')return null;
    const draft=s.transitDraft;
    return <div className="direction-editor transit-editor" role="group" aria-label="Bus service">
        <p><strong>Bus depot {panel.stationId}</strong> · {panel.fleet.length}/2 bays · {panel.summary}</p>
        {draft ? <>
            <p>Tap stops in travel order. The depot is always the start and return.</p>
            <p>{draft.length?draft.map((id,i)=>`${i+1}: ${id===panel.stationId?'Depot':`Stop ${id}`}`).join(' → '):'Choose the first stop.'}</p>
            <div className="direction-actions">
                <button disabled={new Set(draft).size<2} onClick={()=>cityCommand({type:'transit',action:'finish'})}>Finish route</button>
                <button disabled={!draft.length} onClick={()=>cityCommand({type:'transit',action:'undo'})}>Undo tap</button>
                <button onClick={()=>cityCommand({type:'transit',action:'cancel'})}>Cancel</button>
            </div>
        </> : <>
            <p>{panel.stops.length?`Route ${panel.stationId}: Depot → ${panel.stops.filter(id=>id!==panel.stationId).map(id=>`Stop ${id}`).join(' → ')} → Depot`:'Choose at least two stops for a repeating route.'}</p>
            {panel.blocked&&<p role="status">{panel.blocked}</p>}
            <div className="direction-actions">
                <button onClick={()=>cityCommand({type:'transit',action:'edit'})}>{panel.stops.length?'Edit stops':'Choose stops'}</button>
                <button disabled={panel.fleet.length>=2} onClick={()=>cityCommand({type:'transit',action:'buy'})}>Buy bus · $400</button>
                <button disabled={!panel.stops.length||!panel.fleet.length} onClick={()=>cityCommand({type:'transit',action:panel.running?'stop':'start'})}>{panel.running?'Return to depot':'Start service'}</button>
                <button aria-label="Close bus service" onClick={()=>cityCommand({type:'transit',action:'close'})}>×</button>
            </div>
            {panel.fleet.map(bus=><p key={bus.id}>Bus {bus.id}: {bus.parked?'In bay':`${bus.riders}/8 riders`} {bus.parked&&<button onClick={()=>cityCommand({type:'transit',action:'sell',busId:bus.id})}>Sell · ${bus.paid}</button>}</p>)}
        </>}
    </div>;
}
