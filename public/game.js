// Игра «Башня принцессы» для комнаты: хост считает мир, остальные получают снимки. Собрано из одиночной версии.
(function(){

// ===== Константы и данные =====
const cv=document.getElementById('c'),ctx=cv.getContext('2d'),W=1138,H=640,CX=W/2,CY=H/2+45;
const TOTAL=10,TOWER_R=70,SX=(W-808)/2,FONT='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const T={knight:{e:'🤵',hp:3,sp:42,dmg:6,r:20,sz:38},bard:{e:'🎻',hp:2,sp:88,dmg:4,r:16,sz:32,rng:260,rate:3},prince:{e:'🤴',hp:70,sp:28,dmg:30,r:34,sz:70},king:{e:'👑',hp:200,sp:22,dmg:45,r:40,sz:84},mage:{e:'🧙',hp:3,sp:70,dmg:3,r:18,sz:36,rng:270,rate:2,kind:'heal'},merchant:{e:'🤑',hp:4,sp:60,dmg:0,r:18,sz:34,rng:280,rate:3.4,kind:'bag'}};
const BOSS={5:'prince',10:'king'},BN={3:'Новый поклонник: бард с серенадами!',4:'Новый поклонник: маг лечит и защищает щитами!',6:'Новый поклонник: купец с мешками золота!',5:'Босс: Прекрасный принц со свитой',10:'Финал: отец принцессы и вся свита'};
const Q={hit:['Опять с цветами!','Я просила не беспокоить!','Передайте ему, что я в отъезде.','У меня мигрень!','Кто дал ему адрес?!'],kill:['Так держать, ящерки!','Спасибо, мои хорошие!','Тишина… наконец-то.','Он даже не обиделся.'],prince:['Прекрасный принц… Только не он!','Он идёт с оркестром! Огонь!!!'],king:['Папа?! Ты тоже?!','Отец привёл гвардию. Драконы, простите меня!'],bard:['Серенады?! Сбивайте ноты, пока они не долетели!','Он поёт под моим окном!'],note:['Это что, серенада?!','Нота в башню — это уже хулиганство!','Сбейте её, она фальшивит!'],mage:['Маг лечит своих! Он их подбадривает стихами!','Кто-нибудь, заткните этого свата!'],merchant:['Купец! Он хочет купить моё внимание!','Не берите его золото, это ловушка!'],bag:['Золото? Да я принцесса, мне не нужно!','Дракон, не считай монеты!']};
const CUR=[{n:'Золото',c:'#ffd24d'},{n:'Ноты',c:'#7fd6ff'}];
// b — базовая цена, s — прирост цены за покупку, t — валюта (0 золото, 1 ноты)
const UP=[{n:'Усиленное дыхание',d:'урон +1, шар крупнее',b:8,s:5,t:0},{n:'Частое дыхание',d:'стреляет на 20% чаще',b:3,s:2,t:1},{n:'Быстрые крылья',d:'скорость +20%',b:3,s:2,t:1},{n:'Драконий щит',d:'поглощает удар',b:10,s:5,t:0}];
// настройки монет: шанс золота с рыцаря, срок жизни обычной и боссовой монеты, когда начинать мигать
const DROP={chance:.7,life:10,boss:20,warn:3};
// состав волн: с какой волны появляется враг, его базовый вес, максимум врагов на экране.
// Новый враг добавляется тут и в T: так добавлены маг (4-я волна) и купец (6-я).
const ENEMY_INTRO={knight:1,bard:3,mage:4,merchant:6},ENEMY_W={knight:4,bard:1,mage:.5,merchant:1.5},MAXON=35,NEWQ={3:'bard',4:'mage',6:'merchant'};
const stars=Array.from({length:60},()=>({x:Math.random()*W,y:Math.random()*H*.55,r:Math.random()*1.4+.3}));

// ===== Картинки: фон, замок, дракон. Если не загрузились, рисуем как раньше (эмодзи) =====
const IMG={},DFR=9,FFR=6,dragonCache={};
let castleV=[],tintedNow=false,cvW=W,cvH=H,ox=0,oy=0,K=1;   // перекрашиваем не больше одного цвета за кадр, чтобы не было подвисания
function loadImg(k,src){if(typeof Image==='undefined')return;const i=new Image();i.onload=()=>{IMG[k]=i;if(k==='castle')makeCastle()};i.src=src}
loadImg('bg','assets/bg.jpg');loadImg('castle','assets/castle.png');loadImg('dragon','assets/dragon.png');loadImg('fire','assets/fire.png');
function shade(img,a,rgb){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);x.globalCompositeOperation='source-atop';x.fillStyle='rgba('+rgb+','+a+')';x.fillRect(0,0,c.width,c.height);return c}
function makeCastle(){castleV=[IMG.castle,shade(IMG.castle,.22,'90,10,40'),shade(IMG.castle,.42,'60,0,25')]}   // целый, повреждённый, сильно повреждённый
function rgb2hsv(r,g,b){r/=255;g/=255;b/=255;const m=Math.max(r,g,b),n=Math.min(r,g,b),d=m-n;let h=0;
  if(d){if(m===r)h=((g-b)/d)%6;else if(m===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}
  return[h,m?d/m:0,m]}
function hsv2rgb(h,s,v){const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;let r=0,g=0,b=0;
  if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}
  return[Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)]}
// зелёный дракон перекрашивается в цвет игрока: меняется только зелёная часть, крылья и брюхо остаются
function dragonFor(ci){
  if(dragonCache[ci])return dragonCache[ci];if(!IMG.dragon||tintedNow)return null;tintedNow=true;
  const im=IMG.dragon,c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
  const hex=COLORS[ci][1],T=rgb2hsv(parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16));
  const id=x.getImageData(0,0,c.width,c.height),d=id.data;
  for(let i=0;i<d.length;i+=4){if(d[i+3]<20||d[i+1]<=d[i]||d[i+1]<=d[i+2])continue;const h=rgb2hsv(d[i],d[i+1],d[i+2]);
    if(h[0]>55&&h[0]<175&&h[1]>.3){const rgb=hsv2rgb(T[0],Math.min(1,h[1]*T[1]/.75),Math.min(1,h[2]*(.65+.35*T[2])));d[i]=rgb[0];d[i+1]=rgb[1];d[i+2]=rgb[2]}}
  x.putImageData(id,0,0);return dragonCache[ci]=c}
