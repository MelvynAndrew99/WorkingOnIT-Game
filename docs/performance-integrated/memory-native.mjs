import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
const mode=process.argv[2]??'game';
mkdirSync('/tmp/integrated-memory-investigation',{recursive:true});
if(!['game','radio','fixed'].includes(mode))throw Error('Use game, radio or fixed mode');
const raw=JSON.parse(readFileSync(new URL('model-busy.json',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:Number(process.env.MEMORY_WIDTH??390),height:900}}),page=await ctx.newPage();
try{
 await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await ctx.addInitScript(raw=>localStorage.setItem('city-workshop:city:v1',JSON.stringify(raw)),raw);await page.goto(process.env.MEMORY_URL??'http://127.0.0.1:5312');await page.waitForTimeout(1500);
 const cdp=await ctx.newCDPSession(page);await cdp.send('HeapProfiler.enable');const samples=[];
 for(let cycle=0;cycle<5;cycle++){
  if(mode!=='radio'){await page.evaluate(()=>document.querySelector('.title-sandbox').click());await page.waitForTimeout(1500);
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Menu').click());await page.waitForTimeout(1200);}else{await page.evaluate(()=>document.querySelector('.city-radio-mini-info').click());await page.waitForTimeout(200);await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Minimize radio').click());await page.waitForTimeout(500);}
  await cdp.send('HeapProfiler.collectGarbage');samples.push({cycle,heap:await cdp.send('Runtime.getHeapUsage'),dom:await cdp.send('Memory.getDOMCounters')});
 }
 let chunks=[];cdp.on('HeapProfiler.addHeapSnapshotChunk',({chunk})=>chunks.push(chunk));await cdp.send('HeapProfiler.takeHeapSnapshot',{reportProgress:false});writeFileSync(`/tmp/integrated-memory-investigation/${mode}.heapsnapshot`,chunks.join(''));
 writeFileSync(`/tmp/integrated-memory-investigation/${mode}-results.json`,JSON.stringify(samples,null,2));console.log(samples);
}finally{await browser.close();}
