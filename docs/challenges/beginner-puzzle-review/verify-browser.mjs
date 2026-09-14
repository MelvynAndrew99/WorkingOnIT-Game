import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
const out=process.env.BEGINNER_EVIDENCE??'/tmp/beginner-puzzles';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.addInitScript(()=>{window.gameModule=path=>import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>new URL(n).pathname===path).at(-1)??path);});
 await page.goto(process.env.BEGINNER_URL??'http://127.0.0.1:5295');await page.getByRole('button',{name:/^Missions,/}).click();
 const sandbox=await page.evaluate(()=>localStorage.getItem('city-workshop:city:v1'));
 for(let level=1;level<=10;level++){
  await page.getByRole('button',{name:`Level ${level}, playable`,exact:true}).click();
  await page.getByRole('button',{name:/^(Play|Continue) level/}).click();await page.locator('canvas').waitFor();await page.waitForTimeout(150);
  if(level!==7){assert.match(await page.locator('.challenge-current').innerText(),/^Goal:/);const fits=await page.locator('.challenge-current').evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom;});assert.ok(fits);}
  assert.ok((await page.locator('.city-map-viewport').boundingBox()).height>=100);
  if(level===2)assert.match(await page.locator('.challenge-counts').innerText(),/45.0s left/);
  if(level===7)assert.match(await page.locator('.challenge-objective').innerText(),/15 seconds/);
  await page.screenshot({path:`${out}/${width}-level-${level}.png`});
  if(level===1){
   await page.locator('[data-tool="road"]').click();
   for(let x=4;x<=9;x++){
    await page.evaluate(async point=>(await window.gameModule('/src/game/cityControls.ts')).cityCommand({type:'focus',point}),{x,y:6});await page.waitForTimeout(80);
    const b=await page.locator('.city-map-viewport').boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
   }
  }
  const result=await page.evaluate(async({alternative,level})=>{
   const c=await window.gameModule('/src/state/challenges.ts'),m=await window.gameModule('/src/game/cityChallenges.ts'),s=await window.gameModule('/docs/challenges/beginner-puzzle-review/solutions.ts');const r=c.getChallengeRun();
   if(level!==1)s.solveBeginnerPuzzle(r,alternative);m.stepChallenge(r,240);c.flushChallenges();(await window.gameModule('/src/state/store.ts')).store.patch({});
   return {earned:r.earned,stages:m.challengeStages(r),funds:r.city.funds};
  },{alternative:width===390,level});
  assert.ok(result.earned,JSON.stringify(result));await page.getByRole('heading',{name:'Nice work!',exact:true}).waitFor();
  await page.screenshot({path:`${out}/${width}-level-${level}-complete.png`});
  assert.deepEqual(errors,[]);results.push({width,level,...result});console.log(width,level,'pass');
  await page.getByRole('button',{name:'Level map',exact:true}).click();
 }
 await page.reload();await page.getByRole('button',{name:/^Missions,/}).click();
 assert.equal(await page.getByRole('button',{name:/^Level \d+, completed$/}).count(),10);
 assert.equal(await page.getByRole('button',{name:'Level 11, playable',exact:true}).count(),1);
 assert.equal(await page.evaluate(()=>localStorage.getItem('city-workshop:city:v1')),sandbox);
 await context.close();
}writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));}finally{await browser.close();}
