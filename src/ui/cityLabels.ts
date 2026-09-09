import {LABELS, type Building, type Tool} from '../game/cityModel.ts';
export const BUILDING_LABELS = LABELS;
export function isBuildingTool(tool:Tool|null):tool is Building['kind'] {
  return tool!==null && Object.hasOwn(BUILDING_LABELS,tool);
}
