
// Игра «Башня принцессы» для комнаты: хост считает мир, остальные получают снимки. Собрано из одиночной версии.
(function(){

// ===== Константы и данные =====
const cv=document.getElementById('c'),ctx=cv.getContext('2d'),W=1138,H=640,CX=W/2,CY=Math.round(H*.512);
const TOTAL=10,TOWER_R=70,MOUTH_X=42,MOUTH_Y=8,SX=(W-808)/2,FONT='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const T={knight:{e:'🤵',hp:3,sp:42,dmg:6,r:24,sz:38},bard:{e:'🎻',hp:2,sp:88,dmg:4,r:20,sz:32,rng:260,rate:3},prince:{e:'🤴',hp:70,sp:28,dmg:30,r:38,sz:70,boss:true},king:{e:'👑',hp:200,sp:22,dmg:45,r:44,sz:84,boss:true},mage:{e:'🧙',hp:3,sp:70,dmg:3,r:20,sz:36,rng:270,rate:2,kind:'heal'},merchant:{e:'🤑',hp:4,sp:60,dmg:0,r:20,sz:34,rng:280,rate:3.4,kind:'bag'}};
const BOSS={5:'prince',10:'king'},BN={
  3:'Новый поклонник: бард с серенадами!',
  5:'Босс: Прекрасный принц со свитой',
  6:'Новый поклонник: маг лечит и защищает щитами!',
  8:'Новый поклонник: купец с мешками золота!',
  10:'Финал: отец принцессы и вся свита'
};
const Q={hit:['Опять с цветами!','Я просила не беспокоить!','Передайте ему, что я в отъезде.','У меня мигрень!','Кто дал ему адрес?!'],kill:['Так держать, ящерки!','Спасибо, мои хорошие!','Тишина… наконец-то.','Он даже не обиделся.'],prince:['Прекрасный принц… Только не он!','Он идёт с оркестром! Огонь!!!'],king:['Папа?! Ты тоже?!','Отец привёл гвардию. Драконы, простите меня!'],bard:['Серенады?! Сбивайте ноты, пока они не долетели!','Он поёт под моим окном!'],note:['Это что, серенада?!','Нота в башню — это уже хулиганство!','Сбейте её, она фальшивит!'],mage:['Маг лечит своих! Он их подбадривает стихами!','Кто-нибудь, заткните этого свата!'],merchant:['Купец! Он хочет купить моё внимание!','Не берите его золото, это ловушка!'],bag:['Золото? Да я принцесса, мне не нужно!','Дракон, не считай монеты!']};
const CUR=[{n:'Золото',c:'#ffd24d'},{n:'Свитки',c:'#ecd9a8'}];
// b — базовая цена, s — прирост цены за покупку, t — валюта (0 золото, 1 ноты)
const UP=[{n:'Усиленное дыхание',d:'урон +1, шар крупнее',b:8,s:5,t:0},{n:'Частое дыхание',d:'стреляет на 20% чаще',b:3,s:2,t:1},{n:'Быстрые крылья',d:'скорость +20%',b:3,s:2,t:1},{n:'Драконий щит',d:'поглощает удар',b:10,s:5,t:0}];
// настройки монет: шанс золота с рыцаря, срок жизни обычной и боссовой монеты, когда начинать мигать
const DROP={chance:.7,life:10,boss:20,warn:3};
// состав волн: с какой волны появляется враг, его базовый вес, максимум врагов на экране.
const ENEMY_INTRO={
  knight:1,
  bard:3,
  mage:6,
  merchant:8
},
ENEMY_W={
  knight:4,
  bard:.6,
  mage:.5,
  merchant:1.5
},
MAXON=35,
NEWQ={
  3:'bard',
  6:'mage',
  8:'merchant'
};
const stars=Array.from({length:60},()=>({x:Math.random()*W,y:Math.random()*H*.55,r:Math.random()*1.4+.3}));

// ===== Картинки =====
const IMG={},DFR=9,FFR=6,KFR=6,SDFR=4,dragonCache={},stunnedDragonCache={};
let frameDt=.016,castleV=[],tintedNow=false,cvW=W,cvH=H,ox=0,oy=0,K=1;
function loadImg(k,src){if(typeof Image==='undefined')return;const i=new Image();i.onload=()=>{IMG[k]=i;if(k==='castle')makeCastle()};i.src=src}
loadImg('crown','assets/king_order_crown_icon.png');loadImg('bg','assets/bg.jpg');loadImg('castle','assets/castle.png');loadImg('dragon','assets/dragon.png');loadImg('dragonStunned','assets/dragon_stunned.png');loadImg('fire','assets/fire.png');loadImg('knight','assets/knight.png');loadImg('bard','assets/bard.png');loadImg('bardIdle','assets/bard_idle.png');loadImg('princeStunned','assets/prince_stunned.png');for(const k of ['prince','princeCast','princeThrow','mage','mageCast','merchant','merchantIdle','merchantThrow','king','kingIdle','kingSwing','coinBag','bouquet','ring','scroll'])loadImg(k,'assets/'+k+'.png');
function shade(img,a,rgb){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);x.globalCompositeOperation='source-atop';x.fillStyle='rgba('+rgb+','+a+')';x.fillRect(0,0,c.width,c.height);return c}
function makeCastle(){castleV=[IMG.castle,shade(IMG.castle,.22,'90,10,40'),shade(IMG.castle,.42,'60,0,25')]}
function rgb2hsv(r,g,b){r/=255;g/=255;b/=255;const m=Math.max(r,g,b),n=Math.min(r,g,b),d=m-n;let h=0;
  if(d){if(m===r)h=((g-b)/d)%6;else if(m===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}
  return[h,m?d/m:0,m]}
function hsv2rgb(h,s,v){const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;let r=0,g=0,b=0;
  if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}
  return[Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)]}
function dragonFor(ci){
  if(dragonCache[ci])return dragonCache[ci];if(!IMG.dragon||tintedNow)return null;tintedNow=true;
  const im=IMG.dragon,c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
  const hex=COLORS[ci][1],T=rgb2hsv(parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16));
  const id=x.getImageData(0,0,c.width,c.height),d=id.data;
  for(let i=0;i<d.length;i+=4){if(d[i+3]<20||d[i+1]<=d[i]||d[i+1]<=d[i+2])continue;const h=rgb2hsv(d[i],d[i+1],d[i+2]);
    if(h[0]>55&&h[0]<175&&h[1]>.3){const rgb=hsv2rgb(T[0],Math.min(1,h[1]*T[1]/.75),Math.min(1,h[2]*(.65+.35*T[2])));d[i]=rgb[0];d[i+1]=rgb[1];d[i+2]=rgb[2]}}
  x.putImageData(id,0,0);return dragonCache[ci]=c}
  function dragonStunnedFor(ci){
  if(stunnedDragonCache[ci])return stunnedDragonCache[ci];
  if(!IMG.dragonStunned)return null;

  const im=IMG.dragonStunned;
  const c=document.createElement('canvas');
  c.width=im.width;
  c.height=im.height;
  const x=c.getContext('2d');
  x.drawImage(im,0,0);

  // Use exactly the same player-palette mapping as the normal dragon.
  const hex=COLORS[ci][1];
  const target=rgb2hsv(
    parseInt(hex.slice(1,3),16),
    parseInt(hex.slice(3,5),16),
    parseInt(hex.slice(5,7),16)
  );

  const imageData=x.getImageData(0,0,c.width,c.height);
  const d=imageData.data;

  for(let i=0;i<d.length;i+=4){
    if(d[i+3]<20||d[i+1]<=d[i]||d[i+1]<=d[i+2])continue;

    const h=rgb2hsv(d[i],d[i+1],d[i+2]);
    if(h[0]>55&&h[0]<175&&h[1]>.3){
      const rgb=hsv2rgb(
        target[0],
        Math.min(1,h[1]*target[1]/.75),
        Math.min(1,h[2]*(.65+.35*target[2]))
      );
      d[i]=rgb[0];
      d[i+1]=rgb[1];
      d[i+2]=rgb[2];
    }
  }

  x.putImageData(imageData,0,0);
  return stunnedDragonCache[ci]=c;
}

// Единая матрица трансформации дракона.
// Порядок полностью совпадает с отрисовкой: translate → scale(face) → rotate(angle).
// Так координаты рта и видимый спрайт используют одну и ту же геометрию.
function dragonTransform(p, angleOverride) {
  const angle = Number.isFinite(angleOverride)
    ? angleOverride
    : (Number.isFinite(p.dtilt) ? p.dtilt : (p.tilt || 0));

  const face = p.face < 0 ? -1 : 1;
  const cs = Math.cos(angle);
  const sn = Math.sin(angle);

  return {
    a: face * cs,
    b: sn,
    c: -face * sn,
    d: cs,
    angle,
    face
  };
}

// Положение рта в мировых координатах, рассчитанное той же матрицей,
// которой ниже поворачивается и зеркалится сам спрайт.
function dragonMouthPosition(p, angleOverride) {
  const m = dragonTransform(p, angleOverride);

  return {
    x: p.x + m.a * MOUTH_X + m.c * MOUTH_Y,
    y: p.y + m.b * MOUTH_X + m.d * MOUTH_Y
  };
}

// Наклон спрайта рассчитывается по направлению от центра дракона к курсору.
// Для левого направления учитываем зеркальное отображение спрайта.
// При строго вертикальном наведении угол получается ровно +/- PI/2.
function dragonAimTilt(p, ax, ay) {
  const dx = ax - p.x;
  const dy = ay - p.y;
  const face = p.face < 0 ? -1 : 1;

  // When the dragon faces left and aims almost vertically,
  // snap its body/head angle to an exact vertical direction.
  // This prevents tiny horizontal cursor offsets from tilting the flame.
  const nearVerticalLeft = face < 0 &&
    Math.abs(dx) <= Math.abs(dy) * 0.15;

  if (nearVerticalLeft) {
    return dy < 0 ? -Math.PI / 2 : Math.PI / 2;
  }

  return Math.atan2(dy, face * dx);
}

// Точка старта берётся из фактической матрицы спрайта,
// а направление — из курсора относительно центра дракона.
// Это не даёт смещению рта превращать вертикальный выстрел в диагональный.
function dragonShotFromMouth(p) {
  // Берём ту же матрицу, которой в drawDragonSprite() отображается дракон.
  // Поэтому центральный шар всегда летит вдоль локальной оси морды,
  // включая зеркальное отображение и любой угол поворота.
  const transform = dragonTransform(p);
  const mouth = dragonMouthPosition(p);

  const axisLength = Math.hypot(transform.a, transform.b) || 1;
  const dirX = transform.a / axisLength;
  const dirY = transform.b / axisLength;

  // Небольшой вынос вперёд, чтобы шар начинал движение за кончиком морды.
  const muzzleClearance = 5;

  return {
    x: mouth.x + dirX * muzzleClearance,
    y: mouth.y + dirY * muzzleClearance,
    angle: Math.atan2(dirY, dirX),
    dirX,
    dirY
  };
}

// Трёхшаровый залп раскрывается веером относительно оси головы.
// Центральный шар стартует строго изо рта и летит точно по оси;
// боковые выходят рядом с ним и расходятся симметрично.
function dragonVolleyPositions(shot, count, fanAngle = 0.30, sideGap = 5) {
  if (count <= 1) {
    return [{ x: shot.x, y: shot.y, angle: shot.angle }];
  }

  // Перпендикуляр к оси морды; при любом повороте веер вращается вместе с драконом.
  const sideX = -shot.dirY;
  const sideY = shot.dirX;

  if (count === 2) {
    // При двух снарядах сохраняем центральный и один боковой.
    return [
      { x: shot.x, y: shot.y, angle: shot.angle },
      {
        x: shot.x + sideX * sideGap,
        y: shot.y + sideY * sideGap,
        angle: shot.angle + fanAngle
      }
    ];
  }

  // Центральный шар остаётся на оси головы; боковые расходятся веером.
  return [
    { x: shot.x, y: shot.y, angle: shot.angle },
    {
      x: shot.x + sideX * sideGap,
      y: shot.y + sideY * sideGap,
      angle: shot.angle + fanAngle
    },
    {
      x: shot.x - sideX * sideGap,
      y: shot.y - sideY * sideGap,
      angle: shot.angle - fanAngle
    }
  ];
}

// Локальный и удалённые драконы рисуются с тем же углом,
// который используется при расчёте точки выхода огня.
function updateDragonDrawAngle(p, dt) {
  const target = Number.isFinite(p.tilt) ? p.tilt : 0;

  if (p === me) {
    p.dtilt = target;
  } else {
    const current = Number.isFinite(p.dtilt) ? p.dtilt : target;
    p.dtilt = current + (target - current) * Math.min(1, dt * 18);
  }
}

function drawDragonSprite(p){
  const stunned=p.asleep&&!p.dead;
  const sh=stunned
    ?(dragonStunnedFor(p.ci)||IMG.dragonStunned||dragonFor(p.ci)||IMG.dragon)
    :(dragonFor(p.ci)||IMG.dragon);

  if(!sh){emoji('🐲',p.x,p.y,46);return}
  if(!p.face)p.face=1;

  const frameCount=stunned?SDFR:DFR;
  const frameMs=stunned?300:140/(1+.3*(p.lv?p.lv[2]:0));

  // Advance the stunned animation even while the player is asleep.
  p.ph=(p.ph||p.id*2)+frameDt*1000/frameMs;
  const drawAngle = Number.isFinite(p.dtilt)
  ? p.dtilt
  : (p.tilt || 0);

  const fw=sh.width/frameCount;
  const fh=sh.height;
  const w=96;
  const h=w*fh/fw;
  const f=Math.floor(p.ph)%frameCount;

  const transform = dragonTransform(p, drawAngle);

  ctx.save();
  ctx.translate(p.x,p.y);
  ctx.transform(
    transform.a,
    transform.b,
    transform.c,
    transform.d,
    0,
    0
  );
  ctx.drawImage(sh,f*fw,0,fw,fh,-w/2,-h/2,w,h);
  ctx.restore();
}

