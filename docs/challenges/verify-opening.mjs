import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const out='/tmp/challenges-opening-evidence';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const results=[];
try{for(const [name,width,height] of [['desktop',1440,900],['narrow',390,844]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('http://127.0.0.1:5192');await page.getByRole('button',{name:'Challenges',exact:true}).waitFor();
 await page.evaluate(async()=>{const urls=performance.getEntriesByType('resource').map(e=>e.name);const save=await import(urls.filter(n=>n.includes('/src/state/save.ts')).at(-1));save.flushSave();
 const challenges=await import(urls.filter(n=>n.includes('/src/state/challenges.ts')).at(-1));const {createChallenge}=await import('/src/game/cityChallenges.ts');
 const old=createChallenge();delete old.id;old.earned=true;old.city.funds=2345;
 localStorage.setItem('working-on-it:challenges:v1',JSON.stringify({run:old,star:true,updatedAt:Date.now()}));await challenges.loadChallenges();});
 const sandbox=await page.evaluate(()=>localStorage.getItem('city-workshop:city:v1'));
 const gold=await page.locator('.title-navigation .commute-button').evaluateAll(es=>es.map(e=>({background:getComputedStyle(e).backgroundImage,height:e.getBoundingClientRect().height})));
 assert.equal(gold.length,2);assert.equal(gold[0].background,gold[1].background);assert.ok(gold.every(e=>e.height>=44));
 await page.screenshot({path:`${out}/${name}-menu.png`});
 await page.getByRole('button',{name:'Challenges',exact:true}).click();
 assert.deepEqual(await page.locator('article h2').allTextContents(),['The first road ','Roads for the neighborhood ','Room to move ★']);
 await page.screenshot({path:`${out}/${name}-levels.png`});
 async function bind(){await page.evaluate(async()=>{const urls=performance.getEntriesByType('resource').map(e=>e.name);window.cs=await import(urls.filter(n=>n.includes('/src/state/challenges.ts')).at(-1));window.state=await import(urls.filter(n=>n.includes('/src/state/store.ts')).at(-1));window.model=await import('/src/game/cityChallenges.ts');window.commands=await import('/src/game/cityControls.ts');});}
 for(const [title,id,lo,hi,budget] of [['The first road','first-road',4,9,140],['Roads for the neighborhood','neighborhood-roads',2,11,240]]){
  await page.getByRole('article',{name:title,exact:true}).getByRole('button',{name:'Play challenge',exact:true}).click();await page.locator('canvas').waitFor();await bind();await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>cs.getChallengeRun().id),id);
  assert.equal(await page.evaluate(()=>state.store.get().paused),true);
  const map=await page.locator('.city-map-viewport').boundingBox();assert.ok(map.height>=100);
  await page.screenshot({path:`${out}/${name}-${id}.png`});
  for(let x=lo;x<=hi;x++){await page.evaluate(x=>commands.cityCommand({type:'focus',point:{x,y:6}}),x);const m=await page.locator('.city-map-viewport').boundingBox();await page.mouse.click(m.x+m.width/2,m.y+m.height/2);}
  assert.equal(await page.evaluate(()=>cs.getChallengeRun().city.funds),budget-(hi-lo+1)*20);
  await page.getByRole('button',{name:'Run traffic',exact:true}).click();await page.waitForTimeout(600);await page.getByRole('button',{name:'Pause',exact:true}).click();
  await page.evaluate(()=>{model.stepChallenge(cs.getChallengeRun(),120);cs.flushChallenges();state.store.patch({});});
  assert.equal(await page.evaluate(()=>cs.getChallengeRun().city.funds),budget-(hi-lo+1)*20);
  await page.getByText('★ Challenge solved. Keep experimenting!',{exact:true}).waitFor();
  // Direct exit from play, and re-entry without losing this level's progress.
  await page.getByRole('button',{name:'Main menu',exact:true}).click();await page.getByRole('button',{name:'Challenges',exact:true}).click();
  await page.getByRole('article',{name:title,exact:true}).getByLabel('One star earned').waitFor();
 }
 await page.reload();await page.getByRole('button',{name:'Challenges',exact:true}).click();
 assert.equal(await page.getByLabel('One star earned').count(),3);
 await page.getByRole('article',{name:'Room to move',exact:true}).getByRole('button',{name:'Continue challenge',exact:true}).click();await page.locator('canvas').waitFor();await bind();
 assert.equal(await page.evaluate(()=>cs.getChallengeRun().city.funds),2345);assert.equal(await page.evaluate(()=>cs.getChallengeRun().earned),true);
 await page.getByRole('button',{name:'Levels',exact:true}).click();await page.getByRole('button',{name:'Main menu',exact:true}).click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('city-workshop:city:v1')),sandbox);assert.deepEqual(errors,[]);
 results.push({name,gold,threeIndependentStars:true,legacyFlowPreserved:true,noIncome:true,directExit:true,sandboxUnchanged:true});await context.close();
}await fs.writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(results);}finally{await browser.close();}
