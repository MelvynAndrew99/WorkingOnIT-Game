import type { TutorialAction } from './cityTutorial.ts';
import type { Point } from './cityModel.ts';
import type { ExpansionDirection } from './cityMap.ts';
export type CityCommand = {type:'road-direction'; mode:'forward'|'reverse'|'two-way'|'cancel'|'undo'} | {type:'finish-tutorial'} | {type:'open-expansion'} | { type: 'tutorial'; action: TutorialAction } | { type: 'focus'; point: Point } | { type: 'connect'; point: Point } | { type: 'zoom'; factor: number } | { type: 'home' } | { type: 'expand'; direction: ExpansionDirection };
const listeners = new Set<(command: CityCommand) => void>();
export function cityCommand(command: CityCommand): void { for (const listener of listeners) listener(command); }
export function onCityCommand(listener: (command: CityCommand) => void): () => void {
    listeners.add(listener); return () => { listeners.delete(listener); };
}
