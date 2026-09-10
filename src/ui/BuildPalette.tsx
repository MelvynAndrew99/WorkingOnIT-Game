import { useEffect } from 'react';
import { LABELS, toolPrices, type PricedTool, type Tool } from '../game/cityModel.ts';
import { starterToolAllowed } from '../game/cityStarterTutorial.ts';
import { getSave } from '../state/save.ts';
import { store, useStore } from '../state/store.ts';
import { isBuildingTool } from './cityLabels.ts';
import './buildPalette.css';
import {useTutorialGuidance} from './TutorialGuidance.tsx';

type Category = 'roads' | 'places' | 'services';
type Entry = { tool: Tool; label: string; name?: string; note: string; key?: string };
const GROUPS: { id: Category; label: string; entries: Entry[] }[] = [
    { id: 'roads', label: 'Roads', entries: [
        { tool: 'road', label: 'Road', key: '3', note: 'Drag to draw. Link every entrance arrow.' },
        { tool: 'stop', label: 'Stops', name: 'All-way stop', key: '5', note: 'Tap a junction. Cars halt, then take turns.' },
        { tool: 'signal', label: 'Lights', name: 'Traffic lights', key: '6', note: 'Tap a junction to cycle balanced, N/S, E/W.' },
        { tool: 'closure', label: 'Divert', name: 'Road closure', key: '7', note: 'Tap a road to close or reopen it. Cars detour.' },
    ] },
    { id: 'places', label: 'Places', entries: [
        { tool: 'home', label: 'Home', key: '1', note: 'One car per home, out to shops and parks.' },
        { tool: 'store', label: 'Store', key: '2', note: 'Shopping visits pay when they finish.' },
        { tool: 'park', label: 'Park', note: 'Recreation visits support household income.' },
        { tool: 'bulldoze', label: 'Clear', name: 'Remove, full refund', key: '4', note: 'Refunds what you paid. Tap a building or road you placed.' },
    ] },
    { id: 'services', label: 'Services', entries: [
        { tool: 'policeStation', label: 'Police', note: 'Police patrol nearby roads and respond to crashes. Select the station to see its patrol radius.' },
        { tool: 'fireStation', label: 'Fire', note: 'Crews put out burning vehicles.' },
        { tool: 'hospital', label: 'Clinic', name: 'Clinic (Hospital)', note: 'EMS treats the injured before the deadline.' },
    ] },
];
/** Small code-native symbols stay legible independently of building artwork. */
function ToolIcon({tool,locked}:{tool:Tool;locked:boolean}) {
    const paths:Partial<Record<Tool,React.ReactNode>> = {
        road:<><path d="M5 2v20M19 2v20M12 2v4m0 4v4m0 4v4" /></>,
        home:<><path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7" /></>,
        store:<><path d="M3 9h18l-2-6H5L3 9Zm2 0v12h14V9M9 21v-7h6v7M3 9v3h18V9" /></>,
        park:<><path d="m12 2-7 9h4l-5 6h7v5h2v-5h7l-5-6h4L12 2Z" /></>,
        stop:<><path d="m8 2-6 6v8l6 6h8l6-6V8l-6-6H8Z" /><path d="M7 12h10" /></>,
        signal:<><rect x="7" y="2" width="10" height="20" rx="3"/><circle cx="12" cy="6" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="18" r="1"/></>,
        closure:<><path d="M3 6h18v9H3zM6 15v6m12-6v6M4 13l6-6m2 7 7-7" /></>,
        bulldoze:<><path d="m14 3 7 7-4 4-7-7 4-4ZM3 21l10-10M3 17l4 4" /></>,
        hospital:<><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z" /></>,
        policeStation:<><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z"/><path d="m8 12 3 3 5-6" /></>,
        fireStation:<><path d="M12 2c2 6-5 7-3 11 3-1 5-3 6-6 2 4 6 7 4 11-3 6-12 5-14 0C3 12 9 9 12 2Z" /></>,
    };
    return <svg className="build-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {locked?<><rect x="5" y="10" width="14" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 15v3"/></>:paths[tool]}
    </svg>;
}
const FACING = ['south', 'west', 'north', 'east'];
const fullName = (e: Entry): string => e.name ?? (isBuildingTool(e.tool) ? LABELS[e.tool] : e.label);
/** Tools the economy charges for. Closures and removal have no price. */
const PRICED = new Set<Tool>(['stop', 'signal', 'road', 'home', 'store', 'park', 'hospital', 'fireStation', 'policeStation']);
const priceOf = (prices: Record<PricedTool, number>, tool: Tool): number | null =>
    PRICED.has(tool) ? prices[tool as PricedTool] : null;

/** Uniform shelves share four columns, including the three-service shelf.
 * Narrow category browsing remains independent of tool selection and guidance.
 * Prices and locks come from the live town; unaffordable selection stays inspectable.
 */
