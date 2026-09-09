/** Original code-native pixel sprites. Candidate only; never changes the runtime atlas. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blank, read, write, rect, get, set, blit } from '../../../tools/png.mjs';
const OUT=path.dirname(fileURLToPath(import.meta.url)), ROOT=path.resolve(OUT,'../../..');
const palette={ink:'303a42',rubber:'283038',rim:'9ba6a2',white:'e7e8d8',light:'faf1d2',shade:'bbc7c0',blue:'345d83',blueLight:'648fae',glass:'608f9e',glint:'a7c8c6',red:'c85646',redLight:'e17a59',redDark:'8f403d',teal:'378e87',tealDark:'276d6a',gold:'e6bd63',lamp:'f6dda0'};
const C=Object.fromEntries(Object.entries(palette).map(([k,h])=>[k,[...h.matchAll(/../g)].map(v=>parseInt(v[0],16)).concat(255)]));
const box=(im,x,y,w,h,c)=>rect(im,x,y,w,h,C[c]??c);
function wheel(im,x,y){box(im,x,y,6,5,'rubber');box(im,x+1,y+1,4,4,'ink');box(im,x+2,y+2,2,2,'rim');}
function cross(im,x,y){box(im,x+2,y,2,6,'teal');box(im,x,y+2,6,2,'teal');}
function lightbar(im,x,y,w=10){box(im,x,y+2,w,1,'ink');box(im,x,y,w/2-1,2,'red');box(im,x+w/2,y,w/2,2,'blueLight');}
function side(kind){const im=blank(36,24);
 if(kind==='police'){
  box(im,8,5,19,2,'ink');box(im,7,7,22,8,'blue');box(im,9,6,16,2,'white');
  box(im,8,8,8,6,'glass');box(im,18,8,8,6,'glass');box(im,9,8,6,1,'glint');box(im,19,8,5,1,'glint');
  box(im,2,13,32,8,'ink');box(im,3,13,30,6,'blue');box(im,12,14,14,5,'white');box(im,4,13,7,2,'blueLight');box(im,28,13,4,2,'blueLight');
  box(im,18,15,3,3,'gold');box(im,19,18,1,1,'gold');box(im,24,14,2,1,'ink');lightbar(im,13,3);
 }else{
  const fire=kind==='fire',body=fire?'red':'white', hi=fire?'redLight':'light';
  box(im,1,5,23,16,'ink');box(im,2,5,21,14,body);box(im,2,5,21,2,hi);box(im,23,9,10,12,'ink');box(im,24,9,8,10,body);box(im,32,14,3,7,body);
  box(im,25,10,6,5,'glass');box(im,25,10,5,1,'glint');box(im,30,12,1,3,'glint');box(im,25,16,3,1,'ink');
  box(im,2,17,32,2,fire?'white':'teal');lightbar(im,24,7,8);
  if(fire){
   box(im,4,10,8,6,'rim');box(im,14,10,7,6,'rim');for(const y of [11,13,15]){box(im,4,y,8,1,'shade');box(im,14,y,7,1,'shade');}
   box(im,3,2,22,3,'ink');box(im,4,2,20,1,'shade');box(im,4,4,20,1,'shade');for(let x=6;x<24;x+=4)box(im,x,2,1,3,'rim');
   box(im,20,7,2,2,'gold');
  }else{cross(im,10,8);box(im,3,8,3,6,'shade');box(im,4,9,2,4,'glass');}
 }
 box(im,1,19,34,2,'rim');box(im,32,15,3,2,'lamp');box(im,1,15,2,2,'redDark');wheel(im,6,19);wheel(im,26,19);return im;
}
function end(kind,front){const im=blank(22,29),fire=kind==='fire',police=kind==='police',body=fire?'red':police?'blue':'white';
 box(im,2,8,3,20,'rubber');box(im,17,8,3,20,'rubber');box(im,3,4,16,22,'ink');box(im,4,4,14,21,body);box(im,5,3,12,3,fire?'redLight':police?'white':'light');
 if(police){box(im,5,8,12,9,'glass');box(im,6,8,10,2,'glint');box(im,5,18,12,4,'white');box(im,6,18,10,1,'shade');}
 else if(front){box(im,5,10,12,7,'glass');box(im,6,10,10,2,'glint');box(im,10,10,1,7,'ink');box(im,5,18,12,3,fire?'redLight':'shade');}
 else {box(im,5,9,5,12,fire?'rim':'shade');box(im,12,9,5,12,fire?'rim':'shade');box(im,6,10,3,4,'glass');box(im,13,10,3,4,'glass');if(fire){for(let y=16;y<21;y+=2)box(im,5,y,12,1,'white');}else cross(im,8,15);}
 if(fire){box(im,8,1,6,7,'ink');box(im,8,1,1,7,'shade');box(im,13,1,1,7,'shade');for(let y=1;y<8;y+=3)box(im,9,y,4,1,'rim');}
 lightbar(im,6,police?1:7);
 box(im,4,23,14,2,'ink');box(im,4,23,3,2,front?'lamp':'redDark');box(im,15,23,3,2,front?'lamp':'redDark');box(im,9,23,4,2,'rim');box(im,3,25,16,1,'rim');
 return im;
}
function mirror(im){const result=blank(im.width,im.height);for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)set(result,im.width-x-1,y,get(im,x,y));return result;}
const atlas=read(path.join(ROOT,'public/images/city/city-atlas.png'));
const frames=Object.fromEntries([...fs.readFileSync(path.join(ROOT,'src/game/cityAtlas.ts'),'utf8').matchAll(/(\w+): \{\s*x: (\d+),\s*y: (\d+),\s*w: (\d+),\s*h: (\d+)\s*\}/g)].map(m=>[m[1],m.slice(2).map(Number)]));
const sprites={};for(const kind of ['police','ems','fire'])for(const view of ['N','E','S','W']){const im=view==='N'||view==='S'?end(kind,view==='S'):view==='E'?side(kind):mirror(side(kind));sprites[`${kind}-${view}`]=im;write(im,path.join(OUT,`${kind}-${view}.png`));}
for(const view of ['N','E','S','W']){const f=frames[`car_silver_${view}`],im=blank(f[2],f[3]);blit(im,atlas,...f,0,0);sprites[`civilian-${view}`]=im;write(im,path.join(OUT,`current-civilian-${view}.png`));}
const glyph={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'101111111111101',O:'010101101101010',P:'110101110100100',Q:'010101101111011',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',Z:'111001010100111','/':'001001010100100','!':'010010010000010','-':'000000111000000'};
function label(im,str,x,y,scale=2){for(const ch of str){const g=glyph[ch];if(g)for(let r=0;r<5;r++)for(let c=0;c<3;c++)if(g[r*3+c]==='1')box(im,x+c*scale,y+r*scale,scale,scale,'white');x+=4*scale;}}
const board=blank(1000,640,[29,47,48,255]);label(board,'WORKING ON IT! / EMERGENCY VEHICLES',28,24,3);label(board,'CANDIDATE ART / FIXED CAMERA / FOUR VIEWS',28,52);
const kinds=['civilian','police','ems','fire'];for(let i=0;i<4;i++){const x=20+i*245;box(board,x,87,235,446,[46,61,64,255]);label(board,['EXISTING CAR','POLICE','AMBULANCE / EMS','FIRE ENGINE'][i],x+12,99,2);for(let j=0;j<4;j++){const view=['E','W','S','N'][j],im=sprites[`${kinds[i]}-${view}`],y=127+j*99;label(board,view,x+12,y+31,2);blit(board,im,0,0,im.width,im.height,x+Math.floor((235-im.width*3)/2)+8,y,3);}}
label(board,'NATIVE PIXELS / SAME SCALE AS CIVILIAN CAR',28,555,2);const strip=blank(280,36,[46,61,64,255]);for(let i=0;i<4;i++){const im=sprites[`${kinds[i]}-E`];blit(board,im,0,0,im.width,im.height,44+i*245,588);blit(strip,im,0,0,im.width,im.height,10+i*68,7);}
write(board,path.join(OUT,'comparison.png'));write(strip,path.join(OUT,'native-strip.png'));
console.log('Wrote twelve vehicle views, four civilian references, comparison and native strip.');
