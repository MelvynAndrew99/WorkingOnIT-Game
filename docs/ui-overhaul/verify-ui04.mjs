// UI-04: real pointer construction after shelf, rotation and reserved-panel changes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=process.env.UI_EVIDENCE_DIR??'/tmp/ui04-evidence';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const results=[];
try { for(const [name,width,height] of [['narrow',390,844],['desktop',1440,900]]) {
 const context=await browser.newContext({viewport:{width,height},hasTouch:name==='narrow',reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 await page.goto(process.env.UI_BASE_URL??'http://localhost:5184');await page.getByRole('button',{name:'Start your city',exact:true}).click();await page.locator('canvas').waitFor();await page.waitForTimeout(700);
 await page.evaluate(async()=>{const r=performance.getEntriesByType('resource').map(e=>e.name);window.save=await import(r.filter(n=>n.includes('/src/state/save.ts')).at(-1));window.state=await import(r.filter(n=>n.includes('/src/state/store.ts')).at(-1));window.commands=await import('/src/game/cityControls.ts');});
 const tool=t=>page.locator(`.build-tool[data-tool=${t}]`);
 async function shelf(label){if(name==='narrow')await page.getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(150);}
 async function snapshot(label){await page.waitForTimeout(200);const data=await page.evaluate(()=>{
  const rect=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};};
  const selectors=['.city-map-viewport','.city-header','.city-mission-region','.city-build-region','.city-dashboard','.map-rail'];
  const boxes=Object.fromEntries(selectors.map(s=>[s,document.querySelector(s)]).filter(([,e])=>e).map(([s,e])=>[s,rect(e)]));
  const buttons=[...document.querySelectorAll('.build-tool')].filter(e=>e.getBoundingClientRect().width).map(e=>({tool:e.dataset.tool,...rect(e),overflow:e.scrollWidth>e.clientWidth,icon:!!e.querySelector('svg')}));
  const actions=[...document.querySelectorAll('.mission-card .objective-buttons button')].map(rect);
  return {boxes,buttons,actions,scroll:document.documentElement.scrollWidth>innerWidth};});
  await page.screenshot({path:`${output}/${name}-${label}.png`});
  const map=data.boxes['.city-map-viewport'],mission=data.boxes['.city-mission-region'],build=data.boxes['.city-build-region'];
  assert.ok(map.height>=100&&map.width>=150);assert.equal(data.scroll,false);
  for(const [s,b] of Object.entries(data.boxes))if(s!=='.city-map-viewport')assert.ok(map.x+map.width<=b.x+.6||b.x+b.width<=map.x+.6||map.y+map.height<=b.y+.6||b.y+b.height<=map.y+.6,`${label}: map overlap ${s}`);
  if(name==='narrow')assert.ok(build.y>=mission.y+mission.height-.5);else assert.ok(build.x>=mission.x+mission.width-.5);
  for(const b of data.buttons){assert.ok(b.width>=44&&b.height>=44);assert.equal(b.overflow,false,`${b.tool} overflow ${JSON.stringify(b)}`);assert.equal(b.icon,true);assert.ok(Math.abs(b.width-data.buttons[0].width)<1,`${label} unequal widths`);assert.ok(Math.abs(b.height-data.buttons[0].height)<1);}
  for(const b of data.actions)assert.ok(b.y+b.height<=mission.y+mission.height+.5,`${label}: hidden mission action`);
  await page.screenshot({path:`${output}/${name}-${label}.png`});results.push({name,label,...data});
 }
 assert.equal(await tool('home').getAttribute('data-tutorial-target'),'true');assert.equal(await page.evaluate(()=>state.store.get().tool),null);
 await shelf('Services');assert.equal(await tool('hospital').isDisabled(),true);
 if(name==='narrow')assert.equal(await page.getByRole('button',{name:'Places',exact:true}).getAttribute('data-tutorial-target'),'true');
 await snapshot('locked');await shelf('Places');
 // Real stalled-lesson allowance, without waiting a minute in wall time.
 await page.evaluate(async()=>{const {stepCity}=await import('/src/game/cityModel.ts');stepCity(save.getSave().city,61);});await page.waitForTimeout(500);
 assert.match(await tool('home').textContent(),/Free/);await snapshot('waived');
 await tool('home').click();await snapshot('tutorial-selected');await page.evaluate(()=>commands.cityCommand({type:'focus',point:{x:3,y:2}}));await page.waitForTimeout(200);
 let map=await page.locator('.city-map-viewport').boundingBox();if(name==='narrow')await page.touchscreen.tap(map.x+map.width/2,map.y+map.height/2);else await page.mouse.click(map.x+map.width/2,map.y+map.height/2);
 assert.equal(await page.evaluate(()=>save.getSave().city.buildings.some(b=>b.kind==='home'&&b.x===3&&b.y===2&&b.paid===0)),true);
 await page.evaluate(()=>{commands.cityCommand({type:'tutorial',action:'skip'});save.getSave().city.funds=10;state.store.patch({funds:10});});await page.waitForTimeout(200);await shelf('Services');
 assert.equal(await tool('hospital').isDisabled(),false);assert.equal(await tool('hospital').getAttribute('data-afford'),'false');await tool('hospital').click();assert.match(await page.evaluate(()=>state.store.get().message),/costs/);await snapshot('unaffordable');
 await page.evaluate(()=>{save.getSave().city.funds=10000;state.store.patch({funds:10000});});await shelf('Places');await tool('store').click();
 await page.locator('.build-rotate').click();assert.match(await page.locator('.build-rotate').getAttribute('aria-label'),/west/);await page.keyboard.press('r');assert.match(await page.locator('.build-rotate').getAttribute('aria-label'),/north/);
 await page.evaluate(()=>commands.cityCommand({type:'focus',point:{x:16,y:13}}));
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.getByRole('button',{name:'Zoom out',exact:true}).click();
 await page.getByRole('button',{name:'Dashboard',exact:true}).click();await page.setViewportSize({width:width-8,height:height+12});await page.waitForTimeout(300);
 // No refocus after panel or resize: screen center must still mean world tile 16,13.
 map=await page.locator('.city-map-viewport').boundingBox();await page.mouse.click(map.x+map.width/2,map.y+map.height/2);
 assert.equal(await page.evaluate(()=>save.getSave().city.buildings.some(b=>b.kind==='store'&&b.x===16&&b.y===13&&b.rotation===2)),true,'rotated store after category/panel/resize');
 await snapshot('rotated-placement');await page.getByRole('button',{name:'Close Dashboard',exact:true}).click();
 await shelf('Roads');await tool('road').click();await page.evaluate(()=>commands.cityCommand({type:'focus',point:{x:16,y:11}}));await page.waitForTimeout(250);
 map=await page.locator('.city-map-viewport').boundingBox();const fw=await page.locator('#app-frame').evaluate(e=>e.clientWidth),tile=48*Math.min(fw/720,1);
 if(name==='narrow'){
  const cdp=await context.newCDPSession(page),y=map.y+map.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:map.x+map.width/2-tile,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:map.x+map.width/2+tile,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }else{await page.mouse.move(map.x+map.width/2-tile,map.y+map.height/2);await page.mouse.down();await page.mouse.move(map.x+map.width/2+tile,map.y+map.height/2,{steps:10});await page.mouse.up();}
 assert.equal(await page.evaluate(()=>[15,16,17].every(x=>save.getSave().city.roads.some(r=>r.x===x&&r.y===11))),true);
 await shelf('Places');await tool('bulldoze').click();await page.mouse.click(map.x+map.width/2,map.y+map.height/2);assert.equal(await page.evaluate(()=>save.getSave().city.roads.some(r=>r.x===16&&r.y===11)),false);
 const count=await page.evaluate(()=>save.getSave().city.roads.length);await page.getByRole('button',{name:'Pan mode off',exact:true}).click();await page.mouse.move(map.x+map.width/2,map.y+map.height/2);await page.mouse.down();await page.mouse.move(map.x+map.width/2+tile,map.y+map.height/2,{steps:8});await page.mouse.up();assert.equal(await page.evaluate(()=>save.getSave().city.roads.length),count);await page.getByRole('button',{name:'Pan mode on',exact:true}).click();
 await page.getByRole('button',{name:'Back to town',exact:true}).click();
 const old=await page.evaluate(()=>({...save.getSave().city.map}));await page.getByRole('button',{name:'Add land at a map edge',exact:true}).click();await page.getByRole('button',{name:'Expand north',exact:true}).click();await page.getByRole('button',{name:'Add land · Free',exact:true}).click();assert.equal(await page.evaluate(()=>save.getSave().city.map.y),old.y-8);
 await shelf('Services');await page.keyboard.press('Tab');await tool('hospital').focus();assert.equal(await tool('hospital').evaluate(e=>e.matches(':focus-visible')),true);await snapshot('expanded');
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Game display').selectOption('wide');await page.keyboard.press('Escape');await page.getByRole('button',{name:/Continue/i}).first().click();await page.waitForTimeout(300);await page.evaluate(()=>save.flushSave());await page.reload();await page.getByRole('button',{name:/Continue/i}).first().click();await page.waitForTimeout(500);assert.equal(await page.locator('#app-frame').getAttribute('data-display-mode'),'wide');
 assert.deepEqual(errors,[]);await context.close();console.log(name,'UI-04 passed');
}}finally{await fs.writeFile(`${output}/build-results.json`,JSON.stringify(results,null,2));await browser.close();}
