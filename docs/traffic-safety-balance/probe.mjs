import {stepCity} from '../../src/game/cityModel.ts';
import {CITY_RULES} from '../../src/game/cityRules.ts';
import {intersectionTown as busyTown,quietIntersectionTown as quietTown,separateApproaches,turningIntersectionTown} from '../../src/game/fixtures/intersectionTown.ts';
export function measure(c,seconds=120){
  let peak=0,encounters=0,vehicles=0,warningAt=null;const returned=new Set();
  for(let t=0;t<seconds*40&&!c.accidentCount;t++){
    stepCity(c,.025);
    for(const r of c.risks){peak=Math.max(peak,r.exposure);encounters=Math.max(encounters,r.encounters?.length??0);
      vehicles=Math.max(vehicles,new Set(r.encounters?.flatMap(e=>[e.firstId,e.secondId])).size);
      if(r.exposure>=CITY_RULES.intersectionSafety.warningExposure)warningAt??=c.elapsed;}
    for(const h of c.history)if(h.service?.purpose==='shopping')returned.add(h.service.homeId);
  }
  return {homes:c.buildings.filter(b=>b.kind==='home').length,completed:c.completed,accidents:c.accidentCount,
    returnedHomes:returned.size,missing:c.buildings.filter(b=>b.kind==='home'&&!returned.has(b.id)).map(b=>({id:b.id,x:b.x,y:b.y})),
    crashAt:c.incidents[0]?.createdAt??null,warningAt,peak,encounters,vehicles};
}
if(process.argv[1]?.endsWith('/probe.mjs')) {
  console.log(JSON.stringify({scenario:'level2',...measure(quietTown(),600)}));
  for(const extra of [0,2])for(const control of [undefined,'stop','signal'])
    console.log(JSON.stringify({extra,control:control??'unsigned',...measure(busyTown(extra,control),600)}));
  const rerouted=busyTown(2);separateApproaches(rerouted);
  console.log(JSON.stringify({scenario:'separate-routes',...measure(rerouted,600)}));
  for(const preset of ['balanced','ns','ew']){
    const c=turningIntersectionTown();c.controls[0].preset=preset;
    console.log(JSON.stringify({scenario:'opposing-turns-signal',preset,...measure(c,600)}));
  }
}
