import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const out=process.env.EMERGENCY_EVIDENCE??'/tmp/emergency-browser';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const results=[];
try{for(const [name,width,height]of [['desktop',1440,900],['narrow',390,844]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const modules=()=>page.evaluate(async()=>{const urls=performance.getEntriesByType('resource').map(e=>e.name);window.state=await import(urls.filter(n=>n.includes('/src/state/store.ts')).at(-1));window.cs=await import(urls.filter(n=>n.includes('/src/state/challenges.ts')).at(-1));window.model=await import('/src/game/cityChallenges.ts');window.commands=await import('/src/game/cityControls.ts');window.solutions=await import('/src/game/fixtures/emergencySolutions.ts');});
 await page.goto(process.env.EMERGENCY_URL??'http://127.0.0.1:5193');await page.getByRole('button',{name:'Challenges',exact:true}).click();await modules();
 const sandbox=await page.evaluate(()=>localStorage.getItem('city-workshop:city:v1'));
 const legacy=await page.evaluate(()=>{const old=model.createChallenge('first-bus-service');old.id='a-town-that-works';old.revision=2;old.earned=true;const raw={runs:{'a-town-that-works':old},stars:{'a-town-that-works':true},updatedAt:Date.now()};localStorage.setItem('working-on-it:challenges:v1',JSON.stringify(raw));return old;});
 await page.reload();await page.getByRole('button',{name:'Challenges',exact:true}).click();await modules();
 const go=async(n,completed=false)=>{await page.getByRole('button',{name:`Level ${n}, ${completed?'completed':'playable'}`,exact:true}).click();await page.getByRole('button',{name:/^(Play|Continue) level/}).click();await page.locator('canvas').waitFor();await page.waitForTimeout(250);};
 await go(15,true);
 const migration=await page.evaluate(()=>JSON.parse(localStorage.getItem('working-on-it:challenges:v1')));
 assert.deepEqual(migration.archivedRuns['a-town-that-works'].city,legacy.city);assert.equal(migration.stars['a-town-that-works'],true);assert.equal(migration.runs['a-town-that-works'].revision,3);
 assert.equal(await page.evaluate(()=>state.store.get().tool),null);
 await page.screenshot({path:`${out}/${name}-police-access.png`});await page.getByRole('button',{name:'Levels',exact:true}).click();
 await go(16);
 await page.getByRole('button',{name:'Police',exact:false}).click();await page.getByRole('button',{name:'Rotate',exact:true}).click();await page.getByRole('button',{name:'Rotate',exact:true}).click();
 await page.evaluate(()=>commands.cityCommand({type:'focus',point:{x:12,y:12}}));await page.waitForTimeout(80);const b=await page.locator('.city-map-viewport').boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
 assert.equal(await page.evaluate(()=>cs.getChallengeRun().city.buildings.some(b=>b.kind==='policeStation')),true);
 await page.getByRole('button',{name:'Run traffic',exact:true}).click();await page.getByRole('button',{name:'Pause traffic',exact:true}).click();
 await page.evaluate(()=>{model.stepChallenge(cs.getChallengeRun(),3);cs.flushChallenges();state.store.patch({});});
 const evidence=await page.evaluate(()=>cs.getChallengeRun().emergency);
 await page.reload();await page.getByRole('button',{name:'Challenges',exact:true}).click();await modules();await go(16);
 assert.deepEqual(await page.evaluate(()=>cs.getChallengeRun().emergency),evidence);
 await page.evaluate(()=>{model.stepChallenge(cs.getChallengeRun(),180);cs.flushChallenges();state.store.patch({});});await page.getByRole('heading',{name:'Nice work!',exact:true}).waitFor();
 await page.getByRole('button',{name:'Back to level map',exact:true}).click();
 for(const n of [17,18,19,20,21,22,23,24]){
  await go(n);
  const stages=await page.locator('.challenge-stages li').count();assert.ok(stages>=3);
  if(n===21){await page.getByRole('button',{name:'One-way',exact:false}).click();assert.equal(await page.getByLabel('Restore two-way').isVisible(),true);await page.screenshot({path:`${out}/${name}-recovery-editor.png`});await page.getByRole('button',{name:'Inspect',exact:true}).click();}
  await page.evaluate(()=>{solutions.solveEmergency(cs.getChallengeRun());model.stepChallenge(cs.getChallengeRun(),240);cs.flushChallenges();state.store.patch({});});
  await page.getByRole('heading',{name:'Nice work!',exact:true}).waitFor();
  if(n===24){assert.equal(await page.getByRole('dialog').getByRole('button',{name:'Next',exact:false}).count(),0);await page.screenshot({path:`${out}/${name}-district-complete.png`});}
  await page.getByRole('button',{name:'Back to level map',exact:true}).click();
 }
 assert.equal(await page.getByRole('button',{name:'Level 25, coming soon',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:/^(Play|Continue) level/}).count(),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem('city-workshop:city:v1')),sandbox);assert.deepEqual(errors,[]);
 results.push({name,legacyAttemptArchived:true,legacyAwardPreserved:true,policePointerPlacement:true,responseReload:true,allNewBriefingsAndCompletions:true,directionEditor:true,finaleUnavailable:true,sandboxUnchanged:true,errors});await context.close();
}await fs.writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(results);
}finally{await browser.close();}
