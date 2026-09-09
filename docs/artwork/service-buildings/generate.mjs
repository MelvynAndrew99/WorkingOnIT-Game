/** Candidate art only. Run from any directory with node. No runtime files touched. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blank, read, write, rect, get, over, blit } from '../../../tools/png.mjs';
const OUT = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(OUT, '../../..');
const atlas = read(path.join(ROOT, 'public/images/city/city-atlas.png'));
const source = fs.readFileSync(path.join(ROOT, 'src/game/cityAtlas.ts'), 'utf8');
const frames = Object.fromEntries([...source.matchAll(/(\w+): \{\s*x: (\d+),\s*y: (\d+),\s*w: (\d+),\s*h: (\d+)\s*\}/g)].map(m => [m[1], m.slice(2).map(Number)]));
const C = Object.fromEntries(Object.entries({ ink:'333b42', brick:'a65d48', brickLight:'c6805b', brickDark:'804a42', cream:'e1ddc8', white:'f3eedb', grey:'87948b', shadow:'526966', blue:'345b82', blueLight:'6085a2', glass:'78acb2', glassLight:'bad4cd', teal:'328e86', tealDark:'286966', gold:'e8bf67', red:'c95c49', dark:'414e56' }).map(([k,h])=>[k,[...h.matchAll(/../g)].map(v=>parseInt(v[0],16)).concat(255)]));
function box(im,x,y,w,h,c){ rect(im,x,y,w,h,typeof c==='string'?C[c]:c); }
function tile(im,name,x,y,w=16,h=16){ const f=frames[name]; if(!f)throw Error(name); for(let j=0;j<h;j++)for(let i=0;i<w;i++)over(im,x+i,y+j,get(atlas,f[0]+Math.floor(i*f[2]/w),f[1]+Math.floor(j*f[3]/h))); }
function roof(im,x,y,w,h,family='grey') { // Nine slice leaves atlas texture density intact.
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const hs=i<8?'l':i>=w-8?'r':'m', vs=j<8?'t':j>=h-8?'b':'m';
    const name=vs==='m'?(hs==='m'?'mid':hs):(hs==='m'?vs:vs+hs);
    const f=frames[`roof_${family}_${name}`];
    const sx=hs==='r'?16-(w-i):i%16, sy=vs==='b'?16-(h-j):j%16;
    over(im,x+i,y+j,get(atlas,f[0]+sx,f[1]+sy));
  }
}
function wall(im,x,y,w,h,family='stone') { for(let i=0;i<w;i+=16)tile(im,`wall_${family}_${i===0?'l':i+16>=w?'r':'m'}`,x+i,y,Math.min(16,w-i),h); }
function window(im,x,y,w=5,h=6){box(im,x,y,w,h,'shadow');box(im,x+1,y+1,w-2,h-2,'glass');box(im,x+1,y+1,w-2,1,'glassLight');}
function shutter(im,x,y,w,h,active=false){box(im,x,y,w,h,'ink');box(im,x+1,y+1,w-2,h-2,'grey');for(let j=3;j<h-2;j+=3)box(im,x+1,y+j,w-2,1,'shadow');if(active){box(im,x+1,y+h-3,w-2,2,'dark');box(im,x+1,y+h-1,w-2,1,'gold');}else box(im,x+Math.floor(w/2),y+h-3,2,1,'cream');}
function cross(im,x,y,size=9){const n=Math.floor(size/3);box(im,x+n,y,n,size,'teal');box(im,x,y+n,size,n,'teal');}
function shield(im,x,y){box(im,x,y,9,2,'cream');box(im,x,y+2,9,5,'gold');box(im,x+1,y+7,7,2,'gold');box(im,x+2,y+9,5,1,'gold');box(im,x+3,y+10,3,1,'gold');box(im,x+3,y+3,3,4,'blue');box(im,x+2,y+4,5,2,'blue');}
function fire(w,h,side){const im=blank(w,h), tall=w===32, fy=h-15, towerX=tall?2:3, bodyX=tall?11:14;
  wall(im,bodyX,fy,w-bodyX-2,14,'brick'); roof(im,bodyX-1,tall?13:8,w-bodyX,fy-(tall?13:8)+2,'grey');
  // Narrow masonry hose tower supplies a distinct uneven silhouette.
  box(im,towerX,4,10,h-5,'brickDark');box(im,towerX+1,4,8,h-6,'brick');
  for(let yy=8;yy<h-4;yy+=5){box(im,towerX+1,yy,8,1,'brickLight');box(im,towerX+4+(yy%2)*2,yy-3,1,3,'brickDark');}
  box(im,towerX-1,3,12,3,'cream');box(im,towerX,2,10,1,'grey');
  window(im,towerX+3,9,4,7);box(im,towerX+2,h-10,6,7,'brickDark');box(im,towerX+4,h-10,1,2,'gold');box(im,towerX+3,h-8,3,2,'gold');box(im,towerX+2,h-6,5,2,'gold');box(im,towerX+3,h-4,3,1,'gold');box(im,towerX+4,h-6,1,2,'red');
  box(im,bodyX,fy,w-bodyX-2,3,'cream');
  if(tall)shutter(im,bodyX+2,fy+4,14,10,false);else{shutter(im,16,fy+4,14,10,side==='south');shutter(im,32,fy+4,12,10,false);}
  return im;
}
function police(w,h,side){const im=blank(w,h), fy=h-14, cx=Math.floor(w/2);
  wall(im,2,fy,w-4,13);roof(im,1,8,w-2,fy-6,'grey');
  box(im,2,fy-2,w-4,3,'blue');box(im,3,fy+1,w-6,2,'blueLight');
  // Raised civic portico and badge, unlike shop's continuous awning/glazing.
  box(im,cx-8,3,16,3,'blue');box(im,cx-10,6,20,2,'blueLight');box(im,cx-7,8,14,12,'blue');shield(im,cx-4,8);
  if(w===32){window(im,4,fy+5,5,6);window(im,w-9,fy+5,5,6);}else{window(im,5,fy+5,7,6);window(im,w-12,fy+5,7,6);}
  box(im,cx-8,fy+2,16,2,'cream');box(im,cx-8,fy+4,3,9,'white');box(im,cx+5,fy+4,3,9,'white');
  if(side==='south'){box(im,cx-4,fy+4,8,9,'ink');box(im,cx-3,fy+5,6,7,'glass');box(im,cx,fy+5,1,7,'shadow');box(im,cx-5,h-2,10,1,'cream');}
  else window(im,cx-4,fy+5,8,7);
  // Small mast reinforces civic/service silhouette, contained within footprint.
  box(im,w-5,2,1,7,'shadow');box(im,w-4,2,3,3,'blue');
  return im;
}
function hospital(w,h,side){const im=blank(w,h), fy=h-13,cx=Math.floor(w/2), tall=w===32;
  // Setback side wings and a raised central clinical block.
  wall(im,1,fy,w-2,12,'sand');roof(im,1,tall?16:10,w-2,fy-(tall?16:10)+2,'pale');
  box(im,2,fy-1,w-4,3,'teal');box(im,2,fy+2,w-4,1,'glassLight');
  const blockY=tall?5:2;roof(im,cx-9,blockY,18,Math.max(10,fy-blockY),'pale');box(im,cx-8,fy-10,16,11,'cream');box(im,cx-7,fy-9,14,10,'white');cross(im,cx-4,fy-9,9);
  if(tall){window(im,4,fy+4,6,6);window(im,w-10,fy+4,6,6);}
  else {window(im,4,fy+4,8,6);shutter(im,33,fy+4,11,8,false);box(im,34,fy+4,9,1,'teal');}
  box(im,cx-7,fy+3,14,2,'tealDark');
  if(side==='south'){box(im,cx-5,fy+5,10,7,'shadow');box(im,cx-4,fy+6,8,6,'glass');box(im,cx,fy+6,1,6,'cream');box(im,cx-6,h-1,12,1,'cream');}
  else window(im,cx-5,fy+5,10,7);
  return im;
}
// Exact atlas composition of existing home/store skin 0 at native scale, with rounding
// at fractional pixel boundaries; used only for comparison, not a second game renderer.
function reference(kind,w,h){const im=blank(w,h), cols=w/16, rows=h/16, wr=rows-1;
 for(let y=0;y<wr;y++)for(let x=0;x<cols;x++){const hs=x===0?'l':x===cols-1?'r':'',vs=y===0?'t':y===wr-1?'b':'';tile(im,`roof_${kind==='home'?'red':'grey'}_${vs+hs||'mid'}`,x*16,y*16);}
 for(let x=0;x<cols;x++){tile(im,`wall_${kind==='home'?'sand':'stone'}_${x===0?'l':x===cols-1?'r':'m'}`,x*16,wr*16);
  if(kind==='store'){if(x!==1)tile(im,x===0?'shopGlassL':'shopGlassR',x*16,wr*16);tile(im,'awningGreen',x*16,Math.round((wr-.34)*16),16,7);}
  else if(x!==0)tile(im,'windowHome',x*16+4,wr*16+3,9,10);
 }
 if(kind==='store')tile(im,'signBar',Math.round(w/2-.7*16),Math.round((wr-.86)*16),22,6);
 tile(im,kind==='home'?'doorHome':'doorStore',(kind==='home'?0:16)+3,wr*16+1,11,15);
 tile(im,'plot',(kind==='home'?0:16)+3,wr*16+11,11,5);return im;
}
const sprites={};
for(const [kind,fn]of Object.entries({'fire-station':fire,'police-station':police,hospital}))for(const side of ['south','west','north','east']){const tall=side==='west'||side==='east',im=fn(tall?32:48,tall?48:32,side);sprites[`${kind}-${side}`]=im;write(im,path.join(OUT,`${kind}-${side}.png`));}
for(const kind of ['home','store']){const im=reference(kind,kind==='home'?32:48,32);sprites[kind]=im;write(im,path.join(OUT,`current-${kind}.png`));}
const glyph={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'101111111111101',O:'010101101101010',P:'110101110100100',Q:'010101101111011',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',Z:'111001010100111',1:'010110010010111',2:'110001010100111',3:'110001010001110',4:'101101111001001',5:'111100110001110',6:'011100110101010',8:'010101010101010','/':'001001010100100','-':'000000111000000','!':'010010010000010'};
function label(im,s,x,y,scale=2,c='cream'){for(const ch of s){const g=glyph[ch];if(g)for(let r=0;r<5;r++)for(let col=0;col<3;col++)if(g[r*3+col]==='1')box(im,x+col*scale,y+r*scale,scale,scale,c);x+=scale*4;}}
const board=blank(1000,620,[29,47,48,255]);label(board,'WORKING ON IT! / SERVICE BUILDING CANDIDATES',30,25,3);label(board,'EXISTING',34,75);label(board,'NEW CANDIDATES / SOUTH ACCESS',410,75);
const items=[['HOME',sprites.home],['STORE',sprites.store],['FIRE',sprites['fire-station-south']],['POLICE',sprites['police-station-south']],['HOSPITAL / EMS',sprites['hospital-south']]];
for(let i=0;i<items.length;i++){const x=20+i*196;box(board,x,99,184,173,[48,72,62,255]);label(board,items[i][0],x+12,112,2);const im=items[i][1];blit(board,im,0,0,im.width,im.height,x+Math.floor((184-im.width*3)/2),150,3);}
label(board,'UPRIGHT ART / TALL FOOTPRINT / WEST ACCESS',30,296,2);
for(let i=0;i<3;i++){const im=sprites[['fire-station','police-station','hospital'][i]+'-west'],x=410+i*196;box(board,x,322,184,174,[48,72,62,255]);blit(board,im,0,0,im.width,im.height,x+44,334,3);}
label(board,'CLOSED BAYS ARE',30,340,2);label(board,'FACADE DETAILS.',30,360,2);label(board,'ROAD ACCESS STILL',30,397,2);label(board,'USES THE MAP ARROW.',30,417,2);
label(board,'NATIVE PIXELS / SOUTH ACCESS',30,520,2);for(let i=0;i<items.length;i++){const im=items[i][1];blit(board,im,0,0,im.width,im.height,40+i*196,551);}
write(board,path.join(OUT,'comparison.png'));
console.log(`Wrote ${Object.keys(sprites).length} sprites and comparison.png to ${OUT}`);
