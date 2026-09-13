import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const out=process.env.JAM_EVIDENCE??'/tmp/jam-browser';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const results=[];
try{for(const [name,width,height]of [['desktop',1440,900],['narrow',390,844]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const modules=()=>page.evaluate(async()=>{
  const urls=performance.getEntriesByType('resource').map(e=>e.name);
  window.state=await import(urls.filter(n=>n.includes('/src/state/store.ts')).at(-1));
  window.cs=await import(urls.filter(n=>n.includes('/src/state/challenges.ts')).at(-1));
  window.model=await import('/src/game/cityChallenges.ts');window.commands=await import('/src/game/cityControls.ts');
  window.solutions=await import('/src/game/fixtures/campaignSolutions.ts');
 });
 await page.goto(process.env.JAM_URL??'http://127.0.0.1:5197');
 await page.getByRole('button',{name:'Challenges',exact:true}).click();await modules();
 const sandbox=await page.evaluate(()=>localStorage.getItem('city-workshop:city:v1'));
 assert.equal(await page.getByRole('button',{name:/^Level \d+, playable$/}).count(),1);
 assert.equal(await page.getByRole('button',{name:/^Level \d+, locked$/}).count(),24);
 await page.getByRole('button',{name:'Level 25, locked',exact:true}).click();
 assert.equal(await page.getByRole('dialog').getByRole('button',{name:'Locked',exact:true}).isDisabled(),true);
 assert.match(await page.getByRole('dialog').innerText(),/complete Level 24 first/);
 await page.screenshot({path:`${out}/${name}-locked-briefing.png`});
 assert.ok(await page.evaluate(()=>{try{cs.selectChallenge('what-a-jam');return false;}catch{return true;}}));
 await page.getByRole('button',{name:'Close level briefing',exact:true}).click();
 await page.getByRole('button',{name:'Level 1, playable',exact:true}).click();
 await page.getByRole('button',{name:'Play level',exact:false}).click();
 await page.evaluate(()=>{const r=cs.getChallengeRun();for(let x=4;x<=9;x++)model.challengePlace(r.city,'road',x,6,0,r.id);model.stepChallenge(r,60);cs.flushChallenges();state.store.patch({});});
 await page.getByRole('heading',{name:'Nice work!',exact:true}).waitFor();
 assert.ok(await page.evaluate(()=>cs.challengeUnlocked('neighborhood-roads')));
 await page.getByRole('button',{name:'Retry',exact:true}).click();
 assert.ok(await page.evaluate(()=>cs.challengeUnlocked('neighborhood-roads')&&!cs.getChallengeRun().earned));
 await page.getByRole('button',{name:'Levels',exact:true}).click();
 await page.reload();await page.getByRole('button',{name:'Challenges',exact:true}).click();await modules();
 assert.equal(await page.getByRole('button',{name:'Level 2, playable',exact:true}).count(),1);
 assert.equal(await page.getByRole('button',{name:'Level 3, locked',exact:true}).count(),1);
 const old=JSON.parse(await fs.readFile(new URL('../levels-15-24/evidence/past-the-wreck.json',import.meta.url),'utf8'));
 await page.evaluate(old=>localStorage.setItem('working-on-it:challenges:v1',JSON.stringify({runs:{'past-the-wreck':old},stars:Object.fromEntries(model.CHALLENGES.slice(0,24).map(d=>[d.id,true])),updatedAt:Date.now()})),old);
 await page.reload();await page.getByRole('button',{name:'Challenges',exact:true}).click();await modules();
 const go=async(n)=>{await page.getByRole('button',{name:new RegExp(`^Level ${n}, (playable|completed)$`)}).click();
  if(n===11)assert.match(await page.getByRole('dialog').innerText(),/Shopping visits earn \$100/);
  await page.getByRole('button',{name:/^(Play|Continue) level/}).click();await page.locator('canvas').waitFor();await page.waitForTimeout(150);
 };
 for(const n of [10,11,14,19,25]){
  await go(n);assert.equal(await page.evaluate(()=>state.store.get().tool),null);
  if(n===10){
   await page.getByRole('button',{name:/^4-lane road/}).click();
   await page.evaluate(()=>commands.cityCommand({type:'focus',point:{x:9,y:10}}));await page.waitForTimeout(100);
   const b=await page.locator('.city-map-viewport').boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
   assert.ok(await page.evaluate(()=>cs.getChallengeRun().city.wideRoads.some(s=>s.x===9&&s.y===10)));
   await page.getByRole('button',{name:'Inspect',exact:true}).click();
  }
  if(n===19){
   const migrated=await page.evaluate(()=>JSON.parse(localStorage.getItem('working-on-it:challenges:v1')));
   assert.equal(migrated.runs['past-the-wreck'].revision,4);assert.deepEqual(migrated.archivedRuns['past-the-wreck'].city,old.city);assert.equal(migrated.stars['past-the-wreck'],true);
   await page.getByRole('button',{name:'Show Divert approach',exact:true}).click();
   await page.getByRole('button',{name:/^Divert/}).click();await page.waitForTimeout(100);
   const b=await page.locator('.city-map-viewport').boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
   assert.ok(await page.evaluate(()=>cs.getChallengeRun().city.closures.some(p=>p.x===8&&p.y===10)));
   await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
   assert.equal(await page.evaluate(()=>cs.getChallengeRun().city.closures.length),0);
   await page.getByRole('button',{name:'Inspect',exact:true}).click();
   await page.getByRole('button',{name:'Run traffic',exact:true}).click();await page.getByRole('button',{name:'Pause traffic',exact:true}).click();
  }
  await page.screenshot({path:`${out}/${name}-level-${n}.png`});
  const observation=await page.evaluate(()=>{solutions.solveCampaign(cs.getChallengeRun());model.stepChallenge(cs.getChallengeRun(),240);cs.flushChallenges();state.store.patch({});return {id:cs.getChallengeRun().id,earned:cs.getChallengeRun().earned,stages:model.challengeStages(cs.getChallengeRun())};});
  assert.ok(observation.earned,JSON.stringify(observation));
  await page.getByRole('heading',{name:'Nice work!',exact:true}).waitFor();
  if(n===25){assert.equal(await page.getByRole('dialog').getByRole('button',{name:/^Next/}).count(),0);assert.ok(await page.evaluate(()=>cs.hasJamSongReward()));await page.screenshot({path:`${out}/${name}-finale-complete.png`});}
  await page.screenshot({path:`${out}/${name}-level-${n}-complete.png`});
  console.log(name,n,'completed');
  await page.getByRole('button',{name:'Level map',exact:true}).click();
 }
 // Complete-route rendering and persistent reward are checked in isolated storage.
 await page.evaluate(()=>{const raw=JSON.parse(localStorage.getItem('working-on-it:challenges:v1'));for(const d of model.CHALLENGES)raw.stars[d.id]=true;raw.updatedAt=Date.now();localStorage.setItem('working-on-it:challenges:v1',JSON.stringify(raw));});
 await page.reload();await page.getByRole('button',{name:'Challenges',exact:true}).click();await modules();
 assert.equal(await page.getByRole('button',{name:/^Level \d+, completed$/}).count(),25);
 assert.ok(await page.evaluate(()=>cs.hasJamSongReward()));
 assert.equal(await page.evaluate(()=>localStorage.getItem('city-workshop:city:v1')),sandbox);
 assert.deepEqual(errors,[]);await page.screenshot({path:`${out}/${name}-all-complete.png`});
 results.push({name,sequentialLocks:true,lockedBriefing:true,stateSelectionGuard:true,realWinUnlocksNext:true,retryAndReloadKeepUnlock:true,wideRoadPointerPlacement:true,divertPointerToggle:true,incomeCopy:true,oldRescueArchived:true,allAddedLevelsComplete:true,finaleRewardPersistent:true,allCompleteRoute:true,sandboxUnchanged:true,errors});
 await context.close();
}await fs.writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(results);
}finally{await browser.close();}
