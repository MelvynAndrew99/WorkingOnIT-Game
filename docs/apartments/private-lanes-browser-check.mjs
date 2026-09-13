import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
import {createCity,place} from '../../src/game/cityModel.ts';

const out='/tmp/private-lanes-browser';mkdirSync(out,{recursive:true});
const city=createCity();city.funds=20000;delete city.land;city.map.width=32;city.map.height=24;city.tutorial.status='complete';
for(let y=14;y<=18;y++)assert.match(place(city,'road',10,y),/built/);
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

 await page.goto('http://127.0.0.1:5293');await enter();
 await chooseTool('apartment','Places');await clickTile(10,9);await clickTile(16,9);
 const initial=await saved();assert.equal(initial.buildings.length,2);
 await page.getByRole('button',{name:'Roads',exact:true}).click();assert.equal(await page.locator('[data-tool="communityRoad"]').count(),0);
 await inspect(10,9);await complex.waitFor();
 await complex.getByRole('button',{name:'Join complex',exact:true}).click();await clickTile(16,9);
 await complex.getByRole('button',{name:/Build lanes & join/}).waitFor();
 assert.equal((await saved()).roads.length,initial.roads.length);
 await page.screenshot({path:`${out}/preview-${width}.png`});
 await page.keyboard.press('Escape');assert.equal((await saved()).apartmentComplexes,undefined);
 await complex.getByRole('button',{name:'Join complex',exact:true}).click();await clickTile(16,9);
 await complex.getByRole('button',{name:/Build lanes & join/}).click();
 await page.waitForFunction(async()=>(await window.gameModule('/src/state/save.ts')).getSave().city.apartmentComplexes?.[0]?.privateLanes?.length===7);
 assert.match(await complex.innerText(),/2 blocks · 8 residents/);
 await page.evaluate(async()=>(await window.gameModule('/src/game/cityControls.ts')).cityCommand({type:'focus',point:{x:14,y:12}}));
 await page.waitForTimeout(250);await page.screenshot({path:`${out}/joined-${width}.png`});
 const joined=await saved();assert.equal(joined.funds,initial.funds-140);
 await chooseTool('road','Roads');await clickTile(13,13);
 assert.equal((await saved()).communityRoads.length,7);
 await page.evaluate(async()=>(await window.gameModule('/src/state/save.ts')).flushSave());
 await page.reload();await enter();
 const restored=await saved();assert.deepEqual(restored.apartmentComplexes,joined.apartmentComplexes);assert.deepEqual(restored.communityRoads,joined.communityRoads);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);results.push({width,previewBeforePayment:true,escapeCancels:true,automaticLanes:7,sharedPublicApproach:true,managed:true,reload:true,errors});
 await context.close();lastPage=undefined;
}}catch(error){
 if(lastPage){await lastPage.screenshot({path:`${out}/failure.png`});writeFileSync(`${out}/failure.json`,JSON.stringify(await lastPage.evaluate(async()=>({state:(await window.gameModule('/src/state/store.ts')).store.get(),city:(await window.gameModule('/src/state/save.ts')).getSave().city,buttons:[...document.querySelectorAll('button')].filter(b=>b.offsetHeight).map(b=>b.textContent)})),null,2));}
 throw error;
}finally{await browser.close();writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));}
console.log(results);