function drawDragonSprite(p){
  const sh=dragonFor(p.ci)||IMG.dragon;if(!sh){emoji('🐲',p.x,p.y,46);return}
  if(!p.face)p.face=1;
  const fw=sh.width/DFR,fh=sh.height,w=96,h=w*fh/fw,f=p.asleep?0:Math.floor((typeof performance!=='undefined'?performance.now():0)/140+p.id*2)%DFR;
  ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.face,1);ctx.drawImage(sh,f*fw,0,fw,fh,-w/2,-h/2,w,h);ctx.restore()}
// Холст подгоняется под окно: игровое поле 16:9 стоит по центру, а вокруг продолжается фон (на любом экране без чёрных полос)
function resizeCanvas(){
  const vw=typeof innerWidth==='number'?innerWidth:W,vh=typeof innerHeight==='number'?innerHeight:H,a=Math.min(2.6,Math.max(1.2,vw/vh));
  cvW=Math.round(Math.max(W,H*a));cvH=Math.round(Math.max(H,W/a));ox=(cvW-W)/2;oy=(cvH-H)/2;
  K=Math.max(1,Math.min(2,vh*(typeof devicePixelRatio==='number'?devicePixelRatio:1)/cvH));
  cv.width=Math.round(cvW*K);cv.height=Math.round(cvH*K)}
function drawBg(){const im=IMG.bg,s=Math.max(cvW/im.width,cvH/im.height),w=im.width*s,h=im.height*s;
  ctx.drawImage(im,Math.min(0,Math.max(cvW-w,cvW/2-w/2)),Math.min(0,Math.max(cvH-h,CY+oy-.57*h)),w,h)}
function drawBall(b){
  const sh=IMG.fire,t=typeof performance!=='undefined'?performance.now():0;
  if(!sh){ctx.fillStyle=b.col;ctx.shadowColor=b.col;ctx.shadowBlur=16;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,6.283);ctx.fill();ctx.shadowBlur=0;return}
  const fw=sh.width/FFR,fh=sh.height,w=34+(b.r-7.5)*7,h=w*fh/fw,f=Math.floor(t/60+b.id)%FFR;
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.ang||0);
  ctx.globalAlpha=.35;ctx.fillStyle=b.col;ctx.beginPath();ctx.arc(w*.05,0,h*.42,0,6.283);ctx.fill();ctx.globalAlpha=1;   // цветной ореол: чей это огонь
  ctx.drawImage(sh,f*fw,0,fw,fh,-w*.55,-h/2,w,h);ctx.restore()}
function drawCastle(){
  if(!castleV.length){emoji('🏰',CX,CY,100);return}
  const st=tower>66?0:tower>33?1:2,im=castleV[st],w=210,h=w*im.height/im.width;
  ctx.drawImage(im,CX-w/2,CY-h/2,w,h);
  if(st>0){const tt=(typeof performance!=='undefined'?performance.now():0)/1000;
    for(let i=0;i<3+st*2;i++){const u=(tt*.35+i*.37)%1;ctx.globalAlpha=(1-u)*.35;ctx.fillStyle='#bbb';ctx.beginPath();
      ctx.arc(CX+(i%3-1)*40+Math.sin(tt+i)*6,CY-h*.45-u*70,10+u*16,0,6.283);ctx.fill()}ctx.globalAlpha=1}}

// ===== Состояние мира (общее для всех игроков) =====
let state='play',wave=0,tower=100,score=0,queue=[],spawnT=0,phase='break',phaseT=0;
let enemies=[],notes=[],beams=[],balls=[],pickups=[],parts=[],shake=0,quip='',quipT=0,last=0,shopT=0,spawned=0,inspV=1,chorusCd=6,chorusT=0,tags=[],uid=0,evs=[],active=false;

// ===== Игроки: всё личное хранится здесь =====
let players=[],me=null,isHost=false,ws=null;
const maxH=p=>3,flames=p=>1+Math.min(2,Math.ceil(p.lv[0]/2)),dmgOf=p=>1+Math.floor(p.lv[0]/2),shMax=p=>p.lv[3]>=3?2:p.lv[3]>=1?1:0,SH_T=[0,10,7,6];
const wakeTime=()=>players.length>1?12:6;
const cost=(p,i)=>UP[i].b+p.lv[i]*UP[i].s;
const capped=(p,i)=>p.lv[i]>=[4,5,3,3][i];
const descOf=(p,i)=>[['два пламени за выстрел','урон пламени +1','три пламени за выстрел','урон пламени +1'][p.lv[0]],'скорострельность +15%','скорость полёта +20%',['щит на 1 удар (10 с)','щит быстрее: 7 с','2 заряда, 6 с'][p.lv[3]]][i]||UP[i].d;
function makePlayer(id,ci){
  return{id,ci,name:'',nid:'',gone:false,x:CX,y:CY-105,h:3,inv:0,asleep:false,wt:0,rv:0,cd:0,frz:0,sh:0,shT:0,ready:false,
    w:[0,0],lv:[0,0,0,0],kills:0,earned:0,slept:0,
    in:{mx:0,my:0,ax:CX,ay:0,fire:false}}   // ввод игрока: сюда же придут данные по сети
}

// ===== Ввод (локальный игрок) =====
const mouse={x:CX,y:0,down:false},keys={};
function pos(e){const r=cv.getBoundingClientRect();mouse.x=(e.clientX-r.left)*cvW/r.width-ox;mouse.y=(e.clientY-r.top)*cvH/r.height-oy}
cv.addEventListener('pointermove',pos);
cv.addEventListener('pointerdown',e=>{pos(e);
  if(state==='shop'){if(shopT>.4)shopClick();return}
  mouse.down=true});
addEventListener('pointerup',()=>mouse.down=false);
addEventListener('keydown',e=>{if(!active)return;if(e.code==='KeyF'&&document.documentElement&&document.documentElement.requestFullscreen){if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen()}keys[e.code]=true;if(e.code.startsWith('Arrow')||e.code==='Space')e.preventDefault();
  if(state==='shop'&&shopT>.4){if(e.code==='Space'||e.code==='Enter')goReq();if(/^Digit[1-4]$/.test(e.code))buyReq(+e.code[5]-1)}});
addEventListener('keyup',e=>{keys[e.code]=false});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouse.down=false});

