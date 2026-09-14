import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
const out='/tmp/lanes-ring-pacing';mkdirSync(out,{recursive:true});
const raw=JSON.parse(readFileSync('/home/phil/Code/jams/AI-Overlord/docs/transit-and-one-way/lanes-and-roundabouts/player-ring-save.json','utf8'));
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const width of [1440,390])for(const [label,port]of [['ring',5221]]) {
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],failed=[];
 await context.route('**/*',r=>{const u=new URL(r.request().url());return ['127.0.0.1','venus-static-01293ak.web.app'].includes(u.hostname)||u.protocol==='data:'?r.continue():r.abort();});
 await context.addInitScript(raw=>localStorage.setItem('city-workshop:city:v1',JSON.stringify(raw)),raw);
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(new URL(r.url()).hostname==='127.0.0.1'&&r.status()>=400)failed.push(r.url());});
 await page.goto(`http://127.0.0.1:${port}/game/`);await page.getByRole('button',{name:'Continue commute',exact:true}).click();await page.getByRole('button',{name:'Pause the city',exact:true}).waitFor();await page.waitForTimeout(2500);
 const result=await page.evaluate(async()=>{const intervals=[],start=performance.now();let last=start;await new Promise(resolve=>{const frame=t=>{intervals.push(t-last);last=t;if(t-start>=12000)resolve();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});intervals.shift();intervals.sort((a,b)=>a-b);return {frames:intervals.length,wallMs:performance.now()-start,fps:intervals.length/((performance.now()-start)/1000),p50:intervals[Math.floor(intervals.length*.5)],p95:intervals[Math.floor(intervals.length*.95)],p99:intervals[Math.floor(intervals.length*.99)],over33:intervals.filter(t=>t>33.4).length};});
 await page.screenshot({path:`${out}/${label}-${width}.png`});
 await page.getByRole('button',{name:'Menu',exact:true}).click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('city-workshop:city:v1')).city);
 assert.ok(saved.elapsed>raw.city.elapsed);assert.deepEqual(saved.roads,raw.city.roads);assert.deepEqual(saved.buildings,raw.city.buildings);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 results.push({label,width,...result,simulationAdvanced:true,geometryPreserved:true,errors,failed});console.log(results.at(-1));await context.close();
}}finally{await browser.close();}
writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));