function resizeCanvas(){
  const vw=typeof innerWidth==='number'?innerWidth:W,vh=typeof innerHeight==='number'?innerHeight:H,a=Math.min(2.6,Math.max(1.2,vw/vh));
  cvW=Math.round(Math.max(W,H*a));cvH=Math.round(Math.max(H,W/a));ox=(cvW-W)/2;oy=(cvH-H)/2;
  K=Math.max(1,Math.min(2,vh*(typeof devicePixelRatio==='number'?devicePixelRatio:1)/cvH));
  cv.width=Math.round(cvW*K);cv.height=Math.round(cvH*K)}
function drawBg(){const im=IMG.bg,s=Math.max(cvW/im.width,cvH/im.height),w=im.width*s,h=im.height*s;
  ctx.drawImage(im,Math.min(0,Math.max(cvW-w,CX+ox-.5*w)),Math.min(0,Math.max(cvH-h,CY+oy-.512*h)),w,h)}
function drawBall(b){
  const sh=IMG.fire,t=typeof performance!=='undefined'?performance.now():0;
  if(!sh){
    ctx.fillStyle=b.col;
    ctx.beginPath();
    ctx.arc(b.x,b.y,b.r,0,6.283);
    ctx.fill();
    return;
  }
  const fw=sh.width/FFR,fh=sh.height,w=34+(b.r-7.5)*7,h=w*fh/fw,f=Math.floor(t/60+b.id)%FFR;
  ctx.save();
  ctx.translate(b.x,b.y);
  ctx.rotate(b.ang||0);
  ctx.drawImage(sh,f*fw,0,fw,fh,-w*.12,-h/2,w,h);
  ctx.restore();
}
const SPR={knight:{fr:6,h:58,ms:110},bard:{fr:8,h:60,ms:120},bardIdle:{fr:8,h:60,ms:180},prince:{fr:8,h:98,ms:120},princeCast:{fr:8,h:98,ms:130},princeThrow:{fr:8,h:98,ms:100},princeStunned:{fr:8,h:108,ms:160},mage:{fr:8,h:62,ms:130},mageCast:{fr:8,h:62,ms:130},merchant:{fr:8,h:64,ms:120},merchantIdle:{fr:4,h:64,ms:450},merchantThrow:{fr:6,h:64,ms:100},king:{fr:8,h:112,ms:130},kingIdle:{fr:8,h:112,ms:140},kingSwing:{fr:8,h:112,ms:120}};
function drawShadow(x, y, rx, ry, opacity = 0.22) {
  ctx.save();

  const gradient = ctx.createRadialGradient(
    x, y, 0,
    x, y, rx
  );

  gradient.addColorStop(
    0,
    `rgba(20, 10, 25, ${opacity})`
  );

  gradient.addColorStop(
    0.55,
    `rgba(20, 10, 25, ${opacity * 0.5})`
  );

  gradient.addColorStop(1, 'rgba(20, 10, 25, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
  
  function drawEnemy(e){
  drawShadow(
  e.x,
  e.y + e.t.sz * 0.68,
  e.t.r * 1.25,
  e.t.r * 0.35,
  0.24
);
  let key=e.k,fo=-1;
  const near=e.t.rng&&Math.hypot(e.x-CX,e.y-CY)<=e.t.rng+3;

  if(e.k==='bard'&&near&&IMG.bardIdle)key='bardIdle';
  else if(e.k==='mage'&&near&&!e.rush&&IMG.mageCast)key='mageCast';

  else if(e.k==='prince'){
    const ci=castInfo(e);
    const action=e.bossAction||(e.ab&&e.ab.action);
const stunned=!!((e.ab&&e.ab.stun>0)||e.stunned);

if(stunned&&IMG.princeStunned){
  key='princeStunned';
  fo=-1;
}
else if(action==='rose'&&ci[2]>0&&IMG.princeCast){
  key='princeCast';
  fo=Math.floor(ci[2]/100*SPR.princeCast.fr);
}
else if(action==='ring'&&ci[2]>0&&IMG.princeThrow){
  key='princeThrow';
  fo=Math.floor(ci[2]/100*SPR.princeThrow.fr);
}
else if(ci[0]>0&&IMG.princeCast){
  key='princeCast';
  fo=Math.floor(ci[0]/100*SPR.princeCast.fr);
}
  }

  if(e.k==='merchant'){
    const th=castInfo(e)[2];
    if(th>0&&IMG.merchantThrow){
      key='merchantThrow';
      fo=Math.floor(th/100*SPR.merchantThrow.fr);
    }
    else if(near&&IMG.merchantIdle)key='merchantIdle';
  }
  else if(e.k==='king'){
    const pr=castInfo(e)[2];
    if(pr>0&&pr<38&&IMG.kingIdle)key='kingIdle';
    else if(pr>=38&&IMG.kingSwing){
      key='kingSwing';
      fo=Math.floor((pr-38)/62*SPR.kingSwing.fr);
    }
  }

  const sp=SPR[key],sh=sp&&IMG[key];

  if(sh){
    const fw=sh.width/sp.fr,fh=sh.height;
    const h=sp.h,w=h*fw/fh;
    const t=typeof performance!=='undefined'?performance.now():0;
    const f=fo>=0?Math.min(sp.fr-1,fo):Math.floor(t/sp.ms+e.id)%sp.fr;

    ctx.save();
    ctx.translate(e.x,e.y);
    if(e.x>CX)ctx.scale(-1,1);
    ctx.drawImage(sh,f*fw,0,fw,fh,-w/2,-h/2,w,h);
    ctx.restore();
  }
  else if(e.k==='king')drawCrownIcon(e.x,e.y,48,34);
  else emoji(e.t.e,e.x,e.y,e.t.sz);
}
function drawCastle(){
  if(!castleV.length){emoji('🏰',CX,CY-40,100);return}
  const fr=tower/towerMax,st=fr>.66?0:fr>.33?1:2,im=castleV[st],w=210,h=w*im.height/im.width;
  const ct=CY+28-h*.94;
  ctx.drawImage(im,CX-w/2,ct,w,h);
  if(st>0){const tt=(typeof performance!=='undefined'?performance.now():0)/1000;
    for(let i=0;i<3+st*2;i++){const u=(tt*.35+i*.37)%1;ctx.globalAlpha=(1-u)*.35;ctx.fillStyle='#bbb';ctx.beginPath();
      ctx.arc(CX+(i%3-1)*40+Math.sin(tt+i)*6,ct+h*.12-u*70,10+u*16,0,6.283);ctx.fill()}ctx.globalAlpha=1}}

// ===== Состояние мира =====
let state='play',wave=0,tower=100,towerMax=100,score=0,queue=[],spawnT=0,phase='break',phaseT=0;
let TEST_MODE=false,testInvulnerable=false;
let enemies=[],notes=[],beams=[],balls=[],pickups=[],parts=[],shake=0,quip='',quipT=0,last=0,shopT=0,spawned=0,inspV=1,chorusCd=6,chorusT=0,chorusBardId=null,tags=[],uid=0,evs=[],active=false,zones=[],bossProjectiles=[],markId=-1,markT=0;

// ===== Игроки =====
let players=[],me=null,isHost=false,ws=null;
const maxH=p=>3,flames=p=>1+Math.min(2,Math.ceil(p.lv[0]/2)),dmgOf=p=>1+Math.floor(p.lv[0]/2),shMax=p=>p.lv[3]>=3?2:p.lv[3]>=1?1:0,SH_T=[0,10,7,6];
const wakeTime=()=>15;
const cost=(p,i)=>UP[i].b+p.lv[i]*UP[i].s;
const capped=(p,i)=>p.lv[i]>=[5,5,3,3][i];
const descOf=(p,i)=>[['два пламени за выстрел','урон пламени +1','три пламени за выстрел','урон пламени +1','взрыв по правой кнопке (раз в 5 с)'][p.lv[0]],'скорострельность +15%','скорость полёта +20%',['щит на 1 удар (10 с)','щит быстрее: 7 с','2 заряда, 6 с'][p.lv[3]]][i]||UP[i].d;
function makePlayer(id,ci){
  return{id,ci,name:'',nid:'',gone:false,dead:false,acd:0,tilt:0,ph:0,x:CX,y:CY-105,h:3,inv:0,asleep:false,wt:0,rv:0,cd:0,frz:0,sh:0,shT:0,coinGlow:0,ready:false,
    w:[0,0],lv:[0,0,0,0],kills:0,earned:0,slept:0,
    in:{mx:0,my:0,ax:CX,ay:0,fire:false}}
}

// ===== Ввод =====
const mouse={x:CX,y:0,down:false,alt:false},keys={};
function pos(e){const r=cv.getBoundingClientRect();mouse.x=(e.clientX-r.left)*cvW/r.width-ox;mouse.y=(e.clientY-r.top)*cvH/r.height-oy}
cv.addEventListener('pointermove',pos);
cv.addEventListener('pointerdown',e=>{pos(e);
  if(state==='shop'){if(shopT>.4)shopClick();return}
  if(e.button===2){mouse.alt=true;lastIn=0;return}
  mouse.down=true;lastIn=0});
cv.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('pointerup',e=>{if(e.button===2)mouse.alt=false;else mouse.down=false;lastIn=0});
addEventListener('keydown',e=>{if(!active)return;if(e.target&&/^(INPUT|SELECT|BUTTON)$/.test(e.target.tagName))return;if(e.code==='KeyF'&&document.documentElement&&document.documentElement.requestFullscreen){if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen()}keys[e.code]=true;lastIn=0;if(e.code.startsWith('Arrow')||e.code==='Space')e.preventDefault();
  if(state==='shop'&&shopT>.4){if(e.code==='Space'||e.code==='Enter')goReq();if(/^Digit[1-4]$/.test(e.code))buyReq(+e.code[5]-1)}});
addEventListener('keyup',e=>{keys[e.code]=false;lastIn=0});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouse.down=false;mouse.alt=false});

// ===== Вспомогательное =====
const pick=a=>a[Math.random()*a.length|0];
const isBoss=e=>e.k==='prince'||e.k==='king';
function say(t,s=3){quip=t;quipT=s}
function tag(e,txt){tags.push({x:e.x,y:e.y-34,txt,life:1.3})}
function boom(x,y,col,n){if(isHost&&evs.length<40)evs.push([Math.round(x),Math.round(y),col,n]);spark(x,y,col,n)}
function spark(x,y,col,n){if(parts.length>400)return;for(let i=0;i<n;i++){const a=Math.random()*6.283,v=30+Math.random()*100;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.42+Math.random()*.25,col})}}

// ===== Магазин =====
function buy(p,i){const c=cost(p,i),t=UP[i].t;if(p.w[t]>=c&&!capped(p,i)){p.w[t]-=c;p.lv[i]++;if(i===3){p.sh=shMax(p);p.shT=0}}}
function goOn(){me.ready=true;checkGo()}
function checkGo(){if(players.every(p=>p.gone||p.ready))nextFromShop()}
function nextFromShop(){players.forEach(p=>p.ready=false);state='play';nextWave()}
function buyReq(i){if(isHost)buy(me,i);else net({k:'buy',i})}
function goReq(){if(isHost)goOn();else net({k:'go'})}
function shopClick(){UP.forEach((u,i)=>{const x=SX+i*206;if(mouse.x>x&&mouse.x<x+190&&mouse.y>190&&mouse.y<380)buyReq(i)});if(Math.abs(mouse.x-CX)<110&&mouse.y>450&&mouse.y<498)goReq()}

// ===== Ход игры =====
function resetWorld(){state='play';wave=0;tower=towerMax;score=0;enemies=[];notes=[];beams=[];tags=[];balls=[];pickups=[];parts=[];shake=0;zones=[];bossProjectiles=[];markId=-1}
function nextWave(){
  wave++;queue=[];spawned=0;
  const n=Math.round((4+wave*2.2)*(1+.85*Math.sqrt(players.length-1))*(BOSS[wave]?.85:1));
  // состав волны: pickType() и таблица ENEMY_INTRO
  for(let i=0;i<n;i++)queue.push(pickType());
  if(BOSS[wave]){for(const k in ENEMY_INTRO)if(ENEMY_INTRO[k]<=wave){let c=queue.filter(x=>x===k).length;while(c++<(k==='mage'||k==='bard'?2:3))queue.push(k)}}
  for(const k in ENEMY_INTRO){const w0=wave-ENEMY_INTRO[k];if(ENEMY_INTRO[k]>1&&w0>=0&&w0<2){let c=queue.filter(x=>x===k).length;while(c++<2)queue.push(k)}}
  queue.sort(()=>Math.random()-.5);
  if(BOSS[wave])queue.splice(n>>1,0,BOSS[wave]);
  phase='break';phaseT=3;spawnT=0;if(BOSS[wave])say(pick(Q[BOSS[wave]]),4);else if(NEWQ[wave])say(pick(Q[NEWQ[wave]]),4)}
function pickType(){const ks=Object.keys(ENEMY_INTRO).filter(k=>ENEMY_INTRO[k]<=wave),w=ks.map(k=>ENEMY_W[k]*(wave-ENEMY_INTRO[k]<2?2.5:1));
  let r=Math.random()*w.reduce((a,b)=>a+b,0);for(let i=0;i<ks.length;i++){r-=w[i];if(r<=0)return ks[i]}return ks[0]}

// ===== Индивидуальные траектории боссов =====
// У принца — одна широкая S-образная дуга.
// У короля — отдельная многоволновая траектория с тремя заметными изгибами.
function bossPathBend(path, u) {
  const envelope = Math.sin(Math.PI * u);

  if (path.kind === 'king') {
    // Три последовательных боковых отклонения вместо прямого захода.
    // Небольшая асимметрия делает манёвр короля отличимым от траектории принца.
    return Math.sin(3 * Math.PI * u) * (0.78 + 0.22 * envelope)
      + 0.10 * Math.sin(Math.PI * u);
  }

  return Math.sin(2 * Math.PI * u) * (0.78 + 0.22 * envelope);
}

function bossPathPoint(path, u) {
  const bend = bossPathBend(path, u);

  return {
    x: path.sx + (path.tx - path.sx) * u
      + path.px * path.amplitude * bend,
    y: path.sy + (path.ty - path.sy) * u
      + path.py * path.amplitude * bend
  };
}