// ===== Вспомогательное =====
const pick=a=>a[Math.random()*a.length|0];
const isBoss=e=>e.k==='prince'||e.k==='king';
function say(t,s=3){quip=t;quipT=s}
function tag(e,txt){tags.push({x:e.x,y:e.y-34,txt,life:1.3})}   // небольшая подпись над врагом, когда он колдует
function boom(x,y,col,n){if(isHost&&evs.length<40)evs.push([Math.round(x),Math.round(y),col,n]);spark(x,y,col,n)}
function spark(x,y,col,n){if(parts.length>400)return;for(let i=0;i<n;i++){const a=Math.random()*6.283,v=40+Math.random()*140;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.5+Math.random()*.3,col})}}

// ===== Магазин (у каждого игрока свой) =====
function buy(p,i){const c=cost(p,i),t=UP[i].t;if(p.w[t]>=c&&!capped(p,i)){p.w[t]-=c;p.lv[i]++;if(i===3){p.sh=shMax(p);p.shT=0}}}
function goOn(){me.ready=true;checkGo()}
function checkGo(){if(players.every(p=>p.gone||p.ready))nextFromShop()}
function nextFromShop(){players.forEach(p=>p.ready=false);state='play';nextWave()}
function buyReq(i){if(isHost)buy(me,i);else net({k:'buy',i})}
function goReq(){if(isHost)goOn();else net({k:'go'})}
function shopClick(){UP.forEach((u,i)=>{const x=SX+i*206;if(mouse.x>x&&mouse.x<x+190&&mouse.y>190&&mouse.y<380)buyReq(i)});if(Math.abs(mouse.x-CX)<110&&mouse.y>450&&mouse.y<498)goReq()}

// ===== Ход игры =====
function resetWorld(){state='play';wave=0;tower=100;score=0;enemies=[];notes=[];beams=[];tags=[];balls=[];pickups=[];parts=[];shake=0}
function nextWave(){
  wave++;queue=[];spawned=0;
  const n=Math.round((4+wave*2.2)*(1+.85*Math.sqrt(players.length-1))*(BOSS[wave]?.85:1));   // больше игроков — больше врагов
     // состав волны: pickType() и таблица ENEMY_INTRO
  for(let i=0;i<n;i++)queue.push(pickType());
  if(BOSS[wave]){for(const k in ENEMY_INTRO)if(ENEMY_INTRO[k]<=wave){let c=queue.filter(x=>x===k).length;while(c++<(k==='mage'||k==='bard'?2:3))queue.push(k)}}   // на босс-волне представлены все типы
  for(const k in ENEMY_INTRO){const w0=wave-ENEMY_INTRO[k];if(ENEMY_INTRO[k]>1&&w0>=0&&w0<2){let c=queue.filter(x=>x===k).length;while(c++<2)queue.push(k)}}   // новичкам первые 2 волны гарантировано минимум 2 штуки
  queue.sort(()=>Math.random()-.5);
  if(BOSS[wave])queue.splice(n>>1,0,BOSS[wave]);
  phase='break';phaseT=3;spawnT=0;if(BOSS[wave])say(pick(Q[BOSS[wave]]),4);else if(NEWQ[wave])say(pick(Q[NEWQ[wave]]),4)}
function pickType(){const ks=Object.keys(ENEMY_INTRO).filter(k=>ENEMY_INTRO[k]<=wave),w=ks.map(k=>ENEMY_W[k]*(wave-ENEMY_INTRO[k]<2?2.5:1));   // новичок первые 2 волны в 2,5 раза чаще
  let r=Math.random()*w.reduce((a,b)=>a+b,0);for(let i=0;i<ks.length;i++){r-=w[i];if(r<=0)return ks[i]}return ks[0]}
function spawn(k){spawned++;const a=Math.random()*6.283,t=T[k],s=k==='prince'||k==='king'?1+(players.length-1)*.5:1+(wave-1)*.2;enemies.push({id:++uid,k,t,x:CX+Math.cos(a)*(W/2+230),y:CY+Math.sin(a)*(H/2+150),hp:t.hp*s,max:t.hp*s})}
function nx(p,i){return{lv:p.lv.map((v,j)=>j===i?v+1:v)}}   // уровни игрока после покупки улучшения
function descNew(p,i){const n=capped(p,i)?p:nx(p,i);   // подпись «было → стало»
  return['пламени×урон: '+flames(p)+'×'+dmgOf(p)+' → '+flames(n)+'×'+dmgOf(n),
    'выстр./с: '+(1/(.5*Math.pow(.85,p.lv[1]))).toFixed(1)+' → '+(1/(.5*Math.pow(.85,n.lv[1]))).toFixed(1),
    'скорость: '+Math.round(230*(1+.2*p.lv[2]))+' → '+Math.round(230*(1+.2*n.lv[2])),
    'щит: '+shMax(p)+' → '+shMax(n)+', восст. '+(SH_T[n.lv[3]]||'—')+' с'][i]}
function drop(e,o){const D={knight:[Math.random()<DROP.chance?1:0,0],bard:[0,1],mage:[2,0],merchant:[2,0],prince:[10,4],king:[20,8]}[e.k];
  D.forEach((v,t)=>{if(v)pickups.push({id:++uid,x:e.x+(t?12:-12),y:e.y,v,t,life:isBoss(e)?DROP.boss:DROP.life,own:o.id,res:3})})}   // 3 секунды монета только для убийцы
function toShop(){for(const c of pickups)boom(c.x,c.y,'#9a8aa8',5);pickups=[];for(const p of players){p.asleep=false;p.h=Math.min(maxH(p),p.h+1);p.inv=0;p.frz=0;p.sh=shMax(p);p.shT=0;p.ready=false}state='shop';shopT=0}
// способности дальних врагов: маг лечит раненого союзника, купец бросает мешок в дракона, бард — ноту в башню
function lonely(e){return e.t.kind==='heal'&&!enemies.some(o=>o.hp>0&&o.t.kind!=='heal')&&!queue.some(k=>T[k].kind!=='heal')}   // остались одни саппорты
function shieldAllies(e){const c=enemies.filter(o=>o!==e&&o.hp>0&&!o.sh&&!isBoss(o)).sort(()=>Math.random()-.5).slice(0,Math.max(0,Math.min(2,6-enemies.filter(o=>o.sh).length)));   // не больше 6 щитов на поле
  for(const o of c){o.sh=2;boom(o.x,o.y,'#8fd8ff',6)}if(c.length)tag(e,'Щит!')}
