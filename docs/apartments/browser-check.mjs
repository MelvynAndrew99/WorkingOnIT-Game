import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
import {createCity,place} from '../../src/game/cityModel.ts';

const out='/tmp/apartment-browser-final';mkdirSync(out,{recursive:true});
const city=createCity();city.funds=20000;city.map.width=32;city.map.height=24;city.tutorial.status='complete';
for(let x=10;x<=22;x++)assert.match(place(city,'road',x,13),/built/);
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];let lastPage;
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 lastPage=page;page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await context.addInitScript(raw=>{
  if(!localStorage.getItem('city-workshop:city:v1'))localStorage.setItem('city-workshop:city:v1',JSON.stringify({city:raw,updatedAt:1}));
  window.gameModule=path=>import(performance.getEntriesByType('resource').map(e=>e.name).find(n=>new URL(n).pathname===path)??path);
 },city);
 const saved=()=>page.evaluate(async()=>structuredClone((await window.gameModule('/src/state/save.ts')).getSave().city));
 const sceneReady=async()=>{
  await page.waitForFunction(async()=>(await window.gameModule('/src/state/store.ts')).store.get().map.width===32);
  await page.locator('.city-map-viewport').waitFor();
  const at=(await saved()).elapsed;
  await page.waitForFunction(async at=>document.querySelector('canvas')&&(await window.gameModule('/src/state/save.ts')).getSave().city.elapsed>at+.3,at);
 };
 const enter=async()=>{await page.getByRole('button',{name:'Continue commute',exact:true}).click();await sceneReady();};
 const clickTile=async(x,y)=>{
  await page.evaluate(async point=>(await window.gameModule('/src/game/cityControls.ts')).cityCommand({type:'focus',point}),{x,y});
  await page.waitForTimeout(180);
  const box=await page.locator('.city-map-viewport').boundingBox();assert.ok(box&&box.height>60,'map remains usable');
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 };
 const inspect=async(x,y)=>{await page.keyboard.press('Escape');await clickTile(x,y);};
 const chooseTool=async(tool,category)=>{await page.getByRole('button',{name:category,exact:true}).click();await page.locator(`[data-tool="${tool}"]`).click();};
 const apartment=page.getByRole('group',{name:'Apartment',exact:true});
 const complex=page.getByRole('group',{name:'Apartment complex',exact:true});
 const office=page.getByRole('group',{name:'Office',exact:true});
 await page.goto('http://127.0.0.1:5293');await enter();
 await chooseTool('apartment','Places');await clickTile(10,9);await clickTile(16,9);
 assert.equal((await saved()).buildings.filter(b=>b.kind==='apartment').length,2);
 await inspect(10,9);await apartment.waitFor();assert.match(await apartment.innerText(),/4 residents · 1 entrance/);
 await page.screenshot({path:`${out}/base-${width}.png`});
 await apartment.getByRole('button',{name:/Upgrade/}).click();
 assert.match(await apartment.innerText(),/Tap a highlighted tile/);
 await apartment.getByRole('button',{name:'Cancel upgrade',exact:true}).click();
 const cancelled=(await saved()).buildings.find(b=>b.kind==='apartment'&&b.x===10);
 assert.equal(cancelled.secondEntrance,undefined);assert.equal(cancelled.entranceUpgradePaid,undefined);
 await apartment.getByRole('button',{name:/Upgrade/}).click();await clickTile(9,11);
 await page.waitForFunction(async()=>(await window.gameModule('/src/state/save.ts')).getSave().city.buildings.find(b=>b.kind==='apartment'&&b.x===10)?.entranceCount===2);
 assert.match(await apartment.innerText(),/6 residents · 2 entrances/);
 assert.deepEqual((await saved()).buildings.find(b=>b.kind==='apartment'&&b.x===10).secondEntrance,{x:9,y:11});
 // Infrastructure is marked before any work destination exists, so traffic cannot
 // occupy a road while the user is converting it to community use.
 await chooseTool('communityRoad','Roads');for(let x=10;x<=16;x++)await clickTile(x,13);
 const linked=await saved();for(let x=10;x<=16;x++)assert.ok(linked.communityRoads.some(p=>p.x===x&&p.y===13));
 await inspect(10,9);await complex.waitFor();await complex.getByRole('button',{name:'Join complex',exact:true}).click();
 await complex.getByRole('button',{name:'Cancel join',exact:true}).click();assert.equal((await saved()).apartmentComplexes,undefined);
 await complex.getByRole('button',{name:'Join complex',exact:true}).click();await clickTile(16,9);
 await page.waitForFunction(async()=>(await window.gameModule('/src/state/save.ts')).getSave().city.apartmentComplexes?.[0]?.buildingIds.length===2);
 assert.match(await complex.innerText(),/2 blocks · 10 residents/);
 await page.screenshot({path:`${out}/complex-${width}.png`});
 await chooseTool('office','Places');await clickTile(22,9);await inspect(22,9);await office.waitFor();
 assert.match(await office.innerText(),/8 work spaces · 1 entrance/);
 await office.getByRole('button',{name:/Upgrade/}).click();await clickTile(23,8);
 await page.waitForFunction(async()=>(await window.gameModule('/src/state/save.ts')).getSave().city.buildings.find(b=>b.kind==='office')?.entranceCount===2);
 assert.match(await office.innerText(),/16 work spaces · 2 entrances/);
 await page.waitForFunction(async()=>(await window.gameModule('/src/state/save.ts')).getSave().city.trips.some(t=>t.purpose==='work'),undefined,{timeout:45000});
 await page.waitForFunction(async()=>(await window.gameModule('/src/state/save.ts')).getSave().city.trips.some(t=>t.purpose==='work'&&t.phase==='visiting'),undefined,{timeout:45000});
 await page.screenshot({path:`${out}/office-work-${width}.png`});
 const beforeReload=await saved();
 const expectedBuildings=beforeReload.buildings.map(({id,kind,x,y,entranceCount,secondEntrance})=>({id,kind,x,y,entranceCount,secondEntrance}));
 await page.evaluate(async()=>(await window.gameModule('/src/state/save.ts')).flushSave());
 await page.reload();await enter();
 const restored=await saved();assert.deepEqual(restored.buildings.map(({id,kind,x,y,entranceCount,secondEntrance})=>({id,kind,x,y,entranceCount,secondEntrance})),expectedBuildings);
 assert.deepEqual(restored.apartmentComplexes,beforeReload.apartmentComplexes);assert.deepEqual(restored.communityRoads,beforeReload.communityRoads);
 await inspect(10,9);await apartment.waitFor();assert.match(await apartment.innerText(),/6 residents · 2 entrances/);assert.match(await complex.innerText(),/2 blocks · 10 residents/);
 await inspect(22,9);await office.waitFor();assert.match(await office.innerText(),/16 work spaces · 2 entrances/);
 assert.deepEqual(errors,[]);results.push({width,pointerPlacedBlocks:2,apartmentResidents:[6,4],chosenEntrance:{x:9,y:11},cancelWithoutPurchase:true,communityRoadTiles:7,joinedResidents:10,officeCapacity:16,officeEntrance:{x:23,y:8},actualWorkVisit:true,reload:true,errors});
 await context.close();lastPage=undefined;
}}catch(error){
 if(lastPage){await lastPage.screenshot({path:`${out}/failure.png`});writeFileSync(`${out}/failure.json`,JSON.stringify(await lastPage.evaluate(async()=>({state:(await window.gameModule('/src/state/store.ts')).store.get(),city:(await window.gameModule('/src/state/save.ts')).getSave().city,buttons:[...document.querySelectorAll('button')].filter(b=>b.offsetHeight).map(b=>b.textContent)})),null,2));}
 throw error;
}finally{await browser.close();writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));}
console.log(results);
