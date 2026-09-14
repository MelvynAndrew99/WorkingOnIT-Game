import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const {chromium}=await import('/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const original=JSON.parse(readFileSync(new URL('../../emergency-recovery/bottom-right-jam/original-save.json',import.meta.url),'utf8'));
const out=fileURLToPath(new URL('.',import.meta.url));
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(save=>{if(!localStorage.getItem('city-workshop:city:v1'))localStorage.setItem('city-workshop:city:v1',JSON.stringify(save));},original);
  await page.goto('http://localhost:5187');
  await page.getByRole('button',{name:'Continue commute',exact:true}).click();
  await page.getByRole('button',{name:'Show city connection',exact:true}).click();
  const data=await page.evaluate(async()=>{const {getSave}=await import('/src/state/save.ts');return getSave().city;});
  assert.deepEqual(data.external.gateway,{x:39,y:10});assert.deepEqual(data.roads,original.city.roads);
  assert.ok(await page.getByText('Build a road to the CITY marker at the edge.',{exact:true}).isVisible());
  await page.screenshot({path:`${out}connection-${width}.png`});
  await page.getByRole('button',{name:'Add land at a map edge',exact:true}).click();
  assert.ok(await page.getByRole('button',{name:'Expand east',exact:true}).isDisabled());
  const dialog=page.getByRole('dialog',{name:'Room to grow',exact:true});
  assert.match(await dialog.innerText(),/outside city connects on the east edge/);
  assert.ok(await dialog.getByRole('button',{name:/^Add land/}).isDisabled());
  await page.getByRole('button',{name:'Expand south',exact:true}).click();
  assert.ok(await dialog.getByRole('button',{name:/^Add land/}).isEnabled());
  await page.screenshot({path:`${out}expansion-${width}.png`});
  await dialog.getByRole('button',{name:/^Add land/}).click();
  await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).click();
  const after=await page.evaluate(async()=>{const {getSave}=await import('/src/state/save.ts');return getSave().city;});
  assert.equal(after.map.height,original.city.map.height+8);assert.deepEqual(after.external.gateway,{x:39,y:10});
  assert.ok(await page.getByRole('button',{name:'Show city connection',exact:true}).isVisible());
  assert.deepEqual(errors,[]);console.log(`PASS ${width}: relocated marker, visible connection prompt, fixed east, actual south expansion, reload`);
  await context.close();
 }
}finally{await browser.close();}
