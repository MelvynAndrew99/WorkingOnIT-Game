/** Export reused/composed Kenney frames and a labeled inspection sheet.
 * Run inside nix develop with PLAYWRIGHT_MODULE and CHROMIUM_PATH set.
 * Source packs stay untouched; tools/build-city-atlas.mjs owns composition.
 */
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {FRAMES} from '../../../src/game/cityAtlas.ts';
import {read,blank,write,blit} from '../../../tools/png.mjs';
const root=new URL('./',import.meta.url),output=new URL('kenney/',root);
await fs.mkdir(output,{recursive:true});
const atlas=read(fileURLToPath(new URL('../../../public/images/city/city-atlas.png',root)));
const names=['cone','barrierOrange','barrierWarning','barrierWarningVertical','barrierYellow','workSurface','detourN','detourE','detourS','detourW'];
const cells=[];
for(const name of names){
 const f=FRAMES[name],png=blank(f.w,f.h);blit(png,atlas,f.x,f.y,f.w,f.h,0,0);
 const path=new URL(`${name}.png`,output);write(png,fileURLToPath(path));
 const data=(await fs.readFile(path)).toString('base64');
 cells.push(`<section><img src="data:image/png;base64,${data}"><strong>${name}</strong><small>${name==='workSurface'||name==='barrierWarningVertical'||name.startsWith('detour')?'Composed from Kenney':'Original Kenney pixels'}</small></section>`);
}
await fs.writeFile(new URL('frames.json',output),JSON.stringify(Object.fromEntries(names.map(n=>[n,FRAMES[n]])),null,2)+'\n');
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:760,height:560},deviceScaleFactor:1});
 await page.route('**/*',r=>r.abort());
 await page.setContent(`<style>body{margin:20px;background:#182a3a;color:#f5f7fc;font:17px sans-serif}h2{font-size:23px;margin:0 0 20px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}img{display:block;width:96px;height:96px;image-rendering:pixelated;background:repeating-conic-gradient(#425362 0% 25%,#526372 0% 50%) 0/16px 16px}strong,small{display:block;margin-top:5px}small{font-size:14px;color:#afbdd0}</style><h2>Kenney roadworks assets · native 16px, shown at 6×</h2><main>${cells.join('')}</main>`);
 await page.screenshot({path:fileURLToPath(new URL('kenney-derived.png',root)),fullPage:true});
}finally{await browser.close();}
console.log('Exported ten Kenney frames and labeled preview.');
