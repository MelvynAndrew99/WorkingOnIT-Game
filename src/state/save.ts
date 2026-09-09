/** City persistence uses RUN appStorage and a local mirror; old traffic saves are untouched. */
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { sdkReady } from '../sdk/runSdk.ts';

import { createCity, parseCity, type City } from '../game/cityModel.ts';

// Separate namespace preserves all AI Overlord saves.
const SAVE_KEY = 'city-workshop:city:v1';
export interface SaveData { city: City; updatedAt: number; }
let data: SaveData = { city: createCity(), updatedAt: 0 };
let pendingHost: string | null = null;
let writingHost = false;
function parse(raw: string | null): SaveData | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        const city = parseCity(parsed?.city);
        const updatedAt = typeof parsed?.updatedAt === 'number' && Number.isFinite(parsed.updatedAt) ? Math.max(0, parsed.updatedAt) : 0;
        return city ? { city, updatedAt } : null;
    } catch { return null; }
}

/** Load the save into memory. Call once at boot, after initSdk(). */
export async function loadSave(): Promise<SaveData> {
    let loaded: SaveData | null = null;
    if (sdkReady()) {
        try {
            loaded = parse(await RundotGameAPI.appStorage.getItem(SAVE_KEY));
        } catch {
            /* host storage unavailable — fall through to localStorage */
        }
    }
    // A pending/offline host write must not roll back a newer local city on reload.
    try {
        const local = parse(localStorage.getItem(SAVE_KEY));
        if (local && (!loaded || local.updatedAt >= loaded.updatedAt)) loaded = local;
    } catch { /* blocked storage */ }
    data = loaded ?? { city: createCity(), updatedAt: 0 };
    return data;
}

export function getSave(): SaveData {
    return data;
}

/** Write-through persist of the in-memory save. Fire-and-forget, never throws. */
export function flushSave(): void {
    data.updatedAt = Math.max(Date.now(), data.updatedAt + 1);
    const raw = JSON.stringify(data);
    try { localStorage.setItem(SAVE_KEY, raw); } catch { /* blocked storage */ }
    if (sdkReady()) {
        pendingHost = raw;
        void drainHostWrites();
    }
}

/** Serialize and coalesce host writes so slower old requests cannot overwrite newer ones. */
async function drainHostWrites(): Promise<void> {
    if (writingHost) return;
    writingHost = true;
    try {
        while (pendingHost !== null) {
            const raw = pendingHost;
            pendingHost = null;
            try { await RundotGameAPI.appStorage.setItem(SAVE_KEY, raw); } catch { /* local mirror remains authoritative */ }
        }
    } finally { writingHost = false; }
}

/** Called only after the player chooses New game (and confirms replacing an existing town). */
export function startNewCity(): void {
    data.city = createCity();
    flushSave();
}
