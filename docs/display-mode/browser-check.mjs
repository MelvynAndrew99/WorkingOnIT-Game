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
async function size(page){return page.evaluate(()=>{const f=document.querySelector('#app-frame').getBoundingClientRect(),c=document.querySelector('canvas').getBoundingClientRect();return {frame:{x:f.x,width:f.width,height:f.height},canvas:{x:c.x,width:c.width,height:c.height}};});}
async function setLiveMode(page,mode){await page.evaluate(async mode=>{const {store}=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/store.ts')).at(-1)||'/src/state/store.ts');store.patch({displayMode:mode});},mode);await page.waitForTimeout(350);}
async function focusInput(page,x,y){
 await page.evaluate(async({x,y})=>{const path=s=>performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes(s)).at(-1)||s;const {cityCommand}=await import(path('/src/game/cityControls.ts')),{store}=await import(path('/src/state/store.ts'));store.patch({tool:'road',panning:false});cityCommand({type:'focus',point:{x,y}});},{x,y});
 await page.waitForTimeout(100);
 const at=await page.evaluate(()=>{const h=document.querySelector('.city-header').getBoundingClientRect(),f=document.querySelector('.city-controls').getBoundingClientRect(),frame=document.querySelector('#app-frame').getBoundingClientRect();return {x:frame.x+frame.width/2,y:(h.bottom+f.top)/2,scale:Math.min(frame.width/720,1)};});
 await page.mouse.click(at.x,at.y);await page.mouse.click(at.x+48*at.scale,at.y);
 const c=(await live(page)).city;
 assert.ok(c.roads.some(p=>p.x===x&&p.y===y),`center pointer maps to ${x},${y}`);
 assert.ok(c.roads.some(p=>p.x===x+1&&p.y===y),`48 design units maps to one tile at scale ${at.scale}`);
 return at.scale;
}
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();active=page;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.getByRole('button',{name:/Start your city/}).waitFor();
 await page.evaluate(async saveKey=>{const m=await import('/src/game/cityModel.ts'),c=m.createCity();m.place(c,'home',0,2);m.place(c,'store',9,2);for(let x=0;x<=12;x++)m.place(c,'road',x,4);c.tutorial.status='skipped';localStorage.setItem(saveKey,JSON.stringify({city:c,updatedAt:Date.now()+1000}));},saveKey);
 await page.reload();await paused(page);
 let dimensions=await size(page);assert.equal(dimensions.frame.width,1440);assert.equal(dimensions.canvas.width,1440);assert.equal(dimensions.canvas.height,900);
 const initial=(await live(page)).city;
 await page.screenshot({path:`${out}desktop-auto.png`});
 assert.equal(await focusInput(page,7,7),1,'wide mode retains 48px tiles');
 for(const mode of ['portrait','wide','auto']){
  const before=(await live(page)).city;await setLiveMode(page,mode);assert.deepEqual((await live(page)).city,before,'display switching cannot reset or reshape saved town');
  dimensions=await size(page);const expected=mode==='portrait'?506.25:1440;
  assert.ok(Math.abs(dimensions.frame.width-expected)<1);assert.ok(Math.abs(dimensions.canvas.width-dimensions.frame.width)<1);assert.equal(dimensions.canvas.height,900);
  console.log(mode,dimensions);
  await focusInput(page,7,mode==='portrait'?8:9);
  await page.screenshot({path:`${out}desktop-${mode}.png`});
 }
 // Actual settings change persists across reload; title/menu remains a portrait composition.
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click();
 const display=page.getByLabel(/Game display/);await display.selectOption('portrait');
 assert.equal(await page.locator('#app-frame').getAttribute('data-display-mode'),'portrait');
 await page.screenshot({path:`${out}settings.png`});
 await page.getByRole('button',{name:'Done',exact:true}).click();await page.reload();
 await page.getByRole('button',{name:'Settings',exact:true}).click();assert.equal(await display.inputValue(),'portrait');
 await page.getByRole('button',{name:'Done',exact:true}).click();await paused(page);dimensions=await size(page);assert.ok(Math.abs(dimensions.frame.width-506.25)<1);
 const restored=(await live(page)).city;assert.deepEqual(restored.buildings,initial.buildings);assert.ok(restored.roads.length>initial.roads.length,'real placed roads survived settings reload');
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click();await display.selectOption('wide');await page.getByRole('button',{name:'Done',exact:true}).click();await page.reload();await paused(page);dimensions=await size(page);assert.equal(dimensions.frame.width,1440);assert.equal(dimensions.canvas.width,1440);
 assert.deepEqual((await live(page)).city,restored,'persistent wide selection preserves city exactly');
 assert.deepEqual(errors,[]);await context.close();
 const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),phone=await mobile.newPage();active=phone;await phone.goto(url);await paused(phone);dimensions=await size(phone);assert.equal(dimensions.frame.width,390);assert.equal(dimensions.canvas.width,390);assert.equal(dimensions.canvas.height,844);
 const before=(await live(phone)).city;
 for(const mode of ['wide','portrait','auto']){await setLiveMode(phone,mode);dimensions=await size(phone);assert.equal(dimensions.frame.width,390);assert.equal(dimensions.canvas.width,390);assert.deepEqual((await live(phone)).city,before);}
 await focusInput(phone,7,7);await phone.screenshot({path:`${out}mobile-auto.png`});await mobile.close();console.log('PASS settings persistence, wide/portrait canvas resize, capped tile scale, actual input after switch, unchanged city and mobile auto');
}catch(e){if(active&&!active.isClosed())await active.screenshot({path:`${out}browser-failure.png`}).catch(()=>{});throw e;}finally{await browser.close();}
