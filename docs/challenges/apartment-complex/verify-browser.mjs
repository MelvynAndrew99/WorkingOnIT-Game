import {neighborhoodTown} from '../../../src/game/fixtures/neighborhoodTown.ts';
import {solveCampaign} from '../../../src/game/fixtures/campaignSolutions.ts';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
import {CHALLENGES,createChallenge,stepChallenge} from '../../../src/game/cityChallenges.ts';
const out='docs/challenges/apartment-complex/evidence';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];let lastPage;
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 lastPage=page;page.on('pageerror',e=>{errors.push(e.message);console.log(e.message);});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const run=createChallenge('another-front-door');
 if(width===390){run.revision=2;run.city=neighborhoodTown();run.city.funds=1200;solveCampaign(run);stepChallenge(run,180);assert.ok(run.earned);}
 await context.addInitScript(({run,stars})=>{
  if(!localStorage.getItem('working-on-it:challenges:v1'))localStorage.setItem('working-on-it:challenges:v1',JSON.stringify({runs:{'another-front-door':run},stars,updatedAt:1}));
  window.gameModule=path=>import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>new URL(n).pathname===path).at(-1)??path);
 },{run,stars:Object.fromEntries(CHALLENGES.slice(0,13).map(d=>[d.id,true]))});
 const enter=async()=>{await page.getByRole('button',{name:'Challenges',exact:true}).click();await page.getByRole('button',{name:/^Level 14, (playable|completed)$/}).click();await page.getByRole('button',{name:/^(Play|Continue) level/}).click();};
 const saved=()=>page.evaluate(async()=>structuredClone((await window.gameModule('/src/state/challenges.ts')).getChallengeRun()));
 const clickTile=async(x,y)=>{await page.evaluate(async point=>(await window.gameModule('/src/game/cityControls.ts')).cityCommand({type:'focus',point}),{x,y});await page.waitForTimeout(200);const box=await page.locator('.city-map-viewport').boundingBox();assert.ok(box&&box.height>60);await page.mouse.click(box.x+box.width/2,box.y+box.height/2);};
 await page.goto(process.env.APARTMENT_URL??'http://127.0.0.1:5295');await page.getByRole('button',{name:/Start your city|Continue commute/}).waitFor();await enter();await page.locator('.city-map-viewport').waitFor();await page.waitForTimeout(500);
 if(width===390){const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('working-on-it:challenges:v1')));assert.equal(data.archivedRuns['another-front-door'].revision,2);assert.equal(data.stars['another-front-door'],true);assert.equal(data.runs['another-front-door'].revision,3);assert.equal(data.runs['another-front-door'].earned,false);}
 await page.locator('[data-tool="apartment"]').click();await clickTile(2,2);await clickTile(8,2);
 assert.equal((await saved()).city.buildings.filter(b=>b.kind==='apartment').length,2);
 await page.getByRole('button',{name:'Inspect',exact:true}).click();await clickTile(2,2);
 const panel=page.getByRole('group',{name:'Apartment complex',exact:true});await panel.getByRole('button',{name:'Join complex',exact:true}).click();await clickTile(8,2);
 await panel.getByRole('button',{name:/Build lanes & join/}).waitFor();assert.equal((await saved()).city.apartmentComplexes,undefined);
 await page.screenshot({path:`${out}/preview-${width}.png`});await panel.getByRole('button',{name:/Build lanes & join/}).click();
 assert.equal((await saved()).city.apartmentComplexes[0].privateLanes.length,7);
 await page.locator('[data-tool="road"]').click();for(let y=7;y<12;y++)await clickTile(2,y);
 await page.screenshot({path:`${out}/connected-${width}.png`});
 await page.evaluate(async()=>{const c=await window.gameModule('/src/state/challenges.ts');c.flushChallenges();});await page.reload();await page.getByRole('button',{name:/Start your city|Continue commute/}).waitFor();await enter();await page.locator('.city-map-viewport').waitFor();
 assert.equal((await saved()).city.apartmentComplexes[0].privateLanes.length,7);
 await page.getByRole('button',{name:'Run traffic',exact:true}).click();
 await page.waitForTimeout(500);
 await page.evaluate(async()=>{const c=await window.gameModule('/src/state/challenges.ts'),m=await window.gameModule('/src/game/cityChallenges.ts');m.stepChallenge(c.getChallengeRun(),180);c.flushChallenges();(await window.gameModule('/src/state/store.ts')).store.patch({});});
 assert.equal((await saved()).earned,true);
 await page.getByRole('heading',{name:'Nice work!'}).waitFor();await page.screenshot({path:`${out}/complete-${width}.png`});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 results.push({width,pointerPlacement:true,pointerJoin:true,pointerConnection:true,reload:true,earned:true,legacyAwardPreserved:width===390?true:undefined,funds:(await saved()).city.funds,errors});await context.close();
}}catch(e){if(lastPage){await lastPage.screenshot({path:`${out}/failure.png`});console.log(await lastPage.locator('body').innerText());console.log(await lastPage.evaluate(async()=>(await window.gameModule('/src/state/store.ts')).store.get().phase));}throw e;}finally{await browser.close();}
writeFileSync(`${out}/browser-results.json`,JSON.stringify(results,null,2));
