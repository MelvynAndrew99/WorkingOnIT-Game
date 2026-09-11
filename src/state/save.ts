/** City persistence uses RUN appStorage and a local mirror; old traffic saves are untouched. */
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { sdkReady } from '../sdk/runSdk.ts';

import { createCity, parseCity, type City } from '../game/cityModel.ts';
import { relocateInteriorGateway } from '../game/cityExternal.ts';

// Separate namespace preserves all AI Overlord saves.
const SAVE_KEY = 'city-workshop:city:v1';
export interface SaveData { city: City; updatedAt: number; }
let data: SaveData = { city: createCity(true), updatedAt: 0 };
let pendingHost: string | null = null;
let writingHost = false;
export interface PreservedSaveCopy {source:'host'|'local';raw:string;}
let loadProblem: string | null = null;
let recoveryNotice: string | null = null;
let preservedCopies: PreservedSaveCopy[] = [];
export const getSaveLoadProblem = ():string|null => loadProblem;
export const getSaveRecoveryNotice = ():string|null => recoveryNotice;
/** Exact source bytes, retained for a user-requested download; never logged. */
export const getPreservedSaveCopies = ():PreservedSaveCopy[] => preservedCopies.map(copy=>({...copy}));
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
    loadProblem = null;
    recoveryNotice = null;
    preservedCopies = [];
    pendingHost = null;
    if (sdkReady()) {
        try {
            const raw = await RundotGameAPI.appStorage.getItem(SAVE_KEY);
            if(raw)preservedCopies.push({source:'host',raw});
        } catch { /* host storage unavailable — inspect the local mirror */ }
    }
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if(raw)preservedCopies.push({source:'local',raw});
    } catch { /* blocked storage */ }
    const invalid:PreservedSaveCopy[]=[];
    for(const copy of preservedCopies) {
        const candidate=parse(copy.raw);
        if(!candidate)invalid.push(copy);
        else if(!loaded||candidate.updatedAt>=loaded.updatedAt)loaded=candidate;
    }
    if(preservedCopies.length&&!loaded) {
        loadProblem='Your saved town could not be read safely. Its original copies are preserved. Download them for recovery, or retry loading.';
        return data;
    }
    // Never overwrite an unreadable mirror until its exact bytes have a durable backup.
    // If storage is blocked/full, hold gameplay and offer the in-memory download instead.
    if(invalid.length) {
        try {
            for(const copy of invalid) {
                const backupKey=`${SAVE_KEY}:recovery:${Date.now()}:${copy.source}`;
                localStorage.setItem(backupKey,copy.raw);
                if(localStorage.getItem(backupKey)!==copy.raw)throw new Error('Backup verification failed');
            }
            recoveryNotice='Recovered your town from a readable saved copy. The unreadable copy was backed up on this device.';
        } catch {
            loadProblem='A saved copy could not be read, and this device could not back it up. Download the preserved copies before retrying.';
            return data;
        }
    }
    data = loaded ?? { city: createCity(true), updatedAt: 0 };
    if(relocateInteriorGateway(data.city))flushSave();
    return data;
}

export function getSave(): SaveData {
    return data;
}

/** Write-through persist of the in-memory save. Fire-and-forget, never throws. */
export function flushSave(): void {
    if(loadProblem)return;
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
    if(loadProblem)return;
    data.city = createCity(true);
    flushSave();
}
