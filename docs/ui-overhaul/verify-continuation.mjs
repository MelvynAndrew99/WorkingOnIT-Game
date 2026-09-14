// UI-01 browser evidence; use an isolated browser context, never a personal save.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const output=process.env.UI_EVIDENCE_DIR ?? '/tmp/ui01-evidence';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
try {for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:width===390?844:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 await page.goto((process.env.UI_BASE_URL ?? 'http://localhost:5184'));await page.getByRole('button',{name:'Start your city',exact:true}).click();
 const result=await page.evaluate(async()=>{
 const {createCity,place,stepCity,parseCity}=await import('/src/game/cityModel.ts');
 const c=createCity();c.funds=10000;
 for(const [x,kind] of [[1,'hospital'],[5,'fireStation'],[9,'policeStation']])place(c,kind,x,1);
 place(c,'home',1,9);place(c,'store',10,9);
 for(let x=1;x<=13;x++){place(c,'road',x,3);place(c,'road',x,11);}
 for(let y=4;y<=8;y++)place(c,'road',8,y);
 c.incidents.push({id:c.nextId++,x:8,y:8,severity:'fire',status:'active',createdAt:0,required:['police','ems','fire'],completedServices:[],rescueDeadline:90,outcome:'pending'});c.accidentCount=1;
 stepCity(c,.3);
 if(c.trips.filter(t=>t.service).length!==3)throw Error('Missing real response');
 const assignments=c.trips.filter(t=>t.service).map(t=>({id:t.id,service:t.service,stationId:t.stationId,incidentId:t.incidentId,path:t.path,progress:t.progress}));
 const save=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/save.ts')).at(-1));
 const store=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/store.ts')).at(-1));store.store.patch({paused:true});
 save.getSave().city=parseCity(JSON.parse(JSON.stringify(c)));save.flushSave();
 localStorage.setItem('ai-overlord:traffic:v1','j3-preserve-sentinel');
 return {assignments,roads:c.roads.length};
 });
 await page.reload();await page.getByRole('button',{name:/Continue/i}).first().click();
 await page.getByRole('button',{name:'Dashboard',exact:true}).click();
 await page.getByRole('button',{name:'Debug',exact:true}).click();
 await page.setViewportSize({width:width-5,height:width===390?856:912});await page.waitForTimeout(300);
 await page.getByRole('button',{name:'Close debug',exact:true}).click();
 await page.getByRole('button',{name:'Heatmap',exact:true}).click();
 const restored=await page.evaluate(async()=>{
 const save=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/save.ts')).at(-1));
 const {stepCity,parseCity}=await import('/src/game/cityModel.ts');
 const c=save.getSave().city;
 const assignments=c.trips.filter(t=>t.service).map(t=>({id:t.id,service:t.service,stationId:t.stationId,incidentId:t.incidentId,path:t.path,progress:t.progress}));
 for(let i=0;i<600;i++)stepCity(c,.1);
 if(c.incidents[0].status!=='cleared'||c.incidents[0].outcome!=='rescued')throw Error('Rescue/scene work failed');
 if(assignments.some(a=>c.trips.some(t=>t.id===a.id)))throw Error('Original crew failed to return');
 if(c.completed<1)throw Error('Civilian visit and return failed');
 if(!parseCity(JSON.parse(JSON.stringify(c))))throw Error('Completed city no longer loads');
 return {roads:c.roads.length,assignments,completed:c.completed,services:c.incidents[0].completedServices,old:localStorage.getItem('ai-overlord:traffic:v1')};
 });assert.equal(restored.roads,result.roads);assert.deepEqual(restored.assignments.map(({id,service,stationId,incidentId})=>({id,service,stationId,incidentId})),result.assignments.map(({id,service,stationId,incidentId})=>({id,service,stationId,incidentId}))); assert.equal(restored.old,'j3-preserve-sentinel');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 await page.screenshot({path:`${output}/response-${width}.png`});console.log(JSON.stringify({width,...result,completed:restored.completed,services:restored.services}));await context.close();
}}finally{await browser.close();}
