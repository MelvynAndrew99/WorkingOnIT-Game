import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
import {createCity,place} from '/home/phil/Code/jams/AI-Overlord/src/game/cityModel.ts';
const out='/tmp/bus-ridership-ui';mkdirSync(out,{recursive:true});
const c=createCity();c.map={x:0,y:0,width:24,height:20};c.funds=20000;c.tutorial.status='complete';
for(let x=3;x<=21;x++){place(c,'road',x,5);place(c,'road',x,15);}
for(let y=6;y<15;y++){place(c,'road',3,y);place(c,'road',21,y);}place(c,'road',3,4);
for(const [kind,x,y,r] of [['busStation',2,1,0],['busStop',8,6,2],['busStop',17,6,2],['home',5,3,0],['home',7,3,0],['home',9,3,0],['home',11,3,0],['store',17,3,0]])assert.match(place(c,kind,x,y,r),/built/);
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 await context.addInitScript(raw=>{if(!localStorage.getItem('city-workshop:city:v1'))localStorage.setItem('city-workshop:city:v1',JSON.stringify(raw));},{city:c,updatedAt:1});
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:5231');await page.getByRole('button',{name:'Continue commute',exact:true}).click();await page.waitForTimeout(800);
 const focus=async(x,y)=>{await page.evaluate(async p=>(await import('/src/game/cityControls.ts')).cityCommand({type:'focus',point:p}),{x,y});await page.waitForTimeout(180);};
 const tile=async(x,y)=>{await focus(x,y);const b=await page.locator('.city-map-viewport').boundingBox();assert.ok(b.height>70);await page.mouse.click(b.x+b.width/2,b.y+b.height/2);};
 await tile(3,2);await page.getByRole('group',{name:'Bus service',exact:true}).waitFor();
 await page.getByRole('button',{name:'Buy bus · $400',exact:true}).click();await page.getByRole('button',{name:'Choose stops',exact:true}).click();await tile(8,6);await tile(17,6);
 await page.getByRole('button',{name:'Finish route',exact:true}).click();await page.getByRole('button',{name:'Start service',exact:true}).click();
 const sample=async(until)=>page.evaluate(async until=>{
   const {getSave}=await import('/src/state/save.ts'),{stepTransit}=await import('/src/game/cityTransit.ts'),{roadIndex,trafficTick}=await import('/src/game/cityTraffic.ts'),{store}=await import('/src/state/store.ts');
   const c=getSave().city;
   for(let i=0;i<24000;i++){
     c.elapsed=Math.round((c.elapsed+.025)*1e6)/1e6;const index=roadIndex(c);stepTransit(c,index,.025);trafficTick(c,index);
     const s=c.transit.ridership,bus=c.transit.fleet[0];
     if(until==='loaded'&&bus.abstractOnboard?.length>=3||until==='return-queue'&&s.riders.filter(j=>j.stage==='waiting-back').length>=3||until==='complete'&&s.completed>=3){
       const trip=c.trips.find(t=>t.busId===bus.id);return {riders:s.riders,completed:s.completed,generated:s.generated,onboard:bus.abstractOnboard?.length??0,point:trip?.path[Math.min(trip.path.length-1,Math.floor(trip.progress))]};
     }
   }throw new Error(`Did not reach ${until}: ${JSON.stringify(c.transit)}`);
 },until);
 console.log('route started',width);const loaded=await sample('loaded');console.log('loaded',loaded.onboard);assert.ok(loaded.onboard>=3);await focus(loaded.point.x,loaded.point.y);await page.screenshot({path:`${out}/loaded-${width}.png`});
 const queued=await sample('return-queue');console.log('return queue',width);assert.ok(queued.riders.filter(j=>j.stage==='waiting-back').length>=3);await focus(17,6);await page.screenshot({path:`${out}/stop-dots-${width}.png`});
 const completed=await sample('complete');console.log('completed',width);assert.ok(completed.completed>=3);
 await tile(3,2);await page.getByRole('group',{name:'Bus service',exact:true}).waitFor();await page.screenshot({path:`${out}/panel-${width}.png`});
 const panel=await page.getByRole('group',{name:'Bus service',exact:true}).boundingBox();assert.ok(panel.x>=0&&panel.x+panel.width<=width+1);assert.ok(panel.height<700);
 const before=await page.evaluate(async()=>{const {getSave,flushSave}=await import('/src/state/save.ts');for(const h of getSave().city.transit.ridership.homes)h.nextAt=getSave().city.elapsed+20;flushSave();return JSON.parse(JSON.stringify(getSave().city.transit.ridership));});
 await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).click();await page.waitForTimeout(300);
 const after=await page.evaluate(async()=>{return (await import('/src/state/save.ts')).getSave().city.transit.ridership;});
 assert.equal(after.generated,before.generated);assert.ok(after.completed>=before.completed);assert.deepEqual(after.homes,before.homes);assert.ok(after.riders.every(j=>before.riders.some(b=>b.id===j.id)));assert.equal(before.riders.length-after.riders.length,after.completed-before.completed+after.cancelled-before.cancelled);
 await tile(3,2);await page.screenshot({path:`${out}/reload-${width}.png`});await page.getByRole('button',{name:'Return to depot',exact:true}).click();
 assert.equal(await page.evaluate(async()=> (await import('/src/state/save.ts')).getSave().city.transit.routes[0].running),false);
 assert.deepEqual(errors,[]);results.push({width,loaded:loaded.onboard,waiting:queued.riders.filter(j=>j.stage==='waiting-back').length,completed:completed.completed,reload:true,controls:true,errors});await context.close();
}}finally{await browser.close();writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));}