function woundedNear(e){for(const o of enemies){if(o!==e&&o.hp>0&&o.hp<o.max&&Math.hypot(o.x-e.x,o.y-e.y)<=260)return true}return false}
function cast(e,dx,dy,d,force){
  let k=force||e.t.kind;
  
  if(k==='heal'){let best=null,bm=0;
    for(const o of enemies){if(o===e||o.hp<=0||o.hp>=o.max||Math.hypot(o.x-e.x,o.y-e.y)>260)continue;if(o.max-o.hp>bm){bm=o.max-o.hp;best=o}}
    if(best){best.hp=Math.min(best.max,best.hp+(isBoss(best)?1:Math.max(1,best.max*.3)));beams.push({x1:e.x,y1:e.y,x2:best.x,y2:best.y,life:.4});boom(best.x,best.y,'#7dff9a',6);tag(e,'Лечу!')}else e.cdn=.5;
    return}
  let tx=CX,ty=CY;
  if(k==='bag'){let bd=1e9;for(const p of players){if(p.asleep)continue;const q=Math.hypot(p.x-e.x,p.y-e.y);if(q<bd){bd=q;tx=p.x;ty=p.y}}}
  const a=Math.atan2(ty-e.y,tx-e.x),v=k==='bag'?130:110;
  
  tag(e,k==='bag'?'Держи!':'♪ Ля-ля!');notes.push({id:++uid,x:e.x,y:e.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,hp:1,k:k==='bag'?'bag':'note',dmg:e.t.dmg,r:12,life:5,sx:e.x,sy:e.y,tx,ty,t:0,d:1.1})}
function wakeUp(p,byFriend){p.asleep=false;p.h=1;p.inv=2;p.rv=0;
  if(byFriend)say('Дракона разбудили!');else{p.w[0]=Math.floor(p.w[0]*.75);say('Дракон проснулся. Часть золота потерялась по дороге.')}}
function hitDragon(p,e){if(p.sh>0){p.sh--;p.shT=0;p.inv=.8;shake=3;boom(p.x,p.y,'#8fd8ff',10)}else{p.h--;p.inv=1.5;shake=8;boom(p.x,p.y,'#ff6b81',10)}if(e.k==='note')e.hp=0;else{e.hp-=1;if(e.hp<=0){p.kills++;score++;boom(e.x,e.y,'#ff8fa8',14);drop(e,p)}}
  if(p.h<=0){p.h=0;p.asleep=true;p.wt=wakeTime();p.rv=0;say('Ой, дракон уснул от цветов…')}}

function updatePlayer(p,dt){
  if(p.gone){p.asleep=true;return}
  p.inv=Math.max(0,p.inv-dt);p.cd-=dt;p.frz=Math.max(0,p.frz-dt);
  if(p.lv[3]>0&&p.sh<shMax(p)){p.shT+=dt;if(p.shT>=SH_T[p.lv[3]]){p.sh++;p.shT=0}}   // щит восстанавливается
  if(p.asleep){p.slept+=dt;p.wt-=dt;
    if(players.some(o=>o!==p&&!o.asleep&&Math.hypot(o.x-p.x,o.y-p.y)<50))p.rv+=dt;   // друг рядом будит за 2 секунды
    if(p.rv>=2)wakeUp(p,true);else if(p.wt<=0)wakeUp(p,false);
    return}
  const{mx,my,ax,ay,fire}=p.in,l=Math.hypot(mx,my);
  if(l&&p.frz<=0){const s=230*(1+.2*p.lv[2]);p.x+=mx/l*s*dt;p.y+=my/l*s*dt}
  p.x=Math.max(24,Math.min(W-24,p.x));p.y=Math.max(70,Math.min(H-24,p.y));
  if(Math.abs(ax-p.x)>28)p.face=ax>p.x?1:-1;if(!p.face)p.face=1;   // смотрит в сторону прицела; рядом с драконом поворот не меняется
  if(fire&&p.cd<=0&&p.frz<=0){const sx=p.x+p.face*34,sy=p.y-6,a=Math.atan2(ay-sy,ax-sx);   // огонь вылетает изо рта
    const nf=flames(p),dm=dmgOf(p);for(let i=0;i<nf;i++){const a2=a+(i-(nf-1)/2)*.16;balls.push({id:++uid,x:sx,y:sy,ang:a2,vx:Math.cos(a2)*540,vy:Math.sin(a2)*540,life:1.3,col:COLORS[p.ci][1],dmg:dm,r:6+dm*1.5,owner:p.id})}
    p.cd=.5*Math.pow(.85,p.lv[1])}}

