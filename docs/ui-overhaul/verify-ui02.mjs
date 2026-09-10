// UI-02 data/action checks complement verify-layout.mjs's real tutorial/resize/reload checks.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=process.env.UI_EVIDENCE_DIR??'/tmp/ui02-evidence';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const results=[];
try{for(const [name,width,height] of [['narrow',390,844],['desktop',1440,900]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 await page.goto(process.env.UI_BASE_URL??'http://localhost:5184');await page.getByRole('button',{name:'Start your city',exact:true}).click();await page.locator('canvas').waitFor();await page.waitForTimeout(700);
 await page.evaluate(async()=>{const r=performance.getEntriesByType('resource').map(e=>e.name);window.save=await import(r.filter(n=>n.includes('/src/state/save.ts')).at(-1));window.state=await import(r.filter(n=>n.includes('/src/state/store.ts')).at(-1));window.commands=await import('/src/game/cityControls.ts');commands.cityCommand({type:'tutorial',action:'skip'});save.getSave().city.funds=1234567;save.getSave().city.elapsed=360061;});
 await page.waitForTimeout(1100);
 assert.deepEqual(await page.locator('.city-stats-bar dt').allTextContents(),['Funds','Visitors','On Road','Fatalities','Time','Weather']);
 assert.equal(await page.locator('.city-stat-exact').textContent(),'$1,234,567');
 assert.equal(await page.locator('.city-stat-muted').textContent(),'Not simulated');
 assert.match(await page.locator('.city-stat').nth(4).locator('dd').textContent(),/^100:01:/);
 await page.getByRole('button',{name:'Pause the city',exact:true}).click();await page.waitForTimeout(600);
 const frozen=await page.locator('.city-stat').nth(4).locator('dd').textContent();await page.waitForTimeout(1200);assert.equal(await page.locator('.city-stat').nth(4).locator('dd').textContent(),frozen);
 await page.getByRole('button',{name:'Resume game',exact:true}).click();
 await page.getByRole('button',{name:'Heatmap',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Heatmap',exact:true}).getAttribute('aria-pressed'),'true');await page.locator('.map-view-legend').waitFor();
 await page.getByRole('button',{name:'Heatmap',exact:true}).click();assert.equal(await page.locator('.map-view-legend').count(),0);
 await page.evaluate(()=>{commands.cityCommand({type:'focus',point:{x:16,y:13}});commands.cityCommand({type:'zoom',factor:1.25});});
 await page.getByRole('button',{name:'Dashboard',exact:true}).click();await page.waitForTimeout(250);
 const map=await page.locator('.city-map-viewport').boundingBox(),panel=await page.locator('.city-dashboard').boundingBox();assert.ok(map.x+map.width<=panel.x+.5);
 await page.keyboard.press('3');const fw=await page.locator('#app-frame').evaluate(e=>e.clientWidth),tile=48*1.25*Math.min(fw/720,1);
 await page.mouse.move(map.x+map.width/2-tile,map.y+map.height/2);await page.mouse.down();await page.mouse.move(map.x+map.width/2+tile,map.y+map.height/2,{steps:8});await page.mouse.up();
 assert.equal(await page.evaluate(()=>[15,16,17].every(x=>save.getSave().city.roads.some(r=>r.x===x&&r.y===13))),true);
 await page.keyboard.press('1');await page.waitForTimeout(250);const placementMap=await page.locator('.city-map-viewport').boundingBox();await page.mouse.click(placementMap.x+placementMap.width/2+2*tile,placementMap.y+placementMap.height/2);
 assert.equal(await page.evaluate(()=>save.getSave().city.buildings.some(b=>b.kind==='home'&&b.x===18&&b.y===13)),true);
 for(const [label,id] of [['Access','access'],['Visitors','capacity'],['Traffic','traffic']]){await page.getByRole('button',{name:label,exact:true}).click();assert.equal(await page.evaluate(()=>state.store.get().diagnosticView),id);}
 await page.getByRole('button',{name:'Normal',exact:true}).click();
 await page.locator('.city-dashboard').evaluate(e=>e.scrollTop=0);await page.screenshot({path:`${output}/${name}-dashboard-placement.png`});
 await page.getByRole('button',{name:'Close Dashboard',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Dashboard',exact:true}).evaluate(e=>e===document.activeElement),true);
 await page.waitForTimeout(1500);assert.notEqual(await page.locator('.city-stat').nth(4).locator('dd').textContent(),frozen);
 await page.evaluate(()=>save.flushSave());await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:/Continue/}).first().click();await page.waitForTimeout(700);assert.match(await page.locator('.city-stat').nth(4).locator('dd').textContent(),/^100:01:/);
 await page.screenshot({path:`${output}/${name}-stats.png`});assert.deepEqual(errors,[]);results.push({name,map,panel,checks:'six stats, exact funds, saved elapsed time, pause/resume, Heatmap/Access/Visitors, Dashboard focus, road + Home with panel open, Menu/Continue'});await context.close();console.log(name,'UI-02 passed');
}}finally{await fs.writeFile(`${output}/stats-results.json`,JSON.stringify(results,null,2));await browser.close();}
