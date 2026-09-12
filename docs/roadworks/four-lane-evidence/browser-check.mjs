import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
import {createCity,place} from '/tmp/wide-ui-source/src/game/cityModel.ts';
const out='/tmp/wide-ui-check';mkdirSync(out,{recursive:true});
const c=createCity();c.map={x:0,y:0,width:24,height:20};c.funds=20000;c.tutorial.status='complete';c.roads=[];c.buildings=[];c.trips=[];c.controls=[];c.incidents=[];
for(let x=3;x<=18;x++)place(c,'road',x,8);
assert.match(place(c,'home',12,3,0),/built/);
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 await context.addInitScript(raw=>{if(!localStorage.getItem('city-workshop:city:v1'))localStorage.setItem('city-workshop:city:v1',JSON.stringify(raw));},{city:c,updatedAt:1});
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:5243');await page.getByRole('button',{name:'Continue commute',exact:true}).click();await page.waitForTimeout(800);
 const state=()=>page.evaluate(async()=>structuredClone((await import('/src/state/save.ts')).getSave().city));
 const focus=async(x,y)=>{await page.evaluate(async p=>(await import('/src/game/cityControls.ts')).cityCommand({type:'focus',point:p}),{x,y});await page.waitForTimeout(180);};
 const hover=async(x,y)=>{await focus(x,y);const b=await page.locator('.city-map-viewport').boundingBox();assert.ok(b.height>70);await page.mouse.move(b.x+b.width/2,b.y+b.height/2);return b;};
 const tile=async(x,y)=>{const b=await hover(x,y);await page.mouse.click(b.x+b.width/2,b.y+b.height/2);};
 if(width===390)await page.getByRole('button',{name:'Roads',exact:true}).click();
 await page.locator('[data-tool=wideRoad]').click();await hover(6,12);await page.screenshot({path:`${out}/preview-${width}.png`});await tile(6,12);
 let city=await state();if(!city.wideRoads){console.log('placement failure',width,await page.evaluate(async()=>({state:(await import('/src/state/store.ts')).store.get(),viewport:document.querySelector('.city-map-viewport').getBoundingClientRect().toJSON()})));await page.screenshot({path:`${out}/failure-${width}.png`});}assert.ok(city.wideRoads?.some(s=>s.x===6&&s.y===12&&s.axis==='horizontal'),'horizontal placement');
 const dragBox=await hover(4,16),cx=dragBox.x+dragBox.width/2,cy=dragBox.y+dragBox.height/2;
 await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+3*48*Math.min(width/720,1),cy,{steps:12});await page.mouse.up();
 city=await state();for(let x=4;x<=7;x++)assert.ok(city.wideRoads.some(s=>s.x===x&&s.y===16),'drag places every section');
 await page.getByRole('button',{name:'Rotate 4-lane road',exact:true}).click();await tile(9,12);city=await state();assert.ok(city.wideRoads?.some(s=>s.x===9&&s.y===12&&s.axis==='vertical'),'vertical placement');
 await page.getByRole('button',{name:'Rotate 4-lane road',exact:true}).click();
 // Observe real running construction before advancing the isolated simulation.
 await tile(7,8);city=await state();assert.equal(city.wideRoadWorks?.length,1);assert.ok(city.wideRoadWorks[0].remaining>2&&city.wideRoadWorks[0].remaining<=3);await page.screenshot({path:`${out}/roadworks-${width}.png`});
 await page.evaluate(async()=>{const c=(await import('/src/state/save.ts')).getSave().city;const {stepCity}=await import('/src/game/cityModel.ts');for(let i=0;i<31;i++)stepCity(c,.1);});await page.waitForTimeout(200);
 city=await state();assert.ok(city.wideRoads.some(s=>s.x===7&&s.y===8));assert.ok(!city.wideRoadWorks?.length);
 const before=JSON.stringify({buildings:city.buildings,roads:city.roads,funds:city.funds});await hover(12,3);await page.screenshot({path:`${out}/blocked-${width}.png`});await tile(12,3);city=await state();assert.equal(JSON.stringify({buildings:city.buildings,roads:city.roads,funds:city.funds}),before);
 const message=await page.evaluate(async()=>(await import('/src/state/store.ts')).store.get().message);assert.match(message,/Clear the highlighted building/);
 // Populate a useful preview of full width straight, side and wide crossing.
 await page.evaluate(async()=>{const c=(await import('/src/state/save.ts')).getSave().city;const {place,stepCity}=await import('/src/game/cityModel.ts');for(let x=4;x<=15;x++)place(c,'wideRoad',x,8,0);for(let i=0;i<31;i++)stepCity(c,.1);for(let y=6;y<=12;y++)place(c,'wideRoad',10,y,1);for(let i=0;i<31;i++)stepCity(c,.1);});await focus(10,9);await page.mouse.move(0,0);await page.evaluate(()=>{const region=document.querySelector('.city-build-region');if(region)region.scrollTop=0;});await page.screenshot({path:`${out}/intersection-${width}.png`});
 await page.locator('[data-tool=stop]').click();await tile(10,8);city=await state();assert.equal(city.controls.length,1);assert.equal(city.controls[0].kind,'stop');
 await page.locator('[data-tool=signal]').click();await tile(11,9);city=await state();assert.equal(city.controls.length,1);assert.equal(city.controls[0].kind,'signal');await page.mouse.move(0,0);await page.screenshot({path:`${out}/signals-${width}.png`});
 await page.evaluate(async()=> (await import('/src/state/save.ts')).flushSave());const count=(await state()).wideRoads.length;await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).click();await page.waitForTimeout(500);assert.equal((await state()).wideRoads.length,count);
 assert.deepEqual(errors,[]);results.push({width,passed:true,wideSections:count});await context.close();
}}finally{await browser.close();writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
