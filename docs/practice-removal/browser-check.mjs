import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.CITY_PLAYWRIGHT_MODULE||'/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:process.env.CITY_CHROMIUM_PATH||'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const out=fileURLToPath(new URL('.',import.meta.url)), url=process.env.CITY_URL||'http://localhost:5181';
try {
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.getByRole('button',{name:'Start your city',exact:true}).waitFor();
  const expected=await page.evaluate(async()=>{
   const m=await import('/src/game/cityModel.ts'),t=await import('/src/game/cityTutorial.ts');
   const city=m.createCity();
   for(const [x,y] of [[4,6],[5,6],[6,6],[5,5]])m.place(city,'road',x,y);
   m.place(city,'stop',5,6);
   city.tutorial.completed=['first-visit','park-visit','driver-rules','junction-control'];t.refreshTutorial(city);
   const before=JSON.stringify(city);t.tutorialAction(city,'practice');
   if(JSON.stringify(city)!==before)throw Error('Retired command changed the town');
   if(!m.parseCity(JSON.parse(before)))throw Error('Fixture must reload');
   localStorage.setItem('city-workshop:city:v1',JSON.stringify({city,updatedAt:Date.now()+1000}));
   return {roads:city.roads,buildings:city.buildings,funds:city.funds,map:city.map};
  });
  await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).waitFor();
  await page.evaluate(async()=>{const {store}=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/store.ts')).at(-1)||'/src/state/store.ts');store.patch({phase:'playing',paused:true});});
  await page.getByRole('region',{name:'Current objective'}).waitFor();
  if(width<900)await page.getByRole('button',{name:'More',exact:true}).click();
  await page.getByRole('button',{name:'Keep my safe crossing',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:/practice/i}).count(),0);
  assert.doesNotMatch(await page.getByRole('region',{name:'Current objective'}).innerText(),/practice district|practice crossing/i);
  await page.screenshot({path:`${out}safe-crossing-${width}.png`});
  await page.getByRole('button',{name:'Keep my safe crossing',exact:true}).click();
  const after=await page.evaluate(async()=>{
   const s=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/save.ts')).at(-1)||'/src/state/save.ts');
   const c=s.getSave().city;s.flushSave();return {geometry:{roads:c.roads,buildings:c.buildings,funds:c.funds,map:c.map},tutorial:c.tutorial,rescued:c.rescuedCount,accidents:c.accidentCount};
  });
  assert.deepEqual(after.geometry,expected);assert.ok(after.tutorial.completed.includes('rescue'));assert.equal(after.rescued,0);assert.equal(after.accidents,0);
  await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).waitFor();
  const loaded=await page.evaluate(async()=>{const s=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/save.ts')).at(-1)||'/src/state/save.ts');return s.getSave().city.tutorial;});
  assert.deepEqual(loaded,after.tutorial);assert.deepEqual(errors,[]);
  console.log(`PASS ${width}: no Practice controls, unchanged town, safe-crossing acknowledgement and saved progress, no invented rescue`);
  await context.close();
 }
}finally{await browser.close();}
