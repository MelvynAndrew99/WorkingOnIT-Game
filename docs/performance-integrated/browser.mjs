import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
const tag=process.argv[2]??'before',url=process.argv[3]??'http://127.0.0.1:5310',out=`/tmp/integrated-browser-${tag}`;
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];let lastPage;
try {for(let trial=0;trial<Number(process.env.TRIALS??2);trial++) for(const town of (process.env.TOWN?[process.env.TOWN]:['small','busy']))for(const width of (process.env.WIDTH?[Number(process.env.WIDTH)]:[1440,390])){
 const id=`${town}-${width}-${trial}`,raw=JSON.parse(readFileSync(new URL(`model-${town}.json`,import.meta.url)));
 if(town==='small')for(const b of raw.city.buildings)if(b.kind==='apartment')b.y=4;
 const context=await browser.newContext({viewport:{width,height:width===390?844:900},deviceScaleFactor:1,hasTouch:width===390}),page=await context.newPage(),errors=[];
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 lastPage=page;page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message);});
 await context.addInitScript(raw=>{
  if(!localStorage.getItem('city-workshop:city:v1'))localStorage.setItem('city-workshop:city:v1',JSON.stringify(raw));
  window.gameModule=path=>window.__gameModules?.[path]?Promise.resolve(window.__gameModules[path]):import(performance.getEntriesByType('resource').map(e=>e.name).find(n=>new URL(n).pathname===path)??path);
  window.__samples={};window.__perfRecord=(name,ms)=>{if(window.__collect)(window.__samples[name]??=[]).push(ms);};
  window.__inputs=[];for(const name of ['pointerdown','pointerup','wheel','keydown','input'])document.addEventListener(name,e=>{if(!window.__collect)return;const at=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>window.__inputs.push({type:name,dispatchToSecondRaf:performance.now()-at,queued:Math.max(0,at-e.timeStamp)})));},{capture:true,passive:true});
 },raw);
 await page.goto(url); await page.getByRole('button',{name:/continue your town/i}).click();await page.locator('canvas').waitFor();await page.waitForTimeout(2500);
 await page.evaluate(async()=>{window.save=await window.gameModule('/src/state/save.ts');window.state=await window.gameModule('/src/state/store.ts');window.commands=await window.gameModule('/src/game/cityControls.ts');});
 const cdp=await context.newCDPSession(page);await cdp.send('HeapProfiler.enable');await cdp.send('HeapProfiler.collectGarbage');
 const heapStart=await cdp.send('Runtime.getHeapUsage'),domStart=await cdp.send('Memory.getDOMCounters');
 const phases=[];
 const saved=()=>page.evaluate(()=>structuredClone(window.save.getSave().city));
 const focus=async p=>{await page.evaluate(p=>window.commands.cityCommand({type:'focus',point:p}),p);await page.waitForTimeout(350);};
 const center=async()=>{const b=await page.locator('.city-map-viewport').boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2};};
 const tap=async(x,y)=>width===390?page.touchscreen.tap(x,y):page.mouse.click(x,y);
 const tile=async p=>{await focus(p);const q=await center();await tap(q.x,q.y);};
 const phase=async(name,action,profile=false)=>{
  if(profile){await cdp.send('Profiler.enable');await cdp.send('Profiler.start');}
  await page.evaluate(()=>{
   window.__epoch=(window.__epoch??0)+1;window.__samples={};window.__inputs=[];window.__collect=true;window.__frames=[];window.__long=[];window.__events=[];window.__start=performance.now();window.__elapsed=window.save.getSave().city.elapsed;window.__last=null;
   window.__obs=new PerformanceObserver(list=>window.__long.push(...list.getEntries().map(e=>e.duration)));window.__obs.observe({type:'longtask',buffered:false});
   window.__evobs=new PerformanceObserver(list=>window.__events.push(...list.getEntries().map(e=>({name:e.name,duration:e.duration,delay:e.processingStart-e.startTime,processing:e.processingEnd-e.processingStart}))));window.__evobs.observe({type:'event',durationThreshold:16});
   const epoch=window.__epoch;const frame=t=>{if(!window.__collect||epoch!==window.__epoch)return;if(window.__last!==null)window.__frames.push(t-window.__last);window.__last=t;requestAnimationFrame(frame);};requestAnimationFrame(frame);
  });
  const started=Date.now();if(action)await action();await page.waitForTimeout(Math.max(0,6000-(Date.now()-started)));
  const r=await page.evaluate(name=>{window.__collect=false;window.__obs.disconnect();window.__evobs.disconnect();const stats=a=>{a=[...a].sort((a,b)=>a-b);return {n:a.length,total:a.reduce((a,b)=>a+b,0),p50:a[Math.floor(a.length*.5)]??0,p95:a[Math.floor(a.length*.95)]??0,p99:a[Math.floor(a.length*.99)]??0,max:a.at(-1)??0};};const city=window.save.getSave().city;return {name,wallMs:performance.now()-window.__start,simSeconds:city.elapsed-window.__elapsed,frames:stats(window.__frames),over33:window.__frames.filter(x=>x>33.4).length,longTasks:stats(window.__long),costs:Object.fromEntries(Object.entries(window.__samples).map(([k,v])=>[k,stats(v)])),input:stats(window.__inputs.map(x=>x.dispatchToSecondRaf)),queuedInput:stats(window.__inputs.map(x=>x.queued)),eventTiming:window.__events,heap:performance.memory?.usedJSHeapSize,roads:city.roads.length,buildings:city.buildings.length,trips:city.trips.length};},name);
  if(profile){const {profile:p}=await cdp.send('Profiler.stop');writeFileSync(`${out}/${id}-${name}.cpuprofile`,JSON.stringify(p));}
  phases.push(r);writeFileSync(`${out}/${id}-phases.json`,JSON.stringify(phases,null,2));console.log(JSON.stringify({tag,id,name,fps:r.frames.n/(r.frames.total/1000),p95:r.frames.p95,simulation:r.costs.simulation?.p95,input:r.input.p95}));
 };
 await phase('live',null,trial===0);
 await phase('pan-zoom',async()=>{await page.keyboard.press('Escape');for(let i=0;i<6;i++){let p=await center();if(width===390){await cdp.send('Input.synthesizeScrollGesture',{x:p.x,y:p.y,xDistance:i%2?50:-50,yDistance:i%2?30:-30,gestureSourceType:'touch',speed:250});await cdp.send('Input.synthesizePinchGesture',{x:p.x,y:p.y,scaleFactor:i%2?.9:1.1,gestureSourceType:'touch',relativeSpeed:500});}else{await page.mouse.move(p.x,p.y);await page.mouse.down({button:'middle'});await page.mouse.move(p.x+(i%2?70:-70),p.y+30,{steps:6});await page.mouse.up({button:'middle'});await page.mouse.wheel(0,i%2?100:-100);}await page.waitForTimeout(100);}});
 let joins;
 await phase('construction',async()=>{
  await page.evaluate(()=>window.commands.cityCommand({type:'home'}));await page.waitForTimeout(350);
  joins=await page.evaluate(async()=>{const {place,parseCity}=await window.gameModule('/src/game/cityModel.ts');const {previewApartmentComplexJoin}=await window.gameModule('/src/game/cityPrivateLanes.ts');const city=window.save.getSave().city;if(city.buildings.some(b=>b.kind==='apartment'))return city.buildings.filter(b=>b.kind==='apartment').slice(0,2).map(b=>({x:b.x,y:b.y}));
  for(let y=city.map.y+5;y<city.map.y+city.map.height-7;y++)for(let x=city.map.x+5;x<city.map.x+city.map.width-13;x++){const copy=structuredClone(city),n=copy.buildings.length;place(copy,'apartment',x,y);place(copy,'apartment',x+6,y);if(copy.buildings.length===n+2)return [{x,y},{x:x+6,y}];}throw Error('No apartment pair area');});
  if(town==='busy'){await page.getByRole('button',{name:'Places',exact:true}).click();await page.locator('[data-tool="apartment"]').click();for(const p of joins)await tile(p);}
  await page.getByRole('button',{name:'Roads',exact:true}).click();await page.locator('[data-tool="road"]').click();
  const candidates=await page.evaluate(async()=>{const {place}=await window.gameModule('/src/game/cityModel.ts');const c=structuredClone(window.save.getSave().city),out=[];for(const r of [...c.roads])for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){const p={x:r.x+dx,y:r.y+dy};if(p.x<c.map.x+4||p.y<c.map.y+4||p.x>c.map.x+c.map.width-5||p.y>c.map.y+c.map.height-5)continue;const n=c.roads.length;place(c,'road',p.x,p.y);if(c.roads.length===n+1)out.push(p);if(out.length===4)return out;}return out;});
  for(const p of candidates)await tile(p);
  const c=await saved();for(const p of candidates)assert(c.roads.some(r=>r.x===p.x&&r.y===p.y),'road actually built');assert.equal(c.buildings.filter(b=>b.kind==='apartment').length,2);
 });
 await phase('apartment-joining',async()=>{await page.keyboard.press('Escape');await tile({x:joins[0].x+1,y:joins[0].y+1});const panel=page.getByRole('group',{name:'Apartment complex',exact:true});await panel.getByRole('button',{name:'Join complex',exact:true}).click();await tile({x:joins[1].x+1,y:joins[1].y+1});await panel.getByRole('button',{name:/Build lanes & join/}).click();assert.equal((await saved()).apartmentComplexes?.length,1);});
 await phase('inspectors',async()=>{for(let i=0;i<3;i++){await page.keyboard.press('Escape');await tile(joins[i%2]);await page.getByRole('button',{name:/^Tracker/}).click();await page.waitForTimeout(120);await page.getByRole('button',{name:'Close Tracker',exact:true}).click();}});
 const gameplayHeap=await cdp.send('Runtime.getHeapUsage');await page.getByRole('button',{name:'Menu',exact:true}).click();await page.waitForTimeout(300);
 await phase('radio',async()=>{await page.getByRole('button',{name:/Open City Radio/}).click();await page.getByRole('button',{name:'Turn radio on',exact:true}).first().click();await page.waitForTimeout(500);await page.getByRole('button',{name:'Seek up',exact:true}).click();await page.waitForTimeout(800);const dial=page.getByRole('slider',{name:'Tuning dial'});await dial.focus();for(let i=0;i<5;i++)await page.keyboard.press('ArrowRight');await page.getByRole('button',{name:'Seek down',exact:true}).click();await page.waitForTimeout(1000);assert.equal(await page.locator('.city-radio').getAttribute('data-playing'),'true');});
 const radio=await page.evaluate(async()=>{const r=await window.gameModule('/src/audio/radio.ts');return r.radioState();});
 await page.screenshot({path:`${out}/${id}.png`});
 await page.getByRole('button',{name:'Minimize radio',exact:true}).click();await page.getByRole('button',{name:'Turn radio off',exact:true}).click();
 await cdp.send('HeapProfiler.collectGarbage');const heapEnd=await cdp.send('Runtime.getHeapUsage'),domEnd=await cdp.send('Memory.getDOMCounters');
 const geometry=await saved();await page.evaluate(()=>window.save.flushSave());await page.reload();await page.getByRole('button',{name:/continue your town/i}).click();await page.waitForTimeout(1000);const restored=await page.evaluate(async()=>structuredClone((await window.gameModule('/src/state/save.ts')).getSave().city));
 assert.deepEqual(restored.roads,geometry.roads);assert.deepEqual(restored.apartmentComplexes,geometry.apartmentComplexes);assert.deepEqual(errors,[]);
 results.push({id,town,width,trial,phases,gameplayHeap,heapStart,heapEnd,domStart,domEnd,radio:{playing:radio.playing,currentTime:radio.currentTime,trackId:radio.trackId},reload:true,errors});writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));await context.close();
 }}catch(e){if(lastPage){console.log('FAIL',await lastPage.locator('body').innerText());await lastPage.screenshot({path:`${out}/failure.png`});}throw e;}finally{await browser.close();}
