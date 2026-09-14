import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const {chromium}=await import('/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs');
const out='/tmp/player-perf-interactions';mkdirSync(out,{recursive:true});
const raw=JSON.parse(readFileSync(new URL('save.json',import.meta.url),'utf8'));
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='localhost'?route.continue():route.abort());
 await context.addInitScript(raw=>{if(!localStorage.getItem('city-workshop:city:v1'))localStorage.setItem('city-workshop:city:v1',JSON.stringify(raw));},raw);
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:5201');await page.getByRole('button',{name:'Continue commute',exact:true}).click();await page.waitForTimeout(1500);
 await page.getByRole('button',{name:'Pause the city',exact:true}).click();
 const point=await page.evaluate(async()=>{
  const {getSave}=await import('/src/state/save.ts');const {place}=await import('/src/game/cityModel.ts');const {store}=await import('/src/state/store.ts');const {cityCommand}=await import('/src/game/cityControls.ts');
  const c=getSave().city;window.perfPauseAt=c.elapsed;window.perfOldRoads=JSON.stringify(c.roads);
  const distance=p=>Math.abs(p.x-(c.map.x+c.map.width/2))+Math.abs(p.y-(c.map.y+c.map.height/2));
  for(const road of [...c.roads].sort((a,b)=>distance(a)-distance(b)))for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
   const p={x:road.x+dx,y:road.y+dy};if(p.x<c.map.x+6||p.y<c.map.y+6||p.x>c.map.x+c.map.width-6||p.y>c.map.y+c.map.height-6)continue;
   const copy=structuredClone(c);place(copy,'road',p.x,p.y);if(copy.roads.length!==c.roads.length+1)continue;
   store.patch({tool:'road',panning:false});cityCommand({type:'focus',point:p});return p;
  }throw Error('No build candidate');
 });
 await page.waitForTimeout(350);assert.equal(await page.evaluate(async()=> (await import('/src/state/save.ts')).getSave().city.elapsed===window.perfPauseAt),true);
 await page.getByRole('button',{name:'Resume game',exact:true}).click();await page.waitForTimeout(150);
 const region=await page.locator('.city-map-viewport').boundingBox();const center={x:region.x+region.width/2,y:region.y+region.height/2};
 await page.mouse.move(0,0);const before=await page.screenshot({clip:{x:center.x-10,y:center.y-10,width:20,height:20}});
 await page.mouse.click(center.x,center.y);await page.mouse.move(0,0);await page.waitForTimeout(150);
 const built=await page.evaluate(async p=>{const c=(await import('/src/state/save.ts')).getSave().city;return {built:c.roads.some(r=>r.x===p.x&&r.y===p.y),roads:c.roads,buildings:c.buildings};},point);if(!built.built){console.log({width,point,center,debug:await page.evaluate(async()=>{const s=(await import('/src/state/store.ts')).store.get(),c=(await import('/src/state/save.ts')).getSave().city;return {message:s.message,tool:s.tool,oldRoads:JSON.parse(window.perfOldRoads).length,roads:c.roads.length,newRoads:c.roads.filter(p=>!JSON.parse(window.perfOldRoads).some(q=>p.x===q.x&&p.y===q.y))};})});await page.screenshot({path:`${out}/failed-${width}.png`});}assert.equal(built.built,true);
 const after=await page.screenshot({clip:{x:center.x-10,y:center.y-10,width:20,height:20}});assert.notDeepEqual(after,before,'construction repaints the cached road layer');
 await page.getByRole('button',{name:'Zoom out',exact:true}).click();await page.screenshot({path:`${out}/built-zoomed-${width}.png`});
 await page.waitForTimeout(500);assert.equal(await page.evaluate(async()=> (await import('/src/state/save.ts')).getSave().city.elapsed>window.perfPauseAt),true);
 await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).click();await page.waitForTimeout(1000);
 const reloaded=await page.evaluate(async()=>{const c=(await import('/src/state/save.ts')).getSave().city;return {roads:c.roads,buildings:c.buildings};});assert.deepEqual(reloaded.roads,built.roads);assert.deepEqual(reloaded.buildings,built.buildings);assert.deepEqual(errors,[]);
 results.push({width,point,pauseResume:true,constructionVisible:true,zoom:true,reloadPreservesConstruction:true,errors});await context.close();
}}finally{await browser.close();}
writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(results);
