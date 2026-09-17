import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
const root=process.cwd();
const raw=JSON.parse(readFileSync(root+'/docs/performance-integrated/model-small.json'));
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(raw=>localStorage.setItem('city-workshop:city:v1',JSON.stringify(raw)),raw);
 await page.goto('http://127.0.0.1:5317');await page.getByRole('button',{name:/continue your town/i}).click();await page.locator('canvas').waitFor();await page.waitForTimeout(3500);
 await page.evaluate(async()=>{
  const mod=path=>import(performance.getEntriesByType('resource').map(e=>e.name).find(n=>new URL(n).pathname===path)??path);
  window.commands=await mod('/src/game/cityControls.ts');window.save=await mod('/src/state/save.ts');window.state=await mod('/src/state/store.ts');window.visits=await mod('/src/game/cityVisits.ts');window.model=await mod('/src/game/cityModel.ts');window.state.store.patch({paused:true});
 });
 const verify=async()=>{
  await page.evaluate(()=>{window.commands.cityCommand({type:'bus-stop',action:'close'});window.commands.cityCommand({type:'zoom',factor:1});});
  await page.waitForFunction(()=>{
   const city=window.save.getSave().city;
   const expected=city.buildings.filter(window.model.isResidential).flatMap(b=>{const reason=window.visits.homeRoadIssue(city,b);return reason?[{homeId:b.id,x:b.x,y:b.y,reason}]:[];});
   return JSON.stringify(window.state.store.get().roadIssues)===JSON.stringify(expected);
  });
  return page.evaluate(()=>window.state.store.get().roadIssues);
 };
 const initial=await verify();
 await page.evaluate(()=>{const c=window.save.getSave().city;window.originalRoads=c.roads;c.roads=[];});
 const disconnected=await verify();assert.ok(disconnected.length>0);
 await page.evaluate(()=>{window.save.getSave().city.roads=window.originalRoads;});
 const restored=await verify();assert.deepEqual(restored,initial);
 assert.deepEqual(errors,[]);results.push({width,initial,disconnected,restored,errors});await context.close();
}}finally{await browser.close();}
writeFileSync(root+'/docs/performance-review/access-cache/browser.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
