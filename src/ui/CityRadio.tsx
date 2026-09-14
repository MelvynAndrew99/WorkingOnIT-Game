import {useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties} from 'react';
import {
    DIAL_MAX, DIAL_MIN, RADIO_TRACKS, formatRadioTime, initRadio, radioStations, radioState, radioTrackUnlocked,
    replayRadio, seekRadio, setRadioAccess, setRadioPower, stopRadio, subscribeRadio, tune, type RadioState, type RadioTrack,
} from '../audio/radio.ts';
import type {ChallengeId} from '../game/cityChallenges.ts';
import {challengeHasStar} from '../state/challenges.ts';
import './cityRadio.css';

const SETTLE_MS = 320;
const bandPercent = (mhz: number) => ((mhz - DIAL_MIN) / (DIAL_MAX - DIAL_MIN)) * 100;

/** Saved entitlements decide which songs play in full. Purchases are not sold yet. */
function unlocked(track: RadioTrack) {
    if (track.unlock.kind === 'free') return true;
    if (track.unlock.kind === 'mission') return challengeHasStar(track.unlock.challengeId as ChallengeId);
    return false;
}
setRadioAccess(unlocked);

/** Tune to a station and make sure the set is on, as a preset or SEEK press does on a real radio. */
function playStation(track: RadioTrack) {
    tune(track.frequency, true);
    if (!radioState().power) setRadioPower(true);
}
function seekAndPlay(step: 1 | -1) {
    seekRadio(step);
    if (!radioState().power) setRadioPower(true);
}

function describe(radio: RadioState) {
    const current = RADIO_TRACKS.find(track => track.id === radio.trackId) ?? null;
    const locked = !!current && !radioTrackUnlocked(current);
    const status = !radio.power ? 'OFF' : !current ? 'NO SIGNAL' : radio.loading ? 'TUNING' : locked ? 'PREVIEW' : 'ON AIR';
    return {current, locked, status};
}

export interface CityRadioProps {
    /** Start with the full receiver open instead of the mini bar. */
    defaultExpanded?: boolean;
    /** Which way the full receiver opens from the mini bar. */
    opens?: 'up' | 'down';
    /** Turn the set off when this radio leaves the screen (title screen: yes). */
    stopOnUnmount?: boolean;
    className?: string;
}

/**
 * W-ON-IT City Radio. Self-contained: a mini "now playing" bar that expands into the full
 * receiver. The host only positions it; playback lives in audio/radio.ts.
 */
export default function CityRadio({defaultExpanded = false, opens = 'up', stopOnUnmount = true, className = ''}: CityRadioProps) {
    const radio = useSyncExternalStore(subscribeRadio, radioState);
    const [expanded, setExpanded] = useState(defaultExpanded);
    const root = useRef<HTMLDivElement>(null);
    const sheetId = useId();
    useEffect(() => {
        initRadio();
        return () => { if (stopOnUnmount) stopRadio(); };
    }, [stopOnUnmount]);
    useEffect(() => {
        if (!expanded) return;
        const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setExpanded(false); };
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false); };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
    }, [expanded]);
    const {current, locked, status} = describe(radio);

    return <div ref={root} className={`city-radio ${className}`} data-power={radio.power} data-playing={radio.playing} data-expanded={expanded} data-opens={opens}>
        {expanded && <RadioReceiver id={sheetId} radio={radio} onCollapse={() => setExpanded(false)} />}
        <div className="city-radio-mini" role="group" aria-label="W-ON-IT City Radio">
            <PowerButton on={radio.power} />
            <button type="button" className="city-radio-mini-info" aria-expanded={expanded} aria-controls={sheetId}
                aria-label={`${expanded ? 'Close' : 'Open'} City Radio. ${current ? `${current.frequency.toFixed(1)} FM, ${current.stationName}, ${current.title}` : 'Radio off'}`}
                onClick={() => { if (!radio.power) setRadioPower(true); setExpanded(value => !value); }}>
                <span className="city-radio-mini-title">{radio.power && current ? current.title : 'W-ON-IT City Radio'}</span>
                <span className="city-radio-mini-status">
                    {radio.playing ? <Equalizer /> : locked ? <LockIcon /> : <span className="city-radio-dot" aria-hidden="true" />}
                    {radio.power && current && <span className="city-radio-mini-freq">{current.frequency.toFixed(1)}</span>}
                    <span className="city-radio-mini-detail">{!radio.power ? 'Tap to tune in' : locked ? (radio.notice ? 'Preview over' : 'Preview') : status === 'ON AIR' ? current?.stationName : status.toLowerCase().replace(/^./, c => c.toUpperCase())}</span>
                </span>
                <svg className="city-radio-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
            </button>
            <button type="button" className="city-radio-key" aria-label="Next station" onClick={() => seekAndPlay(1)}>
                <svg className="is-solid" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 6 7 6-7 6zM13 6l7 6-7 6z" /></svg>
            </button>
        </div>
    </div>;
}

