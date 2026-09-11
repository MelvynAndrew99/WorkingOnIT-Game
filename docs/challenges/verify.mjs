import {PNG} from 'pngjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const out=process.env.UI_EVIDENCE_DIR??'/tmp/challenges-evidence';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const results=[];
try {for(const [name,width,height] of [['desktop',1440,900],['narrow',390,844]]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('http://127.0.0.1:5192');
 await page.getByRole('button',{name:'Challenges',exact:true}).waitFor();
 await page.screenshot({path:`${out}/${name}-menu.png`});
 await page.evaluate(async()=>{
  const urls=performance.getEntriesByType('resource').map(e=>e.name);
  const save=await import(urls.filter(n=>n.includes('/src/state/save.ts')).at(-1));
  const {flowTown}=await import('/src/game/fixtures/flowTown.ts');
  const city=flowTown('retimed');city.funds=789;city.missions.claimed=['open-for-business'];
  save.getSave().city=city;save.flushSave();
 });
 const sandbox=await page.evaluate(()=>localStorage.getItem('city-workshop:city:v1'));
 await page.getByRole('button',{name:'Challenges',exact:true}).click();
 await page.getByRole('article',{name:'Room to move',exact:true}).getByRole('button',{name:'Play challenge',exact:true}).waitFor();
 await page.screenshot({path:`${out}/${name}-levels.png`});
 await page.getByRole('article',{name:'Room to move',exact:true}).getByRole('button',{name:'Play challenge',exact:true}).click();
 await page.locator('canvas').waitFor();await page.waitForTimeout(1000);
 async function bind(){await page.evaluate(async()=>{
  const urls=performance.getEntriesByType('resource').map(e=>e.name);
  window.challenges=await import(urls.filter(n=>n.includes('/src/state/challenges.ts')).at(-1));
  window.state=await import(urls.filter(n=>n.includes('/src/state/store.ts')).at(-1));
  window.commands=await import('/src/game/cityControls.ts');window.challengeModel=await import('/src/game/cityChallenges.ts');
 });}await bind();
 assert.equal(await page.evaluate(()=>state.store.get().paused),true);
 const before=await page.evaluate(()=>JSON.stringify(challenges.getChallengeRun()));
 await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>JSON.stringify(challenges.getChallengeRun())),before);
 await page.screenshot({path:`${out}/${name}-puzzle.png`});
 const map=await page.locator('.city-map-viewport').boundingBox();assert.ok(map.height>=100,JSON.stringify(map));
 // A real Lights tool and map click selects the EW preset; no hidden solution command.
 await page.getByRole('button',{name:'Lights',exact:false}).click();
 await page.evaluate(()=>commands.cityCommand({type:'focus',point:{x:8,y:6}}));
 const target=await page.locator('.city-map-viewport').boundingBox();await page.mouse.click(target.x+target.width/2,target.y+target.height/2);
 assert.equal(await page.evaluate(()=>challenges.getChallengeRun().city.controls.find(c=>c.x===8&&c.y===6)?.preset),'ew');
 // Scene command guards also protect challenge demand, land and consent.
 const guarded=await page.evaluate(()=>JSON.stringify({map:challenges.getChallengeRun().city.map,external:challenges.getChallengeRun().city.external}));
 await page.evaluate(()=>{commands.cityCommand({type:'expand',direction:'east'});commands.cityCommand({type:'finish-tutorial'});});
 assert.equal(await page.evaluate(()=>JSON.stringify({map:challenges.getChallengeRun().city.map,external:challenges.getChallengeRun().city.external})),guarded);
 await page.getByRole('button',{name:'Run traffic',exact:true}).click();await page.waitForTimeout(800);await page.getByRole('button',{name:'Pause',exact:true}).click();
 assert.ok(await page.evaluate(()=>challenges.getChallengeRun().city.elapsed>120));
 await page.evaluate(()=>{challengeModel.stepChallenge(challenges.getChallengeRun(),180);challenges.flushChallenges();state.store.patch({});});
 await page.getByText('★ Challenge solved. Keep experimenting!',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Rules & details',exact:true}).click();
 await page.waitForTimeout(500);
 const expandedMap=await page.locator('.city-map-viewport').boundingBox();
 assert.ok(Math.abs(expandedMap.height-map.height)<1,'Details must preserve the map area');
 const pixels=PNG.sync.read(await page.screenshot({path:`${out}/${name}-solved.png`}));
 const colors=new Set();
 for(let y=Math.ceil(expandedMap.y)+5;y<expandedMap.y+expandedMap.height-5;y+=3)
  for(let x=Math.ceil(expandedMap.x)+5;x<expandedMap.x+expandedMap.width-5;x+=3){const i=(y*pixels.width+x)*4;colors.add(`${pixels.data[i]},${pixels.data[i+1]},${pixels.data[i+2]}`);}
 assert.ok(colors.size>50,'Paused map must visibly render after opening details');
 await page.getByRole('button',{name:'Levels',exact:true}).click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('city-workshop:city:v1')),sandbox);
 await page.reload();await page.getByRole('button',{name:'Challenges',exact:true}).click();
 await page.getByLabel('One star earned',{exact:true}).waitFor();
 await page.getByRole('article',{name:'Room to move',exact:true}).getByRole('button',{name:'Continue challenge',exact:true}).click();await page.locator('canvas').waitFor();await bind();
 await page.getByText('★ Challenge solved. Keep experimenting!',{exact:true}).waitFor();
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Retry',exact:true}).click();
 await page.waitForTimeout(800);
 assert.equal(await page.evaluate(()=>challenges.getChallengeRun().earned),false);
 assert.equal(await page.evaluate(()=>challenges.challengeHasStar()),true);
 assert.ok(Math.abs(await page.evaluate(()=>challenges.getChallengeRun().city.elapsed)-120)<.001);
 await page.getByRole('button',{name:'Levels',exact:true}).click();await page.getByRole('button',{name:'Main menu',exact:true}).click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('city-workshop:city:v1')),sandbox);
 await page.getByRole('button',{name:/Start your city|Continue commute/}).click();await page.locator('canvas').waitFor();
 await page.waitForTimeout(500);
 const loaded=await page.evaluate(async()=>{const urls=performance.getEntriesByType('resource').map(e=>e.name);const save=await import(urls.filter(n=>n.includes('/src/state/save.ts')).at(-1));return save.getSave().city;});
 assert.deepEqual(loaded.buildings,JSON.parse(sandbox).city.buildings);assert.deepEqual(loaded.roads,JSON.parse(sandbox).city.roads);
 assert.deepEqual(errors,[]);results.push({name,map,sandboxUnchanged:true,starSurvivesReloadAndRetry:true,actualLightClick:true,errors});await context.close();
}await fs.writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(results);
}finally{await browser.close();}
