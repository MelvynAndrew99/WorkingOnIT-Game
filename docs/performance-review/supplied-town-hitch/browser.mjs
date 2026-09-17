import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
const out='/home/phil/Code/jams/won/docs/performance-review/supplied-town-hitch';
const raw=JSON.parse(readFileSync(out+'/save.json'));
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(raw=>{
  localStorage.setItem('city-workshop:city:v1',JSON.stringify(raw));window.__frames=[];window.__outside=[];window.__long=[];window.__collect=false;
  window.__probeBegin=sim=>{if(window.__collect)window.__current={at:performance.now(),sim,spans:{}};};
  window.__probeRecord=(name,ms)=>{if(!window.__collect)return;const f=window.__current;if(!f)return;const s=f.spans[name]??={count:0,total:0,max:0};s.count++;s.total+=ms;s.max=Math.max(s.max,ms);};
  window.__probeEnd=sim=>{const f=window.__current;if(!f)return;f.cpu=performance.now()-f.at;f.simEnd=sim;window.__frames.push(f);window.__current=undefined;};
 },raw);
 await page.goto('http://127.0.0.1:5323');await page.getByRole('button',{name:/continue your town/i}).click();await page.waitForFunction(()=>window.__hitch?.ready);await page.waitForTimeout(3000);
 await page.evaluate(()=>{window.__collect=true;window.__observer=new PerformanceObserver(l=>{window.__long.push(...l.getEntries().map(x=>({start:x.startTime,duration:x.duration})));});window.__observer.observe({type:'longtask',buffered:false});});
 await page.waitForTimeout(24000);
 const data=await page.evaluate(()=>{window.__collect=false;window.__observer.disconnect();return {frames:window.__frames,longTasks:window.__long,final:{elapsed:window.__hitch.city.elapsed,roads:window.__hitch.city.roads.length,trips:window.__hitch.city.trips.length}};});
 assert.ok(data.frames.length>20);assert.deepEqual(errors,[]);results.push({width,errors,...data});
 const spans={};for(const f of data.frames)for(const [name,s]of Object.entries(f.spans)){const a=spans[name]??={count:0,total:0,max:0};a.count+=s.count;a.total+=s.total;a.max=Math.max(a.max,s.max);}
 console.log(JSON.stringify({width,frames:data.frames.length,spans,topFrames:[...data.frames].sort((a,b)=>b.cpu-a.cpu).slice(0,4)}));await context.close();
}}finally{await browser.close();writeFileSync(out+'/browser.json',JSON.stringify(results,null,2));}
