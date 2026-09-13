import {cityCommand} from '../game/cityControls.ts';
import {store,useStore} from '../state/store.ts';

const STOP_BOUND = ['west', 'north', 'east', 'south'] as const;

function stopName(id: number, stationId: number, order: number[]) {
    if (id === stationId) return 'Depot';
    const index = order.filter(stop => stop !== stationId).indexOf(id);
    return index >= 0 ? `Stop ${index + 1}` : 'Stop';
}

function routeLine(stationId: number, stops: number[]) {
    const board = stops.filter(id => id !== stationId);
    if (!board.length) return 'Choose at least two stops for a repeating route.';
    return `Depot → ${board.map((_, i) => `Stop ${i + 1}`).join(' → ')} → Depot`;
}

/** Fleet and ordered map taps share one compact inspector, with no route menus. */
export default function TransitPanel(){
    const s=useStore(), panel=s.transitPanel;

    if(s.busStopPanel){const stop=s.busStopPanel;return <div className="direction-editor transit-editor" role="group" aria-label="Bus stop">
        <div className="transit-head"><p className="transit-kicker">Transit</p><p className="transit-title">Bus stop</p></div>
        <div className="transit-stats">
            <span>{stop.waiting} waiting</span>
            <span>Longest wait {stop.waitSeconds}s</span>
        </div>
        {stop.issue&&<p role="status">This stop cannot be served. {stop.issue} Buses skip it until access is restored.</p>}
        {s.movingBusStop!==null?<>
            <p>Tap an empty roadside square. Existing riders and route order stay with this stop. No charge.</p>
            <div className="direction-actions">
                <button onClick={()=>store.patch({rotation:(s.rotation+1)%4})}>Rotate stop · {STOP_BOUND[s.rotation]}bound</button>
                <button onClick={()=>cityCommand({type:'bus-stop',action:'cancel'})}>Cancel move</button>
            </div>
        </>:<div className="direction-actions">
            <button onClick={()=>cityCommand({type:'bus-stop',action:'move',id:stop.id})}>Move stop</button>
            <button aria-label="Close bus stop" onClick={()=>cityCommand({type:'bus-stop',action:'close'})}>×</button>
        </div>}
    </div>;}
    if(!panel)return null;
    const draft=s.transitDraft;
    const chips=panel.summary.split(' · ').filter(Boolean);
    return <div className="direction-editor transit-editor" role="group" aria-label="Bus service">
        <div className="transit-head">
            <p className="transit-kicker">Transit</p>
            <p className="transit-title">Bus depot</p>
        </div>
        <div className="transit-stats">
            <span>{panel.fleet.length}/2 bays</span>
            {chips.map(chip => <span key={chip}>{chip}</span>)}
        </div>
        {draft ? <>
            <p>Tap stops in travel order. The depot is always the start and return.</p>
            <p className="transit-route">{draft.length?draft.map((id,i)=>`${i+1}. ${stopName(id, panel.stationId, draft)}`).join(' → '):'Choose the first stop.'}</p>
            <div className="direction-actions">
                <button disabled={new Set(draft).size<2} onClick={()=>cityCommand({type:'transit',action:'finish'})}>Finish route</button>
                <button disabled={!draft.length} onClick={()=>cityCommand({type:'transit',action:'undo'})}>Undo tap</button>
                <button onClick={()=>cityCommand({type:'transit',action:'cancel'})}>Cancel</button>
            </div>
        </> : <>
            <p className="transit-route">{routeLine(panel.stationId, panel.stops)}</p>
            {panel.blocked&&<p role="status">{panel.blocked}</p>}
            <div className="direction-actions">
                <button onClick={()=>cityCommand({type:'transit',action:'edit'})}>{panel.stops.length?'Edit stops':'Choose stops'}</button>
                <button disabled={panel.fleet.length>=2} onClick={()=>cityCommand({type:'transit',action:'buy'})}>Buy bus · $400</button>
                <button disabled={!panel.stops.length||!panel.fleet.length} onClick={()=>cityCommand({type:'transit',action:panel.running?'stop':'start'})}>{panel.running?'Return to depot':'Start service'}</button>
                <button aria-label="Close bus service" onClick={()=>cityCommand({type:'transit',action:'close'})}>×</button>
            </div>
            {panel.fleet.length>0&&<ul className="transit-fleet">
                {panel.fleet.map((bus, i)=><li key={bus.id}>
                    <strong>Bus {i+1}</strong>
                    <span>{bus.parked?'In bay':`${bus.riders}/8 aboard`}</span>
                    {bus.parked&&<button onClick={()=>cityCommand({type:'transit',action:'sell',busId:bus.id})}>Sell · ${bus.paid}</button>}
                </li>)}
            </ul>}
        </>}
    </div>;
}
