import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
const raw=JSON.parse(readFileSync('/home/phil/Code/jams/won/docs/performance-integrated/current-town/save.json'));
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];const quant=(a,q)=>[...a].sort((a,b)=>a-b)[Math.min(a.length-1,Math.floor(a.length*q))];
try{for(let trial=0;trial<2;trial++)for(const width of [1440,390])for(const version of trial?['after','before']:['before','after']){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(raw=>localStorage.setItem('city-workshop:city:v1',JSON.stringify(raw)),raw);
 await page.goto('http://127.0.0.1:'+(version==='before'?5321:5322));
 await page.getByRole('button',{name:/continue your town/i}).click();
 await page.waitForFunction(()=>window.__motionProbe?.city);await page.waitForTimeout(3000);
 await page.evaluate(()=>{const p=window.__motionProbe;p.frames=[];p.target=p.city.trips.find(t=>t.hold===0&&['outbound','returning'].includes(t.phase)&&!t.service)?.id??0;p.record=true;});
 await page.waitForTimeout(8000);
 const frames=await page.evaluate(()=>{window.__motionProbe.record=false;return window.__motionProbe.frames;});
 assert.ok(frames.length>10);assert.deepEqual(errors,[]);
 const intervals=frames.slice(1).map((f,i)=>f.at-frames[i].at);let movingPairs=0,repeated=0;
 for(let i=1;i<frames.length;i++){const f=frames[i],p=frames[i-1];if(f.id&&f.id===p.id&&f.hold===0&&p.hold===0){movingPairs++;if(f.x===p.x&&f.y===p.y)repeated++;}}
 const summary={trial,width,version,frames:frames.length,frameP50:quant(intervals,.5),frameP95:quant(intervals,.95),frameP99:quant(intervals,.99),tickCpuP95:quant(frames.map(f=>f.cpu),.95),movingPairs,repeated,errors};
 results.push({...summary,rawFrames:frames});console.log(JSON.stringify(summary));await context.close();
}}finally{await browser.close();writeFileSync('/tmp/won-motion-browser.json',JSON.stringify(results,null,2));}
