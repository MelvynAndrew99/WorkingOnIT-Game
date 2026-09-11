import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE);
const out = process.env.UI_EVIDENCE_DIR ?? '/tmp/flow03-evidence';
await fs.mkdir(out, {recursive:true});
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const results = [];
try {
 for (const [name,width,height] of [['desktop',1440,900],['narrow',390,844]]) {
  const context = await browser.newContext({viewport:{width,height}});
  const page = await context.newPage(), errors = [], external = [];
  page.on('pageerror', e => errors.push(e.message));
  await context.route('**/*', r => {
   if (new URL(r.request().url()).hostname === '127.0.0.1') return r.continue();
   external.push(r.request().url()); return r.abort();
  });
  const base = process.env.UI_BASE_URL ?? 'http://127.0.0.1:5191';
  await page.goto(base);
  await page.evaluate(() => localStorage.setItem('city-workshop:city:v1','untouched-player-sentinel'));
  await page.getByRole('button',{name:'Continue commute'}).click();
  await page.getByRole('heading',{name:'A neighborhood worth visiting',exact:true}).waitFor();
  await page.getByRole('button',{name:'Pause the city',exact:true}).click();
  const initial = await page.evaluate(async () => {
   const urls=performance.getEntriesByType('resource').map(e=>e.name);
   window.save=await import(urls.filter(n=>n.includes('/src/state/save.ts')).at(-1));
   const city=save.getSave().city; save.flushSave();
   return {elapsed:city.elapsed,roads:city.roads,buildings:city.buildings,flow:city.missions.flow,external:city.trips.filter(t=>t.external).length};
  });
  assert.equal(initial.external,0);
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(()=>save.getSave().city.elapsed),initial.elapsed);
  await page.getByRole('button',{name:'Resume game',exact:true}).click();
  await page.getByRole('button',{name:'Inspect traffic',exact:true}).click();
  await page.screenshot({path:`${out}/${name}.png`});
  const map=await page.locator('.city-map-viewport').boundingBox();
  assert.ok(map.height>=100);
  await page.evaluate(()=>{save.getSave().city.funds=1234; save.flushSave();});
  await page.goto(base+'/?trial=2');
  await page.getByRole('button',{name:'Continue commute'}).click();
  const second = await page.evaluate(async()=>{
   const urls=performance.getEntriesByType('resource').map(e=>e.name);
   const save=await import(urls.filter(n=>n.includes('/src/state/save.ts')).at(-1));
   const c=save.getSave().city;return {funds:c.funds,roads:c.roads,buildings:c.buildings};
  });
  assert.notEqual(second.funds,1234);
  assert.deepEqual(second.roads,initial.roads);
  assert.deepEqual(second.buildings,initial.buildings);
  await page.goto(base);
  await page.getByRole('button',{name:'Continue commute'}).click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('working-on-it:flow03-playtest:v1:1')).city.funds),1234);
  assert.equal(await page.evaluate(()=>localStorage.getItem('city-workshop:city:v1')),'untouched-player-sentinel');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  results.push({name,map,initialElapsed:initial.elapsed,independentTrials:true,normalSaveUntouched:true,noExternalRequests:true});
  await context.close();
 }
 await fs.writeFile(`${out}/results.json`,JSON.stringify(results,null,2));
 console.log(JSON.stringify(results));
} finally {await browser.close();}
