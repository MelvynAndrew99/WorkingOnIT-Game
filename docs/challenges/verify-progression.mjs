import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const out='/tmp/commute-progression-evidence';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
try{for(const [name,width,height]of [['desktop',1440,900],['narrow',390,844]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<650,isMobile:width<650}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto(process.env.CHALLENGE_URL??'http://127.0.0.1:5195');await page.getByRole('button',{name:'Challenges',exact:true}).click();await page.locator('.journey-node').first().waitFor();
 await page.locator('.commute-art').evaluate(async e=>e.decode());await page.locator('.route-traveller').evaluate(async e=>e.decode());
 await page.evaluate(async()=>{window.cs=await import('/src/state/challenges.ts');window.state=await import('/src/state/store.ts');const save=await import('/src/state/save.ts');save.flushSave();});
 const sandbox=await page.evaluate(()=>localStorage.getItem('city-workshop:city:v1'));
 assert.equal(await page.locator('.journey-node').count(),25);assert.equal(await page.locator('.journey-node[aria-disabled=false]').count(),4);assert.equal(await page.locator('.journey-node[aria-disabled=true]').count(),21);
 assert.equal(await page.locator('.journey-node[aria-current=step]').getAttribute('aria-label'),'Level 1, playable');assert.equal(await page.locator('.route-traveller').count(),1);
 assert.equal(await page.locator('.journey-district').count(),0);assert.equal(await page.locator('.node-star').count(),0);assert.equal(await page.locator('.commute-art').count(),1);
 assert.equal(await page.locator('.journey-screen').innerText().then(s=>s.includes('The first road')),false);
 await page.screenshot({path:`${out}/${name}-start.png`});
 const avatar=await page.locator('.route-traveller').boundingBox();assert.ok(avatar.y>=60&&avatar.y+avatar.height<height-40);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const bounds=await page.locator('.journey-scroll').boundingBox(),before=await page.locator('.journey-scroll').evaluate(e=>({x:e.scrollLeft,y:e.scrollTop}));
 await page.mouse.move(bounds.x+25,bounds.y+25);await page.mouse.down();await page.mouse.move(bounds.x+110,bounds.y+160,{steps:8});await page.mouse.up();
 const after=await page.locator('.journey-scroll').evaluate(e=>({x:e.scrollLeft,y:e.scrollTop}));assert.notDeepEqual(after,before,'drag pans the map');
 await page.getByRole('button',{name:'Find The Man',exact:false}).click();
 if(width<650){const cdp=await context.newCDPSession(page),start=await page.locator('.journey-scroll').evaluate(e=>e.scrollTop);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bounds.x+180,y:bounds.y+180}]});for(let dy=20;dy<=160;dy+=20){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:bounds.x+180,y:bounds.y+180+dy}]});await page.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(200);assert.notEqual(await page.locator('.journey-scroll').evaluate(e=>e.scrollTop),start,'native touch scroll moves city');await page.getByRole('button',{name:'Find The Man',exact:false}).click();}
 await page.getByRole('button',{name:'Coffee corner: hear The Man and the crew',exact:true}).click();assert.ok((await page.getByRole('status').innerText()).includes('Crew:'));await page.screenshot({path:`${out}/${name}-dialogue.png`});

 await page.locator('.journey-node').nth(4).focus();await page.keyboard.press('Enter');assert.equal(await page.locator('dialog[open]').count(),0);assert.ok((await page.getByRole('status').innerText()).includes('Level 5'));
 await page.locator('.journey-node').nth(0).click();await page.getByRole('dialog').waitFor();await page.screenshot({path:`${out}/${name}-brief.png`});
 await page.getByRole('button',{name:'Play level',exact:false}).click();await page.locator('canvas').waitFor();await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>cs.getChallengeRun().id),'first-road');
 await page.evaluate(async()=>{const m=await import('/src/game/cityChallenges.ts'),r=cs.getChallengeRun();for(let x=4;x<=9;x++)m.challengePlace(r.city,'road',x,6,0,r.id);m.stepChallenge(r,10);cs.flushChallenges();state.store.patch({});});
 await page.locator('.result-award').waitFor();await page.getByRole('button',{name:'Level map',exact:true}).click();
 assert.equal(await page.locator('.node-ribbon').count(),1);assert.equal(await page.locator('.is-complete .node-face img').count(),1);assert.equal(await page.locator('.is-complete .node-number').count(),0);assert.equal(await page.locator('.journey-node[aria-current=step]').getAttribute('aria-label'),'Level 2, playable');
 await page.waitForTimeout(1100);await page.screenshot({path:`${out}/${name}-progress.png`});
 await page.reload();await page.getByRole('button',{name:'Challenges',exact:true}).click();assert.equal(await page.locator('.node-ribbon').count(),1);
 // Fixture: existing completion receipts must all remain represented after a UI-only redesign.
 await page.evaluate(async()=>{const m=await import('/src/state/challenges.ts');for(const id of ['neighborhood-roads','safe-crossing','shopping-flow'])m.selectChallenge(id).earned=true;m.flushChallenges();});
 await page.getByRole('button',{name:'Main menu',exact:true}).click();await page.getByRole('button',{name:'Challenges',exact:true}).click();await page.waitForTimeout(2500);
 assert.equal(await page.locator('.node-ribbon').count(),4);assert.equal(await page.locator('.is-complete .node-face img').count(),4);assert.equal(await page.locator('.journey-node[aria-current=step]').getAttribute('aria-label'),'Level 5, coming soon');
 await page.screenshot({path:`${out}/${name}-frontier.png`});
 await page.locator('.journey-node').last().focus();await page.keyboard.press('Enter');assert.equal(await page.locator('dialog[open]').count(),0);await page.screenshot({path:`${out}/${name}-townhall.png`});
 assert.equal(await page.evaluate(()=>localStorage.getItem('city-workshop:city:v1')),sandbox);
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.journey-node').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 assert.deepEqual(errors,[]);console.log(name,'one city,25 sites,4 playable,drag/recenter,portrait+ribbon completion,real result,reload,frontier,upcoming guards,reduced motion and sandbox isolation passed');await context.close();
}}finally{await browser.close();}
