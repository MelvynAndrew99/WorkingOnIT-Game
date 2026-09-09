import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const {chromium}=await import('/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const url=process.env.CITY_URL||'http://localhost:5177',out=fileURLToPath(new URL('.',import.meta.url)),saveKey='city-workshop:city:v1';
let active;
async function live(page){return page.evaluate(async()=>{const path=s=>performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes(s)).at(-1)||s;const {getSave}=await import(path('/src/state/save.ts')),{store}=await import(path('/src/state/store.ts'));return {city:structuredClone(getSave().city),state:structuredClone(store.get())};});}
async function paused(page){await page.getByRole('button',{name:/Continue commute|Start your city/}).waitFor();await page.evaluate(async()=>{const {store}=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/store.ts')).at(-1)||'/src/state/store.ts');store.patch({phase:'playing',paused:true});});await page.getByRole('button',{name:/^Resume/}).waitFor();await page.waitForTimeout(200);}
async function guide(page){await page.getByRole('button',{name:'Missions',exact:true}).click();await page.getByRole('button',{name:'Tutorial',exact:true}).click();return page.getByRole('dialog',{name:'Learn the roads',exact:true});}
async function waitState(page,predicate,limit=20000){const end=Date.now()+limit;while(Date.now()<end){const v=await live(page);if(predicate(v))return v;await page.waitForTimeout(50);}throw Error('Timed out waiting for actual simulation state');}
try{
for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1440,height:900}]){
 const context=await browser.newContext({viewport,hasTouch:viewport.width<500}),page=await context.newPage();active=page;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await paused(page);
 const coach=page.getByRole('region',{name:'Tutorial guide'});
 assert.match(await coach.innerText(),/Build a home/i);assert.equal(await page.locator('dialog[open]').count(),0);
 const metrics=await page.evaluate(()=>{const h=document.querySelector('.city-header').getBoundingClientRect(),f=document.querySelector('.city-controls').getBoundingClientRect();return {map:f.top-h.bottom-12,dock:document.querySelector('.build-palette').getBoundingClientRect().height,bad:[...document.querySelectorAll('.city-ui button')].filter(e=>e.getBoundingClientRect().height>0&&!e.closest('dialog:not([open])')).map(e=>({text:e.textContent,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,font:parseFloat(getComputedStyle(e).fontSize)})).filter(e=>e.w<43.9||e.h<43.9||e.font<17.59)};});
 assert.ok(metrics.map>=210);assert.ok(metrics.dock<=112);assert.deepEqual(metrics.bad,[]);console.log(viewport.width,JSON.stringify(metrics));
 await page.screenshot({path:`${out}initial-${viewport.width}.png`});
 const untouched=(await live(page)).city;
 for(const [category,tools] of [['Roads',['road','stop','signal','closure']],['Places',['home','store','park','bulldoze']],['Services',['policeStation','fireStation','hospital']]]){
  await page.getByRole('button',{name:category,exact:true}).click();
  for(const tool of tools){const b=page.locator(`.build-shelf [data-tool=${tool}]`);await b.click();assert.equal((await live(page)).state.tool,tool);assert.equal(await b.getAttribute('aria-pressed'),'true');assert.ok((await b.locator('.build-cost').innerText()).length>0);}
 }
 await page.screenshot({path:`${out}services-${viewport.width}.png`});
 await page.keyboard.press('1');await page.locator('.build-shelf [data-tool=home]').waitFor();
 await page.getByRole('button',{name:'Services',exact:true}).click();await page.keyboard.press('1');await page.locator('.build-shelf [data-tool=home]').waitFor();
 await page.getByRole('button',{name:/^Rotate new buildings/}).click();assert.equal((await live(page)).state.rotation,1);
 assert.deepEqual((await live(page)).city,untouched,'dock buttons never build through the map');
 await coach.getByRole('button',{name:/^Home/}).click();assert.equal((await live(page)).state.tool,'home');
 await page.getByRole('button',{name:'Services',exact:true}).click();
 await coach.getByRole('button',{name:/^Home/}).click();await page.locator('.build-shelf [data-tool=home]').waitFor();
 await page.getByRole('button',{name:'Roads',exact:true}).click();await page.locator('.build-shelf [data-tool=road]').click();
 const center=await page.evaluate(()=>{const h=document.querySelector('.city-header').getBoundingClientRect(),f=document.querySelector('.city-controls').getBoundingClientRect();return {x:(h.left+h.right)/2,y:(h.bottom+f.top)/2};});
 await page.mouse.click(center.x,center.y);
 assert.equal((await live(page)).city.roads.length,1,'the map is usable while tutorial is visible');
 const built=(await live(page)).city,originalRoad=built.roads[0];
 await coach.getByRole('button',{name:'Free help',exact:true}).click();
 let state=await live(page);assert.equal(state.city.funds,built.funds);assert.ok(state.city.roads.some(p=>p.x===originalRoad.x&&p.y===originalRoad.y));assert.equal(state.city.buildings.length,2);assert.equal(await page.locator('dialog[open]').count(),0);
 await page.getByRole('button',{name:/^Resume/}).click();
 await waitState(page,v=>v.state.tutorial.currentId==='park-visit',30000);await page.getByRole('button',{name:/^Pause/}).click();
 assert.match(await coach.innerText(),/Connect a Park/);
 await page.screenshot({path:`${out}next-lesson-${viewport.width}.png`});
 const ready=(await live(page));const item=ready.state.missions.items.find(j=>j.done&&!j.claimed);
 assert.ok(item);await page.getByRole('button',{name:`Claim $${item.reward} reward`,exact:true}).click();
 state=await live(page);assert.equal(state.city.funds,ready.city.funds+item.reward);
 assert.ok(state.state.missions.items.find(j=>j.id===item.id).claimed);
 const claimed=state.city;
 await page.reload();await paused(page);state=await live(page);assert.equal(state.city.funds,claimed.funds);assert.ok(state.state.missions.items.find(j=>j.id===item.id).claimed);
 await page.getByRole('button',{name:'Map',exact:true}).click();const map=page.getByRole('dialog',{name:'Your town',exact:true});await map.waitFor();
 await map.getByRole('button',{name:'Pan',exact:true}).click();assert.equal((await live(page)).state.panning,true);
 await map.getByRole('button',{name:'Zoom out',exact:true}).click();await map.getByRole('button',{name:'Zoom in',exact:true}).click();
 await map.getByRole('button',{name:'Expand',exact:true}).click();const expand=page.getByRole('dialog',{name:'Room to grow',exact:true});await expand.waitFor();
 const oldWidth=(await live(page)).city.map.width;
 await expand.getByRole('button',{name:'Add land',exact:true}).click();assert.equal((await live(page)).city.map.width,oldWidth+8);
 if(!await map.isVisible())await page.getByRole('button',{name:'Map',exact:true}).click();
 await map.getByRole('button',{name:'City report',exact:true}).click();const report=page.getByRole('dialog',{name:'City report',exact:true});await report.waitFor();await report.getByRole('button',{name:'Close city dialog'}).click();
 await coach.getByRole('button',{name:'Exit tutorial',exact:true}).click();assert.equal(await coach.count(),0);
 await page.getByRole('button',{name:'Missions',exact:true}).click();let missions=page.getByRole('dialog',{name:'Your next big idea',exact:true});
 await missions.getByRole('button',{name:'City link & guide',exact:true}).click();missions=page.getByRole('dialog',{name:'A growing town',exact:true});
 assert.match(await missions.innerText(),/outside city/);await page.screenshot({path:`${out}city-link-${viewport.width}.png`});
 await missions.getByRole('button',{name:'Close',exact:true}).click();
 // Real practice save immediately before a naturally accumulating first crash.
 await page.evaluate(async saveKey=>{const m=await import('/src/game/cityModel.ts'),t=await import('/src/game/cityTutorial.ts'),c=m.createCity();t.tutorialAction(c,'practice');for(let i=0;i<120/m.TRAFFIC_TICK;i++){m.stepCity(c,m.TRAFFIC_TICK);if(c.risks.some(r=>r.exposure>=5.9))break;}if(c.accidentCount||!c.risks.some(r=>r.exposure>=5.9)||!m.parseCity(c))throw Error('Invalid natural warning fixture');localStorage.setItem(saveKey,JSON.stringify({city:c,updatedAt:Date.now()+1000}));},saveKey);
 await page.reload();await paused(page);await page.getByRole('button',{name:/^Resume/}).click();
 await waitState(page,v=>v.state.paused&&v.city.accidentCount>0,12000);
 assert.equal(await page.locator('dialog[open]').count(),0,'first crash uses the inline coach');
 assert.equal(await coach.getAttribute('data-urgent'),'true');assert.match(await coach.innerText(),/Police needed/);
 const beforeService=(await live(page)).city;
 await coach.getByRole('button',{name:/^Police/}).click();await page.locator('.build-shelf [data-tool=policeStation]').waitFor();
 assert.equal((await live(page)).state.tool,'policeStation');assert.deepEqual((await live(page)).city,beforeService);
 assert.equal(await page.locator('.dispatch-feedback').count(),0,'urgent coach replaces redundant toast');
 await page.screenshot({path:`${out}urgent-coach-${viewport.width}.png`});
 assert.deepEqual(errors,[]);console.log(`PASS ${viewport.width}: inline teaching+real map input, all dock tools, keyboard reveal, actual lesson progress, once-only claimed reward reload, map controls, city-link access, nonmodal real-crash coach`);
 await context.close();
}
}catch(e){if(active&&!active.isClosed())await active.screenshot({path:`${out}browser-failure.png`}).catch(()=>{});throw e;}finally{await browser.close();}
