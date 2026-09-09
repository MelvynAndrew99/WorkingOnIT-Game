import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.CITY_PLAYWRIGHT_MODULE||'/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:process.env.CITY_CHROMIUM_PATH||'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let active;
const out=fileURLToPath(new URL('.',import.meta.url)),url=process.env.CITY_URL||'http://localhost:5181';
async function live(page){return page.evaluate(async()=>{const path=s=>performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes(s)).at(-1)||s;const {getSave}=await import(path('/src/state/save.ts')),{store}=await import(path('/src/state/store.ts'));return {city:structuredClone(getSave().city),state:structuredClone(store.get())};});}
async function patch(page,value){await page.evaluate(async value=>{const {store}=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/store.ts')).at(-1)||'/src/state/store.ts');store.patch(value);},value);await page.waitForTimeout(100);}
async function focusTile(page,x,y){await page.evaluate(async({x,y})=>{const {cityCommand}=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/game/cityControls.ts')).at(-1)||'/src/game/cityControls.ts');cityCommand({type:'focus',point:{x,y}});},{x,y});await page.waitForTimeout(100);
return page.evaluate(()=>{const rect=s=>document.querySelector(s)?.getBoundingClientRect();const f=rect('#app-frame'),h=rect('.city-header'),footer=rect('.city-controls'),l=rect('.city-rail-left'),r=rect('.city-rail-right'),scale=Math.min(f.width/720,1);const left=14*scale+(l?.width?l.width+8:0),right=14*scale+(r?.width?r.width+8:0);return {x:f.x+left+(f.width-left-right)/2,y:(h.bottom+footer.top)/2};});}
async function placeWithPointer(page,x,y){const p=await focusTile(page,x,y);await page.mouse.click(p.x,p.y);await page.waitForTimeout(150);}
try {
 for(const spec of [{width:320,height:640,mode:'auto'},{width:390,height:844,mode:'auto'},{width:1440,height:900,mode:'auto'},{width:1440,height:900,mode:'portrait'}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:spec.width<500});
  const page=await context.newPage(),errors=[];active=page;page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.getByRole('button',{name:'Start your city',exact:true}).waitFor();
  await patch(page,{phase:'playing',paused:true,displayMode:spec.mode});await page.locator('canvas').waitFor();await page.waitForTimeout(250);
  const toast=page.locator('.tutorial-locator');
  await toast.waitFor({state:'visible'});
  if(spec.width===320){
   for(const enabled of [false,true]){
    await page.getByRole('button',{name:'Menu',exact:true}).click();
    await page.getByRole('button',{name:'Settings',exact:true}).click();
    await page.getByRole('checkbox',{name:'Show gameplay control tips',exact:true}).setChecked(enabled);
    await page.getByRole('button',{name:'Done',exact:true}).click();
    await page.getByRole('button',{name:/Start your city|Continue commute/}).click();
    await patch(page,{paused:true});
    if(enabled)await toast.waitFor();else {assert.equal(await toast.count(),0);assert.equal(await page.locator('.objective-primary').innerText(),'Home','turning off tips must not remove the objective action');}
    assert.equal(await page.evaluate(()=>localStorage.getItem('working-on-it:show-tips')),String(enabled));
   }
  }

  assert.equal(await toast.getAttribute('data-guide-tool'),'home');
  assert.equal(await page.locator('.build-tool[data-tool=home]').getAttribute('data-tutorial-target'),'true');
  const frameWidth=await page.locator('#app-frame').evaluate(e=>e.clientWidth);
  if(frameWidth<860){
   await page.getByRole('button',{name:'Roads',exact:true}).click();
   assert.equal(await page.getByRole('button',{name:'Places',exact:true}).getAttribute('data-tutorial-target'),'true');
   assert.match(await toast.innerText(),/Open Places/);
   await page.getByRole('button',{name:'Places',exact:true}).click();
   assert.equal(await page.locator('.build-tool[data-tool=home]').getAttribute('data-tutorial-target'),'true');
  }
  await page.getByRole('button',{name:'Report',exact:true}).click();
  await page.locator('dialog[open]').waitFor();
  assert.equal(await toast.count(),0,'dialog suppresses tutorial cue');
  assert.equal(await page.locator('[data-tutorial-target=true]').count(),0,'dialog suppresses ring');
  await page.keyboard.press('Escape');await toast.waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.build-tool[data-tool=home]').evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.ok(parseFloat(await page.locator('.build-tool[data-tool=home]').evaluate(e=>getComputedStyle(e).outlineWidth))>=3);
  await page.emulateMedia({reducedMotion:'no-preference'});
  const dims=await page.evaluate(()=>{const t=document.querySelector('.tutorial-locator').getBoundingClientRect(),o=document.querySelector('.objective-bar').getBoundingClientRect(),h=document.querySelector('.city-header').getBoundingClientRect(),f=document.querySelector('.city-controls').getBoundingClientRect(),frame=document.querySelector('#app-frame').getBoundingClientRect();return {toastBottom:t.bottom,objectiveTop:o.top,mapHeight:f.top-h.bottom,overflow:document.documentElement.scrollWidth>window.innerWidth,inside:t.left>=frame.left&&t.right<=frame.right};});
  assert.ok(dims.toastBottom<=dims.objectiveTop,'callout sits above objective');assert.ok(dims.mapHeight>=160,'map retains space for placement');assert.ok(dims.inside);assert.equal(dims.overflow,false);

  const tag=`${spec.width}-${spec.mode}`;
  const home=page.locator('.build-tool[data-tool=home]');await home.waitFor({state:'visible'});
  assert.match(await home.innerText(),/Home\s*\$200/);
  await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});
  await page.screenshot({path:`${out}initial-${tag}.png`});
  if(spec.width===320){
   await page.evaluate(async()=>{const path=s=>performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes(s)).at(-1)||s;const {getSave}=await import(path('/src/state/save.ts')),{stepCity}=await import(path('/src/game/cityModel.ts')),{cityCommand}=await import(path('/src/game/cityControls.ts'));stepCity(getSave().city,60);cityCommand({type:'tutorial',action:'assist'});});
   assert.equal(await home.locator('.build-cost').innerText(),'Free','live waiver price remains authoritative');
   assert.equal(await home.getAttribute('data-tutorial-target'),'true');
  }

  await page.getByRole('button',{name:'Dismiss tutorial hint',exact:true}).click();assert.equal(await toast.count(),0);
  await home.click();await placeWithPointer(page,2,2);
  assert.equal((await live(page)).city.buildings.filter(b=>b.kind==='home').length,1,'highlighted Home leads to real placement');
  await toast.waitFor();assert.equal(await toast.getAttribute('data-guide-tool'),'store');
  assert.equal(await page.locator('.build-tool[data-tool=store]').getAttribute('data-tutorial-target'),'true');
  await page.screenshot({path:`${out}store-${tag}.png`});
  await page.locator('.build-tool[data-tool=store]').click();await placeWithPointer(page,7,2);
  assert.equal((await live(page)).city.buildings.filter(b=>b.kind==='store').length,1,'Store leads to real placement');
  assert.equal(await toast.getAttribute('data-guide-tool'),'road');
  if(frameWidth<860){assert.equal(await page.getByRole('button',{name:'Roads',exact:true}).getAttribute('data-tutorial-target'),'true');await page.getByRole('button',{name:'Roads',exact:true}).click();}
  assert.equal(await page.locator('.build-tool[data-tool=road]').getAttribute('data-tutorial-target'),'true');
  await page.locator('.build-tool[data-tool=road]').click();
  for(let x=2;x<=8;x++)await placeWithPointer(page,x,4);
  assert.equal((await live(page)).state.connected,1);assert.equal(await toast.count(),0,'connected trip-watching has no misleading construction target');
  await page.evaluate(async()=>{const {cityCommand}=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/game/cityControls.ts')).at(-1)||'/src/game/cityControls.ts');cityCommand({type:'tutorial',action:'skip'});});
  assert.equal(await toast.count(),0);assert.equal(await page.locator('[data-tutorial-target=true]').count(),0);
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${tag}: category/tool locators, Home/Store/Road pointer placement, dismissal, dialogs, reduced motion and skip`);
 }
}catch(error){if(active&&!active.isClosed()){await active.screenshot({path:`${out}failure.png`});console.log(await active.locator('body').innerText());}throw error;}finally{await browser.close();}
