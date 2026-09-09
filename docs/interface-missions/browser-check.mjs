import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.CITY_PLAYWRIGHT_MODULE || '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ headless:true, executablePath:process.env.CITY_CHROMIUM_PATH || '/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const url = process.env.CITY_URL || 'http://localhost:5177', out = fileURLToPath(new URL('.',import.meta.url));
const saveKey = 'city-workshop:city:v1';
let active;
const live = async page => page.evaluate(async()=>{
  const resource = suffix => performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes(suffix)).at(-1)||suffix;
  const s=await import(resource('/src/state/save.ts')), st=await import(resource('/src/state/store.ts'));
  return {city:structuredClone(s.getSave().city), state:structuredClone(st.store.get())};
});
async function mountPaused(page) {
  await page.getByRole('button',{name:'Continue commute',exact:true}).waitFor();
  await page.evaluate(async()=>{const {store}=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/store.ts')).at(-1)||'/src/state/store.ts');store.patch({phase:'playing',paused:true});});
  await page.getByRole('button',{name:/^Resume/}).waitFor();
  await page.waitForTimeout(350);
}
try {
 for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1440,height:900}]) {
  const context=await browser.newContext({viewport,hasTouch:viewport.width<500});
  const page=await context.newPage(); active=page; const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url); await page.getByRole('button',{name:'Start your city',exact:true}).waitFor();
  const expected=await page.evaluate(async saveKey=>{
    const m=await import('/src/game/cityModel.ts'), c=m.createCity();
    for(let x=0;x<=14;x++)m.place(c,'road',x,6);
    for(let i=0;i<3;i++)m.place(c,'home',i*2,4);
    m.place(c,'store',12,4); m.place(c,'park',5,7,2);
    for(let i=0;i<60/m.TRAFFIC_TICK&&!c.missions.completed.includes('word-on-the-street');i++)m.stepCity(c,m.TRAFFIC_TICK);
    if(!m.parseCity(JSON.parse(JSON.stringify(c))))throw Error('Fixture must be loadable');
    localStorage.setItem(saveKey,JSON.stringify({city:c,updatedAt:Date.now()+1000}));return structuredClone(c);
  },saveKey);
  await page.reload(); await mountPaused(page);
  assert.deepEqual((await live(page)).city,expected,'mounted save preserves actual town, visits and funds');
  const baseline=JSON.stringify((await live(page)).city);
  await page.screenshot({path:`${out}interface-${viewport.width}.png`});
  const measurements=await page.evaluate(()=>{
    const h=document.querySelector('.city-header').getBoundingClientRect(),f=document.querySelector('.city-controls').getBoundingClientRect();
    const small=[];
    for(const e of document.querySelectorAll('.city-ui button,.city-ui button *')) {
      const r=e.getBoundingClientRect(); if(!r.width||!r.height||e.closest('dialog:not([open])'))continue;
      const size=parseFloat(getComputedStyle(e).fontSize);if(size<17.59)small.push({text:e.textContent,size});
    }
    const targets=[...document.querySelectorAll('.city-ui button')].filter(e=>e.getBoundingClientRect().width&&!e.closest('dialog:not([open])')).map(e=>({text:e.textContent,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
    return {mapHeight:f.top-h.bottom-36,small,short:targets.filter(t=>t.height<43.9||t.width<43.9)};
  });
  console.log(viewport.width,JSON.stringify(measurements));
  assert.ok(measurements.mapHeight>=194,`map retains space: ${measurements.mapHeight}`);
  assert.deepEqual(measurements.small,[],'readable tool fonts');
  if(!process.env.CITY_MEASURE_ONLY)assert.deepEqual(measurements.short,[],'44px touch targets');
  for(const [name,tool,cost] of [['Home','home',200],['Store','store',400],['Road','road',20],['Park','park',300],['Clinic','hospital',800],['Police','policeStation',600],['Fire','fireStation',700]]) {
    const button=page.locator(`.city-controls button[data-tool="${tool}"]`);
    await button.click();
    const state=(await live(page)).state;
    assert.equal(state.tool,tool);assert.equal(state.panning,false);
    assert.equal(await button.getAttribute('aria-pressed'),'true');
    assert.ok((await button.innerText()).includes(String(cost)),`${name} exposes cost`);
  }
  for (const tool of ['bulldoze','stop','signal','closure']) {
    const button=page.locator(`.city-controls button[data-tool="${tool}"]`);
    await button.click();assert.equal((await live(page)).state.tool,tool);
    assert.equal(await button.getAttribute('aria-pressed'),'true');
  }
  await page.getByRole('button',{name:/^Rotate/}).click();
  assert.equal((await live(page)).state.rotation,1);
  await page.getByRole('button',{name:'Pan',exact:true}).click();assert.equal((await live(page)).state.panning,true);
  await page.getByRole('button',{name:'City report',exact:true}).click();
  await page.getByRole('dialog',{name:'City report'}).waitFor();
  await page.getByRole('button',{name:'Close city dialog'}).click();
  assert.equal(JSON.stringify((await live(page)).city),baseline,'tool and report clicks do not build through canvas');
  await page.getByRole('button',{name:'Missions',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'The manager’s list'});
  await dialog.waitFor();
  assert.match(await dialog.innerText(),/Recognition 2\/4/);
  await page.screenshot({path:`${out}missions-${viewport.width}.png`});
  await dialog.getByRole('button',{name:'Build a park',exact:true}).click();
  assert.equal((await live(page)).state.tool,'park');assert.equal(await dialog.isVisible(),false);
  assert.equal(JSON.stringify((await live(page)).city),baseline,'mission selection cannot build through canvas');
  await page.getByRole('button',{name:'Missions',exact:true}).click();
  await dialog.locator('.mission-budget').scrollIntoViewIfNeeded();
  if(await dialog.locator('.mission-budget summary').count())await dialog.locator('.mission-budget summary').click();
  assert.match(await dialog.locator('.mission-budget').innerText(),/Cash available/);
  await dialog.locator('.mission-budget dl').scrollIntoViewIfNeeded();
  await page.screenshot({path:`${out}budget-${viewport.width}.png`});
  await dialog.getByRole('button',{name:'Hide guidance, free build',exact:true}).click();
  assert.equal((await live(page)).city.missions.hidden,true);
  await page.reload();await mountPaused(page);
  assert.equal((await live(page)).city.missions.hidden,true);
  assert.equal((await live(page)).city.funds,expected.funds);
  assert.deepEqual((await live(page)).city.trips,expected.trips);
  await page.getByRole('button',{name:'Missions',exact:true}).click();
  await dialog.getByRole('button',{name:'Show current mission',exact:true}).click();
  assert.equal((await live(page)).city.missions.hidden,false);
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  // Seed an existing saved incident, without replacing the mounted simulation.
  await page.evaluate(async saveKey=>{
    const p=performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/save.ts')).at(-1)||'/src/state/save.ts';
    const {getSave}=await import(p),c=structuredClone(getSave().city);
    c.incidents.push({id:c.nextId++,x:14,y:6,severity:'serious',status:'active',createdAt:c.elapsed,required:['police','ems'],completedServices:[],rescueDeadline:c.elapsed+75,outcome:'pending'});c.accidentCount++;
    localStorage.setItem(saveKey,JSON.stringify({city:c,updatedAt:Date.now()+1000}));
  },saveKey);
  await page.reload();await mountPaused(page);
  await page.getByRole('button',{name:'Missions',exact:true}).click();
  const advice=dialog.getByRole('region',{name:'Accident advice'});
  assert.match(await advice.innerText(),/Loop a road around that mess/);
  assert.match(await advice.innerText(),/A detour is not a rescue/);
  assert.match(await advice.innerText(),/Rescue deadline: 75 seconds/);
  await advice.scrollIntoViewIfNeeded();await page.screenshot({path:`${out}accident-advice-${viewport.width}.png`});
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:/^Resume/}).click();
  await page.waitForTimeout(100);await page.getByRole('button',{name:/^Pause/}).click();
  assert.ok((await live(page)).city.elapsed>expected.elapsed);
  assert.deepEqual(errors,[]);
  console.log(`PASS ${viewport.width}: tool access, saved visits, mission progress/preferences, detour/deadline guidance`);
  await context.close();
 }
} catch(e) {if(active&&!active.isClosed())await active.screenshot({path:`${out}browser-failure.png`}).catch(()=>{});throw e;} finally {await browser.close();}
