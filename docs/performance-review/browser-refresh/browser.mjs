import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
const out=new URL('./',import.meta.url),raw=JSON.parse(readFileSync(new URL('../supplied-town-hitch/save.json',out)));
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(let repeat=0;repeat<2;repeat++)for(const width of [1440,390])for(const version of repeat%2?['after','before']:['before','after']){
 const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1}),page=await context.newPage(),errors=[];
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(raw=>{
  localStorage.setItem('city-workshop:city:v1',JSON.stringify(raw));window.__frames=[];window.__raf=[];window.__long=[];window.__collect=false;
  window.__probeBegin=sim=>{if(window.__collect)window.__current={at:performance.now(),sim,phase:window.__phase,spans:{}};};
  window.__probeRecord=(name,ms)=>{if(!window.__collect||!window.__current)return;const s=window.__current.spans[name]??={count:0,total:0,max:0};s.count++;s.total+=ms;s.max=Math.max(s.max,ms);};
  window.__probeEnd=sim=>{const f=window.__current;if(!f)return;f.cpu=performance.now()-f.at;f.simEnd=sim;window.__frames.push(f);window.__current=undefined;};
  const frame=at=>{if(window.__collect)window.__raf.push({at,phase:window.__phase});requestAnimationFrame(frame);};requestAnimationFrame(frame);
 },raw);
 const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
 const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
 await page.goto('http://127.0.0.1:'+ (version==='before'?5331:5332));await page.getByRole('button',{name:/continue your town/i}).click({timeout:15000}).catch(async e=>{console.error({errors,body:await page.locator('body').innerText()});throw e;});await page.waitForFunction(()=>window.__hitch?.ready);await page.waitForTimeout(3000);
 const start=await metrics();
 await page.evaluate(()=>{window.__phase='steady';window.__collect=true;window.__observer=new PerformanceObserver(l=>{window.__long.push(...l.getEntries().map(x=>({start:x.startTime,duration:x.duration,phase:window.__phase})));});window.__observer.observe({type:'longtask',buffered:false});});
 await page.waitForTimeout(12000);const steadyEnd=await metrics();
 await page.evaluate(()=>{
  window.__phase='panZoom';let n=0;const canvas=window.__hitch.app.canvas;
  window.__pan=setInterval(()=>{const r=canvas.getBoundingClientRect(),x=r.left+r.width*.5,y=r.top+r.height*.5,d=n++%2?1:-1;
   const send=(type,dx,buttons)=>canvas.dispatchEvent(new PointerEvent(type,{clientX:x+dx,clientY:y,button:2,buttons,pointerId:77,pointerType:'mouse',bubbles:true}));
   send('pointerdown',0,2);send('pointermove',d*40,2);send('pointerup',d*40,0);
   canvas.dispatchEvent(new WheelEvent('wheel',{clientX:x,clientY:y,deltaY:d*70,bubbles:true,cancelable:true}));
  },500);
 });
 await page.waitForTimeout(8000);const end=await metrics();
 const data=await page.evaluate(()=>{clearInterval(window.__pan);window.__collect=false;window.__observer.disconnect();return {frames:window.__frames,raf:window.__raf,longTasks:window.__long,final:{elapsed:window.__hitch.city.elapsed,roads:window.__hitch.city.roads.length,trips:window.__hitch.city.trips.length}};});
 assert.ok(data.frames.length>20);assert.deepEqual(errors,[]);assert.equal(data.final.roads,414);
 results.push({version,repeat,width,errors,metrics:{start,steadyEnd,end},...data});
 writeFileSync(new URL('browser.json',out),JSON.stringify(results));console.log(JSON.stringify({version,repeat,width,frames:data.frames.length,final:data.final}));await context.close();
}}finally{await browser.close();writeFileSync(new URL('browser.json',out),JSON.stringify(results));}
