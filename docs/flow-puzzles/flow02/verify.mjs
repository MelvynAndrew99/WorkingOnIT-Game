import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const output=process.env.UI_EVIDENCE_DIR??'/tmp/flow02-browser';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const results=[];
try {for(const [name,width,height] of [['desktop',1440,900],['narrow',390,844]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:name==='narrow'}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 await page.goto(process.env.UI_BASE_URL??'http://localhost:5190');
 await page.getByRole('button',{name:'Start your city',exact:true}).click();await page.locator('canvas').waitFor();
 async function bind(){await page.evaluate(async()=>{const urls=performance.getEntriesByType('resource').map(e=>e.name);window.save=await import(urls.filter(n=>n.includes('/src/state/save.ts')).at(-1));window.state=await import(urls.filter(n=>n.includes('/src/state/store.ts')).at(-1));window.model=await import('/src/game/cityModel.ts');window.commands=await import('/src/game/cityControls.ts');});}
 async function reload(){await page.reload();await page.getByRole('button',{name:/Continue|Start your city/}).first().click();await page.locator('canvas').waitFor();await bind();await page.waitForTimeout(650);}
 await bind();
 await page.evaluate(async()=>{const {flowTown}=await import('/src/game/fixtures/flowTown.ts');const {connectExternalCity}=await import('/src/game/cityExternal.ts');const c=flowTown();model.stepCity(c,120);
 // Synthetic historical receipts in an isolated browser town, never a player save.
 c.missions.completed=['open-for-business','word-on-the-street','a-reason-to-drive','a-town-to-notice','everyone-connected'];c.missions.claimed=['open-for-business','word-on-the-street','a-reason-to-drive','a-town-to-notice'];c.tutorial.status='complete';
 // Explicit fixture consent; no silent outside connection is part of FLOW-02.
 connectExternalCity(c,{x:0,y:6});model.place(c,'closure',8,1);save.getSave().city=c;save.flushSave();});
 await reload();const card=page.locator('.mission-card');
 await page.getByRole('heading',{name:'A neighborhood worth visiting',exact:true}).waitFor();
 async function capture(label){
  const bounds=await page.evaluate(()=>{const rect=s=>{const e=document.querySelector(s),r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}:null;};return {map:rect('.city-map-viewport'),card:rect('.mission-card'),buttons:rect('.objective-buttons'),dashboard:rect('.city-dashboard'),flow:rect('.flow-feedback')};});
  assert.ok(bounds.map.height>=100,JSON.stringify(bounds));assert.ok(bounds.buttons.bottom<=bounds.card.bottom+1,JSON.stringify(bounds));
  assert.equal(await page.locator('.mission-dialog,.mission-list,.mission-rail').count(),0);
  await page.screenshot({path:`${output}/${name}-${label}.png`});results.push({name,label,...bounds});
 }
 await capture('objective');
 await card.getByRole('button',{name:'Details',exact:true}).click();
 const flow=card.locator('.flow-feedback');await flow.scrollIntoViewIfNeeded();
 assert.ok((await flow.innerText()).includes('Returns (60s)'));
 assert.equal(await flow.locator('[aria-live],[role=status]').count(),0);
 await capture('details');
 await card.getByRole('button',{name:'Less',exact:true}).click();
 await card.getByRole('button',{name:'Inspect traffic',exact:true}).click();
 assert.equal(await page.evaluate(()=>state.store.get().diagnosticView),'traffic');
 await page.evaluate(()=>commands.cityCommand({type:'focus',point:{x:8,y:6}}));
 const map=await page.locator('.city-map-viewport').boundingBox();
 const beforeRoads=await page.evaluate(()=>JSON.stringify(save.getSave().city.roads));
 await page.mouse.click(map.x+map.width/2,map.y+map.height/2);
 await page.waitForFunction(()=>state.store.get().flow?.selectedRoad?.x===8);
 assert.equal(await page.evaluate(()=>JSON.stringify(save.getSave().city.roads)),beforeRoads);
 await page.getByRole('button',{name:'Dashboard',exact:true}).click();
 const dashboard=page.locator('#city-dashboard');await dashboard.locator('.flow-road').scrollIntoViewIfNeeded();
 assert.ok((await dashboard.locator('.flow-road').innerText()).includes('tile 8, 6'));
 await capture('selected-road');
 assert.equal(await dashboard.locator('h2').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'Dashboard title fits');
 const checks=await page.evaluate(()=>[...document.querySelectorAll('.flow-feedback p,.flow-feedback dt,.flow-feedback dd,.flow-feedback h3,.flow-feedback h4')].map(e=>({text:e.textContent,size:parseFloat(getComputedStyle(e).fontSize),overflow:e.scrollWidth>e.clientWidth+1})));
 assert.ok(checks.every(c=>c.size>=17.5),JSON.stringify(checks));
 assert.ok(checks.every(c=>!c.overflow),JSON.stringify(checks));
 await page.getByRole('button',{name:'Close Dashboard',exact:true}).click();
 // Actual pause/resume controls preserve persisted observation state.
 await page.getByRole('button',{name:'Pause the city',exact:true}).click();
 const paused=await page.evaluate(()=>JSON.stringify({elapsed:save.getSave().city.elapsed,flow:save.getSave().city.missions.flow}));
 await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>JSON.stringify({elapsed:save.getSave().city.elapsed,flow:save.getSave().city.missions.flow})),paused);
 await page.getByRole('button',{name:'Resume game',exact:true}).click();
 // Retiming through an actual map click, using the existing signal tool.
 await page.evaluate(()=>{state.store.patch({tool:'signal',panning:false});commands.cityCommand({type:'focus',point:{x:8,y:6}});});
 const hit=await page.locator('.city-map-viewport').boundingBox();await page.mouse.click(hit.x+hit.width/2,hit.y+hit.height/2);
 assert.equal(await page.evaluate(()=>save.getSave().city.controls.find(c=>c.x===8&&c.y===6).preset),'ew');
 await page.evaluate(()=>{const c=save.getSave().city;model.place(c,'closure',8,1);model.stepCity(c,180);save.flushSave();});
 await page.waitForTimeout(650);
 assert.equal(await page.evaluate(()=>save.getSave().city.missions.completed.includes('neighborhood-flow')),true);
 await page.getByRole('button',{name:'Dashboard',exact:true}).click();await dashboard.locator('.flow-earned').scrollIntoViewIfNeeded();await capture('earned');
 await page.getByRole('button',{name:'Close Dashboard',exact:true}).click();
 const receipts=await page.evaluate(()=>JSON.stringify({claimed:save.getSave().city.missions.claimed,expansion:save.getSave().city.expansion,tutorial:save.getSave().city.tutorial.status,gateway:save.getSave().city.external.gateway}));
 await reload();
 assert.equal(await page.evaluate(()=>save.getSave().city.missions.completed.filter(id=>id==='neighborhood-flow').length),1);
 assert.equal(await page.evaluate(()=>JSON.stringify({claimed:save.getSave().city.missions.claimed,expansion:save.getSave().city.expansion,tutorial:save.getSave().city.tutorial.status,gateway:save.getSave().city.external.gateway})),receipts);
 await page.getByRole('button',{name:'Dashboard',exact:true}).click();await page.locator('.flow-earned').scrollIntoViewIfNeeded();await capture('reload');
 assert.deepEqual(errors,[]);await context.close();
}
 await fs.writeFile(`${output}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
} finally {await browser.close();}
