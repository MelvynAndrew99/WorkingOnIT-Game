import assert from 'node:assert/strict';
import fs from 'node:fs';
import {lotFrame} from '../../../src/game/cityLotArt.ts';
import {entrances} from '../../../src/game/cityModel.ts';
import {FRAMES} from '../../../src/game/cityAtlas.ts';
for(const [kind,dir] of [['office','offices'],['apartment','housing/residential-apartment']]) {
 const manifest=JSON.parse(fs.readFileSync(`docs/artwork/${dir}/${kind}-sheet.json`));
 for(const [key,f] of Object.entries(manifest.frames)) {
  const b={id:1,kind,x:9,y:7,rotation:f.rotation,entranceCount:f.level, ...(f.secondary?{secondEntrance:{x:9+f.secondary.x,y:7+f.secondary.y}}:{})};
  assert.equal(lotFrame(b),key);
  assert.deepEqual(entrances(b).map(p=>({x:p.x-9,y:p.y-7})),[f.primary,f.secondary].filter(Boolean).map(({x,y})=>({x,y})));
  assert.equal(FRAMES[key].w,64);assert.equal(FRAMES[key].h,64);
 }
}
console.log('All 128 runtime variants match model entrance coordinates and packed frames.');
