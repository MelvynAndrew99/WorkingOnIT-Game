import {readFileSync,writeFileSync} from 'node:fs';
import * as original from '/home/phil/Code/jams/won/src/game/cityModel.ts';
import * as candidate from '/tmp/won-merge-probe/src/game/cityModel.ts';
const out='/home/phil/Code/jams/won/docs/performance-review/supplied-town-hitch';
const raw=JSON.parse(readFileSync(out+'/save.json')).city,result={};
for(const [name,model]of [['original',original],['temporaryWaitAccounting',candidate]]){
 const c=model.parseCity(raw),checkpoints=[];
 for(let i=0;i<2400;i++){
  model.stepCity(c,.025);
  if(i%400===399)checkpoints.push({seconds:(i+1)*.025,completed:c.completed,active:c.incidents.filter(i=>i.status==='active').map(i=>i.id),police:c.trips.filter(t=>[34374,34934].includes(t.id)).map(t=>({id:t.id,hold:t.hold,wait:t.wait,progress:t.progress,path:t.path,phase:t.phase}))});
 }
 result[name]=checkpoints;
}
writeFileSync(out+'/merge-probe.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(result).map(([k,v])=>[k,v.map(x=>({...x,police:x.police.map(({path,...t})=>({...t,position:path[Math.min(path.length-1,Math.ceil(t.progress-.5))]}))}))])),null,2));
