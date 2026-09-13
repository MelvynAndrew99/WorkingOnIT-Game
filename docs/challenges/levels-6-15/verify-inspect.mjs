import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const results=[];
try{for(const [name,width,height]of [['desktop',1440,900],['narrow',390,844]]){
 const ctx=await browser.newContext({viewport:{width,height}}),page=await ctx.newPage();
 await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('http://127.0.0.1:5192');await page.getByRole('button',{name:'Challenges',exact:true}).click();
 await page.getByRole('button',{name:'Level 13, playable',exact:true}).click();await page.getByRole('button',{name:'Play level',exact:false}).click();await page.locator('canvas').waitFor();await page.waitForTimeout(300);
 await page.evaluate(async()=>{const u=performance.getEntriesByType('resource').map(e=>e.name);window.state=await import(u.filter(s=>s.includes('/src/state/store.ts')).at(-1));window.cs=await import(u.filter(s=>s.includes('/src/state/challenges.ts')).at(-1));window.commands=await import('/src/game/cityControls.ts');});
 const tap=async(x,y)=>{await page.evaluate(({x,y})=>commands.cityCommand({type:'focus',point:{x,y}}),{x,y});await page.waitForTimeout(100);const b=await page.locator('.city-map-viewport').boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);};
 assert.equal(await page.evaluate(()=>state.store.get().tool),null);
 const before=await page.evaluate(()=>JSON.stringify(cs.getChallengeRun().city));
 await page.getByRole('button',{name:'Road',exact:false}).click();assert.equal(await page.evaluate(()=>state.store.get().tool),'road');
 await page.getByRole('button',{name:'Road',exact:false}).click();assert.equal(await page.evaluate(()=>state.store.get().tool),null);
 await tap(10,10);assert.equal(await page.evaluate(()=>JSON.stringify(cs.getChallengeRun().city)),before,'inspect empty land cannot build');
 await tap(8,6);await page.getByRole('button',{name:'Move stop',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>state.store.get().busStopPanel.id),2);
 await page.getByRole('button',{name:'Move stop',exact:true}).click();await tap(9,6);
 assert.deepEqual(await page.evaluate(()=>{const b=cs.getChallengeRun().city.buildings.find(b=>b.id===2);return [b.x,b.y,b.id,cs.getChallengeRun().city.funds,state.store.get().tool];}),[9,6,2,600,null]);
 await page.getByRole('button',{name:'Move stop',exact:true}).click();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>state.store.get().movingBusStop),null);
 await page.getByRole('button',{name:'Road',exact:false}).click();await page.getByRole('button',{name:'Inspect',exact:true}).click();assert.equal(await page.evaluate(()=>state.store.get().tool),null);
 await page.getByRole('button',{name:'Reset',exact:false}).click();await page.getByRole('button',{name:'Reset level',exact:true}).click();await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>state.store.get().tool),null);
 // The same toggle applies to sandbox palette buttons.
 await page.getByRole('button',{name:'Main menu',exact:true}).click();await page.evaluate(async()=>{const u=performance.getEntriesByType('resource').map(e=>e.name);const save=await import(u.filter(s=>s.includes('/src/state/save.ts')).at(-1));save.getSave().city.tutorial.status='complete';state.store.patch({phase:'playing',paused:false,tool:null});});await page.waitForTimeout(400);
 if(await page.getByRole('button',{name:'Roads',exact:true}).isVisible())await page.getByRole('button',{name:'Roads',exact:true}).click();const road=page.getByRole('button',{name:'2-lane road',exact:false});await road.click();assert.equal(await page.evaluate(()=>state.store.get().tool),'road');await road.click();assert.equal(await page.evaluate(()=>state.store.get().tool),null);
 await page.getByRole('button',{name:'Inspect',exact:true}).click();
 results.push({name,defaultInspect:true,toggleInChallengeAndSandbox:true,emptyLandUnchanged:true,stopMovePreservesIdAndFunds:true,escapeCancelsMove:true,resetInspect:true});await ctx.close();
}console.log(results);await fs.writeFile('/tmp/inspect-results.json',JSON.stringify(results,null,2));}finally{await browser.close();}
