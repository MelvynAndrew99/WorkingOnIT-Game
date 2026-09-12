import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
import {createCity,place} from '../../src/game/cityModel.ts';
const out='/tmp/weather-ui';mkdirSync(out,{recursive:true});
const city=createCity();city.funds=10000;city.tutorial.status='complete';
for(let x=5;x<=13;x++)place(city,'road',x,9);
place(city,'home',5,7);place(city,'store',11,7);assert.equal(city.buildings.length,2);
const raw={city,updatedAt:1};const results=[];
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 await context.addInitScript(raw=>{if(!localStorage.getItem('city-workshop:city:v1'))localStorage.setItem('city-workshop:city:v1',JSON.stringify(raw));},raw);
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:5234');
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 const setting=page.getByRole('checkbox',{name:/weather/i});assert.equal(await setting.isChecked(),true);
 await setting.uncheck();await page.getByRole('button',{name:'Done',exact:true}).click();await page.reload();
 await page.getByRole('button',{name:'Settings',exact:true}).click();assert.equal(await setting.isChecked(),false);
 await setting.check();await page.screenshot({path:`${out}/settings-${width}.png`});await page.getByRole('button',{name:'Done',exact:true}).click();
 await page.getByRole('button',{name:'Continue commute',exact:true}).click();
 await page.waitForFunction(async()=> (await import('/src/state/save.ts')).getSave().city.elapsed>.2);
 await page.screenshot({path:`${out}/clear-${width}.png`});
 // Set only this isolated browser fixture's elapsed clock to the rainy portion.
 await page.evaluate(async()=>{(await import('/src/state/save.ts')).getSave().city.elapsed=Number(240);});
 await page.waitForTimeout(300);await page.screenshot({path:`${out}/rain-${width}.png`});
 await page.getByRole('button',{name:'Pause the city',exact:true}).click();await page.getByRole('heading',{name:'Paused',exact:true}).waitFor();
 const before=await page.evaluate(async()=> (await import('/src/state/save.ts')).getSave().city.elapsed);
 await page.waitForTimeout(200);assert.equal(await page.evaluate(async()=> (await import('/src/state/save.ts')).getSave().city.elapsed),before);
 const pauseWeather=page.getByRole('checkbox',{name:'Weather',exact:true});await pauseWeather.uncheck();assert.equal(await page.evaluate(async()=> (await import('/src/state/store.ts')).store.get().weatherEnabled),false);await pauseWeather.check();
 await page.getByRole('button',{name:'Resume game',exact:true}).click();
 await page.getByRole('button',{name:'Zoom out',exact:true}).click();await page.screenshot({path:`${out}/zoom-${width}.png`});
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);await page.screenshot({path:`${out}/reduced-${width}.png`});
 await page.getByRole('button',{name:'Pause the city',exact:true}).click();await page.getByRole('button',{name:'Main menu',exact:true}).click();
 await page.getByRole('button',{name:'Settings',exact:true}).click();assert.equal(await setting.isChecked(),true);
 await page.getByRole('button',{name:'Done',exact:true}).click();await page.getByRole('button',{name:'Continue commute',exact:true}).click();
 await page.waitForTimeout(200);assert.deepEqual(errors,[]);results.push({width,preferenceReload:true,pause:true,zoom:true,reducedMotion:true,sceneReentry:true,errors});await context.close();
}}finally{await browser.close();}
writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(results);
