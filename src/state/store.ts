import { useSyncExternalStore } from 'react';
import { initialMap, type MapBounds } from '../game/cityMap.ts';
import type { Tool } from '../game/cityModel.ts';
export interface AppState {
    phase: 'loading' | 'menu' | 'playing';
    loadProgress: number;
    paused: boolean;
    showTips: boolean;
    panning: boolean;
    map: MapBounds;
    tool: Tool;
    rotation: number;
    funds: number;
    income: number;
    connected: number;
    homes: number;
    completed: number;
    activeTrips: number;
    tripSeconds: number | null;
    message: string;
}
let showTips = true;
try { showTips = localStorage.getItem('working-on-it:show-tips') !== 'false'; } catch { /* default if storage unavailable */ }
const listeners = new Set<() => void>();
let state: AppState = {
    phase: 'loading', loadProgress: 0, paused: false, showTips, panning: false, map: initialMap(), tool: 'home', rotation: 0,
    funds: 10000, income: 200, connected: 0, homes: 0, completed: 0, activeTrips: 0, tripSeconds: null,
    message: 'Place homes and stores. Link the entrance arrows with roads.',
};
export const store = {
    get: (): AppState => state,
    patch(partial: Partial<AppState>): void {
        state = { ...state, ...partial };
        for (const l of listeners) l();
    },
    subscribe(l: () => void): () => void { listeners.add(l); return () => listeners.delete(l); },
};
export function useStore<T = AppState>(selector: (s: AppState) => T = (s) => s as unknown as T): T {
    return useSyncExternalStore(store.subscribe, () => selector(state));
}
