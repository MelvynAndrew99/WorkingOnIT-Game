import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const { chromium }=await import(process.env.CITY_PLAYWRIGHT_MODULE||'/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:process.env.CITY_CHROMIUM_PATH||'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const url=process.env.CITY_URL||'http://localhost:5177', out=fileURLToPath(new URL('.',import.meta.url));
const saveKey='city-workshop:city:v1';
let active;
async function waitTrip(page,predicate,timeout=12000){const deadline=Date.now()+timeout;while(Date.now()<deadline){const trips=await page.evaluate(async()=>{const s=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/save.ts')).at(-1)||'/src/state/save.ts');return s.getSave().city.trips;});if(trips.some(predicate))return;await page.waitForTimeout(20);}throw Error('Timed out waiting for responder state');}
try{
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const context=await browser.newContext({viewport,hasTouch:viewport.width<500});
  const page=await context.newPage();active=page;const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.getByRole('button',{name:'Start your city',exact:true}).waitFor();
  // Real model fixture, following independent queue regression. Stop halfway through lateral motion.
  const expected=await page.evaluate(async({saveKey})=>{
   const m=await import('/src/game/cityModel.ts'),t=await import('/src/game/cityTraffic.ts'),inc=await import('/src/game/cityIncidents.ts');
   const c=m.createCity();for(let x=0;x<=15;x++)m.place(c,'road',x,6);
   m.place(c,'policeStation',0,4);m.place(c,'home',4,4);m.place(c,'store',11,4);m.place(c,'road',10,5);m.place(c,'signal',10,6);
   const home=c.buildings.find(b=>b.kind==='home'),store=c.buildings.find(b=>b.kind==='store');
   c.trips.push({id:c.nextId++,homeId:home.id,storeId:store.id,path:Array.from({length:9},(_,i)=>({x:4+i,y:6})),progress:5.5,wait:0,hold:0,phase:'outbound',purpose:'shopping',speed:2});
   c.incidents.push({id:c.nextId++,x:14,y:6,severity:'minor',status:'active',createdAt:0,required:['police'],completedServices:[],rescueDeadline:null,outcome:'none'});c.accidentCount++;
   inc.stepIncidents(c,t.TRAFFIC_TICK);
   const response=c.trips.find(tr=>tr.service);
   for(let i=0;i<400;i++){c.elapsed=Math.round((c.elapsed+t.TRAFFIC_TICK)*1e6)/1e6;t.trafficTick(c,t.roadIndex(c));if(response.emergencyPass?.stage==='out'&&response.emergencyPass.shift>=.5)break;}
   if(response.emergencyPass?.shift!==.5)throw Error('Fixture did not reach halfway lane shift');
   if(!m.parseCity(JSON.parse(JSON.stringify(c))))throw Error('Fixture is not loadable');
   localStorage.setItem(saveKey,JSON.stringify({city:c,updatedAt:Date.now()+1000}));return structuredClone(c);
  },{saveKey});
  await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).waitFor();
  // Mount a paused real game through the same phase store used by the menu. No live model is replaced.
  await page.evaluate(async()=>{const {store}=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/store.ts')).at(-1)||'/src/state/store.ts');store.patch({phase:'playing',paused:true});});
  await page.getByRole('button',{name:/Resume/}).waitFor();await page.waitForTimeout(300);
  const loaded=await page.evaluate(async()=>{const s=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/save.ts')).at(-1)||'/src/state/save.ts');return s.getSave().city;});
  assert.deepEqual(loaded,expected,'real boot preserves mid-shift city exactly');
  const art=await page.evaluate(async()=>{
   const a=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/game/cityArt.ts')).at(-1)||'/src/game/cityArt.ts');return ['police','ems','fire'].flatMap(service=>['N','E','S','W'].map(side=>{const view=a.vehicleView(1,side,service);const f=a.frame(view.name);return {service,side,name:view.name,width:f.width,height:f.height};}));
  });
  for(const f of art){assert.ok(f.name.includes(f.service),`${f.service} uses dedicated sprite`);assert.equal(f.width,'EW'.includes(f.side)?36:22);assert.equal(f.height,'EW'.includes(f.side)?24:29);}
  await page.screenshot({path:`${out}in-game-${viewport.width}-mid-shift.png`});
  await page.evaluate(async()=>{const s=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/save.ts')).at(-1)||'/src/state/save.ts');s.flushSave();});
  await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).waitFor();
  await page.evaluate(async()=>{const {store}=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/store.ts')).at(-1)||'/src/state/store.ts');store.patch({phase:'playing',paused:true});});
  await page.getByRole('button',{name:/Resume/}).waitFor();
  const reloaded=await page.evaluate(async()=>{const s=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/save.ts')).at(-1)||'/src/state/save.ts');return s.getSave().city;});
  assert.deepEqual(reloaded,expected,'second boot keeps real saved lateral position');
  await page.getByRole('button',{name:/Resume/}).click();
  await waitTrip(page,t=>t.service&&t.emergencyPass?.stage==='passing');
  await page.getByRole('button',{name:/Pause/}).click();await page.waitForTimeout(100);
  const passing=await page.evaluate(async()=>{const s=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/save.ts')).at(-1)||'/src/state/save.ts');return s.getSave().city.trips.find(t=>t.service);});
  assert.equal(passing.emergencyPass?.stage,'passing');assert.equal(passing.emergencyPass.shift,1);
  await page.screenshot({path:`${out}in-game-${viewport.width}-opposing-lane.png`});
  await page.getByRole('button',{name:/Resume/}).click();
  await waitTrip(page,t=>t.service&&t.phase==='working');
  await page.getByRole('button',{name:/Pause/}).click();
  const outcome=await page.evaluate(async()=>{const s=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/save.ts')).at(-1)||'/src/state/save.ts'),t=await import('/src/game/cityTraffic.ts');const c=s.getSave().city;return {response:c.trips.find(t=>t.service),civilian:c.trips.find(t=>!t.service),signal:t.signalAxis(c,c.controls[0]),elapsed:c.elapsed};});
  assert.equal(outcome.response.phase,'working');assert.equal(outcome.civilian.progress,5.5);assert.equal(outcome.signal,'ns');assert.ok(!outcome.response.emergencyPass);
  await page.screenshot({path:`${out}in-game-${viewport.width}-arrived-on-red.png`});
  assert.deepEqual(errors,[]);console.log(`PASS ${viewport.width}: 12 dedicated textures, paused mid-shift boot/reload, opposing-lane playthrough, arrived during red at ${outcome.elapsed}s`);
  // Separate real dispatch scene makes all three newly installed bodies reviewable together.
  await page.evaluate(async({saveKey})=>{
   const m=await import('/src/game/cityModel.ts'),inc=await import('/src/game/cityIncidents.ts');
   const c=m.createCity();for(let x=0;x<=15;x++)m.place(c,'road',x,8);
   for(const [i,kind]of ['policeStation','hospital','fireStation'].entries())m.place(c,kind,i*4,6);
   c.incidents.push({id:c.nextId++,x:14,y:8,severity:'fire',status:'active',createdAt:0,required:['police','ems','fire'],completedServices:[],rescueDeadline:90,outcome:'pending'});c.accidentCount++;
   inc.stepIncidents(c,.025);m.stepCity(c,.5);
   if(c.trips.filter(t=>t.service).length!==3)throw Error('All three stations must actually dispatch');
   if(!m.parseCity(JSON.parse(JSON.stringify(c))))throw Error('Three-service scene must be loadable');
   localStorage.setItem(saveKey,JSON.stringify({city:c,updatedAt:Date.now()+1000}));
  },{saveKey});
  await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).waitFor();
  await page.evaluate(async()=>{const {store}=await import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/src/state/store.ts')).at(-1)||'/src/state/store.ts');store.patch({phase:'playing',paused:true});});
  await page.getByRole('button',{name:/Resume/}).waitFor();await page.waitForTimeout(300);
  if(viewport.width<500)await page.getByRole('button',{name:'Zoom out',exact:true}).click();
  await page.getByRole('button',{name:'Pan',exact:true}).click();
  const pan=await page.locator('canvas').boundingBox();
  await page.mouse.move(pan.x+pan.width*.6,pan.y+pan.height*.58);await page.mouse.down();await page.mouse.move(pan.x+pan.width*.6-65,pan.y+pan.height*.58,{steps:8});await page.mouse.up();
  await page.screenshot({path:`${out}in-game-${viewport.width}-all-services.png`});
  console.log(`PASS ${viewport.width}: actual police, EMS and fire station-origin dispatch rendered`);
  await context.close();
 }
} catch(e){if(active&&!active.isClosed())await active.screenshot({path:`${out}browser-failure.png`}).catch(()=>{});throw e;}finally{await browser.close();}
