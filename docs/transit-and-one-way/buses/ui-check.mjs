import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
import {createCity,place} from '/home/phil/Code/jams/AI-Overlord/src/game/cityModel.ts';
const out='/tmp/bus-ui-check';mkdirSync(out,{recursive:true});
const c=createCity();c.map={x:0,y:0,width:20,height:18};c.funds=20000;c.tutorial.status='complete';
for(let x=3;x<=17;x++){place(c,'road',x,5);place(c,'road',x,12);}
for(let y=6;y<12;y++){place(c,'road',3,y);place(c,'road',17,y);}
console.log(place(c,'busStation',2,2,0),place(c,'busStop',8,4,0),place(c,'busStop',12,13,2));
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 await context.addInitScript(raw=>{if(!localStorage.getItem('city-workshop:city:v1'))localStorage.setItem('city-workshop:city:v1',JSON.stringify(raw));},{city:c,updatedAt:1});
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});await page.goto(process.env.UI_URL??'http://localhost:5221');await page.getByRole('button',{name:'Continue commute',exact:true}).click();await page.waitForTimeout(900);
 await page.screenshot({path:`${out}/boot-${width}.png`});
 const tile=async(x,y)=>{await page.evaluate(async p=>(await import('/src/game/cityControls.ts')).cityCommand({type:'focus',point:p}),{x,y});await page.waitForTimeout(180);const b=await page.locator('.city-map-viewport').boundingBox();assert.ok(b.height>70);await page.mouse.click(b.x+b.width/2,b.y+b.height/2);};
 await tile(3,3);await page.screenshot({path:`${out}/initial-${width}.png`});await page.getByRole('group',{name:'Bus service',exact:true}).waitFor();
 await page.getByRole('button',{name:'Buy bus · $400',exact:true}).click();
 await page.getByRole('button',{name:'Choose stops',exact:true}).click();await tile(8,4);await tile(12,13);
 await page.screenshot({path:`${out}/draft-${width}.png`});
 await page.getByRole('button',{name:'Finish route',exact:true}).click();
 const route=await page.evaluate(async()=> (await import('/src/state/save.ts')).getSave().city.transit.routes[0]);assert.equal(route.stopIds.length,2);
 await page.getByRole('button',{name:'Start service',exact:true}).click();
 await page.evaluate(async()=>{const {getSave}=await import('/src/state/save.ts');const {stepCity}=await import('/src/game/cityModel.ts');const c=getSave().city;c.paused=false;for(let i=0;i<300;i++)stepCity(c,.1);});
 await page.waitForTimeout(1200);
 const vehicle=await page.evaluate(async()=>{const c=(await import('/src/state/save.ts')).getSave().city;return c.trips.find(t=>t.busId!==undefined);});assert.ok(vehicle,'A purchased bus must deploy on the route');
 await page.evaluate(async point=>(await import('/src/game/cityControls.ts')).cityCommand({type:'focus',point}),vehicle.path[Math.min(vehicle.path.length-1,Math.floor(vehicle.progress))]);await page.waitForTimeout(180);
 await page.screenshot({path:`${out}/running-${width}.png`});
 const before=await page.evaluate(async()=> (await import('/src/state/save.ts')).getSave().city.transit);
 assert.equal(before.fleet.length,1);assert.equal(before.routes[0].running,true);
 await page.evaluate(async()=> (await import('/src/state/save.ts')).flushSave());await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).click();await page.waitForTimeout(500);
 const after=await page.evaluate(async()=> (await import('/src/state/save.ts')).getSave().city.transit);assert.equal(after.fleet.length,1);assert.deepEqual(after.routes[0].stopIds,before.routes[0].stopIds);
 if(width===390)await page.getByRole('button',{name:'Services',exact:true}).click();
 await page.locator('[data-tool=busStop]').click();
 await page.getByRole('button',{name:/Rotate new buildings/}).click();await page.getByRole('button',{name:/Rotate new buildings/}).click();await tile(10,13);
 const placed=await page.evaluate(async()=> (await import('/src/state/save.ts')).getSave().city.buildings.find(b=>b.kind==='busStop'&&b.x===10&&b.y===13));assert.equal(placed?.rotation,2);
 await page.screenshot({path:`${out}/placement-${width}.png`});
 assert.deepEqual(errors,[]);results.push({width,passed:true,route:after.routes[0]});await context.close();
}}finally{await browser.close();writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));}
