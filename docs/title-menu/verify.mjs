const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
for(const [name,width,height] of [['desktop',1440,900],['narrow',390,844]]){
const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
await page.goto('http://127.0.0.1:5197');await page.getByRole('button',{name:'Start your city',exact:true}).waitFor();await page.screenshot({path:`/tmp/title-menu-review/${name}.png`});
assert.equal(await page.locator('#app-frame').evaluate(e=>e.clientWidth),width);
assert.equal(await page.getByRole('button',{name:'New city',exact:true}).count(),0);
for(const button of await page.locator('.title-navigation button').all()){const b=await button.boundingBox();assert.ok(b.width>=44&&b.height>=44);assert.ok(b.y+b.height<=height&&b.x>=0&&b.x+b.width<=width);}
await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByRole('combobox').selectOption('portrait');await page.getByRole('button',{name:'Done',exact:true}).click();assert.equal(await page.locator('#app-frame').evaluate(e=>e.clientWidth),width);
await page.getByRole('button',{name:'Challenges',exact:true}).click();await page.locator('.journey-screen').waitFor();await page.evaluate(async()=>{const urls=performance.getEntriesByType('resource').map(e=>e.name);const st=await import(urls.filter(n=>n.includes('/src/state/store.ts')).at(-1));st.store.patch({phase:'menu'});});
await page.getByRole('button',{name:'Start your city',exact:true}).waitFor();
await page.evaluate(async()=>{const urls=performance.getEntriesByType('resource').map(e=>e.name);window.save=await import(urls.filter(n=>n.includes('/src/state/save.ts')).at(-1));window.st=await import(urls.filter(n=>n.includes('/src/state/store.ts')).at(-1));save.getSave().city.elapsed=10;save.flushSave();st.store.patch({phase:'challenges'});});
await page.evaluate(()=>st.store.patch({phase:'menu'}));await page.getByRole('button',{name:'Continue commute',exact:true}).waitFor();
const before=await page.evaluate(()=>JSON.stringify(save.getSave().city));await page.getByRole('button',{name:'New city',exact:true}).click();await page.getByRole('button',{name:'Keep current city',exact:true}).click();assert.equal(await page.evaluate(()=>JSON.stringify(save.getSave().city)),before);
await page.screenshot({path:`/tmp/title-menu-review/${name}-returning.png`});await page.getByRole('button',{name:'Continue commute',exact:true}).click();await page.locator('canvas').waitFor();
assert.deepEqual(errors,[]);console.log(`${name}: full viewport, touch targets, settings/display mode, challenge entry, cancel reset and continue pass`);await context.close();
}
await browser.close();
