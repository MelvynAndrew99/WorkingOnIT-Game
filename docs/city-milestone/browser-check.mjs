import assert from 'node:assert/strict';
const { chromium } = await import(process.env.CITY_PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CITY_CHROMIUM_PATH || undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const url=process.env.CITY_URL || 'http://localhost:5173';
await page.goto(url);
await page.evaluate(()=>localStorage.setItem('ai-overlord:traffic:v1','{"best":42}'));
await page.getByRole('button',{name:'Start your city'}).click();
await page.locator('canvas').waitFor();await page.waitForTimeout(700);
await page.getByRole('button',{name:'Pause'}).click();
async function xy(x,y) {
 return page.evaluate(({x,y})=>{
 const frame=document.querySelector('#app-frame').getBoundingClientRect();
 const top=document.querySelector('.city-header').getBoundingClientRect().height+44;
 const bottom=document.querySelector('.city-controls').getBoundingClientRect().height+16;
 const t=Math.min((frame.width-28*frame.width/720)/16,(frame.height-top-bottom)/14);
 return {x:frame.left+(frame.width-16*t)/2+(x+.5)*t,y:frame.top+top+Math.max(0,(frame.height-top-bottom-14*t)/2)+(y+.5)*t};
 },{x,y});
}
async function tile(x,y,touch=false){const p=await xy(x,y);if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
const city=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('city-workshop:city:v1')).city);
await tile(2,2,true);
await page.getByRole('button',{name:'Store $400'}).click();await tile(7,2,true);
assert.equal((await city()).buildings.length,2);
assert.equal((await city()).funds,9400);
await tile(15,13);assert.equal((await city()).funds,9400);
await page.getByRole('button',{name:'Road $20'}).click();
const a=await xy(2,4),b=await xy(8,4);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:12});await page.mouse.up();
assert.equal((await city()).roads.length,7);assert.equal((await city()).funds,9260);
await page.getByText('1/1 homes connected').waitFor();await page.getByText('Average roundtrip: 6.0s').waitFor();
await page.getByRole('button',{name:'Resume'}).click();await page.waitForTimeout(4800);
const traveling=await city();assert.equal(traveling.trips.length,1);assert.ok(traveling.trips[0].progress>=0);
await page.screenshot({path:'/tmp/city-playable-phone.png'});
await page.waitForTimeout(6500);assert.ok((await city()).completed>=1);assert.equal((await city()).funds,9560);
await page.getByRole('button',{name:'Pause'}).click();
await page.getByRole('button',{name:'Menu',exact:true}).click();const paused=await city();
await page.getByRole('button',{name:'Continue commute'}).click();await page.waitForTimeout(700);await page.getByRole('button',{name:'Pause'}).click();
await page.getByRole('button',{name:'Remove 100% back'}).click();await tile(5,4);
assert.equal((await city()).roads.length,6);assert.equal((await city()).funds,paused.funds+20);assert.equal((await city()).trips.length,0);
await page.getByText('0/1 homes connected').waitFor();
await page.getByRole('button',{name:'Road $20'}).click();await tile(5,4);
await page.getByText('1/1 homes connected').waitFor();
await page.keyboard.press('2');await page.keyboard.press('r');await tile(11,8);
assert.equal((await city()).buildings[2].rotation,1);
await page.getByRole('button',{name:'Menu',exact:true}).click();
const saved=await city();await page.reload();await page.getByRole('button',{name:'Continue commute'}).click();await page.waitForTimeout(700);await page.getByRole('button',{name:'Pause'}).click();
await page.getByText('1/1 homes connected').waitFor();
await page.getByRole('button',{name:'Menu',exact:true}).click();
assert.deepEqual((await city()).buildings,saved.buildings);assert.deepEqual((await city()).roads,saved.roads);
await page.getByRole('button',{name:'Continue commute'}).click();await page.waitForTimeout(700);await page.getByRole('button',{name:'Pause'}).click();
assert.equal(await page.evaluate(()=>localStorage.getItem('ai-overlord:traffic:v1')),'{"best":42}');
await page.waitForTimeout(2300);const clock=await city();await page.waitForTimeout(1000);assert.equal((await city()).elapsed,clock.elapsed);
for (const size of [{width:320,height:640},{width:1440,height:900}]) {
 await page.setViewportSize(size);await page.waitForTimeout(500);
 const bounds=await page.evaluate(()=>{const a=document.querySelector('.city-header').getBoundingClientRect(),b=document.querySelector('.city-controls').getBoundingClientRect();return {gap:b.top-a.bottom,bottom:b.bottom,height:innerHeight,overflow:document.querySelector('.city-controls').scrollWidth>document.querySelector('.city-controls').clientWidth}});
 assert.ok(bounds.gap>140,JSON.stringify(bounds));assert.ok(bounds.bottom<=bounds.height+1);assert.equal(bounds.overflow,false);
 await page.screenshot({path:`/tmp/city-${size.width}.png`});
}
assert.deepEqual(errors,[]);
console.log('PASS: touch placement, drag roads, bounds rejection, route feedback, moving trips, pause, refunds/disconnection/reconnect, rotation, menu lifecycle, reload, legacy-save preservation, 320px/desktop layouts, no browser errors.');
await browser.close();
