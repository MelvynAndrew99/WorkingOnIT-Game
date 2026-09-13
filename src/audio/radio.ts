/**
 * W-ON-IT City Radio: title-screen station with a tunable FM dial.
 * Locked songs play a short preview; unlocked songs play in full and the station
 * rolls on to the next unlocked song. Independent of the city model and artwork.
 */
import {musicSettings, setRadioHold} from './music.ts';

export const PREVIEW_SECONDS = 20;
export const DIAL_MIN = 88;
export const DIAL_MAX = 108;
/** How close the needle must be to a station to lock on (MHz). */
export const TUNE_WINDOW = 0.3;

/** How a song becomes fully playable. Anything not unlocked plays its preview. */
export type RadioUnlock =
    | {kind: 'free'}
    | {kind: 'mission'; challengeId: string; label: string}
    | {kind: 'purchase'; sku: string; label: string};

export interface RadioTrack {
    id: string;
    title: string;
    artist: string;
    src: string;
    /** Dial position in MHz, unique per song. */
    frequency: number;
    /** What the DJ (The Man) says while the song is on air. */
    dj: string;
    unlock: RadioUnlock;
    previewStart?: number;
    previewSeconds?: number;
}

/** Add songs at 128kbps in public/audio/radio/ and list them here. */
export const RADIO_TRACKS: readonly RadioTrack[] = [
    {id:'what-a-jam', title:'What a Jam!', artist:'The Man', src:'audio/radio/what-a-jam.mp3', frequency:101.5,
        dj:'My song. About me. Requested by me.', unlock:{kind:'mission', challengeId:'what-a-jam', label:'Beat Level 25 to hear the whole song'},
        previewStart:33, previewSeconds:PREVIEW_SECONDS},
    {id:'room-for-us', title:'Room For Us', artist:'City Works', src:'audio/radio/room-for-us.mp3', frequency:98.7,
        dj:'A song about being needed. I relate. Deeply.', unlock:{kind:'purchase', sku:'radio-room-for-us', label:'Unlock with game credits'},
        previewStart:39, previewSeconds:PREVIEW_SECONDS},
    {id:'fill-it-up', title:'Fill It Up!', artist:'City Works', src:'audio/radio/fill-it-up.mp3', frequency:95.5,
        dj:'Long commute, empty wallet. Lucky they have me.', unlock:{kind:'purchase', sku:'radio-fill-it-up', label:'Unlock with game credits'},
        previewStart:50, previewSeconds:PREVIEW_SECONDS},
    {id:'title', title:'Working ON IT!', artist:'City Works', src:'audio/music/TitleTheme.mp3', frequency:92.3,
        dj:'Our theme song. Inspired by me, basically.', unlock:{kind:'free'}},
    {id:'junction', title:'Busy Junction', artist:'City Works', src:'audio/music/pause-menu.mp3', frequency:105.7,
        dj:'Stuck in a queue? Stay calm. I am on it.', unlock:{kind:'free'}},
];

export const radioStations = () => [...RADIO_TRACKS].sort((a, b) => a.frequency - b.frequency);

export interface RadioState {
    power: boolean;
    /** Needle position in MHz. */
    dial: number;
    /** Station under the needle, or null between stations. */
    trackId: string | null;
    playing: boolean;
    loading: boolean;
    full: boolean;
    currentTime: number;
    duration: number;
    /** Set when a preview finishes or a recording is missing. */
    notice: string | null;
    missing: string[];
}

type AccessCheck = (track: RadioTrack) => boolean;
let hasAccess: AccessCheck = track => track.unlock.kind === 'free';
/** The UI supplies saved entitlements (mission awards, later purchases). */
export function setRadioAccess(check: AccessCheck) {
    hasAccess = check;
    emit();
}
export const radioTrackUnlocked = (track: RadioTrack) => hasAccess(track);

