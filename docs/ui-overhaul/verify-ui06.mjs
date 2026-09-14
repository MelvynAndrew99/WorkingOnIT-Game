// UI-06: historical connection compatibility without a Jobs/history screen.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=process.env.UI_EVIDENCE_DIR??'/tmp/ui06-evidence';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const results=[];
try { for(const [name,width,height] of [['desktop',1440,900],['narrow',390,844]]) {
 const context=await browser.newContext({viewport:{width,height},hasTouch:name==='narrow'}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 await page.goto(process.env.UI_BASE_URL??'http://localhost:5184');
 await page.getByRole('button',{name:'Start your city',exact:true}).click();await page.locator('canvas').waitFor();await page.waitForTimeout(500);
 const card=page.locator('.mission-card');
 async function bind(){await page.evaluate(async()=>{const r=performance.getEntriesByType('resource').map(e=>e.name);window.save=await import(r.filter(n=>n.includes('/src/state/save.ts')).at(-1));window.state=await import(r.filter(n=>n.includes('/src/state/store.ts')).at(-1));window.commands=await import('/src/game/cityControls.ts');});}
 async function reload(){await page.reload();await page.getByRole('button',{name:/Continue|Start your city/}).first().click();await page.waitForTimeout(500);await bind();}
 async function absent(){assert.equal(await page.getByRole('button',{name:/^(Jobs|Jobs & city link|City link & guide|Show guide)$/}).count(),0);assert.equal(await page.locator('.mission-dialog,.mission-list,.mission-rail').count(),0);}
 async function capture(label){await absent();const bounds=await page.evaluate(()=>{const rect=s=>{const b=document.querySelector(s).getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom};};return {map:rect('.city-map-viewport'),mission:rect('.mission-card'),actions:rect('.objective-buttons'),title:rect('.objective-title')};});assert.ok(bounds.map.height>=100);assert.ok(bounds.map.bottom<=bounds.mission.y+.5);assert.ok(bounds.actions.bottom<=bounds.mission.bottom+.5);await page.screenshot({path:`${output}/${name}-${label}.png`});results.push({name,label,...bounds});}
 await bind();
 // Real serialized fixtures, including old complete/skipped towns with no H metadata.
 async function fixture(status,pending=false){await page.evaluate(async({status,pending})=>{const {createCity,place}=await import('/src/game/cityModel.ts');const {createTutorialProgress}=await import('/src/game/cityTutorial.ts');const c=createCity();c.tutorial=createTutorialProgress();c.tutorial.status=status;c.funds=10000;if(!pending){for(let x=3;x<=12;x++)place(c,'road',x,6);place(c,'home',3,4);place(c,'store',9,4);}else c.external.autoConnectRequested=true;save.getSave().city=c;save.flushSave();},{status,pending});await reload();}
 for(const status of ['complete','skipped']){
  await fixture(status);await capture(`old-${status}`);
  const geometry=await page.evaluate(()=>JSON.stringify({roads:save.getSave().city.roads,buildings:save.getSave().city.buildings}));
  assert.equal(await page.evaluate(()=>save.getSave().city.external.gateway),null);
  page.once('dialog',d=>d.dismiss());await card.getByRole('button',{name:'Welcome outside visitors',exact:true}).click();
  await card.getByRole('button',{name:'Details',exact:true}).click();const title=await card.locator('h2').boundingBox();await card.locator('.objective-copy').evaluate(e=>e.scrollTop=e.scrollHeight);assert.deepEqual(await card.locator('h2').boundingBox(),title);await card.getByRole('button',{name:'Less',exact:true}).click();
  assert.equal(await page.evaluate(()=>save.getSave().city.tutorial.status),status);
  assert.equal(await page.evaluate(()=>JSON.stringify({roads:save.getSave().city.roads,buildings:save.getSave().city.buildings})),geometry);
  assert.equal(await page.evaluate(()=>!!save.getSave().city.external.autoConnectRequested),false);
  await reload();assert.equal(await card.getByRole('button',{name:'Welcome outside visitors',exact:true}).count(),1);
  page.once('dialog',d=>d.accept());await card.getByRole('button',{name:'Welcome outside visitors',exact:true}).click();await page.waitForTimeout(300);
  assert.ok(await page.evaluate(()=>save.getSave().city.external.gateway));assert.equal(await page.evaluate(()=>save.getSave().city.tutorial.status),status);
  const connected=await page.evaluate(()=>({gateway:save.getSave().city.external.gateway,buildings:save.getSave().city.buildings,receipts:save.getSave().city.missions.claimed}));
  await capture(`connected-${status}`);await page.evaluate(()=>save.flushSave());await reload();
  assert.deepEqual(await page.evaluate(()=>({gateway:save.getSave().city.external.gateway,buildings:save.getSave().city.buildings,receipts:save.getSave().city.missions.claimed})),connected);
  assert.equal(await card.getByRole('button',{name:'Welcome outside visitors',exact:true}).count(),0);
  assert.equal(await page.evaluate(async()=>{const {stepCity}=await import('/src/game/cityModel.ts');const c=save.getSave().city;for(let n=0;n<1200&&!c.external.arrivals;n++)stepCity(c,.1);return c.external.arrivals>0;}),true);
 }
 await fixture('skipped',true);assert.equal(await card.locator('h2').textContent(),'Make room for the connection');
 await card.getByRole('button',{name:'Details',exact:true}).click();assert.match(await card.innerText(),/retry automatically/);await capture('pending');await card.getByRole('button',{name:'Less',exact:true}).click();
 await reload();assert.equal(await page.evaluate(()=>save.getSave().city.external.autoConnectRequested),true);
 await card.getByRole('button',{name:'Road',exact:true}).click();await page.evaluate(()=>commands.cityCommand({type:'focus',point:{x:5,y:6}}));await page.waitForTimeout(200);
 const b=await page.locator('.city-map-viewport').boundingBox();if(name==='narrow')await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);else await page.mouse.click(b.x+b.width/2,b.y+b.height/2);await page.waitForTimeout(500);
 assert.ok(await page.evaluate(()=>save.getSave().city.roads.some(p=>p.x===5&&p.y===6)));assert.ok(await page.evaluate(()=>save.getSave().city.external.gateway));await capture('pending-recovered');
 await page.evaluate(()=>save.flushSave());await reload();assert.ok(await page.evaluate(()=>save.getSave().city.external.gateway));
 await fixture('available');assert.equal(await card.getByRole('button',{name:'Start guide',exact:true}).count(),1);await card.getByRole('button',{name:'Start guide',exact:true}).click();await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>save.getSave().city.tutorial.status),'active');assert.equal(await page.evaluate(()=>save.getSave().city.external.gateway),null);await capture('available-started');
 assert.deepEqual(errors,[]);await context.close();console.log(name,'UI-06 compatibility passed');
}} finally {await fs.writeFile(`${output}/connection-results.json`,JSON.stringify(results,null,2));await browser.close();}