function makeBossPath(k, x, y, targetRadius, targetPoint, maxAmplitude) {
  // Учитываем размер спрайта, чтобы босс оставался в пределах экрана.
  const margin = Math.max(T[k].r + 16, 54);
  x = Math.max(margin, Math.min(W - margin, x));
  y = Math.max(margin, Math.min(H - margin, y));

  const dxToCenter = CX - x;
  const dyToCenter = CY - y;
  const centerDistance = Math.hypot(dxToCenter, dyToCenter) || 1;

  let tx, ty;

  if (targetPoint) {
    // Дополнительная заданная точка используется для патруля короля по краю поля.
    tx = Math.max(margin, Math.min(W - margin, targetPoint.x));
    ty = Math.max(margin, Math.min(H - margin, targetPoint.y));
  } else if (targetRadius !== undefined) {
    // Отдельная точка для отхода и повторного сближения принца.
    tx = CX - dxToCenter / centerDistance * targetRadius;
    ty = CY - dyToCenter / centerDistance * targetRadius;
  } else if (k === 'prince') {
    // Принц останавливается перед видимой границей замка.
    const castleW = 210;
    const castleH = IMG.castle
      ? castleW * IMG.castle.height / IMG.castle.width
      : 220;

    const left = CX - castleW / 2;
    const right = CX + castleW / 2;
    const top = CY + 28 - castleH * .94;
    const bottom = CY + 28 + castleH * .06;

    const dirX = (x - CX) / centerDistance;
    const dirY = (y - CY) / centerDistance;
    const exits = [];

    if (dirX > 0.000001) exits.push((right - CX) / dirX);
    else if (dirX < -0.000001) exits.push((left - CX) / dirX);

    if (dirY > 0.000001) exits.push((bottom - CY) / dirY);
    else if (dirY < -0.000001) exits.push((top - CY) / dirY);

    const edgeDistance = Math.min(...exits.filter(v => v >= 0));
    const safeDistance = edgeDistance + T[k].r + 20;

    tx = CX + dirX * safeDistance;
    ty = CY + dirY * safeDistance;
  } else {
    // Король направляется к замку по собственной многоволновой кривой.
    tx = CX;
    ty = CY;
  }

  const dx = tx - x;
  const dy = ty - y;
  const distance = Math.hypot(dx, dy) || 1;
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const wantedAmplitude = maxAmplitude !== undefined ? maxAmplitude : (k === 'king' ? 320 : 230);

  // Проверяем оба направления изгиба. Выбираем то, у которого больше
  // свободного места внутри экрана, чтобы сохранить выраженную кривую
  // и не допустить выхода босса за границы поля.
  const pathShape = { kind: k };

  function allowedAmplitudeForSide(side) {
    let allowed = wantedAmplitude;

    for (let i = 1; i < 257; i++) {
      const u = i / 256;
      const bend = bossPathBend(pathShape, u);
      const baseX = x + dx * u;
      const baseY = y + dy * u;
      const ox = normalX * side * bend;
      const oy = normalY * side * bend;

      if (ox > 1e-8) allowed = Math.min(allowed, (W - margin - baseX) / ox);
      else if (ox < -1e-8) allowed = Math.min(allowed, (margin - baseX) / ox);

      if (oy > 1e-8) allowed = Math.min(allowed, (H - margin - baseY) / oy);
      else if (oy < -1e-8) allowed = Math.min(allowed, (margin - baseY) / oy);
    }

    const safetyFactor = k === 'king' ? 0.95 : 0.98;
    return Math.max(0, Math.min(wantedAmplitude, allowed) * safetyFactor);
  }

  const ampPositive = allowedAmplitudeForSide(1);
  const ampNegative = allowedAmplitudeForSide(-1);
  let side;

  if (Math.abs(ampPositive - ampNegative) < 8) {
    side = Math.random() < 0.5 ? 1 : -1;
  } else {
    side = ampPositive > ampNegative ? 1 : -1;
  }

  const path = {
    kind: k,
    sx: x,
    sy: y,
    tx,
    ty,
    px: normalX * side,
    py: normalY * side,
    amplitude: side === 1 ? ampPositive : ampNegative,
    u: 0,
    len: 0,
    arrived: false
  };

  // Длина индивидуальной кривой нужна для равномерной скорости движения.
  let prev = bossPathPoint(path, 0);
  for (let i = 1; i <= 256; i++) {
    const next = bossPathPoint(path, i / 256);
    path.len += Math.hypot(next.x - prev.x, next.y - prev.y);
    prev = next;
  }

  return path;
}


// Пока король отдаёт пять указов, он патрулирует по внешней дуге поля,
// а не стоит на месте и не идёт преждевременно прямо к башне.
function makeKingPatrolPath(e) {
  const a = e.ab || (e.ab = {});
  const margin = Math.max(T.king.r + 16, 54);
  const rx = Math.max(80, W / 2 - margin - 24);
  const ry = Math.max(80, H / 2 - margin - 24);

  if (!Number.isFinite(a.patrolAngle)) {
    a.patrolAngle = Math.atan2((e.y - CY) / ry, (e.x - CX) / rx);
    a.patrolDirection = e.id % 2 === 0 ? -1 : 1;
  }

  a.patrolAngle += (a.patrolDirection || 1) * 0.48;
  const targetPoint = {
    x: CX + rx * Math.cos(a.patrolAngle),
    y: CY + ry * Math.sin(a.patrolAngle)
  };

  // Небольшой изгиб сохраняет характерную траекторию короля,
  // но не уводит его через центр к башне до пятого указа.
  e.path = makeBossPath('king', e.x, e.y, undefined, targetPoint, 24);
}

function spawn(k){
  spawned++;
  const a=Math.random()*6.283,t=T[k],s=k==='prince'?1+(players.length-1)*BOSSCFG.hpPrince:k==='king'?1+(players.length-1)*BOSSCFG.hpKing:1+(wave-1)*.2;
  let x,y;

  if(t.boss){
    // Боссы появляются на внутренней границе экрана, а не за его пределами.
    const margin=Math.max(t.r+16,54);
    const vx=Math.cos(a),vy=Math.sin(a);
    const tx=vx>0?(W-margin-CX)/vx:vx<0?(margin-CX)/vx:Infinity;
    const ty=vy>0?(H-margin-CY)/vy:vy<0?(margin-CY)/vy:Infinity;
    const distance=Math.min(tx>0?tx:Infinity,ty>0?ty:Infinity);
    x=CX+vx*distance;
    y=CY+vy*distance;
  }else{
    // Обычные враги сохраняют прежнее появление за границами экрана.
    x=CX+Math.cos(a)*(W/2+230);
    y=CY+Math.sin(a)*(H/2+150);
  }

  const e={id:++uid,k,t,x,y,hp:t.hp*s,max:t.hp*s};
  if(t.boss)e.path=makeBossPath(k,e.x,e.y);
  enemies.push(e);
}
function nx(p,i){return{lv:p.lv.map((v,j)=>j===i?v+1:v)}}
function descNew(p,i){const n=capped(p,i)?p:nx(p,i);
  return['пламени×урон: '+flames(p)+'×'+dmgOf(p)+' → '+flames(n)+'×'+dmgOf(n),
    'выстр./с: '+(1/(.5*Math.pow(.85,p.lv[1]))).toFixed(1)+' → '+(1/(.5*Math.pow(.85,n.lv[1]))).toFixed(1),
    'скорость: '+Math.round(230*(1+.2*p.lv[2]))+' → '+Math.round(230*(1+.2*n.lv[2])),
    'щит: '+shMax(p)+' → '+shMax(n)+', восст. '+(SH_T[n.lv[3]]||'—')+' с'][i]}
function drop(e,o){const D={knight:[Math.random()<DROP.chance?1:0,0],bard:[0,1],mage:[2,0],merchant:[2,0],prince:[10,4],king:[20,8]}[e.k];
  D.forEach((v,t)=>{if(v)pickups.push({id:++uid,x:e.x+(t?12:-12),y:e.y,v,t,life:isBoss(e)?DROP.boss:DROP.life,own:o.id,res:3})})}
function toShop(){for(const c of pickups)boom(c.x,c.y,'#9a8aa8',5);pickups=[];for(const p of players){p.asleep=false;p.dead=false;p.h=Math.min(maxH(p),p.h+1);p.inv=0;p.frz=0;p.sh=shMax(p);p.shT=0;p.ready=false}state='shop';shopT=0}

// ===== Способности боссов =====
const BLAST={cd:5,r:55,mult:1};
function damageEnemy(e,dmg,o){
  if(e.hp<=0)return;if(e.sh>0){const ab=Math.min(e.sh,dmg);e.sh-=ab;dmg-=ab}
  e.hp-=dmg;if(e.hp<=0){o.kills++;score++;boom(e.x,e.y,'#ff8fa8',14);drop(e,o);if(isBoss(e)||Math.random()<.06)say(pick(Q.kill))}}
function explode(b){const o=players[b.owner],dmg=Math.max(1,Math.round(b.dmg*BLAST.mult));
  boom(b.x,b.y,'#ff9a3d',30);boom(b.x,b.y,'#ffe27a',14);shake=Math.max(shake,4);
  for(const e of enemies)if(e.hp>0&&Math.hypot(e.x-b.x,e.y-b.y)<BLAST.r+e.t.r)damageEnemy(e,dmg,o);
  for(const n of notes)if(n.hp>0&&Math.hypot(n.x-b.x,n.y-b.y)<BLAST.r)n.hp=0}
const BOSSCFG={hpPrince:1,hpKing:1.4,roseEvery:9,roseDelay:1.5,roseR:55,castT:7,castBreak:.18,castHit:.25,stun:4,castCd:16,decreeEvery:7,disgraceEvery:5.2,disgraceT:8};
const THROW_T=.8,KING_ACT=1.3,KING_MIN_DECREES=5,KING_MIN_DISGRACES=5;
function castInfo(e){
  if(e.ab){const a=e.ab,th=a.thr>0?Math.max(1,Math.round((1-a.thr/(a.thrT||THROW_T))*100)):0;
    return a.cast>0?[Math.round((1-a.cast/a.castT)*100),Math.min(100,Math.round(Math.max(0,a.castHp-e.hp)/(e.max*BOSSCFG.castBreak)*100)),th]:[0,0,th]}
  return[e.cast||0,e.ip||0,e.thr||0]}
function bossAI(e,dt){
  const a=e.ab||(e.ab=e.k==='prince'
    ?{
      t1:5,
      cast:0,
      castT:BOSSCFG.castT,
      castHp:0,
      cd:6,
      stun:0,
      thr:0,
      thrT:THROW_T,
      action:null,
      arrived:false,
      afterStun:false,
      repositionPathStarted:false,
      repositioned:false
    }
    :{t1:3,t2:8,stun:0,decreeCount:0,disgraceCount:0,approachStarted:false});

  const f=e.hp<e.max*.5?.6:1;
  e.hold=false;

  if(e.k==='king'&&!a.patrolStarted&&!a.approachStarted){
    a.patrolStarted=true;
    makeKingPatrolPath(e);
  }

  // Пока длится оглушение, босс не двигается и не атакует.
  if(a.stun>0){
    a.stun=Math.max(0,a.stun-dt);
    e.hold=true;
    return;
  }

  if(e.k==='prince'){
    // После снятия оглушения принц начинает новую фазу сближения:
    // сначала немного отходит от башни, затем снова подходит к ней.
    if(a.afterStun&&!a.repositionPathStarted){
      a.arrived=false;
      a.repositionPathStarted=true;
      a.repositioned=false;
      e.path=makeBossPath(
        'prince',
        e.x,
        e.y,
        TOWER_R+e.t.r+120
      );
    }


if(a.thr>0&&a.action){

  const finishedAction=a.action;

  a.thr=Math.max(0,a.thr-dt);

  // Цветы не останавливают движение,
  // кольцо останавливает до завершения броска.
  e.hold=finishedAction!=='rose';

  if(a.thr===0){
    a.action=null;

    // После завершения броска кольца
    // запускаем новый цикл движения принца.
    if(finishedAction==='ring'){

      a.afterStun=true;
      a.repositionPathStarted=false;
      a.repositioned=false;
      a.arrived=false;

      a.cd=0;
      a.t1=0.5;
    }
  }

  return;
}


    // Предложение.
    if(a.cast>0){
      e.hold=true;
      a.cast=Math.max(0,a.cast-dt);

      // Если предложение сорвано, запускаем оглушение и последующее движение.
      if(a.castHp-e.hp>=e.max*BOSSCFG.castBreak){
        a.cast=0;
        a.stun=BOSSCFG.stun;
        a.cd=0;
        a.action=null;
        a.afterStun=true;
        a.repositionPathStarted=false;
        a.repositioned=false;

        say('Предложение сорвано! Принц оглушён!');
        tag(e,'Оглушён!');
        boom(e.x,e.y,'#ffd24d',16);
        return;
      }

      // Кольцо запускается только после полного завершения предложения.
      if(a.cast===0){
        a.cd=BOSSCFG.castCd;
        throwPrinceRing(e);
      }
      return;
    }



if(!a.arrived){

  // Цветы бросаются на обоих этапах движения:
  // при отходе от башни и при повторном приближении.

  a.t1-=dt;

  if(a.t1<=0){

    // После оглушения атакует чаще.
    a.t1=a.afterStun
      ? 3.5
      : BOSSCFG.roseEvery*f;

    roseRain(e);
    return;
  }

  return;
}



    // Вблизи башни — только предложение и последующий бросок кольца.
    a.cd-=dt;
    if(a.cd<=0){
      a.cast=a.castT;
      a.castHp=e.hp;
      a.action='proposal';
      e.hold=true;
      say('Принц делает предложение! Собьём его, пока не поздно!',4);
      tag(e,'Предложение!');
    }
    return;
  }


  // Король продолжает движение во время выполнения способностей.
  if(a.thr>0){
    a.thr=Math.max(0,a.thr-dt);

    // Не останавливаем короля во время анимации.
    e.hold=false;

    if(a.thr===0)a.action=null;
  }

  // Король не продолжает действия после достижения лимита.
  // Если очередная опала ожидает выполнения, но рыцарей уже нет,
  // отменяем её без объявления и не увеличиваем счётчик обвинений.
  const knightsRemain=enemies.some(o=>o.k==='knight'&&o.hp>0);

  if(a.pend){
    e.hold=false;

    const pendingDecreeDone=a.pend==='decree'&&(a.decreeCount||0)>=KING_MIN_DECREES;
    const pendingAccusationImpossible=a.pend==='disgrace'&&!knightsRemain;

    if(pendingDecreeDone||pendingAccusationImpossible){
      a.pend=null;
      a.thr=0;
      a.did=false;
    }else{
      if(a.thr<=0){
        a.pend=null;
      }
      else if(a.thr<=KING_ACT-.5&&!a.did){
        a.did=true;

        if(a.pend==='decree'){
          decree(e);
        }
        else{
          disgrace(e);
        }
      }

      return;
    }
  }

  const decreesDone=(a.decreeCount||0)>=KING_MIN_DECREES;
  const accusationsDone=(a.disgraceCount||0)>=KING_MIN_DISGRACES;
  const accusationsCanContinue=knightsRemain&&!accusationsDone;

  // Пять указов обязательны. Пять обвинений король произносит только
  // пока на поле есть живые рыцари. Если рыцари закончились, опала
  // отменяется, и после пятого указа король сразу идёт к башне.
  if(!a.approachStarted&&decreesDone&&(accusationsDone||!knightsRemain)){
    a.approachStarted=true;
    a.pend=null;
    a.thr=0;
    e.path=makeBossPath('king',e.x,e.y);

    if(!knightsRemain){
      say('На поле больше нет рыцарей. Король отменяет опалу и направляется к башне!',4);
    }else{
      say('Король отдал пять указов и пять раз объявил драконов похитителями. Теперь он направляется к башне!',4);
    }
    tag(e,'К башне!');
  }

  // Таймеры независимы: максимум пять указов и максимум пять обвинений.
  // Обвинения не запускаются, когда живых рыцарей на поле больше нет.
  if(!a.approachStarted){
    if(!decreesDone)a.t1-=dt;
    if(accusationsCanContinue)a.t2-=dt;

    if(!decreesDone&&a.t1<=0){
      a.t1=BOSSCFG.decreeEvery*f;
      a.pend='decree';
      a.did=false;
      a.thr=a.thrT=KING_ACT;
    }
    else if(accusationsCanContinue&&a.t2<=0){
      a.t2=BOSSCFG.disgraceEvery*f;
      a.pend='disgrace';
      a.did=false;
      a.thr=a.thrT=KING_ACT;
    }
  }

  e.hold=false;
}
function throwPrinceRing(e){
  const sx=e.x;
  const sy=e.y-28;
  const tx=CX;
  const ty=CY-20;
  const dist=Math.hypot(tx-sx,ty-sy);
  const flight=Math.max(.65,dist/320);

  bossProjectiles.push({
    id:++uid,
    kind:'ring',
    sx,sy,tx,ty,
    t:0,
    d:flight,
    arc:34,
    zoneId:0
  });

  // Анимация броска вперёд
  e.ab.thr=e.ab.thrT=flight;
  e.ab.action='ring';

  say('Принц бросает кольцо!');
  tag(e,'Кольцо!');
}

