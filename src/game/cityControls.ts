import type { ExpansionDirection } from './cityMap.ts';
export type CityCommand = { type: 'zoom'; factor: number } | { type: 'home' } | { type: 'expand'; direction: ExpansionDirection };
const listeners = new Set<(command: CityCommand) => void>();
export function cityCommand(command: CityCommand): void { for (const listener of listeners) listener(command); }
export function onCityCommand(listener: (command: CityCommand) => void): () => void {
    listeners.add(listener); return () => { listeners.delete(listener); };
}
