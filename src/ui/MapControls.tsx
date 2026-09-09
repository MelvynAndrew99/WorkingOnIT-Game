import { useRef, useState } from 'react';
import { store, useStore } from '../state/store.ts';
import { expandedMap, type ExpansionDirection } from '../game/cityMap.ts';
import { cityCommand } from '../game/cityControls.ts';
import './mapControls.css';
export default function MapControls() {
    const map = useStore(s => s.map);
    const panning = useStore(s => s.panning);
    const [direction, setDirection] = useState<ExpansionDirection>('east');
    const dialog = useRef<HTMLDialogElement>(null);
    const next = expandedMap(map, direction);
    const bounds = next ?? map;
    return <>
        <div className="map-controls" aria-label="Map camera and expansion">
            <button aria-pressed={panning} onClick={() => store.patch({panning:!panning})}>Pan</button>
            <button aria-label="Zoom out" onClick={() => cityCommand({type:'zoom',factor:1/1.25})}>−</button>
            <button aria-label="Zoom in" onClick={() => cityCommand({type:'zoom',factor:1.25})}>+</button>
            <button onClick={() => cityCommand({type:'home'})}>Town</button>
            <button onClick={() => dialog.current?.showModal()}>Expand</button>
        </div>
        <dialog ref={dialog} className="expansion-dialog" aria-labelledby="expansion-heading">
            <h2 id="expansion-heading">Room to grow</h2>
            <p>Choose an edge. New land is free.</p>
            <svg className="expansion-preview" viewBox={`${bounds.x-2} ${bounds.y-2} ${bounds.width+4} ${bounds.height+4}`} role="img" aria-label={next ? `${map.width} by ${map.height} town, expand ${direction} to ${next.width} by ${next.height}` : 'Maximum map size reached on this axis'}>
                <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill="#eccb78" />
                <rect x={map.x} y={map.y} width={map.width} height={map.height} fill="#578971" stroke="#c8e0c2" strokeWidth=".5" />
            </svg>
            <p>Green: your town. Gold: new land.</p>
            <div className="expansion-directions">{(['north','east','south','west'] as const).map(d => <button key={d} aria-pressed={direction===d} onClick={() => setDirection(d)}>{d[0].toUpperCase()+d.slice(1)}</button>)}</div>
            <p>{next ? `${map.width} × ${map.height} → ${next.width} × ${next.height} tiles` : 'This axis has reached its 64-tile limit.'}</p>
            <button disabled={!next} className="expand-confirm" onClick={() => { cityCommand({type:'expand',direction}); dialog.current?.close(); }}>Add land</button>
            <button onClick={() => dialog.current?.close()}>Cancel</button>
        </dialog>
    </>;
}
