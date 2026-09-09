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
 let d=await guide(page);assert.match(await d.innerText(),/Your first customer/);
 const metrics=await d.evaluate(el=>({overflow:el.scrollWidth-el.clientWidth,buttons:[...el.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().height>0).map(b=>({text:b.textContent,height:b.getBoundingClientRect().height,width:b.getBoundingClientRect().width,font:parseFloat(getComputedStyle(b).fontSize)}))}));
 assert.ok(metrics.overflow<=1,'guide does not scroll horizontally');
 assert.ok(metrics.buttons.every(b=>b.height>=43.9&&b.width>=43.9&&b.font>=17.59),JSON.stringify(metrics));
 console.log(`GUIDE ${viewport.width}`,JSON.stringify(metrics));
 await page.screenshot({path:`${out}first-lesson-${viewport.width}.png`});
 const before=(await live(page)).city;
 await d.getByRole('button',{name:'Apply free solution',exact:true}).click();
 let state=await live(page);assert.equal(state.city.funds,before.funds);assert.equal(state.city.buildings.length,2);assert.ok(state.city.roads.length>0);assert.equal(state.city.external.gateway,null);assert.equal(state.city.trips.length,0,'paused example did not invent trips');
 await page.screenshot({path:`${out}free-example-${viewport.width}.png`});
 d=await guide(page);await d.getByRole('button',{name:'Skip tutorial',exact:true}).click();
 state=await live(page);assert.equal(state.city.tutorial.status,'skipped');assert.equal(state.city.funds,before.funds);assert.equal(state.city.buildings.length,2);
 await page.reload();await paused(page);assert.equal((await live(page)).city.tutorial.status,'skipped');
 d=await guide(page);assert.equal((await live(page)).city.external.gateway,null);
 await d.getByRole('button',{name:'Connect and enter main game',exact:true}).click();
 state=await live(page);assert.deepEqual(state.city.external.gateway,{x:0,y:4});assert.equal(state.city.funds,before.funds);
 await page.getByRole('button',{name:/^Resume/}).click();
 await waitState(page,v=>v.city.trips.some(t=>t.external)&&v.city.missions.shoppers.length>0,30000);
 await page.getByRole('button',{name:/^Pause/}).click();
 state=await live(page);assert.ok(state.city.missions.shoppers.length>0,'local visit completed during actual browser play');
 assert.ok(state.city.trips.some(t=>t.external));
 await page.screenshot({path:`${out}outside-traffic-${viewport.width}.png`});
 // New isolated saved practice district, stopped immediately before a naturally forming collision.
 const practice=await page.evaluate(async saveKey=>{
  const m=await import('/src/game/cityModel.ts'),t=await import('/src/game/cityTutorial.ts'),c=m.createCity();t.tutorialAction(c,'practice');
  for(let i=0;i<120/m.TRAFFIC_TICK;i++){m.stepCity(c,m.TRAFFIC_TICK);if(c.risks.some(r=>r.exposure>=5.9))break;}
  if(c.accidentCount!==0||!c.risks.some(r=>r.exposure>=5.9))throw Error('Practice must reach natural warning before crash');
  if(!m.parseCity(JSON.parse(JSON.stringify(c))))throw Error('Practice warning save must load');
  localStorage.setItem(saveKey,JSON.stringify({city:c,updatedAt:Date.now()+1000}));return structuredClone(c);
 },saveKey);
 await page.reload();await paused(page);assert.deepEqual((await live(page)).city,practice);
 await page.getByRole('button',{name:/^Resume/}).click();
 await waitState(page,v=>v.state.paused&&v.city.accidentCount>0,12000);
 d=page.getByRole('dialog',{name:'Learn the roads',exact:true});await d.waitFor();
 assert.match(await d.innerText(),/A crash needs attention/);assert.match(await d.innerText(),/Needs police/);
 assert.match(await d.innerText(),/Time is paused while you plan/);
 await d.getByRole('region',{name:'Tutorial accident response'}).scrollIntoViewIfNeeded();
 await page.screenshot({path:`${out}real-crash-guide-${viewport.width}.png`});
 const crash=(await live(page)).city;
 await d.getByRole('button',{name:'Close',exact:true}).click();
 assert.deepEqual((await live(page)).city,crash,'closing lesson does not edit map or unpause');
 await page.getByRole('button',{name:'Menu',exact:true}).click();
 await page.getByRole('button',{name:'Skip tutorial',exact:true}).click();
 await page.getByRole('button',{name:/^Pause/}).click();
 state=await live(page);assert.equal(state.city.tutorial.status,'skipped');assert.deepEqual(state.city.buildings,crash.buildings);assert.deepEqual(state.city.roads,crash.roads);assert.equal(state.city.funds,crash.funds);
 assert.deepEqual(errors,[]);console.log(`PASS ${viewport.width}: free preserved-town example, both skip paths, saved explicit connection, real outside traffic, natural first crash pauses and opens guide`);
 await context.close();
}
}catch(e){if(active&&!active.isClosed())await active.screenshot({path:`${out}browser-failure.png`}).catch(()=>{});throw e;}finally{await browser.close();}