function updateBossProjectiles(dt){
  const remain=[];

  for(const p of bossProjectiles){
    p.t=Math.min(p.d,p.t+dt);

    if(p.t>=p.d){
      if(p.kind==='bouquet'){
        const z=zones.find(z=>z.id===p.zoneId);
        if(z)z.landed=true;
      }
      else{
        if(!(TEST_MODE&&testInvulnerable))tower=Math.max(0,tower-towerMax*BOSSCFG.castHit);
        shake=14;
        boom(CX,CY,'#ff9bb3',24);
        say('Принц успел бросить кольцо! Принцесса в смятении!');
      }
    }
    else remain.push(p);
  }

  bossProjectiles=remain;
}

function drawBossProjectiles(){
  const now=typeof performance!=='undefined'?performance.now():0;

  for(const p of bossProjectiles){
    const u=Math.max(0,Math.min(1,p.t/p.d));
    const x=p.sx+(p.tx-p.sx)*u;
    const y=p.sy+(p.ty-p.sy)*u-Math.sin(Math.PI*u)*p.arc;

    const sheet=p.kind==='bouquet'?IMG.bouquet:IMG.ring;
    const size=p.kind==='bouquet'?42:38;

    if(sheet)drawSheet(sheet,6,x,y,size,now/95+p.id);
    else emoji(p.kind==='bouquet'?'💐':'💍',x,y,size);
  }
}
function roseRain(e){
  const n=Math.min(12,3+Math.ceil(players.length*.6));
  const alive=players.filter(p=>!p.asleep&&!p.gone);

  for(let i=0;i<n;i++){
    let x,y;

    if(alive.length&&Math.random()<.6){
      const p=alive[Math.random()*alive.length|0];
      x=p.x+(Math.random()-.5)*90;
      y=p.y+(Math.random()-.5)*90;
    }
    else{
      x=80+Math.random()*(W-160);
      y=130+Math.random()*(H-200);
    }

    const zone={
      id:++uid,
      x:Math.max(40,Math.min(W-40,x)),
      y:Math.max(90,Math.min(H-40,y)),
      r:BOSSCFG.roseR,
      t:0,
      d:BOSSCFG.roseDelay,
      landed:false
    };

    zones.push(zone);

    // Букет летит от принца к целевой точке
    bossProjectiles.push({
      id:++uid,
      kind:'bouquet',
      sx:e.x,
      sy:e.y-30,
      tx:zone.x,
      ty:zone.y,
      t:-.12,
      d:.66,
      arc:72,
      zoneId:zone.id
    });
  }

  say('Принц осыпает всех розами! Уходите с красных кругов!');
  tag(e,'Розы!');

  // Анимация поднятия рук
e.ab.thr=e.ab.thrT=THROW_T;
e.ab.action='rose';
e.hold=false;
}
function decree(e){
  const a=e.ab;
  // Жёсткий предел: никакие повторные вызовы не создадут шестой указ.
  if(a&&(a.decreeCount||0)>=KING_MIN_DECREES)return;

  const n=4+Math.ceil(Math.sqrt(players.length)*2);
  for(let i=0;i<n;i++)spawn('knight');
  const count=a?(a.decreeCount=(a.decreeCount||0)+1):1;
  say(count>=KING_MIN_DECREES?'Пятый королевский указ! Стража собрана.':'Королевский указ '+count+'/'+KING_MIN_DECREES+': стража, на помощь!');
  tag(e,'Указ '+Math.min(count,KING_MIN_DECREES)+'/'+KING_MIN_DECREES);
}
function disgrace(e){
  // Опала имеет смысл только пока на поле есть живые рыцари.
  // Если их уже нет, не объявляем игрока похитителем и не считаем действие.
  if(!enemies.some(o=>o.k==='knight'&&o.hp>0))return false;

  const alive=players.filter(p=>!p.asleep&&!p.gone);if(!alive.length)return false;
  const a=e.ab;
  if(a&&(a.disgraceCount||0)>=KING_MIN_DISGRACES)return false;

  const p=alive[Math.random()*alive.length|0];markId=p.id;markT=BOSSCFG.disgraceT;
  const count=a?(a.disgraceCount=(a.disgraceCount||0)+1):1;
  say('Король в '+count+'-й раз объявил '+p.name+' похитителем принцессы! Драконы, защищайтесь! ('+count+'/'+KING_MIN_DISGRACES+')',4);
  tag(e,'Похититель '+Math.min(count,KING_MIN_DISGRACES)+'/'+KING_MIN_DISGRACES);
  return true;
}
function drawZones(){
  const t=typeof performance!=='undefined'?performance.now()/1000:0;

  for(const z of zones){
    const u=Math.min(1,z.t/z.d);

    ctx.globalAlpha=.08+.20*u;
    ctx.fillStyle='#ff2d55';
    ctx.beginPath();
    ctx.arc(z.x,z.y,z.r,0,6.283);
    ctx.fill();

    ctx.globalAlpha=.45+.3*Math.sin(t*14);
    ctx.strokeStyle='#ff4d6d';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.arc(z.x,z.y,z.r,0,6.283);
    ctx.stroke();

    ctx.lineWidth=1;
    ctx.globalAlpha=1;

    if(z.landed){
      if(IMG.bouquet)drawSheet(IMG.bouquet,6,z.x,z.y,38,t*9+z.id);
      else emoji('🌹',z.x,z.y,24);
    }
  }
}
function drawEnemyMarks(e){
  const t=typeof performance!=='undefined'?performance.now()/1000:0;
  if(e.chase){ctx.strokeStyle='rgba(255,60,60,'+(.65+.3*Math.sin(t*10))+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,e.t.r+9,0,6.283);ctx.stroke();ctx.lineWidth=1}
  const ci=castInfo(e);
  if(ci[0]>0){const w=110,x=e.x-w/2,y=e.y-e.t.r-34;
    ctx.fillStyle='#0009';ctx.fillRect(x,y,w,16);ctx.fillStyle='#ffd24d';ctx.fillRect(x,y,w*ci[0]/100,8);ctx.fillStyle='#ff5a4d';ctx.fillRect(x,y+8,w*ci[1]/100,8);
    if(IMG.ring)drawSheet(IMG.ring,6,e.x,y-16,26,(typeof performance!=='undefined'?performance.now():0)/130);else emoji('💍',e.x,y-12,22);text('собьём!',e.x,y+30,13,'#fbe8d3','italic')}}
const isCaster=kind=>kind==='heal'||kind==='bag';
function casterOnly(){return !enemies.some(o=>o.hp>0&&!isCaster(o.t.kind))&&!queue.some(k=>!isCaster(T[k].kind))}
function drawRoster(){
  ctx.save();
  const ps=players.filter(p=>!p.gone);
  const active=ps.filter(p=>!p.asleep&&!p.dead).length;

  // HUD coordinates are anchored to the visible viewport, not the 1138x640 world.
  // draw() has already translated by (ox, oy), so subtract those offsets here.
  const viewRight=cvW-ox;
  const viewTop=-oy;
  const right=viewRight-20;
  // The rightmost marker's outer edge lines up with the right-aligned HUD labels.
  const markerRight=right-9;
  const cols=Math.min(9,Math.max(1,ps.length));
  const gap=28;
  const top=viewTop+82;
  const t=typeof performance!=='undefined'?performance.now()/1000:0;

  ctx.textBaseline='middle';
  ctx.textAlign='right';
  text('Отшито поклонников: '+score,right,viewTop+24,16,'#fbe8d3');
  text('Драконы в строю: '+active+' / '+ps.length,right,viewTop+48,13,'#d9c3e8');

  ps.forEach((p,i)=>{
    const col=i%cols;
    const row=Math.floor(i/cols);
    const x=markerRight-col*gap;
    const y=top+row*27;

    ctx.globalAlpha=p.dead?.38:p.asleep?.72:1;
    ctx.fillStyle=COLORS[p.ci][1];
    ctx.beginPath();
    ctx.arc(x,y,9,0,6.283);
    ctx.fill();
    ctx.globalAlpha=1;

    if(p===me){
      ctx.strokeStyle='#fff';
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(x,y,12,0,6.283);
      ctx.stroke();
      ctx.lineWidth=1;
    }

    ctx.textAlign='center';
    if(p.dead){
      emoji('💀',x,y,13);
    }else if(p.asleep){
      ctx.strokeStyle='rgba(255,70,70,'+(.6+.4*Math.sin(t*8))+')';
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(x,y,11,0,6.283);
      ctx.stroke();
      ctx.lineWidth=1;
      text(String(Math.max(0,Math.ceil(p.wt))),x,y+1,9,'#fff');
    }else{
      text((p.name||'').slice(0,1).toUpperCase(),x,y+1,11,'#1b1030');
    }
  });
  ctx.restore();
}
function lonely(e){return e.t.kind==='heal'&&casterOnly()}
function shieldAllies(e){
  // Боссы получают приоритетный щит перед обычными противниками.
  const unshieldedBosses=enemies.filter(
    o=>o!==e&&o.hp>0&&!o.sh&&isBoss(o)
  );
  const unshieldedOthers=enemies.filter(
    o=>o!==e&&o.hp>0&&!o.sh&&!isBoss(o)
  );

  // Сохраняем общий лимит защищённых союзников. Если он уже достигнут,
  // освобождаем место для босса, снимая щит с обычного врага.
  let shieldedCount=enemies.filter(o=>o.hp>0&&o.sh).length;
  const bossSlots=Math.min(2,unshieldedBosses.length);
  const freeSlots=Math.max(0,6-shieldedCount);
  const needFree=Math.max(0,bossSlots-freeSlots);

  if(needFree>0){
    const replace= enemies.filter(
      o=>o.hp>0&&o.sh&&!isBoss(o)
    ).slice(-needFree);
    for(const o of replace){
      o.sh=0;
      shieldedCount--;
    }
  }

  const slots=Math.max(0,Math.min(2,6-shieldedCount));
  const targets=[...unshieldedBosses,...unshieldedOthers].slice(0,slots);

  for(const o of targets){
    o.sh=2;
    boom(o.x,o.y,'#8fd8ff',6);
  }

  if(targets.length)tag(e,'Щит!');
}
function woundedNear(e){for(const o of enemies){if(o!==e&&o.hp>0&&o.hp<o.max&&Math.hypot(o.x-e.x,o.y-e.y)<=260)return true}return false}
function cast(e,dx,dy,d,force){
  let k=force||e.t.kind;
  if(k==='heal'){
    const wounded=enemies.filter(o=>
      o!==e&&o.hp>0&&o.hp<o.max&&Math.hypot(o.x-e.x,o.y-e.y)<=260
    );

    // Раненый босс всегда приоритетнее обычных врагов.
    // Если босс полностью здоров или вне радиуса, лечим наиболее раненого союзника.
    const bossTarget=wounded.find(isBoss)||null;
    const best=bossTarget||wounded.reduce((target,o)=>
      !target||(o.max-o.hp)>(target.max-target.hp)?o:target,
      null
    );

    if(best){
      // Сохраняем прежний объём лечения, но выбираем босса первым.
      const healAmount=isBoss(best)?1:Math.max(1,best.max*.3);
      best.hp=Math.min(best.max,best.hp+healAmount);
      beams.push({x1:e.x,y1:e.y,x2:best.x,y2:best.y,life:.4});
      boom(best.x,best.y,'#7dff9a',6);
      tag(e,isBoss(best)?'Защищаю босса!':'Лечу!');
    }else{
      e.cdn=.5;
    }
    return;
  }
  let tx=CX,ty=CY;
  if(k==='bag'){let bd=1e9;for(const p of players){if(p.asleep)continue;const q=Math.hypot(p.x-e.x,p.y-e.y);if(q<bd){bd=q;tx=p.x;ty=p.y}}}
  const a=Math.atan2(ty-e.y,tx-e.x),v=k==='bag'?130:110;
  if(k==='bag'&&casterOnly()&&notes.filter(n=>n.k==='bag').length<15){
    tag(e,'Распродажа!');e.cdn=e.t.rate*.5;e.actL=e.actT=.6;
    for(let i=0;i<3;i++){const an=i*2.094+Math.random()*.6,bx=Math.max(30,Math.min(W-30,tx+Math.cos(an)*75)),by=Math.max(80,Math.min(H-30,ty+Math.sin(an)*75));
      notes.push({id:++uid,x:e.x,y:e.y,vx:0,vy:0,hp:1,k:'bag',dmg:0,r:12,life:5,sx:e.x,sy:e.y,tx:bx,ty:by,t:0,d:1.1})}
    return}
  if(k==='bag')e.actL=e.actT=.6;
  tag(e,k==='bag'?'Держи!':'♪ Ля-ля!');notes.push({id:++uid,x:e.x,y:e.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,hp:1,k:k==='bag'?'bag':'note',dmg:e.t.dmg,r:12,life:5,sx:e.x,sy:e.y,tx,ty,t:0,d:1.1})}