function update(dt){
  const k=keys;
  Object.assign(me.in,{mx:(k.KeyD||k.ArrowRight?1:0)-(k.KeyA||k.ArrowLeft?1:0),my:(k.KeyS||k.ArrowDown?1:0)-(k.KeyW||k.ArrowUp?1:0),ax:mouse.x,ay:mouse.y,fire:mouse.down});
  for(const p of players)updatePlayer(p,dt);
  for(const b of balls){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    for(const e of enemies){if(e.hp>0&&b.life>0&&Math.hypot(e.x-b.x,e.y-b.y)<e.t.r+8){b.life=0;let dm=b.dmg;if(e.sh>0){const ab=Math.min(e.sh,dm);e.sh-=ab;dm-=ab;boom(b.x,b.y,'#8fd8ff',8);if(dm<=0)continue}e.hp-=dm;boom(b.x,b.y,'#ffb347',5);
      if(e.hp<=0){const o=players[b.owner];o.kills++;score++;boom(e.x,e.y,'#ff8fa8',14);drop(e,o);if(isBoss(e)||Math.random()<.06)say(pick(Q.kill))}}}}
  for(const b of balls)for(const n of notes){if(n.hp>0&&b.life>0&&Math.hypot(n.x-b.x,n.y-b.y)<n.r+8){n.hp=0;b.life=0;boom(n.x,n.y,'#7fd6ff',8)}}   // шар сбивает ноту, награды за это нет
  balls=balls.filter(b=>b.life>0);
  const bn=enemies.filter(o=>o.hp>0&&o.k==='bard').length;   // припев барда раз в 8 секунд ускоряет всех (кроме бардов) на 3 секунды
  if(bn){chorusCd-=dt;if(chorusCd<=0){chorusCd=8;chorusT=3;say('Бард запел припев! Враги ускорились!')}}else chorusCd=Math.max(chorusCd,5);
  chorusT=Math.max(0,chorusT-dt);
  const insp=inspV=chorusT>0?1.6:1;
  for(const e of enemies){if(e.hp<=0)continue;
    const dx=CX-e.x,dy=CY-e.y,d=Math.hypot(dx,dy);
    const lone=lonely(e);if(lone&&!e.rush){e.rush=true;say('Маги остались без прикрытия и бегут к башне!')}
    if(e.t.rng&&d<=e.t.rng&&e.x>24&&e.x<W-24&&e.y>64&&e.y<H-24&&!lone){e.cdn=(e.cdn??1+Math.random())-dt;   // дальний враг стоит и бросает снаряд
      if(e.cdn<=0){e.cdn=e.t.rate;cast(e,dx,dy,d)}
      if(e.t.kind==='heal'){e.scd=(e.scd??1.5+Math.random()*2)-dt;if(e.scd<=0){e.scd=2.5;shieldAllies(e)}}
      }
    else{const sm=e.t.sp*(lone?1.8:1)*(e.k==='bard'?1:insp);e.x+=dx/d*sm*dt;e.y+=dy/d*sm*dt}
    for(const p of players){if(e.hp>0&&!p.asleep&&p.inv<=0&&Math.hypot(e.x-p.x,e.y-p.y)<e.t.r+20)hitDragon(p,e)}
    if(e.hp>0&&d<TOWER_R){tower-=e.t.dmg;e.hp=0;shake=10;boom(CX,CY,'#ffd1dc',10);if(Math.random()<.5)say(pick(Q.hit))}}
  enemies=enemies.filter(e=>e.hp>0);
  if(!enemies.some(o=>o.t.kind==='heal'))for(const o of enemies)o.sh=false;   // нет мага — щиты исчезают
  for(const n of notes){
    
      
    if(n.k==='bag'){n.t+=dt;const u=Math.min(1,n.t/n.d);n.x=n.sx+(n.tx-n.sx)*u;n.y=n.sy+(n.ty-n.sy)*u-Math.sin(Math.PI*u)*60;   // мешок летит по дуге в точку с кольцом-предупреждением
      if(u>=1){n.hp=0;boom(n.tx,n.ty,'#ffd24d',14);for(const p of players)if(!p.asleep&&Math.hypot(p.x-n.tx,p.y-n.ty)<40){p.frz=1.5;say(pick(Q.bag))}}}
    else{n.x+=n.vx*dt;n.y+=n.vy*dt;n.life-=dt;if(n.life<=0)n.hp=0}
    if(n.k==='note'&&n.hp>0&&Math.hypot(n.x-CX,n.y-CY)<TOWER_R){tower-=n.dmg;n.hp=0;shake=6;boom(CX,CY,'#ffd1dc',8);if(Math.random()<.4)say(pick(Q.note))}
    for(const p of players){if(n.hp<=0||p.asleep||Math.hypot(n.x-p.x,n.y-p.y)>=n.r+20)continue;if(n.k==='note'&&p.inv<=0)hitDragon(p,n)}}
  notes=notes.filter(n=>n.hp>0);
  for(const c of pickups){if(!players[c.own].asleep)c.life-=dt;c.res-=dt;
    
    let best=null,bd=1e9;
    for(const p of players){if(p.asleep||(c.res>0&&c.own!==p.id))continue;const d=Math.hypot(p.x-c.x,p.y-c.y);if(d<bd){bd=d;best=p}}
    if(best){if(bd<(c.v>=10?200:130)){const m=bd||1;c.x+=(best.x-c.x)/m*260*dt;c.y+=(best.y-c.y)/m*260*dt}
      if(bd<28){best.w[c.t]+=c.v;if(!c.t)best.earned+=c.v;c.life=0;c.got=true;boom(c.x,c.y,CUR[c.t].c,4)}}}
  for(const c of pickups)if(c.life<=0&&!c.got)boom(c.x,c.y,'#9a8aa8',5);
  pickups=pickups.filter(c=>c.life>0);
  for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}
  parts=parts.filter(p=>p.life>0);
  for(const b of beams)b.life-=dt;
  beams=beams.filter(b=>b.life>0);
  for(const t of tags){t.life-=dt;t.y-=18*dt}
  tags=tags.filter(t=>t.life>0);
  shake=Math.max(0,shake-40*dt);quipT-=dt;
  if(phase==='break'){phaseT-=dt;if(phaseT<=0)phase='spawn'}
  else if(phase==='clear'){phaseT-=dt;if(phaseT<=0)toShop()}
  else{spawnT-=dt;if(queue[0]==='mage'&&queue.length>1&&(enemies.filter(x=>x.k==='mage').length>=2||spawned<4||!enemies.some(x=>x.t.kind!=='heal')))queue.push(queue.shift());   // маги: не больше двух и не раньше основной толпы
    if(queue.length&&spawnT<=0&&enemies.length<MAXON+8*(players.length-1)){spawn(queue.shift());spawnT=Math.max(.3,(1.5-wave*.08)/(1+.5*Math.sqrt(players.length-1)))}
    if(!queue.length&&!enemies.length&&!notes.length){
      if(wave>=TOTAL)state='win';
      else{phase='clear';phaseT=3;say('Волна отбита! Успейте собрать монеты.',3);
        }}}
  if(tower<=0){tower=0;state='lose'}
}

