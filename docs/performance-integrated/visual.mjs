import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {PNG} from 'pngjs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
import {createCity} from '../../src/game/cityModel.ts';
const out='/tmp/integrated-visual';mkdirSync(out,{recursive:true});
const city=createCity();city.tutorial.status='complete';
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const width of [1440,390])for(const [tag,url] of [['before','http://127.0.0.1:5311'],['after','http://127.0.0.1:5312']]){
 const ctx=await browser.newContext({viewport:{width,height:900}}),page=await ctx.newPage();
 await ctx.route('**/*',async r=>{if(new URL(r.request().url()).hostname!=='127.0.0.1')return r.abort();if(r.request().url().endsWith('/city-atlas.png'))await new Promise(resolve=>setTimeout(resolve,600));return r.continue();});
 await ctx.addInitScript(city=>{localStorage.setItem('city-workshop:city:v1',JSON.stringify({city,updatedAt:1}));},city);
 await page.goto(url);await page.locator('.title-sandbox').waitFor();
 await page.evaluate(()=>{window.__gameModules['/src/state/store.ts'].store.patch({phase:'playing',paused:true});});await page.locator('canvas').waitFor();
 await page.addStyleTag({content:'dialog{visibility:hidden !important}'});await page.waitForTimeout(1500);
 const shot=async name=>{await page.waitForTimeout(300);const region=await page.locator('.city-map-viewport').boundingBox();const path=`${out}/${tag}-${width}-${name}.png`;await page.screenshot({path,clip:region});if(tag==='after'){const before=PNG.sync.read(readFileSync(`${out}/before-${width}-${name}.png`)),after=PNG.sync.read(readFileSync(path));assert.equal(before.width,after.width);assert.equal(before.height,after.height);let changed=0;for(let i=0;i<before.data.length;i+=4)if(Math.max(...[0,1,2].map(j=>Math.abs(before.data[i+j]-after.data[i+j])))>3)changed++;const fraction=changed/(before.width*before.height);const exactEqual=before.data.equals(after.data);results.push({width,name,changedPixels:changed,fraction,exactEqual});assert(exactEqual,`${width} ${name}: pixels differ`);assert(fraction<.002,`${width} ${name}: ${fraction} pixels changed`);}};
 const cmd=command=>page.evaluate(c=>window.__gameModules['/src/game/cityControls.ts'].cityCommand(c),command);
 await shot('initial');
 for(const [i,p] of [{x:8,y:8},{x:9,y:9},{x:14,y:14},{x:35,y:30},{x:62,y:46},{x:0,y:0}].entries()){await cmd({type:'focus',point:p});await shot(`pan-${i}`);}
 await cmd({type:'zoom',factor:.25});await shot('zoom-out');await cmd({type:'zoom',factor:8});await shot('zoom-in');
 await page.setViewportSize({width,height:760});await shot('height');
 await cmd({type:'focus',point:{x:18,y:8}});await shot('locked');
 const before=await page.evaluate(()=>window.__gameModules['/src/state/save.ts'].getSave().city.land.owned.length);
 await cmd({type:'unlock-plot',id:1});await shot('unlocked');
 assert.equal(await page.evaluate(()=>window.__gameModules['/src/state/save.ts'].getSave().city.land.owned.length),before+1);
 await ctx.close();
}}finally{await browser.close();writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));}console.log(results);
