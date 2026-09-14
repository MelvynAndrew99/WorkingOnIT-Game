import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const out='/tmp/intersection-ui-evidence';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const results=[];
async function bind(page){await page.evaluate(async()=>{
  const urls=performance.getEntriesByType('resource').map(e=>e.name);
  window.state=await import(urls.filter(n=>n.includes('/src/state/store.ts')).at(-1));
  window.saved=await import(urls.filter(n=>n.includes('/src/state/save.ts')).at(-1));
  window.cs=await import(urls.filter(n=>n.includes('/src/state/challenges.ts')).at(-1));
  window.commands=await import('/src/game/cityControls.ts');
});}
async function pointClick(page,x,y){
  await page.evaluate(({x,y})=>commands.cityCommand({type:'focus',point:{x,y}}),{x,y});
  const b=await page.locator('.city-map-viewport').boundingBox();
  await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
}
async function checkWarning(page,name){
  const p=page.locator('.intersection-warning');await p.waitFor();
  const banner=await p.boundingBox(),map=await page.locator('.city-map-viewport').boundingBox();
  assert.ok(map.height>=100);assert.ok(banner.y+banner.height<=map.y+1);
  assert.ok(await p.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=17.6));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:`${out}/${name}.png`});
  return {text:await p.innerText(),mapHeight:map.height,bannerHeight:banner.height};
}
try{for(const [name,width,height] of [['desktop',1440,900],['narrow',390,844]]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.goto('http://127.0.0.1:5196');await page.getByRole('button',{name:'Challenges',exact:true}).waitFor();await bind(page);
  const sandbox=await page.evaluate(()=>{saved.flushSave();return localStorage.getItem('city-workshop:city:v1');});
  await page.getByRole('button',{name:'Challenges',exact:true}).click();
  await page.getByRole('button',{name:'Level 3, playable',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:/Play level/}).click();await page.locator('canvas').waitFor();await bind(page);
  await page.waitForTimeout(250);
  for(const [x,y] of [[7,6],[8,6],[9,6],[8,5]])await pointClick(page,x,y);
  assert.equal(await page.evaluate(()=>cs.getChallengeRun().city.funds),100);
  await page.getByRole('button',{name:'Run traffic',exact:true}).click();
  await page.locator('.intersection-warning').waitFor({timeout:20000});
  await page.getByRole('button',{name:'Pause traffic',exact:true}).click();
  const challenge=await checkWarning(page,`${name}-challenge-warning`);
  assert.equal(await page.evaluate(()=>cs.getChallengeRun().city.accidentCount),0);
  await page.evaluate(()=>state.store.patch({tool:'stop',toolSelection:state.store.get().toolSelection+1}));await pointClick(page,8,6);
  assert.equal(await page.evaluate(()=>cs.getChallengeRun().city.controls[0]?.kind),'stop');
  await page.getByRole('button',{name:'Fast forward at 2× speed',exact:true}).click();
  await page.getByRole('button',{name:'Run traffic',exact:true}).click();
  await page.getByRole('heading',{name:'Nice work!',exact:true}).waitFor({timeout:45000});
  assert.equal(await page.evaluate(()=>cs.getChallengeRun().city.accidentCount),0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('city-workshop:city:v1')),sandbox);
  // Sandbox warning uses a real pre-simulated test town in this isolated browser context only.
  await page.evaluate(async()=>{
    const {turningIntersectionTown}=await import('/src/game/fixtures/intersectionTown.ts');
    const {stepCity}=await import('/src/game/cityModel.ts');
    const {incidentSummary}=await import('/src/game/cityIncidents.ts');
    const c=turningIntersectionTown();c.controls[0].preset='ew';
    while(!incidentSummary(c).warning&&c.elapsed<90)stepCity(c,.025);
    saved.getSave().city=c;saved.flushSave();
  });
  await page.reload();await page.getByRole('button',{name:/Continue commute/}).click();
  await page.locator('.intersection-warning').waitFor();
  await page.getByRole('button',{name:'Pause the city',exact:true}).click();await bind(page);
  await page.evaluate(()=>commands.cityCommand({type:'focus',point:{x:16,y:16}}));
  await page.getByRole('button',{name:'Resume game',exact:true}).click();
  const sandboxWarning=await checkWarning(page,`${name}-sandbox-warning`);
  assert.match(sandboxWarning.text,/Conflicting turns/);
  assert.ok(await page.evaluate(()=>state.store.get().diagnostics.intersections.some(j=>j.state==='danger')));
  assert.deepEqual(errors,[]);results.push({name,challenge,sandboxWarning,warningResponseWins:true,sandboxSaveProtected:true});await context.close();
}await fs.writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));}
finally{await browser.close();}
