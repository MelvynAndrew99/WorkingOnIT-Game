import {cpSync,mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.argv[2]??'.',dir=mkdtempSync('/tmp/won-occupancy-profile-');
cpSync(resolve(root,'src'),join(dir,'src'),{recursive:true});cpSync(resolve(root,'package.json'),join(dir,'package.json'));
const path=join(dir,'src/game/cityTraffic.ts');let source=readFileSync(path,'utf8');
source=source.replace('function grid(city: City, index: RoadIndex): { grid: Grid; held: Map<number, Slot[]> } {',`function grid(city: City, index: RoadIndex): { grid: Grid; held: Map<number, Slot[]> } {
 const frames=new Error().stack.split('\\n').slice(2,4).map(s=>s.trim().split(' (')[0]).join(' / ');globalThis.__grids[frames]=(globalThis.__grids[frames]??0)+1;`);writeFileSync(path,source);
const m=await import(pathToFileURL(join(dir,'src/game/cityModel.ts')));
globalThis.__grids={};
const raw=JSON.parse(readFileSync(new URL('../supplied-town-hitch/save.json',import.meta.url))).city,c=m.parseCity(raw);globalThis.__grids={};
for(let i=0;i<80;i++)m.stepCity(c,.025);
console.log(JSON.stringify({seconds:2,calls:globalThis.__grids},null,2));
