import type { TutorialAction } from './cityTutorial.ts';
import type { Point } from './cityModel.ts';
import type { ExpansionDirection } from './cityMap.ts';
export type CityCommand = {type:'building-entrance-edit';id:number;slot?:'primary'|'secondary';cancel?:boolean} | {type:'apartment-complex';id:number;cancel?:boolean;apply?:boolean} | {type:'apartment-upgrade';id:number;cancel?:boolean} | {type:'bus-stop';action:'inspect'|'move'|'cancel'|'close';id?:number} | {type:'transit';action:'edit'|'finish'|'cancel'|'undo'|'buy'|'sell'|'start'|'stop'|'close';busId?:number} | {type:'road-direction'; mode:'forward'|'reverse'|'two-way'|'cancel'|'undo'} | {type:'finish-tutorial'} | {type:'open-expansion'} | {type:'unlock-plot';id:number} | { type: 'tutorial'; action: TutorialAction } | { type: 'focus'; point: Point } | { type: 'connect'; point: Point } | { type: 'zoom'; factor: number } | { type: 'home' } | { type: 'expand'; direction: ExpansionDirection };
const listeners = new Set<(command: CityCommand) => void>();
export function cityCommand(command: CityCommand): void { for (const listener of listeners) listener(command); }
export function onCityCommand(listener: (command: CityCommand) => void): () => void {
    listeners.add(listener); return () => { listeners.delete(listener); };
}
