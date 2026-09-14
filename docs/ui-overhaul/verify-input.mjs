// UI-01 browser evidence; use an isolated browser context, never a personal save.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const output=process.env.UI_EVIDENCE_DIR ?? '/tmp/ui01-evidence';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
try{
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),page=await context.newPage();
await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
await page.goto((process.env.UI_BASE_URL ?? 'http://localhost:5184'));await page.getByRole('button',{name:'Start your city',exact:true}).click();await page.waitForTimeout(700);
await page.evaluate(async()=>{const r=performance.getEntriesByType('resource').map(e=>e.name);window.save=await import(r.filter(n=>n.includes('/src/state/save.ts')).at(-1));window.state=await import(r.filter(n=>n.includes('/src/state/store.ts')).at(-1));window.commands=await import('/src/game/cityControls.ts');});
assert.equal(await page.locator('.build-tool[data-tool=home]').evaluate(el=>getComputedStyle(el).animationName),'none');
await page.locator('.build-tool[data-tool=home]').tap();await page.evaluate(()=>commands.cityCommand({type:'focus',point:{x:3,y:2}}));await page.waitForTimeout(200);
let r=await page.locator('.city-map-viewport').boundingBox();await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);
assert.equal(await page.evaluate(()=>save.getSave().city.buildings.some(b=>b.x===3&&b.y===2)),true);
await page.evaluate(()=>{commands.cityCommand({type:'tutorial',action:'skip'});save.getSave().city.funds=10000;state.store.patch({funds:10000});commands.cityCommand({type:'focus',point:{x:16,y:13}});});
await page.keyboard.press('3');await page.waitForTimeout(300);r=await page.locator('.city-map-viewport').boundingBox();const tile=48*390/720,x=r.x+r.width/2,y=r.y+r.height/2;
const cdp=await context.newCDPSession(page);
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-tile,y}]});
await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+tile,y}]});
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
assert.equal(await page.evaluate(()=>[15,16,17].every(x=>save.getSave().city.roads.some(r=>r.x===x&&r.y===13))),true,'touch drag builds road');
// A resize while dragging must cancel the stroke instead of bridging old/new pointers.
await page.mouse.move(x,y-tile);await page.mouse.down();const roads=await page.evaluate(()=>save.getSave().city.roads.length);
await page.setViewportSize({width:382,height:856});await page.waitForTimeout(250);
await page.mouse.move(500,400);await page.mouse.up();assert.equal(await page.evaluate(()=>save.getSave().city.roads.length),roads);
await page.getByRole('button',{name:'Pause the city',exact:true}).click();await page.getByRole('dialog',{name:/paused/i}).waitFor();
const before=await page.evaluate(()=>JSON.stringify(save.getSave().city));r=await page.locator('.city-map-viewport').boundingBox();await page.mouse.click(r.x+12,r.y+12);await page.waitForTimeout(200);
assert.equal(await page.evaluate(()=>JSON.stringify(save.getSave().city)),before,'pause modal blocks map and time');
await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>state.store.get().paused),false);
await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click();
await page.getByLabel('Game display').selectOption('portrait');await page.keyboard.press('Escape');
await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:/Continue/i}).first().click();await page.waitForTimeout(400);
assert.equal(await page.locator('#app-frame').getAttribute('data-display-mode'),'portrait');
await page.reload();await page.getByRole('button',{name:/Continue/i}).first().click();await page.waitForTimeout(400);
assert.equal(await page.locator('#app-frame').getAttribute('data-display-mode'),'portrait');
assert.equal(Math.round((await page.locator('#app-frame').boundingBox()).width),390);
await page.screenshot({path:`${output}/saved-portrait.png`});
console.log('Touch placement, touch road drawing, drag cancellation, reduced motion, pause blocking, and UI-selected portrait persistence passed.');
await context.close();
}finally{await browser.close();}
