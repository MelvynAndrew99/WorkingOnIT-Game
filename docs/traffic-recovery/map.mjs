import fs from 'node:fs';
import {footprint} from '../../src/game/cityModel.ts';
const c=JSON.parse(fs.readFileSync(new URL('original.json',import.meta.url))).city;
const scale=23,X=x=>(x+5)*scale+35,Y=y=>(y+7)*scale+75;
let a=[`<svg xmlns="http://www.w3.org/2000/svg" width="1060" height="800" viewBox="0 0 1060 800"><rect width="1060" height="800" fill="#13202b"/><g font-family="Arial,sans-serif"><text x="30" y="32" font-size="23" fill="white">Your city: traffic recovery locations</text><text x="30" y="55" font-size="14" fill="#bdcdd9">Schematic of the affected area · north at top · coordinates match the road inspector</text>`];
for(let x=-4;x<=28;x+=2)a.push(`<text x="${X(x)+8}" y="${Y(-7)-8}" font-size="10" fill="#bdcdd9">${x}</text>`);
for(let y=-6;y<=22;y+=2)a.push(`<text x="${X(-5)-22}" y="${Y(y)+15}" font-size="10" fill="#bdcdd9">${y}</text>`);
for(const p of c.roads)if(p.x>=-5&&p.x<=28&&p.y>=-7&&p.y<=22)a.push(`<rect x="${X(p.x)}" y="${Y(p.y)}" width="22" height="22" fill="#667d8d"/>`);
const cols={home:'#a48269',store:'#c18d43',park:'#548c69',hospital:'#af6678',policeStation:'#597dc4',fireStation:'#b9554f',busStop:'#e2c55b',apartment:'#967fa1',office:'#967fa1',busStation:'#e2c55b'};
for(const b of c.buildings){for(const p of footprint(b))if(p.x>=-5&&p.x<=28&&p.y>=-7&&p.y<=22)a.push(`<rect x="${X(p.x)+1}" y="${Y(p.y)+1}" width="21" height="21" fill="${cols[b.kind]??'#777'}"/>`);}
for(const p of c.controls)if(p.x>=-5)a.push(`<circle cx="${X(p.x)+11}" cy="${Y(p.y)+11}" r="4" fill="${p.kind==='signal'?'#61d6af':'#ff9d8d'}"/>`);
for(const p of c.closures)a.push(`<path d="M${X(p.x)+4},${Y(p.y)+4}l14,14m0,-14l-14,14" stroke="#ff5c65" stroke-width="4"/>`);
const marks=[['A',2,-2,'Reopen Divert (2, -2)'],['B',10,10,'Lights (10, 10)'],['C',4,11,'Lights (4, 11)'],['D',12,18,'Lights (12, 18)'],['E',17,18,'Lights (17, 18)']];
for(const [i,x,y,label] of marks)a.push(`<circle cx="${X(x)+11}" cy="${Y(y)+11}" r="13" fill="#13202b" stroke="#7cf0d3" stroke-width="2"/><text x="${X(x)+11}" y="${Y(y)+16}" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${i}</text>`);
for(let j=0;j<marks.length;j++)a.push(`<text x="830" y="${120+j*35}" fill="#7cf0d3" font-size="14">${marks[j][0]}  ${marks[j][3]}</text>`);
a.push(`<circle cx="${X(8)+11}" cy="${Y(-5)+11}" r="8" fill="#ffbd54"/><text x="${X(11)}" y="${Y(-5)+15}" fill="#ffbd54" font-size="13">Blocked bus at northern stop</text><text x="830" y="330" fill="#bdcdd9" font-size="13">Red crosses: existing Divert</text><text x="830" y="353" fill="#bdcdd9" font-size="13">Small dots: existing controls</text><text x="830" y="388" fill="#bdcdd9" font-size="13">Install lights, reopen A,</text><text x="830" y="409" fill="#bdcdd9" font-size="13">then let traffic run.</text></g></svg>`);
fs.writeFileSync(new URL('recovery-map.svg',import.meta.url),a.join('\n'));
