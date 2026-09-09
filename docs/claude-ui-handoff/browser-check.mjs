/** Claude layout acceptance. Run only after UI/model source owners declare a stable window. */
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const {chromium}=await import(process.env.CITY_PLAYWRIGHT_MODULE||'/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:process.env.CITY_CHROMIUM_PATH||'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const url=process.env.CITY_URL||'http://localhost:5177',out=process.env.CITY_SCREENSHOT_DIR||fileURLToPath(new URL('.',import.meta.url)),saveKey='city-workshop:city:v1';
let active;
async function live(page){return page.evaluate(async()=>{const path=s=>performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes(s)).at(-1)||s;const {getSave}=await import(path('/src/state/save.ts')),{store}=await import(path('/src/state/store.ts'));return {city:structuredClone(getSave().city),state:structuredClone(store.get())};});}
async function paused(page){await page.getByRole('button',{name:/Continue commute|Start your city/}).waitFor();await page.evaluate(async()=>{const {store}=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/store.ts')).at(-1)||'/src/state/store.ts');store.patch({phase:'playing',paused:true});});await page.locator('canvas').waitFor();await page.waitForTimeout(400);}
async function setMode(page,mode){await page.evaluate(async mode=>{const {store}=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/store.ts')).at(-1)||'/src/state/store.ts');store.patch({displayMode:mode});},mode);await page.waitForTimeout(300);}
async function geometry(page){return page.evaluate(()=>{
 const box=s=>{const e=document.querySelector(s);if(!e)return {width:0,height:0};const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
 const frame=box('#app-frame'),header=box('.city-header'),footer=box('.city-controls'),left=box('.city-rail-left'),right=box('.city-rail-right'),canvas=box('canvas'),scale=Math.min(canvas.width/720,1);
 const insetLeft=14*scale+(left.width?left.width+8:0),insetRight=14*scale+(right.width?right.width+8:0);
 const map={x:frame.x+insetLeft,y:header.bottom+6,width:canvas.width-insetLeft-insetRight,height:footer.top-header.bottom-12};
 const bad=[...document.querySelectorAll('.city-ui button')].filter(e=>e.getBoundingClientRect().height>0&&!e.closest('dialog:not([open])')).map(e=>({text:e.textContent,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,font:parseFloat(getComputedStyle(e).fontSize)})).filter(e=>e.w<43.9||e.h<43.9||e.font<17.59);
 return {frame,header,footer,left,right,canvas,map,scale,bad};
});}
async function pointAt(page,x,y){await page.evaluate(async({x,y})=>{const path=s=>performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes(s)).at(-1)||s;const {cityCommand}=await import(path('/src/game/cityControls.ts'));cityCommand({type:'focus',point:{x,y}});},{x,y});await page.waitForTimeout(100);const g=await geometry(page);return {x:g.map.x+g.map.width/2,y:g.map.y+g.map.height/2};}
async function seedVisitedTown(page){return page.evaluate(async saveKey=>{
 const m=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/game/cityModel.ts')).at(-1)||'/src/game/cityModel.ts'),c=m.createCity();c.funds=10000; // explicit fixture funding, not starter balance evidence
 m.place(c,'home',0,2);m.place(c,'store',9,2);for(let x=0;x<=12;x++)m.place(c,'road',x,4);
 for(let i=0;i<60/m.TRAFFIC_TICK;i++){m.stepCity(c,m.TRAFFIC_TICK);if(c.missions.shoppers.length)break;}
 if(!c.missions.shoppers.length||!m.parseCity(JSON.parse(JSON.stringify(c))))throw Error('Real visited-town fixture failed');
 localStorage.setItem(saveKey,JSON.stringify({city:c,updatedAt:Date.now()+1000}));return structuredClone(c);
},saveKey);}

// Selectors below will be aligned with Claude's delivered DOM before the first run.
async function chooseTool(page,tool,category){
 let button=page.locator(`[data-tool="${tool}"]:visible`).first();
 if(!await button.count()){await page.getByRole('button',{name:category,exact:true}).click();button=page.locator(`[data-tool="${tool}"]:visible`).first();}
 await button.click();assert.equal((await live(page)).state.tool,tool);return button;
}
try{
 for(const scenario of [{width:320,height:640,mode:'auto'},{width:390,height:844,mode:'auto'},{width:1440,height:900,mode:'auto'},{width:1440,height:900,mode:'portrait'}]){
  const context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height},hasTouch:scenario.width<500}),page=await context.newPage();active=page;const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.getByRole('button',{name:/Start your city/}).waitFor();const original=await seedVisitedTown(page);await page.reload();await paused(page);await setMode(page,scenario.mode);
  assert.deepEqual((await live(page)).city,original);
  const tag=`${scenario.width}-${scenario.mode}`,g=await geometry(page);console.log(tag,JSON.stringify(g));
  await page.screenshot({path:`${out}layout-${tag}.png`});
  assert.ok(g.map.height>=210,`map height ${g.map.height}`);assert.ok(g.map.width>=140,`map width ${g.map.width}`);assert.deepEqual(g.bad,[]);
  assert.equal(await page.getByRole('button',{name:/Free help|Apply free solution/i}).count(),0);
  assert.ok(Math.abs(g.canvas.width-g.frame.width)<1);
  const before=(await live(page)).city;
  for(const [category,tools]of [['Roads',['road','stop','signal','closure']],['Places',['home','store','park','bulldoze']],['Services',['policeStation','fireStation','hospital']]])for(const tool of tools)await chooseTool(page,tool,category);
  const removal=await chooseTool(page,'bulldoze','Places');console.log('Remove geometry',await removal.evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth,text:[...e.children].map(c=>({text:c.textContent,width:c.clientWidth,scroll:c.scrollWidth}))})));
  await page.getByRole('button',{name:/^Rotate/}).click();assert.equal((await live(page)).state.rotation,(before.buildings[0]?.rotation??0)+1);
  assert.deepEqual((await live(page)).city,before,'DOM construction controls cannot build through to map');
  await chooseTool(page,'road','Roads');const point=await pointAt(page,7,7);await page.mouse.click(point.x,point.y);
  assert.ok((await live(page)).city.roads.some(p=>p.x===7&&p.y===7),'real placement maps to renderer viewport between rails');
  assert.equal(await page.locator('dialog[open]').count(),0,'tutorial remains nonmodal during construction');
  const prior=await live(page),ready=prior.state.missions.items.find(j=>j.done&&!j.claimed);assert.ok(ready);
  await page.getByRole('button',{name:new RegExp(`Claim.*${ready.reward}`)}).first().click();
  let after=await live(page);assert.equal(after.city.funds,prior.city.funds+ready.reward);assert.ok(after.state.missions.items.find(j=>j.id===ready.id).claimed);
  const claimed=after.city;await page.reload();await paused(page);await setMode(page,scenario.mode);after=await live(page);assert.equal(after.city.funds,claimed.funds);assert.ok(after.state.missions.items.find(j=>j.id===ready.id).claimed);
  await page.screenshot({path:`${out}claimed-${tag}.png`});
  assert.ok((await page.getByRole('region',{name:'Current objective'}).innerText()).match(/Park|park/),'teaching returns after reward collection');
  const preRail=(await live(page)).city;
  await page.getByRole('button',{name:/^Pan mode/}).click();assert.equal((await live(page)).state.panning,true);
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.getByRole('button',{name:'Zoom out',exact:true}).click();
  await page.getByRole('button',{name:'Back to town',exact:true}).click();
  assert.deepEqual((await live(page)).city,preRail,'rail camera buttons cannot construct');
  await page.getByRole('button',{name:'Add land at a map edge',exact:true}).click();
  const growth=page.getByRole('dialog',{name:'Room to grow',exact:true});await growth.waitFor();
  await growth.getByRole('button',{name:'Cancel',exact:true}).click();assert.deepEqual((await live(page)).city,preRail);
  await page.getByRole('button',{name:'Report',exact:true}).click();
  await page.getByRole('button',{name:'Close city report',exact:true}).click();assert.deepEqual((await live(page)).city,preRail);
  if(scenario.width===1440){
   const alternate=scenario.mode==='portrait'?'wide':'portrait';await setMode(page,alternate);
   const resized=await geometry(page);assert.ok(Math.abs(resized.canvas.width-(alternate==='wide'?1440:506))<1);
   assert.equal(resized.left.width>0,alternate==='wide','live CSS mode switches responsive rail presence');
   assert.deepEqual((await live(page)).city,preRail);
   await chooseTool(page,'road','Roads');const nextPoint=await pointAt(page,7,8);await page.mouse.click(nextPoint.x,nextPoint.y);
   assert.ok((await live(page)).city.roads.some(p=>p.x===7&&p.y===8),'live mode switch keeps rail-aware input aligned');
   await page.screenshot({path:`${out}switched-${tag}.png`});
  }
  // A real half-second of resumed simulation matures saved stalled-objective help.
  await page.evaluate(async saveKey=>{const m=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/game/cityModel.ts')).at(-1)||'/src/game/cityModel.ts'),c=m.createCity();c.elapsed=59.5;c.funds=0;c.economy={version:1,waived:[],stallLesson:'first-visit',stallAt:0,stallMark:0};if(!m.parseCity(c))throw Error('Stall fixture must load');localStorage.setItem(saveKey,JSON.stringify({city:c,updatedAt:Date.now()+1000}));},saveKey);
  await page.reload();await paused(page);await setMode(page,scenario.mode);
  const frozen=await live(page);await page.waitForTimeout(650);assert.deepEqual((await live(page)).city,frozen.city,'paused wall time cannot mature waiver');
  await page.getByRole('button',{name:'Resume the city',exact:true}).click();
  const waiverDeadline=Date.now()+10000;
  while(!(await live(page)).state.tutorial?.waived&&Date.now()<waiverDeadline)await page.waitForTimeout(50);
  await page.getByRole('button',{name:'Pause the city',exact:true}).click();
  let waiver=await live(page);assert.ok(waiver.state.tutorial.waived,JSON.stringify({economy:waiver.city.economy,elapsed:waiver.city.elapsed,tutorial:waiver.state.tutorial}));assert.equal(waiver.city.buildings.length,0);assert.equal(waiver.city.roads.length,0);
  assert.equal(await page.getByRole('button',{name:/Free help|Apply free solution|Accept waiver/i}).count(),0);
  assert.ok((await page.locator('.objective-note').innerText()).length>0,'mayor offer appears automatically');
  for(const [tool,category]of [['home','Places'],['store','Places'],['road','Roads']]){const b=await chooseTool(page,tool,category);assert.equal(await b.locator('.build-cost').innerText(),'Free');}
  const homeButton=await chooseTool(page,'home','Places');assert.equal(await homeButton.getAttribute('data-waived'),'true');
  const funds=waiver.city.funds,homePoint=await pointAt(page,7,7);await page.mouse.click(homePoint.x,homePoint.y);
  waiver=await live(page);assert.equal(waiver.city.funds,funds);assert.equal(waiver.city.buildings.length,1);assert.equal(waiver.city.buildings[0].paid,0);
  assert.equal(waiver.city.economy.allowance.home,0);
  await page.screenshot({path:`${out}waiver-${tag}.png`});
  await chooseTool(page,'bulldoze','Places');await page.mouse.click(homePoint.x,homePoint.y);assert.equal((await live(page)).city.funds,funds);assert.equal((await live(page)).city.buildings.length,0);
  await page.getByRole('button',{name:'Menu',exact:true}).click();await page.reload();await paused(page);await setMode(page,scenario.mode);
  waiver=await live(page);assert.equal(waiver.city.economy.allowance.home,0);assert.equal(waiver.city.economy.allowance.store,1);
  const used=await chooseTool(page,'home','Places');assert.equal(await used.locator('.build-cost').innerText(),'$200');
  const clinic=await chooseTool(page,'hospital','Services');assert.equal(await clinic.locator('.build-cost').innerText(),'$800');assert.equal(await clinic.getAttribute('data-afford'),'false');
  const unchanged=(await live(page)).city;const noMoney=await pointAt(page,7,7);await page.mouse.click(noMoney.x,noMoney.y);assert.deepEqual((await live(page)).city,unchanged,'unrelated paid service remains unaffordable');
  assert.deepEqual(errors,[]);console.log(`PASS ${tag}: renderer rails, tools, real construction, claim persistence`);await context.close();
 }
}catch(e){if(active&&!active.isClosed())await active.screenshot({path:`${out}browser-failure.png`}).catch(()=>{});throw e;}finally{await browser.close();}
