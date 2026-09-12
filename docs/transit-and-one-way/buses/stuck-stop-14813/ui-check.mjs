import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
const raw=JSON.parse(readFileSync('/home/phil/Code/jams/AI-Overlord/docs/transit-and-one-way/buses/stuck-stop-14813/city.json','utf8'));
const out='/tmp/bus-stop-ui';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const width of [1440,390]){
const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
await context.addInitScript(city=>{localStorage.setItem('city-workshop:city:v1',JSON.stringify({city,updatedAt:Date.now()}));},raw);
await page.goto('http://127.0.0.1:5223');await page.getByRole('button',{name:'Continue commute',exact:true}).click();
await page.locator('.bus-stop-warning').waitFor();

await page.locator('.bus-stop-warning').click();await page.getByRole('group',{name:'Bus stop',exact:true}).waitFor();
await page.screenshot({path:`${out}/selected-${width}.png`});
await page.getByRole('button',{name:'Move stop',exact:true}).click();
await page.getByRole('button',{name:'Cancel move',exact:true}).click();
assert.equal(await page.evaluate(async()=>(await import('/src/state/store.ts')).store.get().movingBusStop),null);
await page.getByRole('button',{name:'Move stop',exact:true}).click();
await page.evaluate(async()=>(await import('/src/game/cityControls.ts')).cityCommand({type:'focus',point:{x:-2,y:7}}));
await page.waitForTimeout(150);let box=await page.locator('.city-map-viewport').boundingBox();assert.ok(box.height>80);
await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.screenshot({path:`${out}/preview-${width}.png`});
await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
await page.getByRole('button',{name:'Move stop',exact:true}).waitFor();
const city=await page.evaluate(()=>JSON.parse(localStorage.getItem('city-workshop:city:v1')).city);
assert.equal(city.buildings.find(b=>b.id===14813).y,7);
assert.equal(await page.evaluate(async()=>(await import('/src/state/store.ts')).store.get().movingBusStop),null);
await page.screenshot({path:`${out}/moved-${width}.png`});
assert.deepEqual(city.transit.routes[0].stopIds,raw.transit.routes[0].stopIds);
assert.deepEqual(errors,[]);results.push({width,mapHeight:box.height,passed:true});await context.close();
}}finally{await browser.close();writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));}
