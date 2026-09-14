import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
const out=process.env.MISSION21_EVIDENCE??'/tmp/mission21-evidence';mkdirSync(out,{recursive:true});
const old=JSON.parse(readFileSync(new URL('../levels-15-24/evidence/temporary-two-way.json',import.meta.url),'utf8'));
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.addInitScript(()=>{window.gameModule=path=>import(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>new URL(n).pathname===path).at(-1)??path);});
 await page.goto(process.env.MISSION21_URL??'http://127.0.0.1:5295');await page.getByRole('button',{name:/^Missions,/}).click();
 await page.evaluate(async({old,width})=>{const m=await window.gameModule('/src/game/cityChallenges.ts');localStorage.setItem('working-on-it:challenges:v1',JSON.stringify({runs:width===390?{'temporary-two-way':old}:{},stars:Object.fromEntries(m.CHALLENGES.slice(0,width===390?21:20).map(d=>[d.id,true])),updatedAt:1}));},{old,width});
 await page.reload();
 const enter=async()=>{await page.getByRole('button',{name:/^Missions,/}).click();await page.getByRole('button',{name:/^Level 21, (playable|completed)$/}).click();await page.getByRole('button',{name:/^(Play|Continue) level/}).click();await page.locator('canvas').waitFor();};
 await enter();await page.waitForTimeout(500);
 const snapshot=()=>page.evaluate(async()=>structuredClone((await window.gameModule('/src/state/challenges.ts')).getChallengeRun()));
 assert.equal((await snapshot()).revision,4);
 if(width===390){const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('working-on-it:challenges:v1')));assert.equal(saved.archivedRuns['temporary-two-way'].revision,3);assert.equal(saved.stars['temporary-two-way'],true);assert.deepEqual(saved.archivedRuns['temporary-two-way'].emergency,old.emergency);}
 assert.match(await page.locator('.challenge-current').innerText(),/Police have a legal route/);
 assert.equal(await page.getByRole('button',{name:'Show Divert approach',exact:true}).count(),0);
 await page.getByRole('button',{name:'Show one-way',exact:true}).click();
 await page.screenshot({path:`${out}/before-${width}.png`});
 await page.locator('[data-tool="direction"]').click();
 await page.getByRole('checkbox',{name:'Restore two-way',exact:true}).check();
 for(let x=14;x<=18;x++){
  await page.evaluate(async point=>(await window.gameModule('/src/game/cityControls.ts')).cityCommand({type:'focus',point}),{x,y:8});
  await page.waitForTimeout(150);const b=await page.locator('.city-map-viewport').boundingBox();assert.ok(b.height>60);await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
 }
 await page.getByRole('button',{name:'Finish',exact:true}).click();
 assert.equal(Object.keys((await snapshot()).city.roadDirections??{}).length,0);
 await page.getByRole('button',{name:'Inspect',exact:true}).click();
 assert.match(await page.locator('.challenge-current').innerText(),/Police have cleared/);
 await page.screenshot({path:`${out}/connected-${width}.png`});
 await page.reload();await enter();assert.equal(Object.keys((await snapshot()).city.roadDirections??{}).length,0);
 await page.getByRole('button',{name:'Run traffic',exact:true}).click();await page.getByRole('button',{name:'Pause traffic',exact:true}).click();
 await page.evaluate(async()=>{const c=await window.gameModule('/src/state/challenges.ts'),m=await window.gameModule('/src/game/cityChallenges.ts');m.stepChallenge(c.getChallengeRun(),180);c.flushChallenges();(await window.gameModule('/src/state/store.ts')).store.patch({});});
 await page.getByRole('heading',{name:'Nice work!',exact:true}).waitFor();
 const won=await snapshot();assert.ok(won.earned);assert.equal(won.emergency.restored,undefined);assert.equal(won.city.closures.length,0);
 assert.ok(await page.evaluate(async()=>(await window.gameModule('/src/state/challenges.ts')).challengeUnlocked('paired-response')));
 await page.screenshot({path:`${out}/complete-${width}.png`});assert.deepEqual(errors,[]);
 results.push({width,oldAttemptArchived:width===390,earnedAwardPreserved:width===390,actualTwoWayPointerEdit:true,reload:true,realRescueAndRecovery:true,winUnlocks22:true,errors});await context.close();
}writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(results);}finally{await browser.close();}
