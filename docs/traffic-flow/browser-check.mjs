import assert from 'node:assert/strict';
const {chromium}=await import(process.env.CITY_PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CITY_CHROMIUM_PATH || undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  for(const size of [{width:390,height:844},{width:320,height:640},{width:1440,height:900}]) {
    const context=await browser.newContext({viewport:size,hasTouch:true});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.CITY_URL || 'http://localhost:5174');
    await page.getByRole('button',{name:'Start your city',exact:true}).waitFor();
    await page.evaluate(async()=>{
      const {createCity,place}=await import('/src/game/cityModel.ts');
      const c=createCity();
      place(c,'home',2,4);place(c,'home',6,1);place(c,'store',10,7,2);
      for(let x=2;x<=13;x++)place(c,'road',x,6);
      for(let y=3;y<=9;y++)place(c,'road',7,y);
      place(c,'road',6,3);
      localStorage.setItem('city-workshop:city:v1',JSON.stringify({city:c,updatedAt:Date.now()+1000}));
    });
    await page.reload();await page.getByRole('button',{name:'Continue commute',exact:true}).click();
    await page.getByRole('button',{name:'Pause',exact:false}).click();await page.waitForTimeout(300);
    const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('city-workshop:city:v1')).city);
    async function tapJunction(x=7,y=6) {
      const p=await page.evaluate(({x,y})=>{
        const f=document.querySelector('#app-frame').getBoundingClientRect();
        const h=document.querySelector('.city-header').getBoundingClientRect();
        const b=document.querySelector('.city-controls').getBoundingClientRect();
        const scale=f.width/720,top=h.bottom+28,bottom=b.top-8;
        return {x:f.left+f.width/2+(x+.5-7)*48*scale,y:(top+bottom)/2+(y+.5-5)*48*scale,height:bottom-top};
      },{x,y});
      assert.ok(p.height>100,`usable map at ${size.width}`);
      await page.touchscreen.tap(p.x,p.y);
    }
    await page.getByRole('button',{name:'All-way stop',exact:true}).click();await tapJunction();
    assert.equal((await saved()).controls[0]?.kind,'stop');
    await page.getByRole('button',{name:'Traffic lights',exact:true}).click();await tapJunction();
    assert.equal((await saved()).controls[0]?.preset,'balanced');
    await tapJunction();assert.equal((await saved()).controls[0]?.preset,'ns');
    await tapJunction();assert.equal((await saved()).controls[0]?.preset,'ew');
    // Join another junction tile: its approaches must share this controller.
    await page.getByRole('button',{name:'Road $20',exact:true}).click();await tapJunction(8,5);
    await page.getByRole('button',{name:'Traffic lights',exact:true}).click();await tapJunction(8,6);
    assert.equal((await saved()).controls.length,1);assert.equal((await saved()).controls[0].preset,'balanced');
    const before=await saved();
    await page.screenshot({path:`/tmp/traffic-flow-${size.width}.png`});
    await page.getByRole('button',{name:'Menu',exact:true}).click();await page.reload();
    await page.getByRole('button',{name:'Continue commute',exact:true}).click();
    await page.getByRole('button',{name:'Pause',exact:false}).click();
    assert.deepEqual((await saved()).controls,before.controls);
    await page.getByRole('button',{name:'Remove 100%',exact:true}).click();await tapJunction(8,6);
    assert.equal((await saved()).controls.length,0);assert.equal((await saved()).roads.length,before.roads.length);
    await page.getByRole('button',{name:'Resume',exact:false}).click();await page.waitForTimeout(4500);
    assert.ok((await saved()).elapsed>before.elapsed);await page.getByLabel('Traffic performance').waitFor();
    assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS: phone/desktop touch controls, timing cycle, paused rendering, persistence, control-only removal, live simulation, usable map and no page errors.');
} finally {await browser.close();}
