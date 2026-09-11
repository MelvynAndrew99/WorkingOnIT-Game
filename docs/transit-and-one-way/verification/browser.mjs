import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {chromium} from '/home/phil/.npm/_npx/c828ed9cb5b1a5eb/node_modules/playwright/index.mjs';
import {createCity,place} from '/home/phil/Code/jams/AI-Overlord/src/game/cityModel.ts';
const out='/tmp/oneway-browser';mkdirSync(out,{recursive:true});
const c=createCity();c.funds=10000;c.tutorial.status='complete';
for(let x=6;x<=14;x++)place(c,'road',x,10);
for(let y=6;y<=14;y++)place(c,'road',10,y);
const raw={city:c,updatedAt:1};const results=[];
const browser=await chromium.launch({headless:true,executablePath:'/nix/store/50ayz35y5c2ham6qsfwn1yaxznhijykl-chromium-151.0.7922.108/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 await context.addInitScript(raw=>{if(!localStorage.getItem('city-workshop:city:v1'))localStorage.setItem('city-workshop:city:v1',JSON.stringify(raw));},raw);
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:5219');await page.getByRole('button',{name:'Continue commute',exact:true}).click();await page.waitForFunction(async()=> (await import('/src/state/save.ts')).getSave().city.elapsed>.3);await page.waitForTimeout(700);
 const read=()=>page.evaluate(async()=>{const s=(await import('/src/state/store.ts')).store.get(),c=(await import('/src/state/save.ts')).getSave().city;return {directions:c.roadDirections??{},roads:c.roads,selection:s.directionSelection,message:s.message};});
 const tile=async(x,y)=>{await page.evaluate(async p=>(await import('/src/game/cityControls.ts')).cityCommand({type:'focus',point:p}),{x,y});await page.waitForTimeout(160);const b=await page.locator('.city-map-viewport').boundingBox();assert.ok(b.height>80);await page.mouse.click(b.x+b.width/2,b.y+b.height/2);};
 await page.keyboard.press('4');await tile(10,10);assert.ok(!(await read()).roads.some(p=>p.x===10&&p.y===10));
 await page.keyboard.press('3');for(const [x,y]of [[9,9],[11,9],[11,11],[9,11]])await tile(x,y);
 await page.locator('[data-tool=direction]').click();await page.getByRole('group',{name:'Road direction editor'}).waitFor();
 const loop=[[9,9],[10,9],[11,9],[11,10],[11,11],[10,11],[9,11],[9,10],[9,9]];
 for(const [x,y]of loop)await tile(x,y);
 assert.equal((await read()).selection,9);
 await page.evaluate(async()=> (await import('/src/game/cityControls.ts')).cityCommand({type:'focus',point:{x:10,y:10}}));await page.waitForTimeout(150);
 await page.screenshot({path:`${out}/preview-${width}.png`});
 await page.getByRole('button',{name:'Apply one-way',exact:true}).click();assert.equal(Object.keys((await read()).directions).length,8);
 const first=(await read()).directions;await page.screenshot({path:`${out}/applied-${width}.png`});
 // Reverse and restore one selected connection with real clicks.
 for(const [x,y]of loop.slice(0,2))await tile(x,y);await page.getByRole('button',{name:'Reverse',exact:true}).click();
 assert.notDeepEqual((await read()).directions,first);
 for(const [x,y]of loop.slice(0,2))await tile(x,y);await page.getByRole('button',{name:'Two-way',exact:true}).click();assert.equal(Object.keys((await read()).directions).length,7);
 for(const [x,y]of loop.slice(0,2))await tile(x,y);await page.getByRole('button',{name:'Apply one-way',exact:true}).click();assert.deepEqual((await read()).directions,first);
 await tile(9,9);await page.getByRole('button',{name:'Undo tile',exact:true}).click();assert.equal((await read()).selection,0);
 await tile(9,9);await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal((await read()).selection,0);
 await page.getByRole('button',{name:'Zoom out',exact:true}).click();await page.screenshot({path:`${out}/zoom-${width}.png`});
 await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).click();await page.waitForTimeout(600);assert.deepEqual((await read()).directions,first);assert.deepEqual(errors,[]);
 results.push({width,ringBuiltByPointer:true,preview:true,applyReverseRestore:true,undoCancel:true,zoom:true,reload:true,errors});await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:900}}),page=await context.newPage();
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 const corrupt=JSON.stringify({...raw,city:{...c,roadDirections:{'6,10>7,10':'sideways'}}});
 await context.addInitScript(raw=>localStorage.setItem('city-workshop:city:v1',raw),corrupt);await page.goto('http://localhost:5219');await page.getByRole('heading',{name:'Your town needs recovery'}).waitFor();
 await page.evaluate(async()=>{const s=await import('/src/state/save.ts');s.flushSave();s.startNewCity();});
 assert.equal(await page.evaluate(()=>localStorage.getItem('city-workshop:city:v1')),corrupt);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download preserved copies'}).click();const download=await downloadPromise;await download.saveAs(`${out}/preserved-download.json`);
 await page.screenshot({path:`${out}/recovery-390.png`});results.push({corruptDirectionsProtected:true,download:true});await context.close();
}finally{await browser.close();}
writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(results);