export function nearestStation(dial: number, stations: readonly RadioTrack[] = radioStations()) {
    let best: RadioTrack | null = null;
    for (const station of stations) if (!best || Math.abs(station.frequency - dial) < Math.abs(best.frequency - dial)) best = station;
    return {station: best, distance: best ? Math.abs(best.frequency - dial) : Infinity};
}
export function stationAt(dial: number, stations: readonly RadioTrack[] = radioStations()) {
    const {station, distance} = nearestStation(dial, stations);
    return distance <= TUNE_WINDOW + 1e-9 ? station : null;
}
/** Static loudness from 0 (locked on) to 1 (between stations). */
export function staticLevel(dial: number, stations: readonly RadioTrack[] = radioStations()) {
    const {distance} = nearestStation(dial, stations);
    return Math.min(1, Math.max(0, (distance - TUNE_WINDOW * .4) / (TUNE_WINDOW * 1.6)));
}
/** Neighbouring station for SEEK; `playableOnly` skips locked songs when the station rolls on. */
export function seekStation(dial: number, step: 1 | -1, stations: readonly RadioTrack[] = radioStations(), playableOnly?: AccessCheck) {
    const pool = playableOnly ? stations.filter(playableOnly) : [...stations];
    if (!pool.length) return null;
    const ahead = step > 0 ? pool.find(s => s.frequency > dial + 1e-6) : [...pool].reverse().find(s => s.frequency < dial - 1e-6);
    return ahead ?? (step > 0 ? pool[0] : pool[pool.length - 1]);
}
export function clipWindow(track: RadioTrack, fileDuration = Infinity, full = false) {
    const known = Number.isFinite(fileDuration) ? fileDuration : Infinity;
    if (full) return {start: 0, end: known, length: known};
    const start = Math.max(0, Math.min(track.previewStart ?? 0, Number.isFinite(known) ? known : Infinity));
    const end = Math.min(start + (track.previewSeconds ?? PREVIEW_SECONDS), known);
    return {start, end, length: Math.max(0, end - start)};
}
export function formatRadioTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const whole = Math.floor(seconds);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

const listeners = new Set<() => void>();
const FADE_SECONDS = 1.5;
let audio: HTMLAudioElement | null = null;
let power = false, dial = 101.5, trackId: string | null = null, playing = false, loading = false;
let notice: string | null = null, sleeping = false, resumeAfterSleep = false;
const missing = new Set<string>();
let snapshot: RadioState = build();

function build(): RadioState {
    const track = trackById(trackId), full = !!track && hasAccess(track);
    const clip = track ? clipWindow(track, fileDuration(), full) : {start: 0, length: 0};
    return {
        power, dial, trackId, playing, loading, full, notice, missing: [...missing],
        currentTime: audio && track ? Math.max(0, audio.currentTime - clip.start) : 0,
        duration: Number.isFinite(clip.length) ? clip.length : 0,
    };
}
function emit() {
    snapshot = build();
    for (const listener of listeners) listener();
}
function trackById(id: string | null) { return RADIO_TRACKS.find(track => track.id === id); }
function fileDuration() { return audio && Number.isFinite(audio.duration) ? audio.duration : Infinity; }

// Static between stations: generated noise, no download.
let context: AudioContext | null = null, noiseGain: GainNode | null = null;
function ensureStatic() {
    if (context) return;
    try {
        context = new AudioContext();
        const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const band = context.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = 2400;
        band.Q.value = .7;
        noiseGain = context.createGain();
        noiseGain.gain.value = 0;
        source.connect(band).connect(noiseGain).connect(context.destination);
        source.start();
    } catch { context = null; noiseGain = null; }
}
function setStatic(level: number) {
    if (!noiseGain || !context) return;
    const {volume, muted} = musicSettings();
    const gain = power && !sleeping && !muted ? level * volume * .35 : 0;
    noiseGain.gain.setTargetAtTime(gain, context.currentTime, .03);
    if (gain > 0 && context.state === 'suspended') void context.resume();
}

