import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const {chromium}=await import('/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs');
const out=new URL('./',import.meta.url),save=JSON.parse(readFileSync(new URL('../../performance-review/player-town/save.json',import.meta.url),'utf8'));
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],failed=[],loaded=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:5211')){if(r.status()>=400)failed.push({url:new URL(r.url()).pathname,status:r.status()});else loaded.push(new URL(r.url()).pathname);}});
 await context.route('**/*',route=>{const u=new URL(route.request().url());return ['127.0.0.1','venus-static-01293ak.web.app'].includes(u.hostname)||u.protocol==='data:'?route.continue():route.abort();});
 await context.addInitScript(save=>{if(!localStorage.getItem('city-workshop:city:v1'))localStorage.setItem('city-workshop:city:v1',JSON.stringify(save));},save);
 await page.goto('http://127.0.0.1:5211/game/');await page.getByRole('button',{name:'Continue commute',exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);
 assert.ok(await page.getByText('Good as new!',{exact:true}).isVisible());await page.screenshot({path:new URL(`title-${width}.png`,out).pathname});
 await page.getByRole('button',{name:'Continue commute',exact:true}).click();await page.getByRole('button',{name:'Pause the city',exact:true}).waitFor();await page.waitForTimeout(3000);
 await page.getByRole('button',{name:'Zoom out',exact:true}).click();await page.waitForTimeout(500);await page.screenshot({path:new URL(`game-${width}.png`,out).pathname});
 await page.getByRole('button',{name:'Menu',exact:true}).click();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('city-workshop:city:v1')).city);assert.deepEqual(before.roads,save.city.roads);assert.deepEqual(before.buildings,save.city.buildings);assert.ok(before.elapsed>save.city.elapsed);
 await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).waitFor();
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('city-workshop:city:v1')).city);assert.deepEqual(after,before);
 assert.ok(loaded.some(p=>p.endsWith('/images/city/city-atlas.png')));assert.ok(loaded.some(p=>p.endsWith('/images/title/label-wear.svg')));assert.deepEqual(failed,[]);assert.deepEqual(errors,[]);
 results.push({width,production:true,nestedAssetPath:true,titleGraphics:true,cityAtlas:true,zoom:true,existingTownPreserved:true,simulationAdvanced:true,reload:true,errors,failed});console.log(results.at(-1));await context.close();
}}finally{await browser.close();}
writeFileSync(new URL('smoke-results.json',out),JSON.stringify(results,null,2));