function RadioReceiver({id, radio, onCollapse}: {id: string; radio: RadioState; onCollapse: () => void}) {
    const settle = useRef<number | null>(null);
    useEffect(() => () => { if (settle.current !== null) clearTimeout(settle.current); }, []);
    const {current, locked, status} = describe(radio);
    const stations = radioStations();
    const progress = radio.duration > 0 ? Math.min(1, radio.currentTime / radio.duration) : 0;
    const scrub = (mhz: number) => {
        tune(mhz, false);
        if (settle.current !== null) clearTimeout(settle.current);
        settle.current = window.setTimeout(() => { settle.current = null; tune(radioState().dial, true); }, SETTLE_MS);
    };
    const settleNow = () => {
        if (settle.current !== null) clearTimeout(settle.current);
        settle.current = null;
        tune(radioState().dial, true);
    };
    let headline = 'Radio off', detail = 'Tap power or pick a station.';
    if (radio.power && !current) { headline = 'Static'; detail = 'Keep turning the dial.'; }
    else if (current) { headline = current.title; detail = current.stationName; }

    return <section id={id} className="city-radio-receiver" aria-label="City Radio receiver">
        <header className="city-radio-head">
            <span className="city-radio-onair" aria-hidden="true"><span /> ON AIR</span>
            <p className="city-radio-callsign"><strong>W-ON-IT</strong> City Radio</p>
            <button type="button" className="city-radio-key" aria-label="Minimize radio" onClick={onCollapse}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </button>
        </header>

        <div className="city-radio-lcd" role="status" aria-live="polite">
            <div className="city-radio-lcd-top">
                <span className="city-radio-freq">{radio.dial.toFixed(1)}<small> FM</small></span>
                <span className="city-radio-status">{status}</span>
            </div>
            <p className="city-radio-title"><strong>{headline}</strong>{radio.playing && <Equalizer />}</p>
            <p className="city-radio-artist">{detail}</p>
            {radio.power && current && <>
                <p className="city-radio-dj">“{current.dj}”</p>
                <div className="city-radio-progress" aria-hidden="true"><span style={{width: `${progress * 100}%`}} /></div>
                <p className="city-radio-clock">{formatRadioTime(radio.currentTime)} / {formatRadioTime(radio.duration)}</p>
            </>}
            {(radio.notice || (locked && current && current.unlock.kind !== 'free')) && <p className="city-radio-lock">
                <LockIcon />
                <span>{radio.notice ?? (current && current.unlock.kind !== 'free' ? `${current.unlock.label}.` : '')}</span>
                {radio.power && locked && !radio.playing && !radio.loading && <button type="button" onClick={replayRadio}>Replay</button>}
            </p>}
        </div>

        <div className="city-radio-tuner">
            <PowerButton on={radio.power} />
            <button type="button" className="city-radio-key" aria-label="Seek down" onClick={() => seekAndPlay(-1)}>
                <svg className="is-solid" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6l-7 6 7 6zM11 6l-7 6 7 6z" /></svg>
            </button>
            <div className="city-radio-band">
                <div className="city-radio-band-scale" aria-hidden="true">
                    {stations.map(track => <span key={track.id} className="city-radio-band-mark" data-locked={!radioTrackUnlocked(track)}
                        style={{left: `${bandPercent(track.frequency)}%`}} />)}
                    <span className="city-radio-needle" style={{left: `${bandPercent(radio.dial)}%`} as CSSProperties} />
                </div>
                <input type="range" min={DIAL_MIN} max={DIAL_MAX} step="0.1" value={radio.dial}
                    aria-label="Tuning dial" aria-valuetext={`${radio.dial.toFixed(1)} FM${current ? `, ${current.stationName}, ${current.title}` : ''}`}
                    onChange={event => scrub(Number(event.target.value))} onPointerUp={settleNow} />
            </div>
            <button type="button" className="city-radio-key" aria-label="Seek up" onClick={() => seekAndPlay(1)}>
                <svg className="is-solid" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 6 7 6-7 6zM13 6l7 6-7 6z" /></svg>
            </button>
        </div>

        <ul className="city-radio-stations" aria-label="Stations">
            {stations.map(track => {
                const open = radioTrackUnlocked(track);
                const on = radio.trackId === track.id;
                const missing = radio.missing.includes(track.id);
                return <li key={track.id}>
                    <button type="button" data-current={on} data-locked={!open} onClick={() => playStation(track)}
                        aria-label={`${track.stationName}, ${track.title} by ${track.artist}, ${track.frequency.toFixed(1)} FM${open ? '' : ', preview only'}${missing ? ', not installed' : ''}`}>
                        <span className="city-radio-station-freq">{track.frequency.toFixed(1)}</span>
                        <span className="city-radio-station-name"><strong>{track.title}</strong><small>{track.stationName}</small></span>
                        <span className="city-radio-station-state">{on && radio.playing ? <Equalizer /> : !open ? <><LockIcon /><span className="city-radio-station-preview">Preview</span></> : null}</span>
                    </button>
                </li>;
            })}
        </ul>
    </section>;
}

function PowerButton({on}: {on: boolean}) {
    return <button type="button" className="city-radio-power" aria-pressed={on} aria-label={on ? 'Turn radio off' : 'Turn radio on'} onClick={() => setRadioPower(!on)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v8M6.4 6.6a8 8 0 1 0 11.2 0" /></svg>
    </button>;
}
function Equalizer() {
    return <span className="city-radio-eq" aria-hidden="true"><i /><i /><i /><i /></span>;
}
function LockIcon() {
    return <svg className="city-radio-lock-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
}
