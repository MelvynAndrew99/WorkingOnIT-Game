import type {FlowReport} from '../game/cityFlow.ts';
import type {VehicleDebug} from '../game/cityTraffic.ts';
import type {DiagnosticView,CityDiagnostics} from '../game/cityDiagnostics.ts';
import { useSyncExternalStore } from 'react';
import { STARTING_FUNDS } from '../game/cityEconomy.ts';
import { initialMap, type MapBounds } from '../game/cityMap.ts';
import type { Tool } from '../game/cityModel.ts';
import type { MissionSnapshot } from '../game/cityMissions.ts';
import type { TutorialSnapshot } from '../game/cityTutorial.ts';
import { readWeatherPreference, weatherHudLabel } from '../game/cityWeather.ts';
export type DisplayMode = 'auto' | 'wide' | 'portrait';
export interface AppState {
    busStopPanel: {id:number;rotation:number;waiting:number;waitSeconds:number;issue:string}|null;
    movingBusStop: number|null;
    busStopNotices: {id:number;x:number;y:number;reason:string;waiting:number;waitSeconds:number}[];
    transitPanel: {stationId:number; fleet:{id:number;parked:boolean;riders:number;paid:number}[]; stops:number[];running:boolean;blocked:string;summary:string}|null;
    transitDraft: number[] | null;
    flow: FlowReport | null;
    vehicleDebugOpen: boolean;
    selectedVehicleId: number | null;
    vehicleDebug: VehicleDebug[];
    diagnosticView: DiagnosticView;
    diagnostics: CityDiagnostics | null;
    displayMode: DisplayMode;
    weatherEnabled: boolean;
    weatherLabel: string;
    tutorial: TutorialSnapshot | null;
    tutorialNotice: boolean;
    missions: MissionSnapshot | null;
    phase: 'loading' | 'menu' | 'playing' | 'challenges' | 'challenge';
    loadProgress: number;
    paused: boolean;
    showTips: boolean;
    panning: boolean;
    map: MapBounds;
    tool: Tool | null;
    toolSelection: number;
    directionSelection: number;
    directionRestore: boolean;
    rotation: number;
    /** Saved simulation time, sampled by the scene HUD report. */
    elapsedSeconds: number;
    funds: number;
    income: number;
    connected: number;
    roadIssues: {homeId:number;x:number;y:number;reason:string}[];
    homes: number;
    completed: number;
    activeTrips: number;
    tripSeconds: number | null;
    longestStop: number;
    waiting: number;
    averageWait: number;
    throughput: number;
    demand: {shopping:number;leisure:number;visits:number};
    incidentInfo: {active:number;warning:string;details:{id:number;label:string;needs:string;deadlineSeconds:number|null}[]};
    rescued: number;
    fatalities: number;
    inspected: {id:number;name:string;occupied:number;capacity:number;inbound:number;label:string}|null;
    message: string;
}
let showTips = true;
try { showTips = localStorage.getItem('working-on-it:show-tips') !== 'false'; } catch { /* default if storage unavailable */ }
let displayMode: DisplayMode = 'auto';
try { const saved=localStorage.getItem('working-on-it:display-mode'); if(saved==='auto'||saved==='wide'||saved==='portrait')displayMode=saved; } catch { /* default if storage unavailable */ }
const weatherEnabled = readWeatherPreference();
const listeners = new Set<() => void>();
let state: AppState = {
    busStopPanel:null, movingBusStop:null, busStopNotices:[],
    transitPanel:null, transitDraft:null,
    flow: null,
    vehicleDebugOpen: false, selectedVehicleId: null, vehicleDebug: [],
    diagnosticView: 'normal', diagnostics: null,
    displayMode, weatherEnabled, weatherLabel: weatherHudLabel(0, weatherEnabled),
    tutorial: null, tutorialNotice: false,
    missions: null,
    phase: 'loading', loadProgress: 0, paused: false, showTips, panning: false, map: initialMap(), tool: null, toolSelection: 0, directionSelection: 0, directionRestore: false, rotation: 0,
    elapsedSeconds: 0, funds: STARTING_FUNDS, income: 20, connected: 0, roadIssues: [], homes: 0, completed: 0, activeTrips: 0, tripSeconds: null,
    longestStop: 0, waiting: 0, averageWait: 0, throughput: 0,
    demand:{shopping:0,leisure:0,visits:0}, incidentInfo:{active:0,warning:'',details:[]}, rescued:0,fatalities:0,inspected:null,
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
