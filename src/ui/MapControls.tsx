import { useEffect, useRef, useState } from 'react';
import { store, useStore } from '../state/store.ts';
import { getSave, flushSave } from '../state/save.ts';
import { expandedMap, type ExpansionDirection } from '../game/cityMap.ts';
import { cityCommand, onCityCommand } from '../game/cityControls.ts';
import { connectedEdgeReason, expansionSnapshot, markExpansionBriefingSeen } from '../game/cityExpansion.ts';
import './mapControls.css';

/** Direction buttons share the map's fixed-camera compass. */
export default function MapControls({ wide }: { wide: boolean }) {
    const state = useStore();
    const { map, panning } = state;
    const expansion = expansionSnapshot(getSave().city);
    const [direction, setDirection] = useState<ExpansionDirection>('east');
    const [briefing, setBriefing] = useState(false);
    const dialog = useRef<HTMLDialogElement>(null);
    const mayorDialog = useRef<HTMLDialogElement>(null);
    const growButton = useRef<HTMLButtonElement>(null);
    const briefingOpened = useRef(false);
    const connectionBlocked = expansion.connectedEdge === direction;
    const next = connectionBlocked ? null : expandedMap(map, direction);
    const bounds = next ?? map;
    const teaching = state.tutorial?.status === 'active' && state.tutorial.currentId === 'h-expand';
    const openExpansion = () => {
        if (!document.querySelector('dialog[open]')) dialog.current?.showModal();
    };
    useEffect(() => onCityCommand(command => {
        if (command.type === 'open-expansion') openExpansion();
    }), []);
    // Queue the one-time funding explanation behind any already-open speech/menu.
    // Separate dialog ownership prevents a delayed expansion close event acknowledging the new speech.
    useEffect(() => {
        if (expansion.used < 2) briefingOpened.current = false;
        if (state.phase !== 'playing' || expansion.used < 2 || expansion.briefingSeen) return;
        const show = () => {
            if (briefingOpened.current || document.querySelector('dialog[open]') || expansionSnapshot(getSave().city).briefingSeen) return;
            briefingOpened.current = true;
            setBriefing(true);
            store.patch({ paused: true });
            mayorDialog.current?.showModal();
        };
        const observer = new MutationObserver(show);
        observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
        show();
        return () => observer.disconnect();
    }, [state.phase, expansion.used, expansion.briefingSeen]);
    useEffect(() => {
        if (briefing && !state.paused) store.patch({ paused: true });
    }, [briefing, state.paused]);
    const closed = () => {
        if (briefing) {
            markExpansionBriefingSeen(getSave().city);
            flushSave();
            setBriefing(false);
            store.patch({});
            growButton.current?.focus();
        }
    };
    return <>
        <div className="map-rail" role="group" aria-label="Map camera and expansion">
            <button aria-pressed={panning} title="Drag the map instead of building"
                aria-label={panning ? 'Pan mode on' : 'Pan mode off'}
                onClick={() => store.patch({ panning: !panning })}>{wide ? 'Pan map' : 'Pan'}</button>
            <button aria-label="Zoom in" title="Zoom in" onClick={() => cityCommand({ type: 'zoom', factor: 1.25 })}>{wide ? 'Zoom in' : '+'}</button>
            <button aria-label="Zoom out" title="Zoom out" onClick={() => cityCommand({ type: 'zoom', factor: 1 / 1.25 })}>{wide ? 'Zoom out' : '−'}</button>
            <button aria-label="Back to town" title="Centre on your town" onClick={() => cityCommand({ type: 'home' })}>Town</button>
            <button ref={growButton} className={teaching && state.showTips ? 'expansion-target' : undefined} aria-label="Add land at a map edge" title="Add land at a map edge" onClick={openExpansion}>{wide ? 'Add land' : 'Grow'}</button>
        </div>
        <dialog ref={mayorDialog} className="expansion-dialog" aria-labelledby="expansion-mayor-heading" onClose={closed}>
                <p className="expansion-speaker">Your city manager</p>
                <h2 id="expansion-mayor-heading">A small update from the mayor</h2>
                <blockquote>“More land, more roads! A tremendous success. Apparently ‘free’ meant the first two. The mayor wants results before funding the next expansion. Luckily, results are what I’m famous for.”</blockquote>
                <p>Finish the land mission to level up and earn another expansion permit. There’s no cash charge when you use a permit.</p>
                {expansion.permits>0&&<p>You already earned {expansion.permits} permit{expansion.permits===1?'':'s'} through completed growth missions. That work counts.</p>}
                <p><strong>Next mission:</strong> Keep {expansion.target} different households connected to shops after completing shopping visits. {expansion.current}/{expansion.target} served.</p>
                <p>Your two expansions and everything you built stay yours. Traffic is paused while you plan.</p>
                <button autoFocus onClick={() => mayorDialog.current?.close()}>Got it — let’s earn more land</button>
        </dialog>
        <dialog ref={dialog} className="expansion-dialog" aria-labelledby="expansion-heading">
                <h2 id="expansion-heading">Room to grow</h2>
                {expansion.freeRemaining > 0 ? <blockquote>“We need more land so we can build more roads! And it’s free! I do have a gift for negotiation.”</blockquote> : <p>The mayor funds more land when you finish land missions and level up.</p>}
                <p className="expansion-allowance"><strong>{expansion.freeRemaining > 0 ? `${expansion.freeRemaining} free expansion${expansion.freeRemaining === 1 ? '' : 's'} remaining` : `${expansion.permits} expansion permit${expansion.permits === 1 ? '' : 's'} available`}</strong> · Level {expansion.level}</p>
                <svg className="expansion-preview" viewBox={`${bounds.x - 2} ${bounds.y - 2} ${bounds.width + 4} ${bounds.height + 4}`} role="img" aria-label={next ? `${map.width} by ${map.height} town, expand ${direction} to ${next.width} by ${next.height}` : connectionBlocked ? 'Outside connection fixes this map edge' : 'Maximum map size reached on this axis'}>
                    <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill="#eccb78" />
                    <rect x={map.x} y={map.y} width={map.width} height={map.height} fill="#578971" stroke="#c8e0c2" strokeWidth=".5" />
                </svg>
                <p>Choose an edge. Green is your town; gold is new land.</p>
                <div className="expansion-directions" role="group" aria-label="Expansion direction">{(['north', 'west', 'east', 'south'] as const).map(d => <button key={d} className={`expansion-${d}`} aria-label={`Expand ${d}`} aria-pressed={direction === d} disabled={expansion.connectedEdge===d} onClick={() => setDirection(d)}>{d[0].toUpperCase() + d.slice(1)}</button>)}</div>
                {expansion.connectedEdge && <p>{connectedEdgeReason(expansion.connectedEdge)}</p>}
                <p>{next ? `${map.width} × ${map.height} → ${next.width} × ${next.height} tiles` : connectionBlocked ? 'Choose another edge to add land.' : 'This axis has reached its 64-tile limit.'}</p>
                {!expansion.canExpand && <p role="status">{expansion.lockedReason}</p>}
                {expansion.freeRemaining === 0 && <p>Next land mission: {expansion.target} connected households with completed shopping visits. <strong>{expansion.current}/{expansion.target}</strong></p>}
                <button disabled={!next || !expansion.canExpand} className="expand-confirm" onClick={() => { cityCommand({ type: 'expand', direction }); dialog.current?.close(); }}>Add land{expansion.freeRemaining > 0 ? ' · Free' : ' · 1 permit'}</button>
                <button onClick={() => dialog.current?.close()}>Cancel</button>
        </dialog>
    </>;
}
