// Real pointer placement/removal and saved diversion rendering on desktop/narrow.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=process.env.UI_EVIDENCE_DIR??'/tmp/kenney-update-evidence';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const results=[];
try{for(const [name,width,height] of [['desktop',1440,900],['narrow',390,844]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:name==='narrow'}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 await page.goto(process.env.UI_BASE_URL??'http://localhost:5188');await page.getByRole('button',{name:'Start your city',exact:true}).click();await page.locator('canvas').waitFor();await page.waitForTimeout(500);
 async function bind(){await page.evaluate(async()=>{const r=performance.getEntriesByType('resource').map(e=>e.name);window.save=await import(r.filter(n=>n.includes('/src/state/save.ts')).at(-1));window.state=await import(r.filter(n=>n.includes('/src/state/store.ts')).at(-1));window.commands=await import('/src/game/cityControls.ts');});}
 await bind();
 await page.evaluate(async()=>{const {createCity,place}=await import('/src/game/cityModel.ts');const c=createCity();c.tutorial.status='skipped';c.funds=10000;for(let x=1;x<=14;x++){place(c,'road',x,6);place(c,'road',x,10);}for(let y=1;y<=12;y++)place(c,'road',8,y);for(let y=6;y<=10;y++)place(c,'road',14,y);place(c,'home',1,4);place(c,'store',11,4);place(c,'stop',8,6);place(c,'stop',8,10);save.getSave().city=c;save.flushSave();});
 await page.reload();await page.getByRole('button',{name:/Continue/}).first().click();await page.waitForTimeout(600);await bind();
 if(name==='narrow')await page.getByRole('button',{name:'Roads',exact:true}).click();
 await page.locator('.build-tool[data-tool=closure]').click();
 async function focus(x,y){await page.evaluate(({x,y})=>commands.cityCommand({type:'focus',point:{x,y}}),{x,y});await page.waitForTimeout(220);return page.locator('.city-map-viewport').boundingBox();}
 async function tap(x,y){const b=await focus(x,y);if(name==='narrow')await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);else await page.mouse.click(b.x+b.width/2,b.y+b.height/2);await page.waitForTimeout(120);}
 async function capture(label){const bounds=await page.evaluate(()=>{const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom};};return {map:r('.city-map-viewport'),mission:r('.mission-card'),build:r('.city-build-region')};});assert.ok(bounds.map.height>=100);assert.ok(bounds.map.bottom<=bounds.mission.y+.5);assert.ok(bounds.map.bottom<=bounds.build.y+.5);await page.screenshot({path:`${output}/${name}-${label}.png`});results.push({name,label,...bounds});}
 const geometry=await page.evaluate(()=>JSON.stringify({roads:save.getSave().city.roads,buildings:save.getSave().city.buildings}));
 for(const [label,x,y] of [['horizontal',5,6],['vertical',8,3],['corner',14,6],['junction',8,6]]){
  await tap(x,y);assert.equal(await page.evaluate(({x,y})=>save.getSave().city.closures.some(p=>p.x===x&&p.y===y),{x,y}),true);
  // Atlas update must not turn soft diversions into responder-blocking works.
  assert.deepEqual(await page.evaluate(async({x,y})=>{const {isBlocked}=await import('/src/game/cityModel.ts');const c=save.getSave().city;return [isBlocked(c,{x,y}),isBlocked(c,{x,y},true)];},{x,y}),[true,false]);
  await capture(label);await tap(x,y);assert.equal(await page.evaluate(()=>save.getSave().city.closures.length),0);
 }
 await tap(5,6);await page.getByRole('button',{name:'Dashboard',exact:true}).click();await page.getByRole('button',{name:'Close Dashboard',exact:true}).click();await focus(5,6);await capture('dashboard-closed');
 await page.evaluate(()=>save.flushSave());await page.reload();await page.getByRole('button',{name:/Continue/}).first().click();await page.waitForTimeout(500);await bind();assert.deepEqual(await page.evaluate(()=>save.getSave().city.closures),[{x:5,y:6}]);assert.equal(await page.evaluate(()=>JSON.stringify({roads:save.getSave().city.roads,buildings:save.getSave().city.buildings})),geometry);await focus(5,6);await capture('reload');
 // Actual new road placement after layout changes remains accurate.
 if(name==='narrow')await page.getByRole('button',{name:'Roads',exact:true}).click();await page.locator('.build-tool[data-tool=road]').click();await tap(3,8);assert.equal(await page.evaluate(()=>save.getSave().city.roads.some(p=>p.x===3&&p.y===8)),true);
 await page.getByRole('button',{name:'Pause the city',exact:true}).click();const before=await page.evaluate(()=>JSON.stringify(save.getSave().city));const b=await page.locator('.city-map-viewport').boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>JSON.stringify(save.getSave().city)),before);await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);await context.close();console.log(name,'Kenney diversion placement/render/reload passed');
}}finally{await fs.writeFile(`${output}/results.json`,JSON.stringify(results,null,2));await browser.close();}
