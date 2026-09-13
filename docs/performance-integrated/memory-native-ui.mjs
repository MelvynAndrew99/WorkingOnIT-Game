import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
const out='/tmp/integrated-memory-investigation/ui';mkdirSync(out,{recursive:true});
const raw=JSON.parse(readFileSync(new URL('model-busy.json',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const results=[];
try{for(const width of [1440,390])for(const [tag,url] of [['fixed','http://127.0.0.1:5313']]){
 const ctx=await browser.newContext({viewport:{width,height:900}}),page=await ctx.newPage();await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await ctx.addInitScript(raw=>localStorage.setItem('city-workshop:city:v1',JSON.stringify(raw)),raw);await page.goto(url);const errors=[];page.on('pageerror',e=>errors.push(e.message));const cdp=await ctx.newCDPSession(page);await cdp.send('HeapProfiler.enable');const samples=[];
 for(let cycle=0;cycle<4;cycle++){
  await page.locator('.title-sandbox').click();await page.locator('canvas').waitFor();await page.waitForTimeout(500);
  const box=await page.locator('.city-map-viewport').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,700);await page.waitForTimeout(300);
  await page.mouse.wheel(0,-700);await page.waitForTimeout(300);
  await page.getByRole('button',{name:/^Tracker/}).click();await page.getByRole('button',{name:'Close Tracker',exact:true}).click();
  await cdp.send('HeapProfiler.collectGarbage');const gameplayHeap=await cdp.send('Runtime.getHeapUsage');if(cycle===3)await page.screenshot({path:`${out}/${tag}-${width}-gameplay.png`});
  await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:/Open City Radio/}).click();await page.getByRole('button',{name:'Turn radio on',exact:true}).first().click();await page.waitForTimeout(800);await page.getByRole('button',{name:'Seek up',exact:true}).click();await page.waitForTimeout(300);await page.getByRole('button',{name:'Turn radio off',exact:true}).first().click();await page.getByRole('button',{name:'Minimize radio',exact:true}).click();await page.waitForTimeout(500);
  await cdp.send('HeapProfiler.collectGarbage');samples.push({cycle,gameplayHeap,heap:await cdp.send('Runtime.getHeapUsage'),dom:await cdp.send('Memory.getDOMCounters'),canvases:await page.locator('canvas').count()});
  assert.equal(samples.at(-1).canvases,0,'canvas removed at menu');
 }
 assert.deepEqual(errors,[]);results.push({tag,width,samples,errors});writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log({tag,width,MiB:samples.map(s=>s.heap.usedSize/1048576),nodes:samples.map(s=>s.dom.nodes),listeners:samples.map(s=>s.dom.jsEventListeners)});await ctx.close();
}}finally{await browser.close();}