function wakeUp(p,byFriend){p.asleep=false;p.h=1;p.inv=2;p.rv=0;
  if(byFriend)say('Дракона разбудили!');else{p.w[0]=Math.floor(p.w[0]*.75);say('Дракон проснулся. Часть золота потерялась по дороге.')}}
function hitDragon(p,e){if(TEST_MODE&&testInvulnerable){if(e.k==='note')e.hp=0;return}if(p.sh>0){p.sh--;p.shT=0;p.inv=.8;shake=3;boom(p.x,p.y,'#8fd8ff',10)}else{p.h--;p.inv=1.5;shake=8;boom(p.x,p.y,'#ff6b81',10)}if(e.k==='note')e.hp=0;else{e.hp-=1;if(e.hp<=0){p.kills++;score++;boom(e.x,e.y,'#ff8fa8',14);drop(e,p)}}
  if(p.h<=0){p.h=0;p.asleep=true;p.wt=wakeTime();p.rv=0;say('Дракон упал! Его надо поднять за 15 секунд.')}}

function updatePlayer(p,dt){
  p.coinGlow=Math.max(0,(p.coinGlow||0)-dt);
  if(p.in&&(p.in.fire||p.in.alt))p.coinGlow=0;
  if(p.gone){p.asleep=true;return}

  p.inv=Math.max(0,p.inv-dt);
  p.cd-=dt;
  p.frz=Math.max(0,p.frz-dt);

  if(p.lv[3]>0&&p.sh<shMax(p)){
    p.shT+=dt;
    if(p.shT>=SH_T[p.lv[3]]){
      p.sh++;
      p.shT=0;
    }
  }

  if(p.asleep){
    if(p.dead)return;

    p.slept+=dt;
    p.wt-=dt;

    if(players.some(o=>o!==p&&!o.asleep&&Math.hypot(o.x-p.x,o.y-p.y)<50)){
      p.rv+=dt;
    }

    if(p.rv>=2){
      wakeUp(p,true);
    }else if(p.wt<=0){
      p.dead=true;
      p.w[0]=Math.floor(p.w[0]*.75);
      say(p.name+' погиб: до магазина дракон выбывает.',4);
      boom(p.x,p.y,'#9a8aa8',16);
    }

    return;
  }

  const {mx,my,ax,ay,fire}=p.in;
  const moveLength=Math.hypot(mx,my);

  if(moveLength&&p.frz<=0){
    const speed=230*(1+.2*p.lv[2]);
    p.x+=mx/moveLength*speed*dt;
    p.y+=my/moveLength*speed*dt;
  }

  p.x=Math.max(24,Math.min(W-24,p.x));
  p.y=Math.max(70,Math.min(H-24,p.y));

  // Сначала выбираем сторону, в которую смотрит дракон.
  // Порог небольшой, чтобы разворот влево/вправо не запаздывал.
  if(Math.abs(ax-p.x)>1){
    p.face=ax>p.x?1:-1;
  }
  if(!p.face)p.face=1;

  // Наклон рассчитывается уже с учётом выбранной стороны.
  const targetTilt=dragonAimTilt(p,ax,ay);
  p.tilt+=(targetTilt-p.tilt)*Math.min(1,dt*18);

  updateDragonDrawAngle(p,dt);

  // Обычная атака: точка выхода и направление берутся из одной матрицы спрайта.
  if(fire&&p.cd<=0&&p.frz<=0){
    const shot=dragonShotFromMouth(p);
    const nf=flames(p);
    const dm=dmgOf(p);

    const volley=dragonVolleyPositions(shot,nf);
    for(const pellet of volley){
      const angle=pellet.angle;
      balls.push({
        id:++uid,
        x:pellet.x,
        y:pellet.y,
        ang:angle,
        vx:Math.cos(angle)*540,
        vy:Math.sin(angle)*540,
        life:1.3,
        col:COLORS[p.ci][1],
        dmg:dm,
        r:6+dm*1.5,
        owner:p.id
      });
    }

    p.cd=.5*Math.pow(.85,p.lv[1]);
  }

  // Особая атака использует ту же точку выхода изо рта.
  p.acd-=dt;

  if(p.in.alt&&p.lv[0]>=5&&p.acd<=0&&p.frz<=0){
    const shot=dragonShotFromMouth(p);

    balls.push({
      id:++uid,
      x:shot.x,
      y:shot.y,
      ang:shot.angle,
      vx:Math.cos(shot.angle)*470,
      vy:Math.sin(shot.angle)*470,
      life:1.1,
      col:COLORS[p.ci][1],
      dmg:dmgOf(p),
      r:16,
      owner:p.id,
      blast:true
    });

    p.acd=BLAST.cd;
  }
}

function update(dt){
  const k=keys;
  Object.assign(me.in,{mx:(k.KeyD||k.ArrowRight?1:0)-(k.KeyA||k.ArrowLeft?1:0),my:(k.KeyS||k.ArrowDown?1:0)-(k.KeyW||k.ArrowUp?1:0),ax:mouse.x,ay:mouse.y,fire:mouse.down,alt:mouse.alt});
  for(const p of players)updatePlayer(p,dt);
  if(!players.some(p=>!p.asleep&&!p.gone)){state='lose';return}
  for(const b of balls){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    for(const e of enemies){if(e.hp>0&&b.life>0&&Math.hypot(e.x-b.x,e.y-b.y)<e.t.r+8){b.life=0;let dm=b.dmg;if(e.sh>0){const ab=Math.min(e.sh,dm);e.sh-=ab;dm-=ab;boom(b.x,b.y,'#8fd8ff',8);if(dm<=0)continue}e.hp-=dm;boom(b.x,b.y,'#ffb347',5);
      if(e.hp<=0){const o=players[b.owner];o.kills++;score++;boom(e.x,e.y,'#ff8fa8',14);drop(e,o);if(isBoss(e)||Math.random()<.06)say(pick(Q.kill))}}}}
  for(const b of balls)for(const n of notes){if(n.hp>0&&b.life>0&&Math.hypot(n.x-b.x,n.y-b.y)<n.r+8){n.hp=0;b.life=0;boom(n.x,n.y,'#7fd6ff',8)}}
  for(const b of balls)if(b.blast&&b.life<=0)explode(b);
  balls=balls.filter(b=>b.life>0);

const activeBards = enemies.filter(
  e => e.hp > 0 && e.k === 'bard'
);

if(activeBards.length){

  chorusCd -= dt;

  if(chorusCd <= 0){

    chorusCd = 8;
    chorusT = 3;

    // Выбираем одного барда, который запускает ускорение.
    // Это ближайший к замку живой бард.
    const caster = activeBards.reduce((best, current) => {
      const currentDist = Math.hypot(
        current.x - CX,
        current.y - CY
      );

      const bestDist = best
        ? Math.hypot(best.x - CX, best.y - CY)
        : Infinity;

      return currentDist < bestDist ? current : best;
    }, null);

    chorusBardId = caster ? caster.id : null;

    say('Бард запел припев! Враги ускорились!');
  }

}else{

  chorusCd = Math.max(chorusCd, 5);
  chorusT = 0;
  chorusBardId = null;
}

chorusT = Math.max(0, chorusT - dt);

// После окончания ускорения убираем музыкальный эффект.
if(chorusT <= 0){
  chorusBardId = null;
}

  chorusT=Math.max(0,chorusT-dt);
  const insp=inspV=chorusT>0?1.6:1;

if(markId>=0){

  markT-=dt;

  const mp=players[markId];

  // Проверяем, остались ли живые рыцари на карте.
  const knightsRemain=enemies.some(
    e=>e.k==='knight'&&e.hp>0
  );

  // Снимаем опалу, если рыцарей больше нет,
  // истёк таймер или выбранный игрок выбыл.
  if(
    !knightsRemain||
    markT<=0||
    !mp||
    mp.asleep||
    mp.gone
  ){
    markId=-1;
    markT=0;

    say(
      !knightsRemain
        ? 'Опала закончилась: рыцарей больше нет!'
        : 'Опала закончилась.'
    );
  }
}

players.forEach(p=>{
  p.mark=p.id===markId;
});

  for(const e of enemies){if(e.hp<=0)continue;
    let dx=CX-e.x,dy=CY-e.y,d=Math.hypot(dx,dy);e.chase=0;if(e.actL>0){e.actL-=dt;e.thr=e.actL>0?Math.max(1,Math.round((1-e.actL/e.actT)*100)):0}
    if(e.t.boss)bossAI(e,dt);
    if(markId>=0&&!e.t.rng&&!e.t.boss){const mp=players[markId];dx=mp.x-e.x;dy=mp.y-e.y;d=Math.hypot(dx,dy)||1;e.chase=1}
    const lone=lonely(e);if(lone&&!e.rush){e.rush=true;say('Маги остались без прикрытия и бегут к башне!')}
    // Маг может начать поддержку, когда босс входит в радиус лечения,
    // даже если сам маг ещё не подошёл близко к замку.
    const bossInHealRange=e.t.kind==='heal'&&enemies.some(o=>
      o!==e&&o.hp>0&&isBoss(o)&&Math.hypot(o.x-e.x,o.y-e.y)<=260
    );
    if(e.t.rng&&(d<=e.t.rng||bossInHealRange)&&e.x>24&&e.x<W-24&&e.y>64&&e.y<H-24&&!lone){e.cdn=(e.cdn??1+Math.random())-dt;
      if(e.cdn<=0){e.cdn=e.t.rate;cast(e,dx,dy,d)}
      if(e.t.kind==='heal'){e.scd=(e.scd??1.5+Math.random()*2)-dt;if(e.scd<=0){e.scd=2.5;shieldAllies(e)}}
    }
    else if(!e.hold){
      const sm=e.t.sp*(lone?1.8:1)*(e.k==='bard'?1:insp);
if (e.path) {
  if (!e.path.arrived) {
    e.path.u = Math.min(1, e.path.u + sm * dt / e.path.len);
    const q = bossPathPoint(e.path, e.path.u);
    e.x = q.x;
    e.y = q.y;

    if (e.path.u >= 1) {
      e.path.arrived = true;

      if (e.k === 'king' && e.ab && !e.ab.approachStarted) {
        makeKingPatrolPath(e);
      }

      if (e.k === 'prince' && e.ab) {
        if (e.ab.afterStun && e.ab.repositionPathStarted) {
if (!e.ab.repositioned) {

  // Первый этап завершён.
  // Начинаем возвращение к башне.

  e.ab.repositioned = true;

  // Следующий бросок цветов не придётся долго ждать.
  e.ab.t1 = 0.5;

e.path = makeBossPath(
  'prince',
  e.x,
  e.y
);
} else {
            // Повторно приблизился к башне — можно делать предложение.
            e.ab.afterStun = false;
            e.ab.repositionPathStarted = false;
            e.ab.repositioned = false;
            e.ab.arrived = true;
            e.ab.cd = 0;
            e.ab.t1 = Infinity;
          }
        } else {
          // Первое достижение точки остановки.
          e.ab.arrived = true;
          e.ab.cd = 0;
          e.ab.t1 = Infinity;
        }
      }
    }
  }
} else {
  e.x += dx / d * sm * dt;
  e.y += dy / d * sm * dt;
}
    }
    for(const p of players){if(e.hp>0&&!p.asleep&&p.inv<=0&&Math.hypot(e.x-p.x,e.y-p.y)<e.t.r+20)hitDragon(p,e)}
    if(e.hp>0&&Math.hypot(CX-e.x,CY-e.y)<TOWER_R){if(!(TEST_MODE&&testInvulnerable))tower-=e.t.dmg;e.hp=0;shake=10;boom(CX,CY,'#ffd1dc',10);if(Math.random()<.5)say(pick(Q.hit))}}
  enemies=enemies.filter(e=>e.hp>0);
  if(!enemies.some(o=>o.t.kind==='heal'))for(const o of enemies)o.sh=false;
  for(const n of notes){
    if(n.k==='bag'){
      n.t+=dt;
      const u=Math.min(1,n.t/n.d);
      n.x=n.sx+(n.tx-n.sx)*u;
      n.y=n.sy+(n.ty-n.sy)*u-Math.sin(Math.PI*u)*60;
      if(u>=1){
        n.hp=0;
        boom(n.tx,n.ty,'#ffd24d',14);
        for(const p of players){
          if(!p.asleep&&!p.gone&&!p.dead&&Math.hypot(p.x-n.tx,p.y-n.ty)<42){
            // The gold-bag impact freezes the dragon for the full duration.
            p.frz=Math.max(p.frz||0,1.5);
            say(pick(Q.bag));
          }
        }
      }
    }
    else{n.x+=n.vx*dt;n.y+=n.vy*dt;n.life-=dt;if(n.life<=0)n.hp=0}
    if(n.k==='note'&&n.hp>0&&Math.hypot(n.x-CX,n.y-CY)<TOWER_R){if(!(TEST_MODE&&testInvulnerable))tower-=n.dmg;n.hp=0;shake=6;boom(CX,CY,'#ffd1dc',8);if(Math.random()<.4)say(pick(Q.note))}
    for(const p of players){if(n.hp<=0||p.asleep||Math.hypot(n.x-p.x,n.y-p.y)>=n.r+20)continue;if(n.k==='note'&&p.inv<=0)hitDragon(p,n)}}
  notes=notes.filter(n=>n.hp>0);
  for(const z of zones){z.t+=dt;if(z.t>=z.d){for(const p of players)if(!p.asleep&&!p.gone&&p.inv<=0&&Math.hypot(p.x-z.x,p.y-z.y)<z.r)hitDragon(p,{k:'note',hp:1});boom(z.x,z.y,'#ff4d6d',12)}}
  zones=zones.filter(z=>z.t<z.d);
  updateBossProjectiles(dt);
  for(const c of pickups){if(!players[c.own].asleep)c.life-=dt;c.res-=dt;
    let best=null,bd=1e9;
    for(const p of players){if(p.asleep||(c.res>0&&c.own!==p.id))continue;const d=Math.hypot(p.x-c.x,p.y-c.y);if(d<bd){bd=d;best=p}}
    if(best){if(bd<(c.v>=10?200:130)){const m=bd||1;c.x+=(best.x-c.x)/m*260*dt;c.y+=(best.y-c.y)/m*260*dt}
      if(bd<28){best.w[c.t]+=c.v;if(!c.t){best.earned+=c.v;best.coinGlow=(best.in&&(best.in.fire||best.in.alt))?0:1.2;}c.life=0;c.got=true;boom(c.x,c.y,CUR[c.t].c,4)}}}
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
  else if(phase==='clear'){phaseT-=dt;if(phaseT<=0){if(TEST_MODE){phase='break';phaseT=1e9}else toShop()}}
  else{spawnT-=dt;if(queue[0]==='bard'&&queue.length>1&&enemies.filter(x=>x.k==='bard').length>=2+Math.ceil(Math.sqrt(players.length)))queue.push(queue.shift());
    if(queue[0]==='mage'&&queue.length>1&&(enemies.filter(x=>x.k==='mage').length>=2||spawned<4||!enemies.some(x=>x.t.kind!=='heal')))queue.push(queue.shift());
    if(queue.length&&spawnT<=0&&enemies.length<MAXON+8*(players.length-1)){spawn(queue.shift());spawnT=Math.max(TEST_MODE?0.05:0.3,(TEST_MODE?0.14:1.5-wave*0.08)/(1+0.5*Math.sqrt(players.length-1)))}
    if(!queue.length&&!enemies.length&&!notes.length){
      if(TEST_MODE){phase='clear';phaseT=.35;say('Волна очищена. Выберите следующую в панели тестирования.',3)}
      else if(wave>=TOTAL)state='win';
      else{phase='clear';phaseT=3;say('Волна отбита! Успейте собрать монеты.',3);
        }}}
  if(tower<=0){tower=0;state='lose'}
}