// ===== Отрисовка =====
function emoji(ch,x,y,sz){ctx.font=sz+'px '+FONT;ctx.fillText(ch,x,y)}
function text(s,x,y,sz,col,style=''){ctx.font=style+' '+sz+'px Georgia,serif';ctx.fillStyle=col;ctx.fillText(s,x,y)}
function drawDragon(p){
  const c=COLORS[p.ci][1];
  ctx.fillStyle=c;ctx.globalAlpha=.4;ctx.beginPath();ctx.arc(p.x,p.y,30,0,6.283);ctx.fill();ctx.globalAlpha=1;
  ctx.strokeStyle=c;ctx.lineWidth=3;ctx.stroke();ctx.lineWidth=1;
  if(!(p.inv>0&&Math.floor(p.inv*10)%2)){ctx.globalAlpha=p.asleep?.45:1;drawDragonSprite(p);ctx.globalAlpha=1}
  if(p.asleep){emoji('💤',p.x+24,p.y-28,22);ctx.lineWidth=4;ctx.beginPath();
    ctx.arc(p.x,p.y,36,-1.57,-1.57+6.283*Math.min(1,Math.max(p.rv/2,1-p.wt/wakeTime())));ctx.stroke();ctx.lineWidth=1}
  if(p.frz>0)emoji('💰',p.x-24,p.y-28,22);
  if(p.sh>0){ctx.strokeStyle='#8fd8ff';ctx.lineWidth=3;for(let i=0;i<p.sh;i++){ctx.beginPath();ctx.arc(p.x,p.y,36+i*5,0,6.283);ctx.stroke()}ctx.lineWidth=1}
  
  text(p.name,p.x,p.y+50,14,c)}
function drawShop(){
  ctx.globalAlpha=Math.min(1,shopT/.6);ctx.fillStyle='rgba(20,8,35,.9)';ctx.fillRect(-ox,-oy,cvW,cvH);ctx.textAlign='center';
  text('Волна '+wave+' отбита',CX,90,40,'#ff9bb3','italic');
  text('Золото: '+me.w[0],CX-110,140,24,CUR[0].c);text('Ноты: '+me.w[1],CX+110,140,24,CUR[1].c);
  UP.forEach((u,i)=>{const x=SX+i*206,y=190,cap=capped(me,i),ok=!cap&&me.w[u.t]>=cost(me,i);
    ctx.fillStyle=ok?'#3a2050':'#2a1740';ctx.strokeStyle=ok?CUR[u.t].c:'#6b4a85';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x,y,190,190,14);ctx.fill();ctx.stroke();ctx.lineWidth=1;
    text(u.n,x+95,y+40,17,'#fbe8d3','italic');text(descOf(me,i),x+95,y+80,14,'#d9c3e8');text('Куплено: '+me.lv[i],x+95,y+118,14,'#d9c3e8');
    text(cap?'Максимум':cost(me,i)+' '+(u.t?'нот':'золота')+' ['+(i+1)+']',x+95,y+158,19,ok?CUR[u.t].c:'#8a7096')});
  ctx.fillStyle='#ff9bb3';ctx.beginPath();ctx.roundRect(CX-110,450,220,48,12);ctx.fill();text(me.ready?'Ждём остальных':'Дальше',CX,481,22,'#2a1235');
  text('Нажмите на улучшение или клавишу 1–4, чтобы купить. Пробел — готов к следующей волне.',CX,545,15,'#d9c3e8','italic');
  text('Осталось '+Math.max(0,Math.ceil(shopLeft))+' с · готовы '+players.filter(p=>p.ready&&!p.gone).length+' из '+players.filter(p=>!p.gone).length,CX,578,16,'#d9c3e8');ctx.globalAlpha=1}
function draw(){tintedNow=false;ctx.setTransform(K,0,0,K,0,0);
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1b1030');g.addColorStop(.6,'#5a2a5e');g.addColorStop(1,'#c4577a');
  if(IMG.bg)drawBg();else{ctx.fillStyle=g;ctx.fillRect(0,0,cvW,cvH);
  ctx.fillStyle='#fbe8d3';for(const s of stars){ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,6.283);ctx.fill()}ctx.globalAlpha=1}
  ctx.translate(ox,oy);
  ctx.save();if(shake)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  ctx.textAlign='center';ctx.textBaseline='middle';
  drawCastle();
  for(const e of enemies){emoji(e.t.e,e.x,e.y,e.t.sz);if(e.sh){ctx.strokeStyle='#8fd8ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,e.t.r+6,0,6.283);ctx.stroke();ctx.lineWidth=1}if(e.k==='bard')emoji('🎵',e.x+16,e.y-22,16);else if(inspV>1&&!e.t.rng)emoji('🎶',e.x+14,e.y-22,14);
    if(e.hp<e.max){ctx.fillStyle='#0008';ctx.fillRect(e.x-18,e.y-e.t.r-10,36,4);ctx.fillStyle='#ff6b81';ctx.fillRect(e.x-18,e.y-e.t.r-10,36*e.hp/e.max,4)}}
  for(const b of beams){ctx.strokeStyle='rgba(125,255,154,'+Math.min(1,b.life*3)+')';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x1,b.y1);ctx.lineTo(b.x2,b.y2);ctx.stroke();ctx.lineWidth=1}
  for(const t of tags){ctx.globalAlpha=Math.min(1,t.life*2);text(t.txt,t.x,t.y,15,'#fff3e6','italic')}ctx.globalAlpha=1;
  for(const n of notes){const bg=n.k==='bag';if(bg){ctx.strokeStyle='rgba(255,210,77,'+(.35+.35*Math.sin(n.t*12))+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(n.tx,n.ty,40,0,6.283);ctx.stroke()}ctx.strokeStyle=bg?'#ffd24d':'#ff6b9a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(n.x,n.y,n.r+4,0,6.283);ctx.stroke();ctx.lineWidth=1;emoji(bg?'💰':'🎵',n.x,n.y,24)}
  for(const k of pickups){if(k.life<DROP.warn&&Math.floor(k.life*8)%2)continue;const r=7+Math.min(k.v,10)*.6;ctx.fillStyle=CUR[k.t].c;ctx.strokeStyle=k.t?'#2a6f99':'#b8860b';ctx.lineWidth=2;ctx.beginPath();
    if(k.t){ctx.moveTo(k.x,k.y-r-2);ctx.lineTo(k.x+r,k.y);ctx.lineTo(k.x,k.y+r+2);ctx.lineTo(k.x-r,k.y);ctx.closePath()}else ctx.arc(k.x,k.y,r,0,6.283);
    ctx.fill();ctx.stroke();ctx.lineWidth=1}
  players.filter(p=>!p.gone).forEach(drawDragon);
  for(const b of balls)drawBall(b);
  for(const p of parts){ctx.globalAlpha=Math.max(0,p.life*1.6);ctx.fillStyle=p.col;ctx.fillRect(p.x,p.y,4,4)}ctx.globalAlpha=1;
  ctx.restore();
  if(chorusT>0&&state==='play'){ctx.fillStyle='rgba(255,120,170,'+(.08+.06*Math.sin(chorusT*10))+')';ctx.fillRect(-ox,-oy,cvW,cvH)}
  if(me){ctx.textAlign='left';text('Волна '+wave+' из '+TOTAL,20,28,20,'#fbe8d3');text('Золото: '+me.w[0],20,54,18,CUR[0].c);text('Ноты: '+me.w[1],20,76,18,CUR[1].c);
    emoji('❤️'.repeat(me.h)+'🖤'.repeat(maxH(me)-me.h)+(me.sh?'  '+'🛡️'.repeat(me.sh):''),20,106,20)}
  ctx.textAlign='right';text('Отшито поклонников: '+score,W-20,28,20,'#fbe8d3');text('F — во весь экран',W-14,H-14,13,'#fbe8d399');
  ctx.textAlign='center';text('Нервы принцессы',CX,24,16,'#fbe8d3','italic');
  ctx.fillStyle='#0006';ctx.fillRect(CX-150,36,300,14);ctx.fillStyle=tower>35?'#ff9bb3':'#ff4d4d';ctx.fillRect(CX-150,36,300*tower/100,14);
  {const bn=enemies.filter(o=>o.hp>0&&o.k==='bard').length;if(state==='play'&&chorusT>0)text('Припев! Враги быстрее на 60%',CX,70,15,'#ff9bb3','italic');else if(state==='play'&&bn)text('Бард запоёт через '+Math.ceil(chorusCd)+' с',CX,70,15,'#d9c3e8','italic')}
  if(quipT>0&&state==='play'){ctx.font='italic 18px Georgia,serif';const w=ctx.measureText(quip).width+32;
    ctx.fillStyle='#fff3e6';ctx.beginPath();ctx.roundRect(CX-w/2,CY-130,w,36,12);ctx.fill();text(quip,CX,CY-112,18,'#3b1c3f','italic')}
  if(state==='play'&&phase==='break')text(BN[wave]||'Волна '+wave,CX,H-70,34,'#fbe8d3','italic');
  if(state==='play'&&phase==='clear')text('Волна '+wave+' отбита!',CX,H-70,34,'#ffdd88','italic');
  if(state==='shop')drawShop();
  else if(state!=='play'){
    ctx.fillStyle='rgba(20,8,35,.78)';ctx.fillRect(-ox,-oy,cvW,cvH);ctx.textAlign='center';
    const top=players.slice().sort((a,b)=>b.kills-a.kills).slice(0,5).map(p=>p.name+' '+p.kills).join(', ');
    const L=state==='win'?['Принцесса в безопасности!','Отшито поклонников: '+score,'Лучшие драконы: '+top]
      :['Нервы сдали…','Поклонники прорвались. Дошли до волны '+wave+' из '+TOTAL+'.','Лучшие драконы: '+top+'. Отшито: '+score];
    text(L[0],CX,CY-80,52,'#ff9bb3','italic');text(L[1],CX,CY-10,20,'#fbe8d3');text(L[2],CX,CY+22,20,'#fbe8d3');
    text('Чтобы сыграть ещё раз, хост создаёт новую комнату (обновите страницу).',CX,CY+90,18,'#ffdd88','italic')}
}

