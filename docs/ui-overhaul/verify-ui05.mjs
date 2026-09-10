// Full fresh tutorial, real pointer construction and 900-fund economy.
// Model time is advanced in bounded increments to avoid wall-clock waiting;
// progression, traffic, incident creation, dispatch and rescue remain real.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=process.env.UI_EVIDENCE_DIR??'/tmp/ui05-arc';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const results=[];
try{for(const [name,width,height] of [['narrow',390,844],['desktop',1440,900]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:name==='narrow',reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 await page.goto(process.env.UI_BASE_URL??'http://localhost:5184');await page.getByRole('button',{name:'Start your city',exact:true}).click();await page.waitForTimeout(700);
 async function bind(){await page.evaluate(async()=>{const r=performance.getEntriesByType('resource').map(e=>e.name);window.save=await import(r.filter(n=>n.includes('/src/state/save.ts')).at(-1));window.state=await import(r.filter(n=>n.includes('/src/state/store.ts')).at(-1));window.model=await import('/src/game/cityModel.ts');window.commands=await import('/src/game/cityControls.ts');});}
 await bind();assert.equal(await page.evaluate(()=>save.getSave().city.funds),900);
 async function snap(label){await page.waitForTimeout(600);const data=await page.evaluate(()=>{
  const rect=s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};};
  const c=save.getSave().city;return {map:rect('.city-map-viewport'),mission:rect('.mission-card'),build:rect('.city-build-region'),feedback:rect('.city-feedback-region'),actions:rect('.objective-buttons'),stage:c.tutorial.hRoad.stage,funds:c.funds,elapsed:c.elapsed,completed:c.completed,externalTrips:c.trips.filter(t=>t.external).length,briefingSeen:c.expansion.briefingSeen,incidents:c.incidents,roads:c.roads.length,buildings:c.buildings.length};});
  await page.screenshot({path:`${output}/${name}-${label}.png`});
  assert.ok(data.map.height>=150,`${name}/${label} map ${data.map.height}`);for(const b of [data.mission,data.build,data.feedback])assert.ok(data.map.y+data.map.height<=b.y+.5||data.map.x+data.map.width<=b.x+.5);assert.ok(data.actions.y+data.actions.height<=data.mission.y+data.mission.height+.5,`${label} actions clipped ${JSON.stringify(data)}`);
  await page.screenshot({path:`${output}/${name}-${label}.png`});results.push({name,label,...data});console.log(name,label,'stage',data.stage,'map',Math.round(data.map.height));
 }
 async function advance(kind,value,seconds=240){const result=await page.evaluate(({kind,value,seconds})=>{const c=save.getSave().city;const ready=()=>kind==='stage'?c.tutorial.hRoad.stage>=value:kind==='funds'?c.funds>=model.constructionPriceForCity(c,value):kind==='response'?c.trips.some(t=>t.service==='ems'&&t.phase==='responding'):kind==='outside'?c.trips.some(t=>t.external):c.elapsed>=value;for(let n=0;n<seconds*4&&!ready();n++)model.stepCity(c,.25);return {ready:ready(),stage:c.tutorial.hRoad.stage,elapsed:c.elapsed,funds:c.funds};},{kind,value,seconds});assert.ok(result.ready,`${kind} ${value}: ${JSON.stringify(result)}`);await page.waitForTimeout(200);}
 async function select(tool){const category=['home','store','park','bulldoze'].includes(tool)?'Places':['hospital','policeStation','fireStation'].includes(tool)?'Services':'Roads';if(name==='narrow')await page.getByRole('button',{name:category,exact:true}).click();await page.locator(`.build-tool[data-tool=${tool}]`).click();await page.waitForTimeout(120);}
 async function tap(x,y){await page.evaluate(({x,y})=>commands.cityCommand({type:'focus',point:{x,y}}),{x,y});await page.waitForTimeout(100);const b=await page.locator('.city-map-viewport').boundingBox();if(name==='narrow')await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);else await page.mouse.click(b.x+b.width/2,b.y+b.height/2);await page.waitForTimeout(100);}
 async function buy(tool,x,y){await advance('funds',tool,180);await select(tool);await tap(x,y);assert.equal(await page.evaluate(({tool,x,y})=>tool==='road'?save.getSave().city.roads.some(p=>p.x===x&&p.y===y):tool==='stop'?save.getSave().city.controls.some(p=>p.x===x&&p.y===y):save.getSave().city.buildings.some(b=>b.kind===tool&&b.x===x&&b.y===y),{tool,x,y}),true,`${tool}@${x},${y}`);}
 await select('home');await snap('home-ready');await tap(3,2);await buy('store',13,8);await advance('stage',3,60);await snap('first-customer');
 await buy('home',3,8);await buy('home',6,8);await buy('park',13,1);await advance('stage',5,180);await snap('crash');
 assert.deepEqual(await page.evaluate(async()=>{const {incidentServices}=await import('/src/game/cityIncidents.ts');return incidentServices(save.getSave().city.incidents[0]);}),['ems']);assert.equal(await page.evaluate(()=>state.store.get().paused),false);
 // Wait for the actual delayed briefing, dismiss it without completing the task.
 await advance('elapsed',await page.evaluate(()=>save.getSave().city.elapsed+31),32);await page.getByRole('dialog',{name:'More roads!',exact:true}).waitFor();await page.getByRole('button',{name:'Back to my city',exact:true}).click();assert.equal(await page.evaluate(()=>save.getSave().city.tutorial.hRoad.stage),5);
 await page.evaluate(()=>save.flushSave());const crashId=await page.evaluate(()=>save.getSave().city.incidents[0].id);await page.reload();await page.getByRole('button',{name:/Continue/i}).first().click();await page.waitForTimeout(500);await bind();assert.equal(await page.evaluate(()=>save.getSave().city.incidents[0].id),crashId);
 await select('closure');await tap(10,9);assert.equal(await page.evaluate(()=>save.getSave().city.closures.length),1);await tap(10,9);assert.equal(await page.evaluate(()=>save.getSave().city.closures.length),0);
 for(const x of [2,20])for(let y=5;y<=9;y++)await buy('road',x,y);await advance('stage',7,2);await snap('bypass');
 assert.equal(await page.evaluate(()=>save.getSave().city.incidents[0].status),'active');await buy('hospital',17,2);
 // Show and preserve an actual dispatched ambulance, then finish real scene work.
 await page.waitForTimeout(500);await snap('clinic');await page.getByRole('button',{name:'Dashboard',exact:true}).click();await page.getByRole('button',{name:'Close Dashboard',exact:true}).click();await advance('stage',8,240);assert.equal(await page.evaluate(()=>save.getSave().city.rescuedCount),1);assert.equal(await page.evaluate(()=>save.getSave().city.fatalities),0);await snap('rescued');
 await buy('stop',10,10);await advance('stage',9,2);await snap('control');
 for(const direction of ['north','south']){await page.getByRole('button',{name:'Add land at a map edge',exact:true}).click();await page.getByRole('button',{name:`Expand ${direction}`,exact:true}).click();await page.getByRole('button',{name:'Add land · Free',exact:true}).click();await page.waitForTimeout(250);}
 await page.getByRole('button',{name:'Got it — let’s earn more land',exact:true}).click();if(await page.getByRole('button',{name:'Resume game',exact:true}).isVisible())await page.getByRole('button',{name:'Resume game',exact:true}).click();await snap('expanded');
 assert.equal(await page.evaluate(()=>save.getSave().city.tutorial.status),'complete');assert.equal(await page.evaluate(()=>save.getSave().city.external?.gateway),null);
 // Finished lessons must not hide earned cash rewards while the town stays disconnected.
 while(await page.locator('.mission-card').getByRole('button',{name:/^Claim \$[0-9]+$/}).count())await page.locator('.mission-card').getByRole('button',{name:/^Claim \$[0-9]+$/}).click();
 page.once('dialog',d=>d.accept());await page.locator('.mission-card').getByRole('button',{name:'Finish tutorial',exact:true}).click();await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>save.getSave().city.external?.gateway));await advance('outside',null,180);await snap('connected');
 // Paused modal blocks pointer construction and clock; Escape restores play.
 await page.getByRole('button',{name:'Pause the city',exact:true}).click();await page.getByRole('dialog',{name:/paused/i}).waitFor();const frozen=await page.evaluate(()=>JSON.stringify(save.getSave().city));const b=await page.locator('.city-map-viewport').boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>JSON.stringify(save.getSave().city)),frozen);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>state.store.get().paused),false);
 await page.evaluate(()=>save.flushSave());await page.reload();await page.getByRole('button',{name:/Continue/i}).first().click();await page.waitForTimeout(500);await bind();assert.ok(await page.evaluate(()=>save.getSave().city.external?.gateway));assert.equal(await page.evaluate(()=>save.getSave().city.buildings.length),6);assert.equal(await page.evaluate(()=>save.getSave().city.expansion.used),2);assert.deepEqual(errors,[]);await context.close();console.log(name,'full UI-05 tutorial passed');
}}finally{await fs.writeFile(`${output}/arc-results.json`,JSON.stringify(results,null,2));await browser.close();}
