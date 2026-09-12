// Candidate composition only. Reuses the game's Kenney atlas; no runtime writes.
// Run from the repository root: node docs/artwork/housing/preview.mjs
import fs from 'node:fs';
import {read, blank, get, over, rect, write, blit, text} from '../../../tools/png.mjs';
const atlas=read('public/images/city/city-atlas.png');
const source=fs.readFileSync('src/game/cityAtlas.ts','utf8');
const frames=JSON.parse(source.slice(source.indexOf('export const FRAMES = ')+22,source.lastIndexOf('} as const')+1).replace(/(\w+):/g,'"$1":'));
const out=blank(416,154,[28,47,49,255]);
function sprite(name,x,y,w=16,h=16){const f=frames[name];for(let j=0;j<h;j++)for(let i=0;i<w;i++)over(out,x+i,y+j,get(atlas,f.x+Math.floor(i*f.w/w),f.y+Math.floor(j*f.h/h)));}
const cream=[213,208,180,255],shadow=[62,105,77,255];
function lawn(x,y,w,h){for(let j=0;j<h;j+=16)for(let i=0;i<w;i+=16)sprite('grassA',x+i,y+j);}
function building(x,y,w,h,roof,wall,floors=1,door=true){
 rect(out,x+2,y+3,w,h,shadow);
 const rh=h-floors*10;
 sprite(`roof_${roof}_tl`,x,y,w/2,rh);sprite(`roof_${roof}_tr`,x+w/2,y,w/2,rh);
 for(let row=0;row<floors;row++){
  const yy=y+rh+row*10;
  sprite(`wall_${wall}_l`,x,yy,w/2,10);sprite(`wall_${wall}_r`,x+w/2,yy,w/2,10);
  for(let i=0;i<Math.floor(w/10);i++)sprite(floors>1?'windowFlat':'windowHome',x+3+i*10,yy+2,6,7);
 }
 if(door)sprite('doorHome',x+Math.floor(w/2)-4,y+h-9,8,9);
}
function road(x,y,w){for(let i=0;i<w;i+=16)sprite('road10',x+i,y);}
const skins=[['red','sand'],['tan','brick'],['grey','stone'],['tan','sand']];
for(let p=0;p<3;p++){
 const x=8+p*136; lawn(x,20,128,112);text(out,p+1,x,7,2,cream);road(x,116,128);
}
// Same four 2x2 lots in each row. Left approximates today's full-plot composition.
for(let row=0;row<2;row++)for(let col=0;col<3;col++){
 const [roof,wall]=skins[(col+row*2)%4],x=24+col*32,y=32+row*48;
 building(x,y,32,32,roof==='grey'?'red':roof,wall,1,row===1);
 const nx=x+136;
 // Garden and path live within the same lot, and the upright facade stays upright.
 rect(out,nx+14,y+23,5,row===1?13:9,cream);
 if(row===0)rect(out,nx+29,y+15,3,25,cream);
 building(nx+5,y+3,22,23,roof,wall,1,row===1);
 sprite('bush',nx+1,y+25,9,7);
 if(col%2===0)sprite('tree_green',nx+25,y+3,7,16);
 if(col===1){rect(out,nx+5,y+2,3,5,[136,126,116,255]);}
}
// Back gardens between rows; shared street inside this neighborhood.
road(16,64,112);road(152,64,112);
// Apartments: proposed 4x4 lot (64px), taller facade within its footprint,
// central court and a single visibly marked driveway to the street.
const ax=308,ay=44;
rect(out,ax,ay,64,64,[111,145,102,255]);
rect(out,ax+4,ay+5,56,54,cream);
building(ax+5,ay+3,54,38,'grey','brick',3);
rect(out,ax+27,ay+40,10,24,cream);
rect(out,ax+7,ay+45,16,13,[69,126,86,255]);
rect(out,ax+43,ay+45,14,13,[69,126,86,255]);
sprite('tree_green',ax+8,ay+40,9,18);sprite('bush',ax+46,ay+48,10,8);
rect(out,ax+27,ay+64,10,8,cream);
sprite('car_silver_E',ax+2,120,18,10);
const big=blank(out.width*3,out.height*3);blit(big,out,0,0,out.width,out.height,0,0,3);
write(big,'docs/artwork/housing/comparison.png');
