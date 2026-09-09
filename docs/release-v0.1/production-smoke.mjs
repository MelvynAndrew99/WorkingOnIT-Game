import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {chromium}=await import('/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const out=fileURLToPath(new URL('.',import.meta.url));
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.CITY_URL||'http://localhost:5182');
  await page.getByRole('button',{name:'Start your city',exact:true}).click();
  await page.getByRole('button',{name:'Pause the city',exact:true}).click();
  await page.locator('.tutorial-locator[data-guide-tool=home]').waitFor();
  await page.locator('.build-tool[data-tool=home]').click();
  await page.waitForTimeout(300);
  const p=await page.evaluate(()=>{const rect=s=>document.querySelector(s)?.getBoundingClientRect();const f=rect('#app-frame'),h=rect('.city-header'),foot=rect('.city-controls'),l=rect('.city-rail-left'),r=rect('.city-rail-right'),scale=Math.min(f.width/720,1);const left=14*scale+(l?.width?l.width+8:0),right=14*scale+(r?.width?r.width+8:0);return {x:f.x+left+(f.width-left-right)/2,y:(h.bottom+foot.top)/2};});
  await page.mouse.click(p.x,p.y);
  await page.locator('.tutorial-locator[data-guide-tool=store]').waitFor();
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('city-workshop:city:v1')).city);
  assert.equal(before.buildings.length,1);assert.equal(before.buildings[0].kind,'home');
  await page.screenshot({path:`${out}production-${width}.png`});
  await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).waitFor();
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('city-workshop:city:v1')).city);
  assert.deepEqual(after,before);assert.deepEqual(errors,[]);
  console.log(`PASS production ${width}: actual built assets boot, tutorial guide, Home placement and saved reload`);
  await context.close();
 }
}finally{await browser.close();}
