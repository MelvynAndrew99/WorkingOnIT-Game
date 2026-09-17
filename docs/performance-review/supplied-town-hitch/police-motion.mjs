import {readFileSync,writeFileSync} from 'node:fs';
import {parseCity,stepCity} from '/home/phil/Code/jams/won/src/game/cityModel.ts';
const out='/home/phil/Code/jams/won/docs/performance-review/supplied-town-hitch';
const c=parseCity(JSON.parse(readFileSync(out+'/save.json')).city),samples=[];
for(let n=0;n<80;n++){
 const trips=c.trips.filter(t=>[34374,34934].includes(t.id)).map(t=>({id:t.id,progress:t.progress,hold:t.hold,path:t.path,phase:t.phase,pass:t.emergencyPass,nextQuery:t.nextRouteQueryAt}));samples.push({at:n*.025,trips});stepCity(c,.025);
}
writeFileSync(out+'/police-motion.json',JSON.stringify(samples,null,2));
for(const id of [34374,34934]){const a=samples.map(s=>s.trips.find(t=>t.id===id));console.log(id, a.map(t=>t.progress).slice(0,32),a[0].path);}
