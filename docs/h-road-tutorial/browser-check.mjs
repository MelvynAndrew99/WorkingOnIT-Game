import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {chromium}=await import('/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const out=fileURLToPath(new URL('.',import.meta.url));
try{
 for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===320?640:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:5181');await page.getByRole('button',{name:'Start your city',exact:true}).click();
  await page.getByRole('button',{name:'Pause the city',exact:true}).click();
  await page.locator('.tutorial-locator[data-guide-tool=home]').waitFor();
  const initial=await page.evaluate(async()=>{const c=(await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/save.ts')).at(-1)||'/src/state/save.ts')).getSave().city;return {homes:c.buildings.length,roads:c.roads.length,stage:c.tutorial.hRoad.stage};});
  assert.deepEqual(initial,{homes:0,roads:43,stage:0});
  assert.equal(await page.locator('.build-tool[aria-pressed=true]').count(),0,'starting requires an explicit menu selection');
  if(width<900)await page.getByRole('button',{name:'Roads',exact:true}).click();
  assert.ok(await page.locator('.build-tool[data-tool=road]').isDisabled());
  await page.screenshot({path:`${out}initial-${width}.png`});
  for(const tool of ['home','store']){
   if(width<900)await page.getByRole('button',{name:'Places',exact:true}).click();
   await page.locator(`.build-tool[data-tool=${tool}]`).click();
   await page.getByRole('button',{name:'Show lesson area',exact:true}).click();await page.waitForTimeout(200);
   const center=await page.evaluate(()=>{const rect=s=>document.querySelector(s)?.getBoundingClientRect();const f=rect('#app-frame'),h=rect('.city-header'),foot=rect('.city-controls'),l=rect('.city-rail-left'),r=rect('.city-rail-right'),scale=Math.min(f.width/720,1);const left=14*scale+(l?.width?l.width+8:0),right=14*scale+(r?.width?r.width+8:0);return {x:f.x+left+(f.width-left-right)/2,y:(h.bottom+foot.top)/2};});
   await page.mouse.click(center.x,center.y);await page.waitForTimeout(200);

  }
  const after=await page.evaluate(async()=>{const c=(await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/save.ts')).at(-1)||'/src/state/save.ts')).getSave().city;return {kinds:c.buildings.map(b=>b.kind),roads:c.roads.length,stage:c.tutorial.hRoad.stage};});
  assert.deepEqual(after,{kinds:['home','store'],roads:43,stage:2});
  await page.screenshot({path:`${out}placed-${width}.png`});
  await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).waitFor();
  const loaded=await page.evaluate(async()=>{const c=(await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/save.ts')).at(-1)||'/src/state/save.ts')).getSave().city;return {kinds:c.buildings.map(b=>b.kind),roads:c.roads.length,stage:c.tutorial.hRoad.stage};});
  assert.deepEqual(loaded,after);
  await page.getByRole('button',{name:'Skip tutorial',exact:true}).click();
  if(width<900)await page.getByRole('button',{name:'Roads',exact:true}).click();
  assert.ok(await page.locator('.build-tool[data-tool=road]').isEnabled());
  assert.equal(await page.locator('.build-tool[data-tool=stop] .build-cost').innerText(),'$25');
  assert.equal(await page.locator('.build-tool[data-tool=signal] .build-cost').innerText(),'$75');
  assert.deepEqual(errors,[]);
  if(width===390){
   await page.evaluate(async()=>{
    const m=await import('/src/game/cityModel.ts'),c=m.createCity(true);
    m.place(c,'home',3,2);m.place(c,'store',13,8);
    for(let i=0;i<400&&c.tutorial.hRoad.stage<3;i++)m.stepCity(c,.25);
    c.funds=10000; // UI fixture only; independent model test covers the real900 economy.
    m.place(c,'home',3,8);m.place(c,'home',6,8);m.place(c,'park',13,1);
    for(let i=0;i<800&&c.tutorial.hRoad.stage<5;i++)m.stepCity(c,.25);
    if(c.tutorial.hRoad.stage!==5)throw Error('Could not prepare real scripted incident');
    localStorage.setItem('city-workshop:city:v1',JSON.stringify({city:c,updatedAt:Date.now()+1000}));
   });
   await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).click();
   await page.getByRole('region',{name:'Current objective'}).waitFor();
   assert.equal(await page.locator('dialog.manager-popup[open]').count(),0,'the crash must be visible before advice');
   assert.ok(await page.getByRole('button',{name:'Pause the city',exact:true}).isVisible(),'crash does not pause traffic');
   await page.getByRole('button',{name:'Services',exact:true}).click();
   for(const tool of ['policeStation','hospital','fireStation'])assert.ok(await page.locator(`.build-tool[data-tool=${tool}]`).isEnabled());
   await page.getByRole('button',{name:'Show lesson area',exact:true}).click();
   await page.waitForTimeout(200);
   await page.screenshot({path:`${out}crash-before-advice-${width}.png`});
   await page.getByRole('button',{name:'Show Divert',exact:true}).click();
   await page.locator('.tutorial-locator[data-guide-tool=closure]').waitFor();
   assert.equal(await page.locator('.build-tool[data-tool=closure]').getAttribute('aria-pressed'),'true');
   await page.screenshot({path:`${out}optional-divert-${width}.png`});
   assert.ok(await page.getByRole('button',{name:'Pause the city',exact:true}).isVisible());
   await page.getByRole('button',{name:'Show lesson area',exact:true}).click();
   await page.evaluate(async()=>{
    const c=(await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/save.ts')).at(-1)||'/src/state/save.ts')).getSave().city;
    (await import('/src/game/cityModel.ts')).stepCity(c,31);
   });
   await page.getByRole('dialog',{name:'More roads!',exact:true}).waitFor();
   await page.screenshot({path:`${out}crash-briefing-${width}.png`});
   await page.getByRole('button',{name:'Plan a route',exact:true}).click();
   await page.locator('.tutorial-locator[data-guide-tool=road]').waitFor();
   assert.ok(await page.getByRole('button',{name:'Pause the city',exact:true}).isVisible(),'manager does not leave traffic paused');
   await page.getByRole('button',{name:'Show lesson area',exact:true}).click();
   await page.waitForTimeout(250);
   await page.screenshot({path:`${out}crash-queue-${width}.png`});
   const queued=await page.evaluate(async()=>{const c=(await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/save.ts')).at(-1)||'/src/state/save.ts')).getSave().city;return c.trips.filter(t=>!t.service&&t.phase!=='visiting'&&t.phase!=='crashed'&&t.hold>1).length;});
   assert.ok(queued>0,'unresolved crash produces on-road waiting cars');
   await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).click();
   await page.getByRole('region',{name:'Current objective'}).waitFor();
   assert.equal(await page.locator('dialog.manager-popup[open]').count(),0,'manager briefing must not repeat on reload');
   console.log('PASS scripted incident: automatic manager briefing, Road unlock and saved one-time presentation');
  }
  console.log(`PASS ${width}: fresh H roads, zero automatic houses, locked roads, pointer Home/Store placement, reload and Skip`);
  await context.close();
 }
}finally{await browser.close();}
