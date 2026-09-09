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
        // Visible label is 'Clear' only because 'Remove' overflows a 71px card at 320px.
        // The accessible name, tooltip and tool identity stay 'Remove, full refund' / bulldoze.
        { tool: 'bulldoze', label: 'Clear', name: 'Remove, full refund', key: '4', note: 'Refunds what you paid. Tap a building or road you placed.' },
    ] },
    { id: 'services', label: 'Services', entries: [
        { tool: 'policeStation', label: 'Police', note: 'Police secure a crash and clear the road.' },
        { tool: 'fireStation', label: 'Fire', note: 'Crews put out burning vehicles.' },
        { tool: 'hospital', label: 'Clinic', name: 'Clinic (Hospital)', note: 'EMS treats the injured before the deadline.' },
    ] },
];
const FACING = ['south', 'west', 'north', 'east'];
const fullName = (e: Entry): string => e.name ?? (isBuildingTool(e.tool) ? LABELS[e.tool] : e.label);
/** Tools the economy charges for. Closures and removal have no price. */
const PRICED = new Set<Tool>(['stop', 'signal', 'road', 'home', 'store', 'park', 'hospital', 'fireStation', 'policeStation']);
const priceOf = (prices: Record<PricedTool, number>, tool: Tool): number | null =>
    PRICED.has(tool) ? prices[tool as PricedTool] : null;

/**
 * Every shelf is in the DOM at every size. A narrow frame shows the tabs and one
 * shelf; a wide frame hides the tabs and lays all eleven tools out at once, so the
 * desktop dock is one tap deep. Browsing changes the shelf; keyboard and objective
 * selections reveal their matching shelf.
 *
 * Rotate is a sibling of the shelves, not a member of one: sharing the shelf row cost
 * the four-tool categories a slot and clipped "Remove" on a 320px frame. It sits beside
 * the tabs on a phone and at the end of the tool row on a desktop.
 *
 * Prices come from the live city, never the catalog, so a tool the mayor has waived
 * reads Free instead of still looking like it costs money.
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
        <button type="button" className="build-rotate" title="R: Rotate entrance"
            aria-label={`Rotate new buildings, entrance now facing ${FACING[s.rotation]}`}
            onClick={() => {
                const rotation = (s.rotation + 1) % 4;
                store.patch({ rotation, message: `New building entrances face ${FACING[rotation]}. ${isBuildingTool(s.tool) ? 'The entrance arrow points that way.' : 'Pick a building to place one.'}` });
            }}><span aria-hidden="true">↻</span><em>{FACING[s.rotation]}</em></button>
        <div className="build-groups">
            {GROUPS.map(g => <section key={g.id} className="build-group" data-active={category === g.id}>
                <h3 className="build-group-label">{g.label}</h3>
                <div id={`shelf-${g.id}`} className="build-shelf" role="group" aria-label={`${g.label} tools`}
                    style={{ gridTemplateColumns: `repeat(${g.entries.length}, minmax(0, 1fr))` }}>
                    {g.entries.map(e => {
                        const cost = priceOf(prices, e.tool);
                        const locked = !starterToolAllowed(city, e.tool);
                        const unlock = e.tool === 'road' ? 'Unlocks at the bypass lesson' : e.tool === 'closure' ? 'Unlocks at the diversion lesson' : ['hospital','fireStation','policeStation'].includes(e.tool) ? 'Unlocks at the rescue lesson' : ['stop','signal'].includes(e.tool) ? 'Unlocks at the prevention lesson' : 'Unlocks as the tutorial progresses';
                        return <button key={e.tool} type="button" className="build-tool" data-tool={e.tool} disabled={locked}
                            data-tutorial-target={guide.tool===e.tool&&!guide.categoryTarget}
                            aria-describedby={guide.tool===e.tool&&!guide.categoryTarget?'tutorial-locator-instruction':undefined}
                            data-afford={cost !== null && cost > s.funds ? 'false' : 'true'}
                            data-waived={cost === 0 ? 'true' : 'false'}
                            aria-pressed={s.tool === e.tool && !s.panning}
                            aria-label={locked ? `${fullName(e)}, locked. ${unlock}` : cost === null ? fullName(e) : cost === 0 ? `${fullName(e)}, free right now` : `${fullName(e)}, $${cost}`}
                            title={locked ? unlock : e.key ? `${e.key}: ${fullName(e)}` : fullName(e)} onClick={() => select(e)}>
                            <strong>{e.label}</strong><span className="build-cost">{locked ? 'Locked' : priceLabel(e)}</span>
                        </button>;
                    })}
                </div>
            </section>)}
        </div>
    </div>;
}