export default function BuildPalette() {
    const s = useStore();
    const city = getSave().city;
    const prices = toolPrices(city);
    const guide=useTutorialGuidance();
    const {category,setCategory}=guide;
    useEffect(() => {
        const revealShortcut = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]')) return;
            if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable=true]')) return;
            const found = GROUPS.find(g => g.entries.some(e => e.key === event.key));
            if (found) setCategory(found.id);
        };
        window.addEventListener('keydown', revealShortcut);
        return () => window.removeEventListener('keydown', revealShortcut);
    }, [setCategory]);
    const priceLabel = (e: Entry): string => {
        if (e.tool === 'bulldoze') return 'Refund';
        const cost = priceOf(prices, e.tool);
        return cost === null || cost === 0 ? 'Free' : `$${cost}`;
    };
    function select(e: Entry) {
        if (!starterToolAllowed(city, e.tool)) return;
        const cost = priceOf(prices, e.tool);
        store.patch({ tool: e.tool, panning: false,
            message: cost !== null && cost > s.funds
                ? `${fullName(e)} costs $${cost}. You have $${s.funds.toLocaleString()} right now.`
                : `${fullName(e)} (${priceLabel(e)}). ${e.note}` });
    }
    return <div className="build-palette" role="group" aria-label="Build and traffic tools">
        <div className="build-categories" role="group" aria-label="Construction categories">
            {GROUPS.map(g => <button key={g.id} type="button" className="build-category"
                aria-label={g.label} data-tutorial-target={guide.categoryTarget===g.id}
                aria-describedby={guide.categoryTarget===g.id?'tutorial-locator-instruction':undefined}
                aria-pressed={category === g.id} aria-controls={`shelf-${g.id}`}
                onClick={() => setCategory(g.id)}>{g.label}</button>)}
        </div>
        {isBuildingTool(s.tool) && <button type="button" className="build-rotate" title="Rotate the footprint and entrance; artwork stays upright. Desktop shortcut: R."
            aria-label={`Rotate new buildings, entrance now facing ${FACING[s.rotation]}`}
            onClick={() => {
                const rotation = (s.rotation + 1) % 4;
                store.patch({ rotation, message: `Entrance faces ${FACING[rotation]}. The footprint and entrance rotate; artwork stays upright.` });
            }}><strong><span aria-hidden="true">↻ </span>Rotate <kbd>R</kbd></strong><em>Entrance: {FACING[s.rotation]}</em></button>}
        <div className="build-groups">
            {GROUPS.map(g => <section key={g.id} className="build-group" data-active={category === g.id}>
                <h3 className="build-group-label">{g.label}</h3>
                <div id={`shelf-${g.id}`} className="build-shelf" role="group" aria-label={`${g.label} tools`}
                    >
                    {g.entries.map(e => {
                        const cost = priceOf(prices, e.tool);
                        const locked = !starterToolAllowed(city, e.tool);
                        const unlock = e.tool === 'road' ? 'Unlocks at the bypass lesson' : e.tool === 'closure' ? 'Unlocks at the diversion lesson' : ['hospital','fireStation','policeStation'].includes(e.tool) ? 'Unlocks at the rescue lesson' : ['stop','signal'].includes(e.tool) ? 'Unlocks at the prevention lesson' : 'Unlocks as the tutorial progresses';
                        return <button key={e.tool} type="button" className="build-tool" data-tool={e.tool} data-locked={locked} disabled={locked}
                            data-tutorial-target={guide.tool===e.tool&&!guide.categoryTarget}
                            aria-describedby={guide.tool===e.tool&&!guide.categoryTarget?'tutorial-locator-instruction':undefined}
                            data-afford={cost !== null && cost > s.funds ? 'false' : 'true'}
                            data-waived={cost === 0 ? 'true' : 'false'}
                            aria-pressed={s.tool === e.tool && !s.panning}
                            aria-label={locked ? `${fullName(e)}, locked. ${unlock}` : cost === null ? fullName(e) : cost === 0 ? `${fullName(e)}, free right now` : `${fullName(e)}, $${cost}`}
                            title={locked ? unlock : cost !== null && cost > s.funds ? `${fullName(e)} costs $${cost}. You have $${s.funds.toLocaleString()}. Earn more funds to build.` : e.key ? `${e.key}: ${fullName(e)}` : fullName(e)} onClick={() => select(e)}>
                            <span className="build-tool-detail"><ToolIcon tool={e.tool} locked={locked} /><strong>{e.label}</strong></span><span className="build-cost">{locked ? 'Locked' : priceLabel(e)}</span>
                        </button>;
                    })}
                </div>
            </section>)}
        </div>
    </div>;
}
