import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
const out=process.env.PUZZLE_EVIDENCE??'/tmp/jam-puzzles';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.addInitScript(()=>{window.gameModule=path=>import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>new URL(n).pathname===path).at(-1)??path);});
 await page.goto(process.env.PUZZLE_URL??'http://127.0.0.1:5295');await page.getByRole('button',{name:/^Missions,/}).click();
 await page.evaluate(async()=>{const m=await window.gameModule('/src/game/cityChallenges.ts');localStorage.setItem('working-on-it:challenges:v1',JSON.stringify({runs:{},stars:Object.fromEntries(m.CHALLENGES.slice(0,24).map(d=>[d.id,true])),updatedAt:1}));});
 await page.reload();await page.getByRole('button',{name:/^Missions,/}).click();
 for(let level=20;level<=25;level++){
  await page.getByRole('button',{name:new RegExp(`^Level ${level}, (playable|completed)$`)}).click();
  await page.getByRole('button',{name:/^(Play|Continue) level/}).click();await page.locator('canvas').waitFor();await page.waitForTimeout(200);
  assert.match(await page.locator('.challenge-current').innerText(),/^Goal:/);
  assert.doesNotMatch(await page.locator('.challenge-current').innerText(),/Select|Place |Build |Divert|two-way|\(\d+,/);
  if(level>=24){assert.equal(await page.getByRole('button',{name:'Show crash',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Show fire',exact:true}).count(),1);}
  const bounds=await page.locator('.city-map-viewport').boundingBox();assert.ok(bounds.height>=100);
  const visible=await page.locator('.challenge-current').evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom;});assert.ok(visible,'the current goal fits the objective panel');
  await page.screenshot({path:`${out}/${width}-level-${level}.png`});
  const result=await page.evaluate(async alternative=>{const c=await window.gameModule('/src/state/challenges.ts'),m=await window.gameModule('/src/game/cityChallenges.ts'),s=await window.gameModule('/src/game/fixtures/emergencySolutions.ts');const r=c.getChallengeRun();s.solveEmergency(r,alternative);m.stepChallenge(r,240);c.flushChallenges();(await window.gameModule('/src/state/store.ts')).store.patch({});return {earned:r.earned,stages:m.challengeStages(r),funds:r.city.funds};},width===390);
  assert.ok(result.earned);assert.ok(result.stages.every(s=>s.done));
  await page.getByRole('heading',{name:'Nice work!',exact:true}).waitFor();
  await page.screenshot({path:`${out}/${width}-level-${level}-complete.png`});
  assert.deepEqual(errors,[]);results.push({width,level,...result,errors:[]});console.log(width,level,'pass');
  await page.getByRole('button',{name:'Level map',exact:true}).click();
 }
 await context.close();
}writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));}finally{await browser.close();}
