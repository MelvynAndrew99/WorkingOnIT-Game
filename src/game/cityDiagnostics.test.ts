import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCity,place,stepCity,TRAFFIC_TICK} from './cityModel.ts';
import {cityDiagnostics} from './cityDiagnostics.ts';
test('diagnostics distinguish missing access, visitor capacity and ordinary movement without mutations',()=>{
 const c=createCity();c.funds=10000;
 for(let x=0;x<15;x++)place(c,'road',x,6);
 for(let x=0;x<10;x+=2)place(c,'home',x,4);
 assert.ok(cityDiagnostics(c).homes.every(h=>h.status==='access'));
 place(c,'store',12,4);
 let found=false;
 for(let n=0;n<1200;n++){
  stepCity(c,TRAFFIC_TICK);const before=JSON.stringify(c),d=cityDiagnostics(c);assert.equal(JSON.stringify(c),before);
  if(d.homes.some(h=>h.status==='capacity')){found=true;assert.equal(d.destinations[0].occupied+d.destinations[0].inbound,4);break;}
 }
 assert.ok(found,'five households can exhaust four reserved visitor slots');
});
