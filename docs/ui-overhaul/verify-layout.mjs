// UI-01 browser evidence; isolated local contexts only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const output=process.env.UI_EVIDENCE_DIR ?? '/tmp/ui01-evidence';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const results=[];
// Desktop and narrow are the only required layouts. Opt into the historical
// matrix only when a specific issue warrants the additional checks.
const layouts=process.env.UI_EXTENDED_LAYOUTS==='1'
 ? [['phone-small',320,640,'auto'],['phone',390,844,'auto'],['tablet',768,1024,'auto'],['desktop',1440,900,'auto'],['landscape',844,390,'auto'],['portrait',1440,900,'portrait']]
 : [['phone',390,844,'auto'],['desktop',1440,900,'auto']];
try{for(const [name,width,height,mode] of layouts){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 await page.goto((process.env.UI_BASE_URL ?? 'http://localhost:5184'));await page.getByRole('button',{name:'Start your city',exact:true}).click();
 await page.locator('canvas').waitFor();await page.waitForTimeout(700);
 await page.evaluate(async mode=>{
 const resource=performance.getEntriesByType('resource').map(e=>e.name);
 window.save=await import(resource.filter(n=>n.includes('/src/state/save.ts')).at(-1));
 window.state=await import(resource.filter(n=>n.includes('/src/state/store.ts')).at(-1));
 window.commands=await import('/src/game/cityControls.ts');
 state.store.patch({displayMode:mode});
 },mode);await page.waitForTimeout(400);
 async function bounds(label){
  const data=await page.evaluate(()=>{const selectors=['.city-header','.city-map-viewport','.city-controls','.city-mission-region','.city-build-region','.vehicle-debug','.city-dashboard'];const r={};for(const s of selectors){const el=document.querySelector(s);if(el){const b=el.getBoundingClientRect();r[s]={x:b.x,y:b.y,width:b.width,height:b.height};}}return {rects:r,layout:document.querySelector('.city-ui').dataset.layout,scroll:document.documentElement.scrollWidth>innerWidth};});
  const map=data.rects['.city-map-viewport'];assert.ok(map&&map.width>=150&&map.height>=100,`${name}/${label} map ${JSON.stringify(map)}`);
  for(const [s,b] of Object.entries(data.rects))if(s!=='.city-map-viewport')assert.ok(map.x+map.width<=b.x+.6||b.x+b.width<=map.x+.6||map.y+map.height<=b.y+.6||b.y+b.height<=map.y+.6,`${name}/${label} overlap ${s}`);
  assert.equal(data.scroll,false);results.push({name,label,...data});
  await page.screenshot({path:`${output}/${name}-${label}.png`});
 }
 await bounds('tutorial');
 // Geometry alone missed a scroll-layer paint spill over the map. The initial
 // roads-only town is static, so hiding chrome must not change any map pixels.
 const {PNG}=await import('../../node_modules/pngjs/lib/png.js');
 const clip=await page.locator('.city-map-viewport').boundingBox();
 const visible=PNG.sync.read(await page.screenshot());
 await page.locator('.city-controls').evaluate(el=>el.style.visibility='hidden');
 const hidden=PNG.sync.read(await page.screenshot());
 if(name==='phone-small'){
  // This unchanged starter lot is grass. It exposed an opaque horizontal strip
  // in full-frame captures that disappeared when capturing only a crop.
  const pixel=(Math.floor(clip.y+clip.height/2+10)*visible.width+Math.floor(clip.x+clip.width/2+20))*4;
  assert.ok(visible.data[pixel+1]>50&&visible.data[pixel+1]>visible.data[pixel+2],'starter map grass remains visible through the center');
 }

 await page.locator('.city-controls').evaluate(el=>el.style.visibility='');
 let different=0;
 for(let y=Math.ceil(clip.y)+2;y<Math.floor(clip.y+clip.height)-2;y++)for(let x=Math.ceil(clip.x)+2;x<Math.floor(clip.x+clip.width)-2;x++){
  const i=(y*visible.width+x)*4;for(let c=0;c<4;c++)if(visible.data[i+c]!==hidden.data[i+c])different++;
 }
 assert.equal(different,0,`${name} dock must not paint over map in a full-game screenshot`);

 // Real first Home placement with live tutorial gates and highlights.
 await page.locator('.build-tool').filter({hasText:'Home'}).click();
 await page.evaluate(()=>commands.cityCommand({type:'focus',point:{x:3,y:2}}));await page.waitForTimeout(200);
 let rect=await page.locator('.city-map-viewport').boundingBox();await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
 await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>save.getSave().city.buildings.some(b=>b.kind==='home'&&b.x===3&&b.y===2)),true,`${name} first home`);
 await page.waitForTimeout(600);
 await page.locator('.build-tool[data-tool=store]').click();
 await page.evaluate(()=>commands.cityCommand({type:'focus',point:{x:13,y:8}}));await page.waitForTimeout(250);
 rect=await page.locator('.city-map-viewport').boundingBox();await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
 assert.equal(await page.evaluate(()=>save.getSave().city.buildings.some(b=>b.kind==='store'&&b.x===13&&b.y===8)),true,`${name} tutorial store`);
 // Unlock via existing explicit tutorial command, keep construction, use ample test budget.
 await page.evaluate(()=>{commands.cityCommand({type:'tutorial',action:'skip'});save.getSave().city.funds=10000;state.store.patch({funds:10000});});await page.waitForTimeout(250);
 // Focus and zoom once. Subsequent resize/panel/mode changes must keep this world center/zoom.
 await page.evaluate(()=>{commands.cityCommand({type:'focus',point:{x:16,y:13}});commands.cityCommand({type:'zoom',factor:1.25});});
 await page.getByRole('button',{name:'Dashboard',exact:true}).click();
 await bounds('dashboard');
 await page.getByRole('button',{name:'Debug',exact:true}).click();await page.waitForTimeout(250);await bounds('debug');
 await page.getByRole('button',{name:'Close debug',exact:true}).click();
 await page.setViewportSize({width:width-8,height:height+12});await page.waitForTimeout(250);
 await page.evaluate(()=>state.store.patch({displayMode:'wide'}));await page.waitForTimeout(250);
 await page.keyboard.press('3');await page.waitForTimeout(250);
 rect=await page.locator('.city-map-viewport').boundingBox();const fw=await page.locator('#app-frame').evaluate(el=>el.clientWidth),tile=48*1.25*Math.min(fw/720,1);
 await page.mouse.move(rect.x+rect.width/2-tile,rect.y+rect.height/2);await page.mouse.down();await page.mouse.move(rect.x+rect.width/2+tile,rect.y+rect.height/2,{steps:8});await page.mouse.up();
 assert.equal(await page.evaluate(()=>[15,16,17].every(x=>save.getSave().city.roads.some(r=>r.x===x&&r.y===13))),true,`${name} road after resize/panels/mode`);
 await page.keyboard.press('1');await page.waitForTimeout(250);
 rect=await page.locator('.city-map-viewport').boundingBox();await page.mouse.click(rect.x+rect.width/2+2*tile,rect.y+rect.height/2);
 assert.equal(await page.evaluate(()=>save.getSave().city.buildings.some(b=>b.kind==='home'&&b.x===18&&b.y===13)),true,`${name} building after resize/panels/mode/zoom`);
 await page.getByRole('button',{name:'Heatmap',exact:true}).click();await page.waitForTimeout(250);await bounds('built');
 await page.getByRole('button',{name:'Dashboard',exact:true}).click();await page.locator('.city-dashboard').waitFor();await page.keyboard.press('Escape');
 await page.evaluate(()=>{save.flushSave();});const city=await page.evaluate(()=>({roads:save.getSave().city.roads.length,buildings:save.getSave().city.buildings.length}));
 await page.reload();await page.getByRole('button',{name:/Continue/i}).first().click();await page.waitForTimeout(400);
 assert.deepEqual(await page.evaluate(async()=>{const {getSave}=await import('/src/state/save.ts');return {roads:getSave().city.roads.length,buildings:getSave().city.buildings.length};}),city);
 assert.deepEqual(errors,[]);await context.close();
 console.log(name,'passed');
}}finally{await fs.writeFile(`${output}/layout-results.json`,JSON.stringify(results,null,2));await browser.close();}
