import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CITY_PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CITY_CHROMIUM_PATH || undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.CITY_URL || 'http://localhost:5174');await page.getByRole('button',{name:'Start your city'}).click();await page.locator('canvas').waitFor();await page.waitForTimeout(800);await page.getByRole('button',{name:'Pause',exact:false}).click();
const cam={x:8,y:7,zoom:1};
async function view(){return page.evaluate(()=>{const f=document.querySelector('#app-frame').getBoundingClientRect(),h=document.querySelector('.city-header').getBoundingClientRect(),b=document.querySelector('.city-controls').getBoundingClientRect();return {x:f.x+14*f.width/720,y:h.bottom+28,width:f.width-28*f.width/720,height:b.top-8-h.bottom-28,scale:f.width/720};});}
async function xy(x,y){const v=await view();return{x:v.x+v.width/2+(x+.5-cam.x)*48*cam.zoom*v.scale,y:v.y+v.height/2+(y+.5-cam.y)*48*cam.zoom*v.scale};}
async function tile(x,y){const p=await xy(x,y);await page.touchscreen.tap(p.x,p.y);}
async function saved(){return page.evaluate(()=>JSON.parse(localStorage.getItem('city-workshop:city:v1')).city);}
async function expand(side){await page.getByRole('button',{name:'Expand',exact:true}).click();await page.getByRole('button',{name:side,exact:true}).click();await page.getByRole('button',{name:'Add land',exact:true}).click();}
await tile(6,5);assert.equal((await saved()).buildings.length,1);
await page.getByRole('button',{name:'Store $400'}).click();await tile(10,5);assert.equal((await saved()).buildings.length,2);
await page.getByRole('button',{name:'Road $20'}).click();
for(let x=6;x<=11;x++)await tile(x,7);await page.getByText('1/1 homes connected',{exact:true}).waitFor();
const before=await saved();
await page.getByRole('button',{name:'Expand',exact:true}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.deepEqual((await saved()).map,before.map);
for(const side of ['North','West','East','South'])await expand(side);
assert.deepEqual((await saved()).map,{x:-8,y:-8,width:32,height:30});assert.deepEqual((await saved()).buildings,before.buildings);assert.deepEqual((await saved()).roads,before.roads);assert.equal((await saved()).funds,before.funds);
// Retaining the camera means the same screen tile still places at the same world coordinate.
await tile(8,8);assert.ok((await saved()).roads.some(p=>p.x===8&&p.y===8));
await page.getByRole('button',{name:'Pan',exact:true}).click();
const v=await view();const a={x:v.x+v.width/2,y:v.y+v.height/2};
const snapshot=JSON.stringify(await saved());
await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(a.x+160,a.y+60,{steps:10});await page.mouse.up();cam.x-=160/(48*v.scale);cam.y-=60/(48*v.scale);
assert.equal(JSON.stringify(await saved()),snapshot);
// Continue panning into newly available west/north land.
await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(a.x+100,a.y+100,{steps:10});await page.mouse.up();cam.x-=100/(48*v.scale);cam.y-=100/(48*v.scale);
await page.getByRole('button',{name:'Home $200'}).click();await tile(-3,0);assert.ok((await saved()).buildings.some(b=>b.x===-3&&b.y===0));
await page.getByRole('button',{name:'Zoom in',exact:true}).click();cam.zoom*=1.25;
await page.getByRole('button',{name:'Road $20'}).click();await tile(-3,2);assert.ok((await saved()).roads.some(p=>p.x===-3&&p.y===2));
const prePinch=JSON.stringify(await saved());
const cdp=await page.context().newCDPSession(page);const vv=await view();const cx=vv.x+vv.width/2,cy=vv.y+vv.height/2;
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-25,y:cy,id:1},{x:cx+25,y:cy,id:2}]});
await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-50,y:cy,id:1},{x:cx+50,y:cy,id:2}]});
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(JSON.stringify(await saved()),prePinch);
await page.getByRole('button',{name:'Town',exact:true}).click();await page.screenshot({path:'/tmp/expanded-phone.png'});
await page.getByRole('button',{name:'Menu',exact:true}).click();const persisted=await saved();await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).click();await page.waitForTimeout(600);await page.getByRole('button',{name:'Pause',exact:false}).click();await page.getByRole('button',{name:'Menu',exact:true}).click();
assert.deepEqual((await saved()).map,persisted.map);assert.deepEqual((await saved()).buildings,persisted.buildings);assert.deepEqual((await saved()).roads,persisted.roads);
await page.getByRole('button',{name:'Continue commute',exact:true}).click();await page.waitForTimeout(400);await page.getByRole('button',{name:'Pause',exact:false}).click();
for(const size of [{width:320,height:640},{width:1440,height:900}]){await page.setViewportSize(size);await page.waitForTimeout(200);assert.ok((await view()).height>100);await page.getByRole('button',{name:'Expand',exact:true}).click();await page.screenshot({path:`/tmp/expansion-${size.width}.png`});await page.getByRole('button',{name:'Cancel',exact:true}).click();}
assert.deepEqual(errors,[]);console.log('PASS: all-edge expansion, cancel, preserved positions/funds/camera, negative land building, zoom hit tests, pan/pinch no construction, saved expanded town reload, phone/desktop layouts, no page errors.');await browser.close();