// ===== Сеть: хост считает весь мир и рассылает снимки, гости рисуют их и присылают ввод =====
const SHOP_TIME=30,KINDS=Object.keys(T),SNAP_MS=80;
let lastSnap=0,snaps=[],shopLeft=SHOP_TIME,lastIn=0;
const net=o=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify({t:'msg',to:isHost?'all':'host',data:o}))};
const r1=v=>Math.round(v),r10=v=>Math.round(v*10)/10;
function playerByNid(id){return players.find(p=>p.nid===id)}
function clampP(p){p.x=Math.max(24,Math.min(W-24,p.x));p.y=Math.max(70,Math.min(H-24,p.y))}

function sendSnap(now){
  if(now-lastSnap<SNAP_MS)return;lastSnap=now;
  net({k:'snap',st:state,ph:phase,w:wave,tw:r10(tower),sc:score,q:[quip,Math.max(0,quipT)],cT:chorusT,cC:chorusCd,iv:inspV,sl:Math.max(0,shopLeft),sk:r1(shake),
    P:players.map(p=>[r1(p.x),r1(p.y),p.h,p.sh,(p.asleep?1:0)|(p.gone?2:0)|(p.ready?4:0)|(p.face<0?8:0),r10(p.inv),r10(p.frz),r10(p.wt),r10(p.rv),p.kills,p.w[0],p.w[1],p.lv[0],p.lv[1],p.lv[2],p.lv[3]]),
    E:enemies.map(e=>[e.id,KINDS.indexOf(e.k),r1(e.x),r1(e.y),r10(e.hp),r1(e.max),e.sh?1:0]),
    B:balls.map(b=>[b.id,r1(b.x),r1(b.y),b.owner,r10(b.r),Math.round(b.ang*100)]),
    N:notes.map(n=>[n.id,n.k==='bag'?1:0,r1(n.x),r1(n.y),r1(n.tx),r1(n.ty),Math.round(n.t*100)/100]),
    K:pickups.map(c=>[c.id,r1(c.x),r1(c.y),c.v,c.t,r10(c.life)]),
    M:beams.map(b=>[r1(b.x1),r1(b.y1),r1(b.x2),r1(b.y2),Math.round(b.life*100)/100]),
    G:tags.map(t=>[r1(t.x),r1(t.y),t.txt,r10(t.life)]),
    V:evs});
  evs=[];
}
function stepParts(dt){for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}parts=parts.filter(p=>p.life>0)}

