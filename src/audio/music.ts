/**
 * Background music: one looping track (public/cdn-assets/main_theme.mp3),
 * fetched via the CDN API and played through an <audio> element. No SFX bus
 * yet — if the game grows sound effects, add a second bus here the same way
 * the tower defense template's src/audio/audio.ts does.
 *
 * Play state follows store.paused, which is already the single signal for
 * "the game isn't running right now" (Hud's Pause button and the host's
 * onPause/onResume lifecycle both write to it — see GameCanvas.tsx).
 *
 * Autoplay policy: browsers block audio before a user gesture. play() is
 * attempted immediately and retried on the first pointerdown/keydown if it
 * was rejected.
 */
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { store } from '../state/store.ts';

const TRACK = 'main_theme.mp3';
const VOLUME = 0.5;

let el: HTMLAudioElement | null = null;
let muted = false;

function tryPlay(): void {
    el?.play().catch(() => {
        const retry = () => {
            window.removeEventListener('pointerdown', retry);
            window.removeEventListener('keydown', retry);
            tryPlay();
        };
        window.addEventListener('pointerdown', retry, { once: true });
        window.addEventListener('keydown', retry, { once: true });
    });
}

/**
 * Call once at boot. Never throws — a failed fetch just means no music,
 * same posture as the rest of this template's SDK usage.
 */
export async function initMusic(): Promise<void> {
    try {
        const blob = await RundotGameAPI.cdn.fetchAsset(TRACK);
        const url = URL.createObjectURL(blob);
        el = new Audio(url);
        el.loop = true;
        el.volume = muted ? 0 : VOLUME;

        let lastPaused = store.get().paused;
        if (!lastPaused) tryPlay();
        store.subscribe(() => {
            const paused = store.get().paused;
            if (paused === lastPaused) return;
            lastPaused = paused;
            if (paused) el?.pause();
            else tryPlay();
        });
    } catch (err) {
        console.warn('[music] failed to load main theme', err);
    }
}

export function isMusicMuted(): boolean {
    return muted;
}

export function toggleMusicMuted(): boolean {
    muted = !muted;
    if (el) el.volume = muted ? 0 : VOLUME;
    return muted;
}
