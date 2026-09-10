// UI-03: current mission, guide navigation, real earned claim and reload.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=process.env.UI_EVIDENCE_DIR??'/tmp/ui03-evidence';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const results=[];
try{for(const [name,width,height] of [['narrow',390,844],['desktop',1440,900]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 await page.goto(process.env.UI_BASE_URL??'http://localhost:5184');await page.getByRole('button',{name:'Start your city',exact:true}).click();await page.locator('canvas').waitFor();await page.waitForTimeout(700);
 await page.evaluate(async()=>{const r=performance.getEntriesByType('resource').map(e=>e.name);window.save=await import(r.filter(n=>n.includes('/src/state/save.ts')).at(-1));window.state=await import(r.filter(n=>n.includes('/src/state/store.ts')).at(-1));window.commands=await import('/src/game/cityControls.ts');});
 const card=page.locator('.mission-card');
 async function capture(label){
  const bounds=await page.evaluate(()=>{const q=s=>{const b=document.querySelector(s).getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom};};return {map:q('.city-map-viewport'),card:q('.mission-card'),actions:q('.mission-card .objective-buttons'),build:q('.city-build-region')};});
  assert.ok(bounds.actions.bottom<=bounds.card.bottom+.5,`${name}/${label} actions clipped ${JSON.stringify(bounds)}`);
  assert.ok(bounds.map.height>=100);assert.ok(bounds.map.bottom<=bounds.card.y);
  await page.screenshot({path:`${output}/${name}-${label}.png`});results.push({name,label,...bounds});
 }
 assert.equal(await card.locator('h2').textContent(),'Use what we have');assert.equal(await card.getByRole('progressbar').getAttribute('value'),'0');assert.equal(await page.locator('.mission-rail').count(),0);
 await capture('tutorial');await card.getByRole('button',{name:'Details',exact:true}).click();await capture('details');
 assert.equal(await card.getByRole('button',{name:'Skip tutorial',exact:true}).count(),1);
 // Closing guidance does not advance or skip the tutorial.
 await card.getByRole('button',{name:'Less',exact:true}).click();assert.equal(await page.evaluate(()=>save.getSave().city.tutorial.status),'active');
 assert.equal(await page.getByRole('button',{name:/^(Jobs|Jobs & city link|City link & guide)$/}).count(),0);assert.equal(await page.locator('.mission-dialog,.mission-list').count(),0);
 await card.getByRole('button',{name:'Details',exact:true}).click();
 page.once('dialog',d=>d.dismiss());await card.getByRole('button',{name:'Skip tutorial',exact:true}).click();assert.equal(await page.evaluate(()=>save.getSave().city.tutorial.status),'active');
 // Saved-stage fixtures exercise longer tutorial copy and required actions; no full-arc claim.
 await card.getByRole('button',{name:'Less',exact:true}).click();
 for(const stage of [3,5,7,8,9,10]){
  await page.evaluate(stage=>{save.getSave().city.tutorial.hRoad.stage=stage;commands.cityCommand({type:'focus',point:{x:11,y:7}});},stage);await page.waitForTimeout(650);await capture(`lesson-${stage}`);
 }
 await page.evaluate(()=>{save.getSave().city.tutorial.status='active';save.getSave().city.tutorial.hRoad.stage=0;commands.cityCommand({type:'focus',point:{x:3,y:2}});});await page.waitForTimeout(650);await card.getByRole('button',{name:'Details',exact:true}).click();
 page.once('dialog',d=>d.accept());await card.getByRole('button',{name:'Skip tutorial',exact:true}).click();await page.waitForTimeout(300);assert.notEqual(await page.evaluate(()=>save.getSave().city.tutorial.status),'active');
 // Build a real visited town with model stepping, then load it as a saved fixture.
 await page.evaluate(async()=>{const {createCity,place,stepCity}=await import('/src/game/cityModel.ts');const {missionSnapshot}=await import('/src/game/cityMissions.ts');const c=createCity();c.funds=10000;for(let x=0;x<=14;x++)place(c,'road',x,6);place(c,'home',0,4);place(c,'store',12,4);for(let n=0;n<2400&&!missionSnapshot(c).items[0].done;n++)stepCity(c,.1);if(!missionSnapshot(c).items[0].done)throw Error('No real completed shopping visit');c.tutorial.status='skipped';save.getSave().city=c;save.flushSave();});
 await page.reload();await page.getByRole('button',{name:/Continue/}).first().click();await page.waitForTimeout(700);
 await page.evaluate(async()=>{const r=performance.getEntriesByType('resource').map(e=>e.name);window.save=await import(r.filter(n=>n.includes('/src/state/save.ts')).at(-1));window.state=await import(r.filter(n=>n.includes('/src/state/store.ts')).at(-1));});
 await capture('reward');assert.equal(await card.locator('.mission-reward').textContent(),'Reward $100');
 const before=await page.evaluate(()=>save.getSave().city.funds);await card.getByRole('button',{name:'Claim $100',exact:true}).dblclick();
 assert.equal(await page.evaluate(()=>save.getSave().city.funds),before+100);assert.equal(await page.evaluate(()=>save.getSave().city.missions.claimed.filter(id=>id==='open-for-business').length),1);
 await capture('next-job');assert.equal(await card.locator('h2').textContent(),'Ready for a bigger town');await page.reload();await page.getByRole('button',{name:/Continue/}).first().click();await page.waitForTimeout(500);assert.equal(await card.getByRole('button',{name:'Claim $100',exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:/^(Jobs|Jobs & city link|City link & guide)$/}).count(),0);assert.equal(await page.locator('.mission-dialog,.mission-list').count(),0);
 assert.deepEqual(errors,[]);await context.close();console.log(name,'UI-03 passed');
}}finally{await fs.writeFile(`${output}/mission-results.json`,JSON.stringify(results,null,2));await browser.close();}
