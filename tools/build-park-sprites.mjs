/** Render approved SVG source; only entrance paving changes, never the upright art.
 * Run inside nix develop; set PLAYWRIGHT_MODULE and CHROMIUM_PATH to local installs.
 */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const source=await readFile(new URL('../docs/artwork/park/claude-candidate.svg',import.meta.url),'utf8');
const out=new URL('../public/images/city/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
try {
 for(const side of ['S','N','E','W']){
  // Close the original gate on other orientations, then connect the ring to the real side.
  const close=side==='S'?'':`<rect x="84" y="144" width="24" height="16" fill="#7a9660"/><rect x="84" y="160" width="24" height="8" fill="#4b6a3c"/><rect x="84" y="160" width="24" height="4" fill="#5b7d49"/><rect x="84" y="168" width="24" height="4" fill="#7d6a51"/><rect x="84" y="172" width="24" height="4" fill="#59492f"/>`;
  const path=side==='S'?'<rect x="84" y="176" width="24" height="16" fill="#d9c9a6"/>':side==='N'?'<rect x="84" y="0" width="24" height="52" fill="#d9c9a6"/>':side==='W'?'<rect x="0" y="84" width="44" height="24" fill="#d9c9a6"/>':'<rect x="148" y="84" width="44" height="24" fill="#d9c9a6"/>';
  const svg=source.replace('</svg>',`<g id="logical-entrance">${close}${path}</g></svg>`);
  await writeFile(new URL(`park-${side}.svg`,out),svg);
  const page=await browser.newPage({viewport:{width:192,height:192},deviceScaleFactor:1});
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`);
  await page.screenshot({path:new URL(`park-${side}.png`,out).pathname,omitBackground:true});await page.close();
 }
}finally{await browser.close();}