// Кадр гостя: отправить ввод, подвинуть своего дракона сразу, остальное показать по снимкам хоста с небольшой задержкой (интерполяция)
function guestFrame(dt,now){
  const k=keys,mx=(k.KeyD||k.ArrowRight?1:0)-(k.KeyA||k.ArrowLeft?1:0),my=(k.KeyS||k.ArrowDown?1:0)-(k.KeyW||k.ArrowUp?1:0);
  if(now-lastIn>60){lastIn=now;net({k:'in',mx,my,ax:r1(mouse.x),ay:r1(mouse.y),f:mouse.down?1:0})}
  stepParts(dt);
  if(state==='shop')shopT+=dt;else shopT=0;
  const L=snaps.length;if(!L)return;
  const b=snaps[L-1],rt=now-130;
  let a=snaps[0],nx=b;
  for(let i=0;i<L;i++){if(snaps[i].recv<=rt)a=snaps[i]}
  for(let i=0;i<L;i++){if(snaps[i].recv>rt){nx=snaps[i];break}}
  const al=a===nx?1:Math.min(1,Math.max(0,(rt-a.recv)/(nx.recv-a.recv))),lp=(u,v)=>u+(v-u)*al;
  state=b.st;phase=b.ph;wave=b.w;tower=b.tw;score=b.sc;quip=b.q[0];quipT=b.q[1];chorusT=b.cT;chorusCd=b.cC;inspV=b.iv;shopLeft=b.sl;
  if(b.sk>shake)shake=b.sk;shake=Math.max(0,shake-40*dt);
  b.P.forEach((q,i)=>{const p=players[i],pa=a.P[i]||q,pn=nx.P[i]||q;
    p.h=q[2];p.sh=q[3];p.asleep=!!(q[4]&1);p.gone=!!(q[4]&2);p.ready=!!(q[4]&4);if(p!==me)p.face=(q[4]&8)?-1:1;p.inv=q[5];p.frz=q[6];p.wt=q[7];p.rv=q[8];p.kills=q[9];
    p.w=[q[10],q[11]];p.lv=[q[12],q[13],q[14],q[15]];
    if(p!==me){p.x=lp(pa[0],pn[0]);p.y=lp(pa[1],pn[1])}});
  // свой дракон: двигается без задержки; к позиции хоста подтягивается мягко (сильнее, если стоит, спит или сильно разошлись)
  if(!me.asleep&&me.frz<=0){const l=Math.hypot(mx,my);if(l){const s=230*(1+.2*me.lv[2]);me.x+=mx/l*s*dt;me.y+=my/l*s*dt}}
  clampP(me);if(!me.asleep&&Math.abs(mouse.x-me.x)>28)me.face=mouse.x>me.x?1:-1;if(!me.face)me.face=1;
  const au=b.P[me.id],err=Math.hypot(au[0]-me.x,au[1]-me.y);
  const gain=(me.asleep||me.frz>0)?.3:err>150?.15:(mx||my)?0:.12,g=1-Math.pow(1-gain,dt*60);
  me.x+=(au[0]-me.x)*g;me.y+=(au[1]-me.y)*g;
  const mp=arr=>new Map((arr||[]).map(e=>[e[0],e])),ea=mp(a.E),ba=mp(a.B),ka=mp(a.K);
  enemies=nx.E.map(e=>{const o=ea.get(e[0]),kk=KINDS[e[1]];return{id:e[0],k:kk,t:T[kk],x:o?lp(o[2],e[2]):e[2],y:o?lp(o[3],e[3]):e[3],hp:e[4],max:e[5],sh:e[6]}});
  balls=nx.B.map(e=>{const o=ba.get(e[0]);return{id:e[0],x:o?lp(o[1],e[1]):e[1],y:o?lp(o[2],e[2]):e[2],r:e[4],ang:e[5]/100,col:COLORS[players[e[3]].ci][1]}});
  notes=nx.N.map(e=>({id:e[0],k:e[1]?'bag':'note',x:e[2],y:e[3],tx:e[4],ty:e[5],t:e[6],r:12}));
  pickups=nx.K.map(e=>{const o=ka.get(e[0]);return{id:e[0],x:o?lp(o[1],e[1]):e[1],y:o?lp(o[2],e[2]):e[2],v:e[3],t:e[4],life:e[5]}});
  beams=b.M.map(e=>({x1:e[0],y1:e[1],x2:e[2],y2:e[3],life:e[4]}));
  tags=b.G.map(e=>({x:e[0],y:e[1],txt:e[2],life:e[3]}));
}

function loop(t){
  const dt=Math.min(.05,(t-last)/1000||0);last=t;
  if(isHost){
    if(state==='play')update(dt);
    else{parts=[];if(state==='shop'){shopT+=dt;shopLeft=SHOP_TIME-shopT;if(shopLeft<=0)nextFromShop()}}
    sendSnap(t);
  }else guestFrame(dt,t);
  draw();
  if(ws&&ws.readyState>1){ctx.fillStyle='rgba(20,8,35,.8)';ctx.fillRect(-ox,-oy,cvW,cvH);ctx.textAlign='center';text('Связь с сервером потеряна. Обновите страницу.',CX,CY,26,'#ff9bb3','italic')}
  requestAnimationFrame(loop);
}

function startGame(o){resizeCanvas();addEventListener('resize',resizeCanvas);
  ws=o.ws;
  players=o.players.map((q,i)=>{const p=makePlayer(i,q.color);p.name=q.name;p.nid=q.id;const a=i/o.players.length*6.283;p.x=CX+Math.cos(a)*110;p.y=CY+Math.sin(a)*110;return p});
  me=players.find(p=>p.nid===o.me.id);isHost=!!o.me.host;active=true;
  resetWorld();
  if(isHost){nextWave();say('Они опять идут… Драконы, вся надежда на вас!',4)}
  requestAnimationFrame(loop);
}
function onMsg(m){
  if(m.t==='players'){                                   // кто-то вышел из комнаты: его дракон исчезает, игра идёт дальше
    if(isHost){const ids=new Set(m.players.map(q=>q.id));players.forEach(p=>{if(!ids.has(p.nid)&&!p.gone){p.gone=true;p.asleep=true;if(state==='shop')checkGo()}})}
    return}
  if(m.t!=='msg')return;
  const d=m.data;
  if(isHost){
    const p=playerByNid(m.from);if(!p||p.gone)return;
    if(d.k==='in')Object.assign(p.in,{mx:+d.mx||0,my:+d.my||0,ax:+d.ax||0,ay:+d.ay||0,fire:!!d.f});
    else if(d.k==='buy'&&state==='shop'&&d.i>=0&&d.i<UP.length)buy(p,d.i|0);
    else if(d.k==='go'&&state==='shop'){p.ready=true;checkGo()}
  }else if(d.k==='snap'){
    d.recv=performance.now();snaps.push(d);if(snaps.length>5)snaps.shift();
    for(const v of d.V)spark(v[0],v[1],v[2],Math.min(v[3],8));
  }
}
window.Game={start:startGame,onMsg,get active(){return active}};

})();