// ===== Отрисовка =====
function emoji(ch,x,y,sz){ctx.font=sz+'px '+FONT;ctx.fillText(ch,x,y)}
function text(s,x,y,sz,col,style=''){ctx.font=style+' '+sz+'px Georgia,serif';ctx.fillStyle=col;ctx.fillText(s,x,y)}
function drawCrownIcon(x,y,w=34,h=24){
  if(IMG.crown){
    ctx.drawImage(IMG.crown,x-w/2,y-h/2,w,h);
    return;
  }
  ctx.save();
  ctx.translate(x-w/2,y-h/2);
  ctx.lineJoin='round';
  ctx.lineWidth=1.5;
  ctx.fillStyle='#f4bd3e';
  ctx.strokeStyle='#75431d';
  ctx.beginPath();
  ctx.moveTo(2,h*.78);
  ctx.lineTo(1,h*.22);
  ctx.lineTo(w*.27,h*.49);
  ctx.lineTo(w*.40,h*.07);
  ctx.lineTo(w*.59,h*.49);
  ctx.lineTo(w*.81,h*.17);
  ctx.lineTo(w-2,h*.29);
  ctx.lineTo(w*.91,h*.80);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle='#b72f37';
  for(const gx of [w*.27,w*.50,w*.78]){
    ctx.beginPath();
    ctx.arc(gx,h*.49,Math.max(1.5,w*.045),0,6.283);
    ctx.fill();
  }
  ctx.fillStyle='#d98724';
  ctx.fillRect(w*.08,h*.80,w*.84,h*.12);
  ctx.restore();
}
function drawDragon(p){
  const now=typeof performance!=='undefined'?performance.now():0;

  drawShadow(p.x,p.y+38,42,12,0.18);

  // Compact shield rings, close to the dragon and with a lighter outline.
  if(p.sh>0){
    ctx.save();
    const pulse=.9+.1*Math.sin(now/170+p.id);
    for(let i=0;i<p.sh;i++){
      ctx.strokeStyle='rgba(143,216,255,'+(0.68*pulse)+')';
      ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.arc(p.x,p.y,38+i*4.5,0,6.283);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Не рисуем цветной круг вокруг дракона: при некоторых палитрах
  // он выглядит как постороннее жёлтое свечение во время выстрела.

  if(!(p.inv>0&&Math.floor(p.inv*10)%2)){
    ctx.globalAlpha=p.dead?.22:p.asleep?.45:1;
    drawDragonSprite(p);
    ctx.globalAlpha=1;
  }

  // A clearly visible, shield-like golden halo appears when the dragon
  // collects a gold coin. Draw it after the sprite so it cannot be hidden.
  const isFiring = !!(p.in && (p.in.fire || p.in.alt)) ||
    (p===me && !!(mouse && (mouse.down || mouse.alt)));
  if((p.coinGlow||0)>0 && !isFiring){
    const strength=Math.min(1,p.coinGlow/1.2);
    const pulse=.88+.12*Math.sin(now/70+p.id*1.7);
    const radius=44+1.5*Math.sin(now/110+p.id);
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.shadowColor='rgba(255,205,45,'+(0.72*strength)+')';
    ctx.shadowBlur=8*strength;
    ctx.strokeStyle='rgba(255,211,65,'+(0.82*strength*pulse)+')';
    ctx.lineWidth=2.5;
    ctx.beginPath();
    ctx.arc(p.x,p.y,radius,0,6.283);
    ctx.stroke();
    ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,239,160,'+(0.46*strength*pulse)+')';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.arc(p.x,p.y,radius-3,0,6.283);
    ctx.stroke();
    ctx.restore();
  }

  if(p.dead){
    emoji('💀',p.x,p.y-34,26);
  }else if(p.asleep){
    text(String(Math.max(0,Math.ceil(p.wt))),p.x,p.y-52,16,'#ffdd88');
    ctx.lineWidth=4;
    ctx.beginPath();
    ctx.arc(p.x,p.y,36,-1.57,-1.57+6.283*Math.min(1,Math.max(p.rv/2,1-p.wt/wakeTime())));
    ctx.stroke();
    ctx.lineWidth=1;
  }

  if(p.mark){
    const t=now/1000;
    ctx.strokeStyle='rgba(255,60,60,'+(.6+.35*Math.sin(t*10))+')';
    ctx.lineWidth=4;
    ctx.beginPath();
    ctx.arc(p.x,p.y,48,0,6.283);
    ctx.stroke();
    ctx.lineWidth=1;
    drawCrownIcon(p.x,p.y-57,34,24);
  }

  // Merchant's gold-bag effect uses the animated coinBag sprite already in assets.
  if(p.frz>0){
    if(IMG.coinBag)drawSheet(IMG.coinBag,6,p.x+54,p.y-38,30,now/110+p.id);
    else emoji('💰',p.x+54,p.y-38,22);
  }

  text(p.name,p.x,p.y+50,14,c);
}

function drawCoin(x,y,r){ctx.fillStyle='#ffd24d';ctx.strokeStyle='#a8741a';ctx.lineWidth=Math.max(1.5,r*.18);ctx.beginPath();ctx.arc(x,y,r,0,6.283);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#e8a92a';ctx.lineWidth=Math.max(1,r*.12);ctx.beginPath();ctx.arc(x,y,r*.62,0,6.283);ctx.stroke();
  ctx.fillStyle='#fff3b0';ctx.beginPath();ctx.arc(x-r*.3,y-r*.3,r*.16,0,6.283);ctx.fill();ctx.lineWidth=1}
function drawScroll(x,y,r){const w=r*1.5,h=r*1.9;
  ctx.fillStyle='#ecd9a8';ctx.strokeStyle='#8a6a2e';ctx.lineWidth=Math.max(1.5,r*.15);
  ctx.beginPath();ctx.roundRect(x-w/2,y-h/2,w,h,r*.18);ctx.fill();ctx.stroke();
  ctx.fillStyle='#d6bd80';ctx.beginPath();ctx.ellipse(x,y-h/2,w/2+r*.12,r*.28,0,0,6.283);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.ellipse(x,y+h/2,w/2+r*.12,r*.28,0,0,6.283);ctx.fill();ctx.stroke();
  ctx.lineWidth=Math.max(1,r*.1);for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(x-w*.32,y+i*h*.2);ctx.lineTo(x+w*.32,y+i*h*.2);ctx.stroke()}ctx.lineWidth=1}
function drawSheet(sh,fr,x,y,h,ph){const fw=sh.width/fr,fh=sh.height,w=h*fw/fh;ctx.drawImage(sh,(Math.floor(ph)%fr)*fw,0,fw,fh,x-w/2,y-h/2,w,h)}
const drawIcon=(t,x,y,r)=>t?(IMG.scroll?ctx.drawImage(IMG.scroll,x-r*1.3*IMG.scroll.width/IMG.scroll.height,y-r*1.3,r*2.6*IMG.scroll.width/IMG.scroll.height,r*2.6):drawScroll(x,y,r)):drawCoin(x,y,r);

