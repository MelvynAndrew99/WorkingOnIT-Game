import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
import {createCity,place,stepCity} from '/tmp/road-blend-source/src/game/cityModel.ts';
const out='/tmp/road-blend-check';mkdirSync(out,{recursive:true});
const c=createCity();c.map={x:0,y:0,width:36,height:32};c.funds=100000;c.tutorial.status='complete';
for(const y of [5,12,21])for(let x=2;x<=15;x++)place(c,'road',x,y);
for(const x of [20,28])for(let y=2;y<=12;y++)place(c,'road',x,y);
for(let y=17;y<=29;y++)place(c,'road',22,y);
for(const [x,y,r]of[[7,4,0],[7,12,0],[19,7,1],[28,7,1]])assert.match(place(c,'wideRoad',x,y,r),/widening started/);
for(let x=6;x<=11;x++)assert.match(place(c,'wideRoad',x,20),/widening started/);
for(let y=21;y<=25;y++)assert.match(place(c,'wideRoad',21,y,1),/widening started/);
for(let x=2;x<=6;x++)place(c,'road',x,28);
for(let x=8;x<=14;x++)place(c,'road',x,29);
assert.match(place(c,'wideRoad',7,28),/Four-lane road built/);
stepCity(c,3);const raw=JSON.parse(JSON.stringify(c));
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 await context.addInitScript(city=>localStorage.setItem('city-workshop:city:v1',JSON.stringify({city,updatedAt:1})),raw);
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:5254');await page.getByRole('button',{name:'Continue commute',exact:true}).click();await page.waitForTimeout(600);
 for(const [name,x,y]of[['horizontal-above',7,4.5],['horizontal-below',7,12.5],['vertical-left',19.5,7],['vertical-right',28.5,7],['horizontal-long',8,20.5],['vertical-long',21.5,23],['shifted-connector',7,28.5]]){
  await page.evaluate(async({x,y,width})=>{const{cityCommand}=await import('/src/game/cityControls.ts');cityCommand({type:'home'});cityCommand({type:'focus',point:{x,y}});cityCommand({type:'zoom',factor:width===1440?1.5:2});},{x,y,width});
  await page.waitForTimeout(160);await page.mouse.move(0,0);const box=await page.locator('.city-map-viewport').boundingBox();
  await page.screenshot({path:`${out}/${name}-${width}.png`,clip:box});
 }
 await page.evaluate(async()=>{(await import('/src/state/store.ts')).store.patch({paused:true});});
 await page.addStyleTag({content:'.pause-menu {display:none!important} .pause-menu::backdrop {background:transparent!important}'});
 await page.waitForTimeout(100);
 for(const [name,path,x,y]of[
 ['horizontal-motion',[{x:7,y:20},{x:6,y:20},{x:6,y:21},{x:5,y:21}],6,20.5],
 ['vertical-motion',[{x:22,y:20},{x:22,y:21},{x:21,y:21},{x:21,y:22}],21.5,21],
 ['shifted-motion',[{x:6,y:28},{x:7,y:28},{x:7,y:29},{x:8,y:29}],7,28.5]]){
  for(const fraction of [.35,.5,.65]){
   await page.evaluate(async({path,x,y,fraction})=>{
    const{getSave}=await import('/src/state/save.ts');
    getSave().city.trips=[{id:81,homeId:0,storeId:0,path,progress:fraction*(path.length-1),wait:0,hold:999}];
    const{cityCommand}=await import('/src/game/cityControls.ts');cityCommand({type:'home'});cityCommand({type:'focus',point:{x,y}});cityCommand({type:'zoom',factor:2.5});
   },{path,x,y,fraction});
   await page.setViewportSize({width,height:fraction===.5?901:900});
   await page.waitForTimeout(150);const box=await page.locator('.city-map-viewport').boundingBox();
   await page.screenshot({path:`${out}/${name}-${fraction}-${width}.png`,clip:box});
  }
 }
 await page.evaluate(async()=>{(await import('/src/state/save.ts')).getSave().city.trips=[];});
 const before=await page.evaluate(async()=>{const{getSave,flushSave}=await import('/src/state/save.ts');flushSave();return JSON.stringify(getSave().city.wideRoads);});
 await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).click();await page.waitForTimeout(300);
 assert.equal(await page.evaluate(async()=>JSON.stringify((await import('/src/state/save.ts')).getSave().city.wideRoads)),before);
 assert.deepEqual(errors,[]);results.push({width,cases:7,vehicleSamples:9,reload:true,errors});await context.close();
}}finally{await browser.close();writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