function applyVolume() {
    if (!audio) return;
    const {volume, muted} = musicSettings();
    const track = trackById(trackId);
    let fade = 1;
    if (track && !hasAccess(track) && Number.isFinite(audio.currentTime)) {
        const clip = clipWindow(track, fileDuration());
        fade = Math.min(1, Math.max(0, (clip.end - audio.currentTime) / FADE_SECONDS));
    }
    audio.volume = volume * fade;
    audio.muted = muted || sleeping;
}
function stopAudio() {
    audio?.pause();
    playing = false;
    loading = false;
}
function startTrack(track: RadioTrack) {
    if (!audio) return;
    notice = null;
    if (missing.has(track.id)) { stopAudio(); notice = 'No signal. This recording is not installed.'; emit(); return; }
    const full = hasAccess(track);
    if (trackId !== track.id || !audio.src.endsWith(track.src)) {
        audio.src = track.src;
        trackId = track.id;
    }
    const clip = clipWindow(track, fileDuration(), full);
    try { audio.currentTime = clip.start; } catch { /* seeks again once metadata arrives */ }
    loading = true;
    applyVolume();
    emit();
    audio.play().then(() => {
        loading = false;
        playing = true;
        if (!power || sleeping || trackId !== track.id) audio?.pause();
        emit();
    }).catch(() => { loading = false; playing = false; emit(); });
}
function onTimeUpdate() {
    if (!audio) return;
    const track = trackById(trackId);
    if (!track) return;
    const full = hasAccess(track);
    const clip = clipWindow(track, fileDuration(), full);
    if (!full && playing && audio.currentTime >= clip.end - .05) {
        stopAudio();
        try { audio.currentTime = clip.start; } catch { /* ignore */ }
        if (track.unlock.kind !== 'free') notice = `Preview over. ${track.unlock.label}.`;
    }
    applyVolume();
    emit();
}
function onEnded() {
    // A full song finished: the station rolls on to the next unlocked song.
    playing = false;
    const next = seekStation(dial, 1, radioStations(), hasAccess);
    if (power && next) tune(next.frequency, true);
    else emit();
}

export function initRadio(): void {
    if (audio) return;
    audio = new Audio();
    audio.preload = 'none';
    audio.addEventListener('loadedmetadata', () => {
        const track = trackById(trackId);
        if (track && audio) {
            const clip = clipWindow(track, fileDuration(), hasAccess(track));
            if (audio.currentTime < clip.start) audio.currentTime = clip.start;
        }
        emit();
    });
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', () => {
        if (!audio?.src || !trackId) return;
        missing.add(trackId);
        stopAudio();
        notice = 'No signal. This recording is not installed.';
        emit();
    });
    document.addEventListener('visibilitychange', () => setRadioSleeping(document.hidden));
}

export function radioState(): RadioState { return snapshot; }
export function subscribeRadio(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

/** Move the needle. `settle` locks onto a station under it and starts that song. */
export function tune(mhz: number, settle: boolean) {
    if (!Number.isFinite(mhz)) return;
    dial = Math.round(Math.min(DIAL_MAX, Math.max(DIAL_MIN, mhz)) * 10) / 10;
    const station = stationAt(dial);
    if (power) ensureStatic();
    setStatic(station && settle ? 0 : staticLevel(dial));
    if (!station) {
        if (trackId) { stopAudio(); trackId = null; notice = null; }
        emit();
        return;
    }
    if (!settle) {
        // Scrubbing across a station: keep the current song, do not start downloads.
        if (station.id !== trackId) { stopAudio(); trackId = station.id; notice = null; }
        emit();
        return;
    }
    const alreadyOnAir = trackId === station.id && (playing || loading);
    dial = station.frequency;
    trackId = station.id;
    if (power && !alreadyOnAir) startTrack(station);
    else emit();
}
export function seekRadio(step: 1 | -1) {
    const next = seekStation(dial, step);
    if (next) tune(next.frequency, true);
}
export function setRadioPower(on: boolean) {
    power = on;
    setRadioHold(on);
    if (on) {
        ensureStatic();
        const station = stationAt(dial);
        if (station) tune(station.frequency, true);
        else { setStatic(staticLevel(dial)); emit(); }
    } else {
        stopAudio();
        setStatic(0);
        notice = null;
        emit();
    }
}
/** Replay a preview (or restart a song) on the current station. */
export function replayRadio() {
    const track = trackById(trackId);
    if (!track) return;
    if (!power) { setRadioPower(true); return; }
    startTrack(track);
}
export function stopRadio() {
    if (power) setRadioPower(false);
    resumeAfterSleep = false;
}
export function setRadioSleeping(value: boolean) {
    sleeping = value;
    if (value) {
        resumeAfterSleep = playing;
        stopAudio();
        setStatic(0);
    } else {
        if (resumeAfterSleep && power) {
            const track = trackById(trackId);
            if (track) {
                // Resume where the song paused rather than restarting the preview.
                audio?.play().then(() => { playing = true; emit(); }).catch(() => emit());
            }
        }
        resumeAfterSleep = false;
        applyVolume();
    }
    emit();
}