function drawPrincessSpeech(message, centerX, viewLeft, viewRight, viewTop, viewBottom, preferredY){
  const viewportWidth=Math.max(160,viewRight-viewLeft);
  const viewportHeight=Math.max(140,viewBottom-viewTop);
  const padX=15, padY=9, fontSize=17, lineHeight=21;
  const boxMaxWidth=Math.max(128,viewportWidth-32);
  const maxTextWidth=Math.max(100,boxMaxWidth-padX*2);
  const words=String(message||'').trim().split(/\s+/).filter(Boolean);
  const lines=[];
  let line='';

  ctx.save();
  ctx.font='italic '+fontSize+'px Georgia,serif';

  const pushLongWord=(word)=>{
    let part='';
    for(const ch of Array.from(word)){
      const test=part+ch;
      if(part&&ctx.measureText(test).width>maxTextWidth){
        if(line){lines.push(line);line='';}
        lines.push(part);
        part=ch;
      }else part=test;
    }
    if(part){
      if(line&&ctx.measureText(line+' '+part).width<=maxTextWidth)line+=' '+part;
      else{if(line)lines.push(line);line=part;}
    }
  };

  for(const word of words){
    const candidate=line?line+' '+word:word;
    if(ctx.measureText(candidate).width<=maxTextWidth){
      line=candidate;
    }else if(ctx.measureText(word).width>maxTextWidth){
      if(line){lines.push(line);line='';}
      pushLongWord(word);
    }else{
      if(line)lines.push(line);
      line=word;
    }
  }
  if(line)lines.push(line);
  if(!lines.length)lines.push('');

  // Keep even unusually long lines inside short/tall viewports.
  const maxLines=Math.max(1,Math.floor((viewportHeight-116-padY*2)/lineHeight));
  if(lines.length>maxLines){
    lines.length=maxLines;
    let last=lines[maxLines-1];
    while(last.length&&ctx.measureText(last+'…').width>maxTextWidth)last=last.slice(0,-1);
    lines[maxLines-1]=last+'…';
  }

  const measuredWidth=Math.max(...lines.map(v=>ctx.measureText(v).width));
  const boxWidth=Math.min(boxMaxWidth,measuredWidth+padX*2);
  const boxHeight=lines.length*lineHeight+padY*2;
  const minX=viewLeft+16;
  const maxX=Math.max(minX,viewRight-16-boxWidth);
  const boxX=Math.max(minX,Math.min(maxX,centerX-boxWidth/2));
  const minY=viewTop+70;
  const maxY=Math.max(minY,viewBottom-boxHeight-18);
  const boxY=Math.max(minY,Math.min(maxY,preferredY));

  ctx.fillStyle='#fff3e6';
  ctx.beginPath();
  ctx.roundRect(boxX,boxY,boxWidth,boxHeight,12);
  ctx.fill();
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.font='italic '+fontSize+'px Georgia,serif';
  ctx.fillStyle='#3b1c3f';
  lines.forEach((row,i)=>ctx.fillText(row,boxX+boxWidth/2,boxY+padY+lineHeight*(i+.5),maxTextWidth));
  ctx.restore();
}
function drawShop(){
  ctx.globalAlpha=Math.min(1,shopT/.6);ctx.fillStyle='rgba(20,8,35,.9)';ctx.fillRect(-ox,-oy,cvW,cvH);ctx.textAlign='center';
  text('Волна '+wave+' отбита',CX,90,40,'#ff9bb3','italic');
  ctx.textAlign='left';drawIcon(0,CX-120,136,16);text(String(me.w[0]),CX-98,141,28,CUR[0].c);drawIcon(1,CX+30,136,16);text(String(me.w[1]),CX+52,141,28,CUR[1].c);ctx.textAlign='center';
  UP.forEach((u,i)=>{const x=SX+i*206,y=190,cap=capped(me,i),ok=!cap&&me.w[u.t]>=cost(me,i);
    ctx.fillStyle=ok?'#3a2050':'#2a1740';ctx.strokeStyle=ok?CUR[u.t].c:'#6b4a85';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x,y,190,190,14);ctx.fill();ctx.stroke();ctx.lineWidth=1;
    text(u.n,x+95,y+40,17,'#fbe8d3','italic');text(descOf(me,i),x+95,y+80,14,'#d9c3e8');text('Куплено: '+me.lv[i],x+95,y+118,14,'#d9c3e8');
    if(cap)text('Максимум',x+95,y+158,19,'#8a7096');
    else{ctx.textAlign='right';text(String(cost(me,i)),x+84,y+158,22,ok?CUR[u.t].c:'#8a7096');ctx.textAlign='center';ctx.save();if(!ok)ctx.globalAlpha*=.55;drawIcon(u.t,x+108,y+155,12);ctx.restore();text('['+(i+1)+']',x+160,y+158,14,'#8a7096')}});
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
  const drawE=e=>{drawEnemy(e);drawEnemyMarks(e);if(e.sh){ctx.strokeStyle='rgba(143,216,255,.78)';ctx.lineWidth=1.35;ctx.beginPath();ctx.arc(e.x,e.y,e.t.r+3,0,6.283);ctx.stroke();ctx.lineWidth=1}if(
  e.k === 'bard' &&
  chorusT > 0 &&
  e.id === chorusBardId
){
  emoji('🎵',e.x+16,e.y-22,18);
}
    if(e.hp<e.max){ctx.fillStyle='#0008';ctx.fillRect(e.x-18,e.y-e.t.r-10,36,4);ctx.fillStyle='#ff6b81';ctx.fillRect(e.x-18,e.y-e.t.r-10,36*e.hp/e.max,4)}};
  drawZones();
  drawCastle();
  for(const e of enemies)drawE(e);
  drawBossProjectiles();
  for(const b of beams){ctx.strokeStyle='rgba(125,255,154,'+Math.min(1,b.life*3)+')';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x1,b.y1);ctx.lineTo(b.x2,b.y2);ctx.stroke();ctx.lineWidth=1}
  for(const t of tags){ctx.globalAlpha=Math.min(1,t.life*2);text(t.txt,t.x,t.y,15,'#fff3e6','italic')}ctx.globalAlpha=1;
  for(const n of notes){const bg=n.k==='bag';if(bg){ctx.strokeStyle='rgba(255,210,77,'+(.35+.35*Math.sin(n.t*12))+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(n.tx,n.ty,30,0,6.283);ctx.stroke()}ctx.strokeStyle=bg?'#ffd24d':'#ff6b9a';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(n.x,n.y,n.r+2,0,6.283);ctx.stroke();ctx.lineWidth=1;if(bg&&IMG.coinBag)drawSheet(IMG.coinBag,6,n.x,n.y,30,(typeof performance!=='undefined'?performance.now():0)/110+n.id);else emoji(bg?'💰':'🎵',n.x,n.y,20)}
  for(const k of pickups){if(k.life<DROP.warn&&Math.floor(k.life*8)%2)continue;drawIcon(k.t,k.x,k.y,8+Math.min(k.v,10)*.6)}
  players.filter(p=>!p.gone).forEach(drawDragon);
  for(const b of balls)drawBall(b);
  for(const p of parts){ctx.globalAlpha=Math.max(0,p.life*1.6);ctx.fillStyle=p.col;ctx.fillRect(p.x,p.y,3,3)}ctx.globalAlpha=1;
  ctx.restore();
  if(chorusT>0&&state==='play'){ctx.fillStyle='rgba(255,120,170,'+(.08+.06*Math.sin(chorusT*10))+')';ctx.fillRect(-ox,-oy,cvW,cvH)}
  // ===== HUD: привязка непосредственно к краям видимого viewport =====
  // После ctx.translate(ox, oy) координаты HUD должны компенсировать
  // этот сдвиг, иначе элементы остаются у края игрового мира, а не окна.
  const viewLeft=-ox;
  const viewRight=cvW-ox;
  const viewTop=-oy;
  const viewBottom=cvH-oy;
  const edgePad=20;
  const hudLeft=viewLeft+edgePad;
  const hudRight=viewRight-edgePad;
  const hudTop=viewTop+18;
  const hudBottom=viewBottom-18;

  if(me){
    // Левый край viewport: волна, ресурсы, здоровье и особая атака.
    ctx.textAlign='left';
    text('ВОЛНА  '+wave+' / '+TOTAL,hudLeft,hudTop+8,17,'#fbe8d3','italic');

    drawIcon(0,hudLeft+7,hudTop+40,10);
    text(String(me.w[0]),hudLeft+28,hudTop+45,18,CUR[0].c);
    drawIcon(1,hudLeft+7,hudTop+68,10);
    text(String(me.w[1]),hudLeft+28,hudTop+73,18,CUR[1].c);

    const healthIcons='❤️'.repeat(me.h)+'🖤'.repeat(maxH(me)-me.h);
    const healthY=hudTop+102;
    emoji(healthIcons,hudLeft,healthY,16);

    // Lay out hearts, shields and the special-attack icon on one shared baseline.
    ctx.font='16px '+FONT;
    const healthWidth=ctx.measureText(healthIcons).width;
    let statusX=hudLeft+healthWidth+8;
    ctx.font='14px '+FONT;
    const shieldGlyphWidth=Math.max(15,ctx.measureText('🛡️').width);
    if(me.sh>0){
      for(let i=0;i<me.sh;i++){
        emoji('🛡️',statusX+i*(shieldGlyphWidth+1),healthY,14);
      }
      statusX+=me.sh*(shieldGlyphWidth+1)+7;
    }

    if(me.lv[0]>=5){
      const ready=me.acd<=0;
      const progress=ready?1:1-me.acd/BLAST.cd;
      // The rechargeable ability sits directly below the first heart.
      const firstHeartWidth=ctx.measureText('❤️').width;
      const blastX=hudLeft+firstHeartWidth/2;
      const blastY=healthY+28;
      ctx.save();
      ctx.textAlign='center';
      ctx.strokeStyle=ready?'#ffd24d':'#8a7096';
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.arc(blastX,blastY,12,-1.57,-1.57+6.283*progress);
      ctx.stroke();
      ctx.lineWidth=1;

      // Show a static fire icon (the first cell of the existing fire sprite sheet).
      if(IMG.fire){
        const frameW=IMG.fire.width/FFR;
        const frameH=IMG.fire.height;
        const iconH=17;
        const iconW=iconH*frameW/frameH;
        ctx.drawImage(IMG.fire,0,0,frameW,frameH,blastX-iconW/2,blastY-iconH/2,iconW,iconH);
      }else{
        emoji('🔥',blastX,blastY,15);
      }
      ctx.restore();
    }
  }

  // Центр viewport: прочность башни и активный эффект барда.
  const hudCenterX=(viewLeft+viewRight)/2;
  ctx.textAlign='center';
  text('Нервы принцессы',hudCenterX,hudTop+8,15,'#fbe8d3','italic');
  ctx.fillStyle='rgba(0,0,0,.38)';
  ctx.fillRect(hudCenterX-145,hudTop+21,290,9);
  ctx.fillStyle=tower/towerMax>.35?'#ff9bb3':'#ff4d4d';
  ctx.fillRect(hudCenterX-145,hudTop+21,290*Math.max(0,tower/towerMax),9);

  const activeBardCount=enemies.filter(o=>o.hp>0&&o.k==='bard').length;
  if(state==='play'&&chorusT>0){
    text('Припев! Враги быстрее на 60%',hudCenterX,hudTop+51,12,'#ff9bb3','italic');
  }else if(state==='play'&&activeBardCount){
    text('Бард запоёт через '+Math.ceil(chorusCd)+' с',hudCenterX,hudTop+51,12,'#d9c3e8','italic');
  }

  // Правый край viewport: счёт, состояние и индикаторы игроков.
  drawRoster();

  // Подсказки закреплены у нижних углов видимого viewport.
  if(state==='play'){
    ctx.textAlign='left';
    text('WASD / стрелки — движение  ·  ЛКМ — огонь  ·  ПКМ — особая атака',hudLeft,hudBottom,11,'#e9d9ed');
    ctx.textAlign='right';
    text('F — весь экран',hudRight,hudBottom,11,'#e9d9ed');
  }

  if(quipT>0&&state==='play'){
    drawPrincessSpeech(quip,(viewLeft+viewRight)/2,viewLeft,viewRight,viewTop,viewBottom,CY-215);
  }
  if(state==='play'&&(phase==='break'||phase==='clear')){
    ctx.save();
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    const waveLabel=phase==='break'?(BN[wave]||'Волна '+wave):('Волна '+wave+' отбита!');
    text(waveLabel,(viewLeft+viewRight)/2,viewBottom-70,34,phase==='break'?'#fbe8d3':'#ffdd88','italic');
    ctx.restore();
  }
  if(state==='shop')drawShop();
  else if(state!=='play'){
    drawEndScreen();
  }
}

function drawEndScreen(){
  ctx.save();
  ctx.fillStyle='rgba(17,7,31,.86)';
  ctx.fillRect(-ox,-oy,cvW,cvH);

  const rows=players
    .filter(p=>!p.gone)
    .slice()
    .sort((a,b)=>b.kills-a.kills);

  // A narrower centered results table leaves comfortable margins on both sides.
  const tableW=Math.min(820,W-120);
  const tableX=(W-tableW)/2;
  const headerHeight=130;
  const footerHeight=28;
  const maxRowsHeight=H-headerHeight-footerHeight-28;
  const rowH=rows.length
    ?Math.min(34,Math.max(17,maxRowsHeight/rows.length))
    :34;
  const tableH=headerHeight+rows.length*rowH+footerHeight;
  const tableY=(H-tableH)/2;

  ctx.textAlign='center';
  ctx.textBaseline='middle';
  text(
    state==='win'?'Принцесса в безопасности!':(tower<=0?'Нервы сдали…':'Все драконы пали…'),
    CX,tableY+34,Math.min(38,tableW*.045),'#ff9bb3','italic'
  );

  const summary=state==='win'
    ?'Отшито поклонников: '+score
    :'Дошли до волны '+wave+' из '+TOTAL+'  ·  Отшито поклонников: '+score;
  text(summary,CX,tableY+67,15,'#fbe8d3');

  // Колонки распределены от левого до правого края таблицы.
  const rankX=tableX+tableW*.055;
  const colorX=tableX+tableW*.17;
  const playerX=tableX+tableW*.47;
  const killsX=tableX+tableW*.96;
  const headerY=tableY+107;
  const rowsTop=tableY+130;
  const fontSize=Math.min(18,Math.max(12,rowH*.58));

  ctx.textAlign='center';
  text('МЕСТО',rankX,headerY,11,'#b9a3cc','italic');
  ctx.textAlign='left';
  text('ДРАКОН',colorX,headerY,11,'#b9a3cc','italic');
  text('ИГРОК',playerX,headerY,11,'#b9a3cc','italic');
  ctx.textAlign='right';
  text('ОТШИТО',killsX,headerY,11,'#b9a3cc','italic');

  rows.forEach((p,i)=>{
    const rowTop=rowsTop+i*rowH;
    const y=rowTop+rowH/2;

    // Лёгкое выделение текущего игрока и чередование строк — без рамок.
    if(p===me){
      ctx.fillStyle='rgba(255,155,179,.15)';
      ctx.fillRect(tableX+4,rowTop+1,tableW-8,Math.max(1,rowH-2));
    }else if(i%2===1){
      ctx.fillStyle='rgba(255,255,255,.025)';
      ctx.fillRect(tableX+4,rowTop+1,tableW-8,Math.max(1,rowH-2));
    }

    ctx.textAlign='center';
    if(i<3)emoji(['🥇','🥈','🥉'][i],rankX,y,fontSize+3);
    else text(String(i+1),rankX,y,fontSize,'#fbe8d3');

    ctx.fillStyle=COLORS[p.ci][1];
    ctx.beginPath();
    ctx.arc(colorX,y,Math.max(4,Math.min(7,rowH*.22)),0,6.283);
    ctx.fill();

    ctx.textAlign='left';
    ctx.font=fontSize+'px Georgia,serif';
    ctx.fillStyle='#fbe8d3';
    ctx.fillText(COLORS[p.ci][0],colorX+15,y,Math.max(60,playerX-colorX-35));

    ctx.fillStyle=p===me?'#ffdd88':'#fbe8d3';
    ctx.fillText(p.name||'Игрок',playerX,y,Math.max(80,killsX-playerX-65));

    ctx.textAlign='right';
    ctx.font='bold '+fontSize+'px Georgia,serif';
    ctx.fillStyle='#ffd24d';
    ctx.fillText(String(p.kills),killsX,y,52);
  });

  ctx.textAlign='center';
  ctx.font='italic 12px Georgia,serif';
  ctx.fillStyle='#ffdd88';
  ctx.fillText(
    'Чтобы сыграть ещё раз, хост создаёт новую комнату (обновите страницу).',
    CX,tableY+tableH-13,tableW-40
  );

  ctx.textBaseline='alphabetic';
  ctx.restore();
}

const SHOP_TIME=30,KINDS=Object.keys(T),SNAP_MS=80;
let lastSnap=0,snaps=[],shopLeft=SHOP_TIME,lastIn=0,myBalls=[];
const net=o=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify({t:'msg',to:isHost?'all':'host',data:o}))};
const r1=v=>Math.round(v),r10=v=>Math.round(v*10)/10;
function playerByNid(id){return players.find(p=>p.nid===id)}
function clampP(p){p.x=Math.max(24,Math.min(W-24,p.x));p.y=Math.max(70,Math.min(H-24,p.y))}

