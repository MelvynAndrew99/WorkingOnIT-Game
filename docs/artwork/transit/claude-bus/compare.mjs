import {blank,read,write,rect,blit} from '../../../../tools/png.mjs';
const out=new URL('.',import.meta.url);
const glyph={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'101111111111101',O:'010101101101010',P:'110101110100100',Q:'010101101111011',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',Z:'111001010100111','/':'001001010100100','!':'010010010000010','-':'000000111000000'};

function label(im,str,x,y,scale=2){for(const ch of str){const g=glyph[ch];if(g)for(let r=0;r<5;r++)for(let c=0;c<3;c++)if(g[r*3+c]==='1')rect(im,x+c*scale,y+r*scale,scale,scale,[230,235,222,255]);x+=4*scale;}}
const board=blank(760,400,[29,47,48,255]);label(board,'CLAUDE BUS / APPROVED WHEEL FIX',20,16,2);
const views=['E','W','S','N'];for(let col=0;col<4;col++)label(board,views[col],120+col*166,45,2);
for(let row=0;row<3;row++){
 const names=['BUS','CAR','EMS'];label(board,names[row],16,97+row*91,2);
 for(let col=0;col<4;col++){
  const rel=row===0?`bus-${views[col]}.png`:row===1?`../../service-vehicles/current-civilian-${views[col]}.png`:`../../service-vehicles/ems-${views[col]}.png`;
  const img=read(new URL(rel,out));blit(board,img,0,0,img.width,img.height,104+col*166,69+row*91,3);
 }
}
label(board,'NATIVE SIZE / BUS - CAR - EMS',20,354,2);
for(const [i,rel] of ['bus-E.png','../../service-vehicles/current-civilian-E.png','../../service-vehicles/ems-E.png'].entries()){
 const img=read(new URL(rel,out));blit(board,img,0,0,img.width,img.height,350+i*60,348,1);
}
write(board,new URL('comparison-matched.png',out));
