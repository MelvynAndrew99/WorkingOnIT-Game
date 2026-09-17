import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
const out=new URL('./',import.meta.url),raw=JSON.parse(readFileSync(new URL('../supplied-town-hitch/save.json',out)));
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const version of ['before','after']){
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1}),page=await context.newPage(),errors=[];
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(raw=>localStorage.setItem('city-workshop:city:v1',JSON.stringify(raw)),raw);
 await page.goto('http://127.0.0.1:'+(version==='before'?5331:5332));await page.getByRole('button',{name:/continue your town/i}).click();await page.waitForFunction(()=>window.__hitch?.ready);await page.waitForTimeout(3000);
 const cdp=await context.newCDPSession(page),events=[];cdp.on('Tracing.dataCollected',e=>events.push(...e.value));
 await cdp.send('HeapProfiler.enable');await cdp.send('HeapProfiler.startSampling',{samplingInterval:32768,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true});
 await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
 await cdp.send('Tracing.start',{categories:'v8,disabled-by-default-v8.gc',transferMode:'ReportEvents'});
 await page.waitForTimeout(8000);
 const done=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');await done;
 const {profile:cpu}=await cdp.send('Profiler.stop'),{profile:heap}=await cdp.send('HeapProfiler.stopSampling');
 writeFileSync(new URL(version+'.cpuprofile.gz',out),gzipSync(JSON.stringify(cpu)));writeFileSync(new URL(version+'-heap.json.gz',out),gzipSync(JSON.stringify(heap)));writeFileSync(new URL(version+'-gc-trace.json.gz',out),gzipSync(JSON.stringify(events)));
 const main=events.find(e=>e.name==='V8.GC_SCAVENGER'&&e.ph==='X');
 const gc=events.filter(e=>e.ph==='X'&&e.tid===main?.tid&&['V8.GC_SCAVENGER','V8.GC_MARK_COMPACTOR','MinorGC','MajorGC'].includes(e.name));
 const groups={};for(const e of gc){const g=groups[e.name]??={count:0,totalMs:0,maxMs:0};g.count++;g.totalMs+=(e.dur??0)/1000;g.maxMs=Math.max(g.maxMs,(e.dur??0)/1000);}
 let sampledBytes=0;function sum(n){sampledBytes+=n.selfSize;for(const child of n.children??[])sum(child);}sum(heap.head);
 const row={version,seconds:8,errors,sampledAllocationBytes:sampledBytes,gc:groups,eventNames:[...new Set(events.filter(e=>e.ph==='X'&&/GC/.test(e.name)).map(e=>e.name))]};results.push(row);console.log(JSON.stringify(row));await context.close();
}}finally{await browser.close();writeFileSync(new URL('gc-summary.json',out),JSON.stringify(results,null,2));}