function sendSnap(now){
  if(now-lastSnap<SNAP_MS)return;lastSnap=now;
  net({k:'snap',st:state,ph:phase,w:wave,tw:r10(tower),sc:score,q:[quip,Math.max(0,quipT)],cT:chorusT,cC:chorusCd,cb:chorusBardId,iv:inspV,sl:Math.max(0,shopLeft),sk:r1(shake),
    P:players.map(p=>[r1(p.x),r1(p.y),p.h,p.sh,(p.asleep?1:0)|(p.gone?2:0)|(p.ready?4:0)|(p.face<0?8:0)|(p.mark?16:0)|(p.dead?32:0)|((p.in&&(p.in.fire||p.in.alt))?64:0),r10(p.inv),r10(p.frz),r10(p.wt),r10(p.rv),p.kills,p.w[0],p.w[1],p.lv[0],p.lv[1],p.lv[2],p.lv[3],Math.round(p.tilt*100),r10(p.coinGlow||0)]),
   E:enemies.map(e=>[
  e.id,KINDS.indexOf(e.k),
  r1(e.x),r1(e.y),r10(e.hp),r1(e.max),
  e.sh?1:0,e.chase?1:0,
  ...castInfo(e),
  e.rush?1:0,
  e.ab&&e.ab.action==='rose'?1:
  e.ab&&e.ab.action==='ring'?2:0,
  e.ab&&e.ab.stun>0?1:0
]),
   Z:zones.map(z=>[
  z.id,r1(z.x),r1(z.y),z.r,
  Math.round(z.t*100)/100,z.d,z.landed?1:0
]),
    B:balls.map(b=>[b.id,r1(b.x),r1(b.y),b.owner,r10(b.r),Math.round(b.ang*100)]),
    N:notes.map(n=>[n.id,n.k==='bag'?1:0,r1(n.x),r1(n.y),r1(n.tx),r1(n.ty),Math.round(n.t*100)/100]),
    K:pickups.map(c=>[c.id,r1(c.x),r1(c.y),c.v,c.t,r10(c.life)]),
    M:beams.map(b=>[r1(b.x1),r1(b.y1),r1(b.x2),r1(b.y2),Math.round(b.life*100)/100]),
    G:tags.map(t=>[r1(t.x),r1(t.y),t.txt,r10(t.life)]),
       R:bossProjectiles.map(p=>[
  p.id,p.kind==='ring'?1:0,
  r1(p.sx),r1(p.sy),r1(p.tx),r1(p.ty),
  r10(p.t),r10(p.d),r1(p.arc),p.zoneId||0
]),
    V:evs});
  evs=[];
}
function stepParts(dt){for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}parts=parts.filter(p=>p.life>0)}

function guestFrame(dt,now){
  const k=keys,mx=(k.KeyD||k.ArrowRight?1:0)-(k.KeyA||k.ArrowLeft?1:0),my=(k.KeyS||k.ArrowDown?1:0)-(k.KeyW||k.ArrowUp?1:0);
  if(now-lastIn>40){lastIn=now;net({k:'in',mx,my,ax:r1(mouse.x),ay:r1(mouse.y),f:mouse.down?1:0,al:mouse.alt?1:0})}
  stepParts(dt);
  if(state==='shop')shopT+=dt;else shopT=0;
  const L=snaps.length;if(!L)return;
  const b=snaps[L-1],rt=now-120;
  let a=snaps[0],nx=b;
  for(let i=0;i<L;i++){if(snaps[i].recv<=rt)a=snaps[i]}
  for(let i=0;i<L;i++){if(snaps[i].recv>rt){nx=snaps[i];break}}
  const al=a===nx?1:Math.min(1,Math.max(0,(rt-a.recv)/(nx.recv-a.recv))),lp=(u,v)=>u+(v-u)*al;
  state=b.st;phase=b.ph;wave=b.w;tower=b.tw;score=b.sc;quip=b.q[0];quipT=b.q[1];chorusT=b.cT;
chorusCd=b.cC;
chorusBardId=b.cb??null;
inspV=b.iv;shopLeft=b.sl;
  if(b.sk>shake)shake=b.sk;shake=Math.max(0,shake-40*dt);
  b.P.forEach((q,i)=>{const p=players[i],pa=a.P[i]||q,pn=nx.P[i]||q;
    p.h=q[2];p.sh=q[3];p.asleep=!!(q[4]&1);p.gone=!!(q[4]&2);p.ready=!!(q[4]&4);p.mark=!!(q[4]&16);p.dead=!!(q[4]&32);p.in=p.in||{};p.in.fire=!!(q[4]&64);p.in.alt=false;if(p!==me){p.face=(q[4]&8)?-1:1;p.tilt=q[16]/100}p.inv=q[5];p.frz=q[6];p.wt=q[7];p.rv=q[8];p.kills=q[9];p.coinGlow=p.in.fire?0:(q[17]||0);
    p.w=[q[10],q[11]];p.lv=[q[12],q[13],q[14],q[15]];
    if(p!==me){p.x=lp(pa[0],pn[0]);p.y=lp(pa[1],pn[1])}});
  if(!me.asleep&&me.frz<=0){const l=Math.hypot(mx,my);if(l){const s=230*(1+.2*me.lv[2]);me.x+=mx/l*s*dt;me.y+=my/l*s*dt}}
  clampP(me);

  if(!me.asleep&&Math.abs(mouse.x-me.x)>1){
    me.face=mouse.x>me.x?1:-1;
  }
  if(!me.face)me.face=1;

  const targetTilt=dragonAimTilt(me,mouse.x,mouse.y);
  me.tilt+=(targetTilt-me.tilt)*Math.min(1,dt*18);

  // Синхронизируем угол отрисовки всех драконов.
  players.forEach(p=>updateDragonDrawAngle(p,dt));

  me.cd=(me.cd||0)-dt;

  if(mouse.down&&!me.asleep&&me.frz<=0&&me.cd<=0){
    const shot=dragonShotFromMouth(me);
    const nf=flames(me);
    const dm=dmgOf(me);

    const volley=dragonVolleyPositions(shot,nf);
    for(const pellet of volley){
      const angle=pellet.angle;
      myBalls.push({
        id:++uid,
        x:pellet.x,
        y:pellet.y,
        ang:angle,
        vx:Math.cos(angle)*540,
        vy:Math.sin(angle)*540,
        life:1.3,
        r:6+dm*1.5,
        col:COLORS[me.ci][1]
      });
    }

    me.cd=.5*Math.pow(.85,me.lv[1]);
  }

  me.acd=(me.acd||0)-dt;

  if(mouse.alt&&me.lv[0]>=5&&!me.asleep&&me.frz<=0&&me.acd<=0){
    const shot=dragonShotFromMouth(me);

    myBalls.push({
      id:++uid,
      x:shot.x,
      y:shot.y,
      ang:shot.angle,
      vx:Math.cos(shot.angle)*470,
      vy:Math.sin(shot.angle)*470,
      life:1.1,
      r:16,
      col:COLORS[me.ci][1]
    });

    me.acd=BLAST.cd;
  }
  for(const b of myBalls){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    for(const e of enemies)if(e.hp>0&&Math.hypot(e.x-b.x,e.y-b.y)<e.t.r+8){b.life=0;break}
    for(const n of notes)if(b.life>0&&Math.hypot(n.x-b.x,n.y-b.y)<n.r+8){b.life=0;break}}
  myBalls=myBalls.filter(b=>b.life>0);
  const au=b.P[me.id],err=Math.hypot(au[0]-me.x,au[1]-me.y);
  if(me.frz>0){
    // When hit by the gold bag, mirror the host's frozen position exactly.
    me.x=au[0];
    me.y=au[1];
  }else{
    const gain=me.asleep?.3:err>150?.15:(mx||my)?0:.12;
    const g=1-Math.pow(1-gain,dt*60);
    me.x+=(au[0]-me.x)*g;
    me.y+=(au[1]-me.y)*g;
  }
  const mp=arr=>new Map((arr||[]).map(e=>[e[0],e])),ea=mp(a.E),ba=mp(a.B),ka=mp(a.K);
  enemies=nx.E.map(e=>{
  const o=ea.get(e[0]),kk=KINDS[e[1]];
  return{
    id:e[0],
    k:kk,
    t:T[kk],
    x:o?lp(o[2],e[2]):e[2],
    y:o?lp(o[3],e[3]):e[3],
    hp:e[4],
    max:e[5],
    sh:e[6],
    chase:e[7],
    cast:e[8],
    ip:e[9],
    thr:e[10],
    rush:!!e[11],
    bossAction:e[12]===1?'rose':e[12]===2?'ring':null,
    stunned:!!e[13]
  };
});
 zones=(b.Z||[]).map(e=>({
  id:e[0],x:e[1],y:e[2],r:e[3],
  t:e[4],d:e[5],landed:!!e[6]
}));
  balls=nx.B.filter(e=>e[3]!==me.id).map(e=>{const o=ba.get(e[0]);return{id:e[0],x:o?lp(o[1],e[1]):e[1],y:o?lp(o[2],e[2]):e[2],r:e[4],ang:e[5]/100,col:COLORS[players[e[3]].ci][1]}}).concat(myBalls);
  notes=nx.N.map(e=>({id:e[0],k:e[1]?'bag':'note',x:e[2],y:e[3],tx:e[4],ty:e[5],t:e[6],r:12}));
  pickups=nx.K.map(e=>{const o=ka.get(e[0]);return{id:e[0],x:o?lp(o[1],e[1]):e[1],y:o?lp(o[2],e[2]):e[2],v:e[3],t:e[4],life:e[5]}});
  beams=b.M.map(e=>({x1:e[0],y1:e[1],x2:e[2],y2:e[3],life:e[4]}));
  tags=b.G.map(e=>({x:e[0],y:e[1],txt:e[2],life:e[3]}));
  bossProjectiles=(b.R||[]).map(e=>({
  id:e[0],
  kind:e[1]?'ring':'bouquet',
  sx:e[2],sy:e[3],
  tx:e[4],ty:e[5],
  t:e[6],d:e[7],
  arc:e[8],zoneId:e[9]
}));
}

function loop(t){
  const dt=Math.min(.05,(t-last)/1000||0);last=t;frameDt=dt;
  if(isHost){
    if(state==='play')update(dt);
    else{parts=[];if(state==='shop'){shopT+=dt;shopLeft=SHOP_TIME-shopT;if(shopLeft<=0)nextFromShop()}}
    sendSnap(t);
  }else guestFrame(dt,t);
  draw();
  if(ws&&ws.readyState>1){ctx.fillStyle='rgba(20,8,35,.8)';ctx.fillRect(-ox,-oy,cvW,cvH);ctx.textAlign='center';text('Связь с сервером потеряна. Обновите страницу.',CX,CY,26,'#ff9bb3','italic')}
  requestAnimationFrame(loop);
}

function testClearActors(){
  enemies=[];queue=[];notes=[];beams=[];balls=[];pickups=[];parts=[];zones=[];tags=[];
  bossProjectiles=[];myBalls=[];evs=[];
  state='play';phase='break';phaseT=1e9;spawnT=0;markId=-1;markT=0;
}
function testRepair(){
  if(!TEST_MODE||!me)return;
  tower=towerMax;
  me.h=maxH(me);me.asleep=false;me.dead=false;me.gone=false;
  me.inv=0;me.frz=0;me.wt=0;me.rv=0;me.sh=shMax(me);me.shT=0;
  state='play';
}
function testSetUpgrades(enabled){
  if(!TEST_MODE||!me)return;
  me.lv=enabled?[5,5,3,3]:[0,0,0,0];
  me.sh=shMax(me);me.shT=0;
}
function testStartWave(n){
  if(!TEST_MODE)return;
  const target=Math.max(1,Math.min(TOTAL,Number(n)||1));
  resetWorld();
  wave=target-1;
  testClearActors();
  testRepair();
  nextWave();
  phase='spawn';phaseT=0;spawnT=0;state='play';
}
function testSpawn(kind){
  if(!TEST_MODE||!T[kind])return;
  state='play';queue=[];phase='spawn';phaseT=0;spawnT=0;
  spawn(kind);
}
function testSetInvulnerable(enabled){
  if(TEST_MODE)testInvulnerable=!!enabled;
}
function testInfo(){
  return {wave,state,enemies:enemies.length,queue:queue.length,invulnerable:testInvulnerable};
}
function startTest(){
  resizeCanvas();addEventListener('resize',resizeCanvas);
  TEST_MODE=true;testInvulnerable=true;ws=null;isHost=true;active=true;
  players=[makePlayer(0,0)];
  me=players[0];me.name='Тестовый дракон';me.nid='test';
  me.x=CX;me.y=CY+145;me.in.ax=CX;me.in.ay=CY-100;
  towerMax=100;
  testSetUpgrades(true);
  testStartWave(1);
  last=typeof performance!=='undefined'?performance.now():0;
  requestAnimationFrame(loop);
}

function startGame(o){resizeCanvas();addEventListener('resize',resizeCanvas);
  TEST_MODE=false;testInvulnerable=false;
  ws=o.ws;
  players=o.players.map((q,i)=>{const p=makePlayer(i,q.color);p.name=q.name;p.nid=q.id;const a=i/o.players.length*6.283;p.x=CX+Math.cos(a)*110;p.y=CY+Math.sin(a)*110;return p});
  me=players.find(p=>p.nid===o.me.id);isHost=!!o.me.host;active=true;towerMax=Math.round(100*(1+.6*Math.sqrt(players.length-1)));
  resetWorld();
  if(isHost){nextWave();say('Они опять идут… Драконы, вся надежда на вас!',4)}
  requestAnimationFrame(loop);
}
function onMsg(m){
  if(m.t==='players'){
    if(isHost){const ids=new Set(m.players.map(q=>q.id));players.forEach(p=>{if(!ids.has(p.nid)&&!p.gone){p.gone=true;p.asleep=true;if(state==='shop')checkGo()}})}
    return}
  if(m.t!=='msg')return;
  const d=m.data;
  if(isHost){
    const p=playerByNid(m.from);if(!p||p.gone)return;
    if(d.k==='in')Object.assign(p.in,{mx:+d.mx||0,my:+d.my||0,ax:+d.ax||0,ay:+d.ay||0,fire:!!d.f,alt:!!d.al});
    else if(d.k==='buy'&&state==='shop'&&d.i>=0&&d.i<UP.length)buy(p,d.i|0);
    else if(d.k==='go'&&state==='shop'){p.ready=true;checkGo()}
  }else if(d.k==='snap'){
    d.recv=performance.now();snaps.push(d);if(snaps.length>5)snaps.shift();
    for(const v of d.V)spark(v[0],v[1],v[2],Math.min(v[3],8));
  }
}
window.Game={start:startGame,startTest,onMsg,testStartWave,testSpawn,testClear:testClearActors,testRepair,testSetUpgrades,testSetInvulnerable,testInfo,get active(){return active}};

})();