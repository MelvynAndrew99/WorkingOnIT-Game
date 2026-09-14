import { useEffect, useRef, useState, type ReactNode } from 'react';
import { store, useStore, selectConstructionTool } from '../state/store.ts';
import { getSave, flushSave } from '../state/save.ts';
import { cityCommand } from '../game/cityControls.ts';
import { expansionSnapshot, markExpansionBriefingSeen } from '../game/cityExpansion.ts';
import { IconInspect, IconTown } from './hudIcons.tsx';
import './mapControls.css';

/** Inspect, recenter, and the one-time mayor speech after the two free plots. */
export default function MapControls({ children }: { children?: ReactNode }) {
    const state = useStore();
    const { panning } = state;
    const expansion = expansionSnapshot(getSave().city);
    const [briefing, setBriefing] = useState(false);
    const mayorDialog = useRef<HTMLDialogElement>(null);
    const townButton = useRef<HTMLButtonElement>(null);
    const briefingOpened = useRef(false);
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
            townButton.current?.focus();
        }
    };
    return <>
        <div className="map-rail" role="group" aria-label="Map camera">
            <button aria-pressed={state.tool===null&&!panning&&state.movingBusStop===null&&state.transitDraft===null} onClick={()=>selectConstructionTool(null)}><IconInspect /><span>Inspect</span></button>
            <button ref={townButton} title="Centre on your town" onClick={() => cityCommand({ type: 'home' })}><IconTown /><span>Town</span></button>
            {children}
        </div>
        <dialog ref={mayorDialog} className="expansion-dialog" aria-labelledby="expansion-mayor-heading" onClose={closed}>
                <p className="expansion-speaker">Your city manager</p>
                <h2 id="expansion-mayor-heading">A small update from the mayor</h2>
                <blockquote>“More land, more roads! A tremendous success. Apparently ‘free’ meant the first two. The next plots have a price on the sign. Luckily, collecting money is what I’m famous for.”</blockquote>
                <p>Pan across the map to see locked land. Tap a For sale sign next to your town to buy that plot. Panning does not spend money.</p>
                <p>Your two free plots and everything you built stay yours. Traffic is paused while you plan.</p>
                <button autoFocus onClick={() => mayorDialog.current?.close()}>Got it — let’s buy more land</button>
        </dialog>
    </>;
}
