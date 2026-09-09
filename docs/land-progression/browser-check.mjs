import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {chromium}=await import('/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const out=fileURLToPath(new URL('.',import.meta.url));
async function saved(page){return page.evaluate(async()=>{const s=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/save.ts')).at(-1)||'/src/state/save.ts');return s.getSave().city;});}
try{
 for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===320?640:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:5181');await page.getByRole('button',{name:'Start your city',exact:true}).waitFor();
  await page.evaluate(async()=>{
   const m=await import('/src/game/cityModel.ts'),c=m.createCity(true);m.place(c,'home',3,2);m.place(c,'store',13,8);c.tutorial.hRoad.stage=9;
   localStorage.setItem('city-workshop:city:v1',JSON.stringify({city:c,updatedAt:Date.now()+1000}));
  });
  await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).waitFor();
  await page.evaluate(async()=>{const {store}=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/store.ts')).at(-1)||'/src/state/store.ts');store.patch({phase:'playing',paused:true});});
  const initial=await saved(page);
  await page.getByRole('region',{name:'Current objective'}).getByRole('button',{name:'Add land',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Room to grow',exact:true});await dialog.waitFor();
  const boxes={};for(const d of ['north','west','east','south'])boxes[d]=await page.getByRole('button',{name:`Expand ${d}`,exact:true}).boundingBox();
  assert.ok(boxes.west.x<boxes.east.x&&boxes.north.y<boxes.west.y&&boxes.south.y>boxes.east.y);
  await page.getByRole('button',{name:'Expand west',exact:true}).click();
  await page.screenshot({path:`${out}compass-${width}.png`});
  await page.getByRole('button',{name:'Add land · Free',exact:true}).click();
  let c=await saved(page);assert.equal(c.map.x,-8);assert.equal(c.map.width,32);assert.equal(c.expansion.used,1);assert.equal(c.tutorial.hRoad.stage,9);
  await page.getByRole('region',{name:'Current objective'}).getByRole('button',{name:'Add land',exact:true}).click();
  await page.getByRole('button',{name:'Expand east',exact:true}).click();await page.getByRole('button',{name:'Add land · Free',exact:true}).click();
  await page.getByRole('dialog',{name:'A small update from the mayor',exact:true}).waitFor();
  assert.equal(await page.locator('dialog[open]').count(),1);
  c=await saved(page);assert.equal(c.map.x,-8);assert.equal(c.map.width,40);assert.equal(c.expansion.used,2);assert.equal(c.tutorial.hRoad.stage,10);assert.equal(c.tutorial.status,'complete');
  assert.deepEqual(c.buildings,initial.buildings);assert.deepEqual(c.roads,initial.roads);assert.equal(c.funds,initial.funds);
  await page.screenshot({path:`${out}mayor-${width}.png`});
  await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'hidden'});
  assert.equal((await saved(page)).expansion.briefingSeen,true);
  await page.getByRole('button',{name:'Add land at a map edge',exact:true}).click();
  assert.ok(await page.getByRole('button',{name:'Add land · 1 permit',exact:true}).isDisabled());
  assert.match(await dialog.innerText(),/6 households shopping/);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).click();
  await page.getByRole('region',{name:'Current objective'}).waitFor();assert.equal(await page.locator('dialog[open]').count(),0);
  assert.equal((await saved(page)).expansion.used,2);assert.deepEqual(errors,[]);
  console.log(`PASS ${width}: compass alignment, real west/east expansion, two free strips, once-only mayor speech, mission gate and reload`);
  await context.close();
 }
}finally{await browser.close();}
