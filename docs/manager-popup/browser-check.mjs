import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {chromium}=await import('/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const out=fileURLToPath(new URL('.',import.meta.url));
try {
 for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===320?640:width===390?844:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:5181');await page.getByRole('button',{name:'Start your city',exact:true}).waitFor();
  await page.evaluate(async(width)=>{
   const m=await import('/src/game/cityModel.ts'),t=await import('/src/game/cityTutorial.ts');
   const city=m.createCity();
   for(const [x,y] of [[4,6],[5,6],[6,6],[5,5]])m.place(city,'road',x,y);
   m.place(city,'stop',5,6);
   city.tutorial.completed=['first-visit','park-visit','driver-rules','junction-control','accident-response','rescue'];t.refreshTutorial(city);
   if(width===390){city.incidents.push({id:city.nextId++,x:5,y:6,severity:'minor',status:'active',createdAt:0,required:['police'],completedServices:[],rescueDeadline:null,outcome:'none'});city.accidentCount++;}
   localStorage.setItem('city-workshop:city:v1',JSON.stringify({city,updatedAt:Date.now()+1000}));
  },width);
  await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).waitFor();
  await page.evaluate(async()=>{const {store}=await import('/src/state/store.ts');store.patch({phase:'playing',paused:true});});
  const launch=page.getByRole('button',{name:"Manager's plan",exact:true});await launch.waitFor();
  const before=await page.evaluate(async()=>JSON.stringify((await import('/src/state/save.ts')).getSave().city));
  await launch.click();const dialog=page.getByRole('dialog');await dialog.waitFor();
  assert.match(await dialog.innerText(),/We need more roads/);
  assert.equal(await dialog.getByText('A plan for future road blockages.',{exact:true}).count(),width===390?0:1);
  assert.equal(await dialog.getByRole('button',{name:/ignore|I have a plan/i}).count(),0);
  const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
  await page.waitForTimeout(1100);
  assert.equal(await page.evaluate(async()=>JSON.stringify((await import('/src/state/save.ts')).getSave().city)),before,'briefing must freeze city and not award progress');
  await page.screenshot({path:`${out}manager-${width}.png`});
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.ok(await launch.evaluate(el=>el===document.activeElement),'Escape restores focus');
  await launch.click();await page.getByRole('button',{name:'Plan a route',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  const state=await page.evaluate(async()=>{const s=(await import('/src/state/store.ts')).store.get();return {tool:s.tool,paused:s.paused,tutorial:s.tutorial.currentId};});
  assert.deepEqual(state,{tool:'road',paused:true,tutorial:'detour'});
  assert.equal(await page.evaluate(async()=>JSON.stringify((await import('/src/state/save.ts')).getSave().city)),before);
  assert.deepEqual(errors,[]);console.log(`PASS ${width}: manager briefing, pause, Escape, road selection, objective retained, no Ignore`);
  await context.close();
 }
}finally{await browser.close();}
