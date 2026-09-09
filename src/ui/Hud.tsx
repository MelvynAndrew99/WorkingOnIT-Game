import MapControls from './MapControls.tsx';
import { store, useStore } from '../state/store.ts';
import { flushSave } from '../state/save.ts';
import type { Tool } from '../game/cityModel.ts';
const tools: { id: Tool; title: string; detail: string; key: string }[] = [
    { id: 'home', title: 'Home', detail: '$200', key: '1' },
    { id: 'store', title: 'Store', detail: '$400', key: '2' },
    { id: 'road', title: 'Road', detail: '$20', key: '3' },
    { id: 'bulldoze', title: 'Remove', detail: '100% back', key: '4' },
];
export default function Hud() {
    const s = useStore();
    return <div className="city-ui">
        <header className="city-header">
            <div className="city-heading"><strong>YOUR TOWN</strong><button onClick={() => { flushSave(); store.patch({ phase: 'menu' }); }}>Menu</button></div>
            <div className="city-stats"><b>${s.funds.toLocaleString()}</b><span>+${s.income} / 10s</span></div>
            <div className="city-metrics"><span>{s.connected}/{s.homes} homes connected</span><span>{s.completed} trips done</span></div>
            <div className="city-route">{s.tripSeconds === null ? 'Link entrances to start trips' : `Average roundtrip: ${s.tripSeconds.toFixed(1)}s`}</div>
            <MapControls />
        </header>
        <footer className="city-controls">
            <div className="city-feedback" role="status">{s.message}</div>
            <div className="city-tools">{tools.map(t => <button key={t.id} aria-pressed={s.tool === t.id && !s.panning} title={`${t.key}: ${t.title}`} onClick={() => store.patch({ tool: t.id, panning: false })}><strong>{t.title}</strong><span>{t.detail}</span></button>)}</div>
            <div className="city-actions"><button onClick={() => store.patch({ rotation: (s.rotation + 1) % 4 })} disabled={s.tool !== 'home' && s.tool !== 'store'}>Rotate ↻ {['S','W','N','E'][s.rotation]}</button><button onClick={() => store.patch({ paused: !s.paused })}>{s.paused ? '▶ Resume' : 'Ⅱ Pause'}</button></div>
            <p>{s.panning ? 'Drag to move. Pinch or use + / − to zoom.' : s.paused ? 'Paused. Building is still available.' : `${s.activeTrips} traveling • Select Pan to move`}</p>
        </footer>
    </div>;
}
