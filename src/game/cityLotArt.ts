import type { Building } from './cityModel.ts';
import type { FrameName } from './cityAtlas.ts';

/** World-axis entrance offsets select Claude's upright, baked lot variants. */
export function lotFrame(b: Building): FrameName {
    const primary = ['S', 'W', 'N', 'E'][b.rotation];
    if (b.entranceCount !== 2 || !b.secondEntrance) return `${b.kind}_1_${primary}` as FrameName;
    const x = b.secondEntrance.x - b.x, y = b.secondEntrance.y - b.y;
    const side = y === -1 ? 'N' : y === 4 ? 'S' : x === -1 ? 'W' : 'E';
    const offset = side === 'N' || side === 'S' ? x : y;
    return `${b.kind}_2_${primary}_${side}_${offset}` as FrameName;
}
