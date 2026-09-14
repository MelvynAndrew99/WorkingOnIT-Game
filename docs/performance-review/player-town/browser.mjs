import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const {chromium}=await import('/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs');
const label=process.argv[2]??'before',base=new URL('./',import.meta.url),out=new URL(`file:///tmp/player-perf-browser-${label}/`);mkdirSync(out,{recursive:true});
const save=JSON.parse(readFileSync(new URL('save.json',base),'utf8'));
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 await context.route('**/*',route=>{const u=new URL(route.request().url());return u.hostname==='localhost'||u.protocol==='data:'?route.continue():route.abort();});
 if(label==='noaa')await context.route('**/src/game/pixiApp.ts',async route=>{const response=await route.fetch();const body=await response.text();assert.ok(body.includes('antialias: true'));await route.fulfill({response,body:body.replace('antialias: true','antialias: false')});});
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(save=>localStorage.setItem('city-workshop:city:v1',JSON.stringify(save)),save);
 await page.goto(process.env.PERF_URL??'http://localhost:5198');await page.getByRole('button',{name:'Continue commute',exact:true}).click();
 await page.waitForTimeout(2500);
 const cdp=await context.newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
 const result=await page.evaluate(async()=>{
  const {getSave}=await import('/src/state/save.ts');const {store}=await import('/src/state/store.ts');
  const first=getSave().city;const geometry=JSON.stringify([first.roads,first.buildings]);const startElapsed=first.elapsed;
  const durations=[],longTasks=[];const obs=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration)));obs.observe({entryTypes:['longtask']});
  const start=performance.now();let last=start;
  await new Promise(resolve=>{function frame(t){durations.push(t-last);last=t;if(t-start>=12000)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);});
  obs.disconnect();const wall=performance.now()-start;durations.shift();durations.sort((a,b)=>a-b);
  const city=getSave().city;return {wallMs:wall,simSeconds:city.elapsed-startElapsed,frames:durations.length,p50:durations[Math.floor(durations.length*.5)],p95:durations[Math.floor(durations.length*.95)],p99:durations[Math.floor(durations.length*.99)],over33:durations.filter(d=>d>33.4).length,longTasks,geometryPreserved:geometry===JSON.stringify([city.roads,city.buildings]),paused:store.get().paused};
 });
 console.log(JSON.stringify({width,...result,errors}));const {profile}=await cdp.send('Profiler.stop');writeFileSync(new URL(`${label}-${width}.cpuprofile`,out),JSON.stringify(profile));
 await page.screenshot({path:new URL(`${label}-${width}.png`,out).pathname});
 assert.ok(result.simSeconds>0,'benchmark must observe the running city, not a duplicate HMR module');assert.equal(result.geometryPreserved,true);assert.equal(result.paused,false);assert.deepEqual(errors,[]);
 results.push({width,...result,errors});console.log(JSON.stringify(results.at(-1)));await context.close();
}}finally{await browser.close();}
writeFileSync(new URL(`${label}-browser.json`,out),JSON.stringify(results,null,2));
