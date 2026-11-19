
// Игра «Башня принцессы» для комнаты: хост считает мир, остальные получают снимки. Собрано из одиночной версии.
(function(){

// ===== Константы и данные =====
const cv=document.getElementById('c'),ctx=cv.getContext('2d'),W=1138,H=640,CX=W/2,CY=Math.round(H*.512);
const TOTAL=10,TOWER_R=70,MOUTH_X=42,MOUTH_Y=8,SX=(W-808)/2,FONT='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const T={knight:{e:'🤵',hp:3,sp:42,dmg:6,r:24,sz:38},bard:{e:'🎻',hp:2,sp:88,dmg:4,r:20,sz:32,rng:260,rate:3},prince:{e:'🤴',hp:70,sp:28,dmg:30,r:38,sz:70,boss:true},king:{e:'👑',hp:200,sp:22,dmg:45,r:44,sz:84,boss:true},mage:{e:'🧙',hp:3,sp:70,dmg:3,r:20,sz:36,rng:270,rate:2,kind:'heal'},merchant:{e:'🤑',hp:4,sp:60,dmg:0,r:20,sz:34,rng:280,rate:3.4,kind:'bag'}};
const BOSS={5:'prince',10:'king'},BOSS_GUARD_RATIO={prince:.15,king:.18},BOSS_REWARDS={prince:[10,4],king:[20,8]},BN={
  3:'«Тише! У меня тут серенада!»',
  5:'«Принц снова с кольцом?!»',
  6:'«Маг, не лечи им всех!»',
  8:'«Купец! Что в мешке?»',
  10:'«Папа?! Где вся гвардия?!»'
};
// Реплики звучат от лица принцессы: больше характера, самоиронии и реакции на события.
const Q={
  start:['Драконы, вы вовремя! У меня тут очередное мероприятие по спасению башни.','Они опять идут… У меня уже закончились вежливые отказы. Остались только вы!','Добро пожаловать на защиту башни! Чай после победы, обещаю.'],
  hit:['Опять к башне! У вас там семейная скидка на осаду?','Я не принимаю гостей с мечами. Даже по предварительной записи!','Передайте ему: свидание отменено. Башня тоже против.','Почему все мои поклонники приходят с армией?','У меня сегодня день тишины. Особенно для рыцарей!','Кто выдал им адрес? Я же просила не публиковать его в летописях!'],
  kill:['Вот это сервис! Драконы, вам бы орден выдать.','Минус один поклонник, плюс немного тишины!','Прекрасно сработано! И никакого неловкого свидания.','Запишите это в летопись. Желательно крупным шрифтом!','Так держать! Я почти перестала нервничать.','Ещё один ухажёр отправился подумать над своим поведением.'],
  prince:['Прекрасный принц явился! Букет вижу, красные флаги тоже.','Он опять с кольцом. Кто-нибудь объяснит ему, что «нет» — тоже ответ?','Принц считает, что розы всё исправят. Даже его тактику.','Снова свидание с осадой. Романтика окончательно вышла из-под контроля.','Только не говорите, что он репетировал речь у зеркала весь год.','Он назвал это романтическим жестом. Я называю это нарушением границ!'],
  king:['Папа приехал! Надеюсь, в этот раз без семейного совета на двести рыцарей.','Отец лично возглавил осаду. Вот это семейный контроль!','Король на месте. Держитесь: сейчас будет указ, потом ещё указ…','Папа, я просила прислать письмо, а не целую армию!','Семейное воссоединение отменяется. Причина: слишком много рыцарей.','Отец снова решил всё за меня. Даже маршрут до башни!'],
  bossGuardBreak:['Барьер босса разрушен! Теперь бейте по самому самодовольному месту — по здоровью!','Защита лопнула! Отлично, теперь он без магической упаковки.','Барьер снят! Драконы, не давайте ему передумать!'],
  bossTeamReward:['Командная награда! Каждый дракон получает +{gold} золота и +{scrolls} свитков. Вот это коллективный договор!','Босс повержен: награда каждому — {gold} золота и {scrolls} свитков. Наконец-то премия без мелкого шрифта!'],
  bard:['Бард у башни! Я просила тишину, а не концерт во время осады.','Он играет так громко, что даже камни хотят сбежать.','Если услышите фальшивую ноту — это не баг, это бард.','У него серенада или тревожная сирена? Я уже не различаю.'],
  note:['Летящая нота! Уклоняйтесь: музыкальное образование не должно быть таким опасным.','Нота летит в башню. Можно было просто отправить открытку!','Сбейте эту ноту! Она даже в нотный стан не попадает.','Осторожно! Эта нота звучит как судебный иск от соседей.'],
  mage:['Маг лечит рыцарей! Кажется, у них командная страховка.','Он раздаёт щиты. Вот бы кто-нибудь защитил меня от этих ухажёров.','Маг снова всех подлечил. У него бесконечный запас пластырей?','Сначала рыцари ломятся в башню, теперь ещё и лечатся. Удобно устроились!'],
  merchant:['Купец принёс золото. Наконец-то полезный груз… Ах да, это ловушка.','Не подбирайте подарки! Особенно если они летят из подозрительного мешка.','Он торгует прямо во время осады. Уважаю деловую хватку, но нет.','Скидка дня: один мешок золота, два неприятных сюрприза!'],
  bag:['Золото летит! Не отвлекайтесь — у него явно есть скрытые условия.','Мешок с монетами? Я тоже люблю покупки, но не настолько!','Не ловите этот мешок! Это не подарок, а тяжёлая реклама.','Дракон, не засматривайся на золото. Оно сегодня с подвохом!'],
  princeProposal:['Он снова делает предложение! Драконы, прервите этот монолог, пока он не дошёл до стихов!','Принц достал кольцо. Если он скажет «навсегда», я выпрыгну из окна!','Началось предложение руки и сердца. У вас есть несколько секунд, чтобы испортить ему финал!'],
  princeInterrupted:['Предложение сорвано! Наконец-то кто-то перебил его длинную речь.','Принц оглушён! Вот что бывает, когда не слышишь слово «нет».','Браво! Романтическая пауза отменяется вместе с принцем.'],
  princeRing:['Он всё-таки бросил кольцо! Это предложение или метание молота?','Кольцо летит к башне! Я не соглашалась даже на доставку!','Принц запустил кольцо. Надеюсь, у него есть чек на возврат.'],
  princeRingImpact:['Кольцо долетело! Вот это настойчивость… совершенно нежелательная.','Оно попало в башню! Я бы сказала «да», но только если бы это было «давай уйдём».','Принц пробил защиту кольцом. В следующий раз пусть пришлёт открытку.'],
  princeRoses:['Он снова осыпает поле розами! Красиво, но красные круги — плохой знак.','Розовый дождь! Не стойте на местах, где он собрался приземлиться!','Принц решил, что цветов мало. Теперь он украшает ими поле боя!'],
  kingDecree:['Указ №{count} из {max}: стража, ко мне! И наденьте парадную форму!','Королевский приказ {count}/{max}: вызвать рыцарей. Да, опять. Это семейное дело!','Внимание, гвардия! Король нажал кнопку «ещё рыцарей» ({count}/{max}).','Указ {count}/{max}: всем рыцарям явиться. Отговорки не принимаются!','Король выпустил указ {count}/{max}. Аргументы закончились, начались подкрепления!'],
  kingDecreeFinal:['Пятый указ! Стража собрана. Папа, может, теперь поговорим словами?','Пять указов — выполнено! У короля теперь целый отдел по доставке рыцарей.','Пятый приказ подписан. Чернил ушло больше, чем здравого смысла!'],
  kingDisgrace:['Обвинение №{count} из {max}: {name}, вы назначены похитителем принцессы! Возражения не принимаются.','Король снова нашёл виноватого: {name}! Драконы, приготовьтесь к опале.','По королевскому указу {name} — главный подозреваемый. Доказательства? Корона сказала!','Дело №{count}: {name} обвиняется в похищении. Следствие завершено до начала!'],
  kingNoKnights:['Рыцарей больше нет? Папа, обвинять некого. Может, уже пойдёшь ко мне?','Гвардия закончилась! Король отменяет опалу. Хоть одна хорошая новость за день.','На поле больше нет рыцарей. Папа, семейный визит можно продолжить без обвинений!'],
  kingApproach:['Пять указов и пять обвинений — папа закончил бюрократию и идёт к башне. Драконы, встречайте!','Королевские бумаги закончились. Теперь отец решил явиться лично.','Папа наконец отложил печать и направился сюда. Держите оборону!'],
  kingMarkEnded:['Опала закончилась. Король пока не придумал, кого обвинить следующим.','Обвинение снято! Кажется, даже королевская канцелярия устала.','Опала окончена. Можно вернуться к спасению башни!'],
  bardChorus:['Бард взял припев! Враги ускорились. Драконы, испортите ему концерт!','О нет, припев! Рыцари теперь бегут быстрее, чем я от нежелательных предложений.','Бард вышел на высокую ноту — и враги на высокую скорость!'],
  magiAlone:['Маги остались без прикрытия и бегут к башне. Вот теперь им не до лечения!','Без рыцарей маги растерялись. Кто бы мог подумать, что им нужна компания?'],
  wakeFriend:['Павший дракон снова в строю! Вот это командная работа.','Дракон проснулся благодаря друзьям. Вот это настоящее волшебство!'],
  wakeSolo:['Дракон проснулся… Но часть золота осталась в стране снов.','Добро пожаловать обратно! Кошелёк, правда, проснулся не весь.'],
  dragonDown:['Ой-ой, дракон прилёг! Поднимите его, пока враги не решили, что это коврик.','Дракон уснул! Кто-нибудь, срочно принесите ему кофе… или союзника.','Один дракон выбыл из полёта. Не бросайте его, у нас тут командная игра!'],
  dragonOut:['{name} выбыл до магазина. Как жаль — а я уже приготовила благодарственную речь!'],
  waveClear:['Волна отбита! Собирайте монеты, пока они не решили сбежать.','Чисто! Передышка, золото и никаких предложений руки и сердца.','Ура, враги отступили! Самое время пополнить казну.'],
  testWaveClear:['Волна очищена! Выберите следующую в панели. Только не самую спокойную, конечно.']
};
const PRINCESS_HINTS=[
  {id:'controls',wave:1,text:'Драконы, WASD или стрелки — летим, ЛКМ — огонь. Особая атака на ПКМ откроется после нужного улучшения!'},
  {id:'loot',wave:2,text:'После волны собирайте золото и свитки. Они не украсят башню, зато помогут улучшить ваше пламя!'},
  {id:'bard',wave:3,text:'Бард ускоряет врагов припевом. Сбейте его, пока он не взял ещё одну высокую ноту!'},
  {id:'prince',wave:5,text:'Принц бросает розы в отмеченные красные зоны. Не стойте там — романтика романтикой, а здоровье дороже!'},
  {id:'mage',wave:6,text:'Маг лечит рыцарей и накладывает щиты. Постарайтесь убрать его, иначе враги станут слишком живучими!'},
  {id:'merchant',wave:8,text:'Купец бросает мешки с золотом. Не ловите их: от удара дракон на время замирает!'},
  {id:'king',wave:10,text:'Папа-король готовит указы и опалу. Пока на поле есть рыцари, он будет искать виноватого среди драконов!'}
];
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

// Чистая функция масштаба: используется игровым рендером и тестовым режимом.
// При 1–6 игроках сохраняем исходный размер; при 20 уменьшаем спрайты до 70%.
// Хитбоксы, радиусы столкновений, скорость и урон не зависят от визуального масштаба.
function dragonCrowdScaleForCount(visiblePlayers) {
  const count = Math.max(0, Math.floor(Number(visiblePlayers) || 0));
  const progress = Math.max(0, Math.min(1, (count - 6) / 14));
  return 1 - progress * 0.30;
}
function dragonCrowdScale() {
  const visiblePlayers = players.reduce((count, player) => count + (player.gone ? 0 : 1), 0);
  return dragonCrowdScaleForCount(visiblePlayers);
}

// Расширяем стартовую расстановку вместе с размером команды.
// Это увеличивает реальную дистанцию между драконами, а не только уменьшает весь экран.
// При 20 игроках драконы размещаются по эллипсу 306 × 239 мировых пикселей.
function playerSpawnLayoutForCount(visiblePlayers) {
  const count = Math.max(1, Math.min(20, Math.floor(Number(visiblePlayers) || 1)));
  const progress = Math.max(0, Math.min(1, (count - 6) / 14));
  const radiusX = 110 + Math.max(0, count - 6) * 14;
  const radiusY = radiusX * (1 - progress * 0.22);
  return { radiusX, radiusY };
}
function playerSpawnPositionForIndex(index, visiblePlayers) {
  const count = Math.max(1, Math.min(20, Math.floor(Number(visiblePlayers) || 1)));
  const layout = playerSpawnLayoutForCount(count);
  const angle = (Math.max(0, Math.floor(Number(index) || 0)) / count) * Math.PI * 2;
  return {
    x: CX + Math.cos(angle) * layout.radiusX,
    y: CY + Math.sin(angle) * layout.radiusY
  };
}

// При увеличении комнаты камера мягко отдаляется: в кадре видна более широкая область.
// HUD и магазин не масштабируются. При 20 игроках камера работает на 92%.
function sceneCrowdScaleForCount(visiblePlayers) {
  const count = Math.max(0, Math.floor(Number(visiblePlayers) || 0));
  const progress = Math.max(0, Math.min(1, (count - 6) / 14));
  return 1 - progress * 0.08;
}
function sceneCrowdScale() {
  const visiblePlayers = players.reduce((count, player) => count + (player.gone ? 0 : 1), 0);
  return sceneCrowdScaleForCount(visiblePlayers);
}

// Преобразование координат мыши из экранного игрового поля в мировые координаты.
// Важно: выстрелы и прицел гостей должны использовать ту же камеру, что и хост.
function screenToWorldPoint(x, y, scale = sceneCrowdScale()) {
  const safeScale = Math.max(0.01, Number(scale) || 1);
  return {
    x: CX + (x - CX) / safeScale,
    y: CY + (y - CY) / safeScale
  };
}

// Границы движения тоже должны учитывать отдаление камеры.
// Раньше дракон оставался зажат в старых координатах 24..W-24 / 70..H-24,
// хотя после zoom-out видимая область уже расширялась. Поэтому персонаж
// останавливался у невидимой стены задолго до края видимой сцены.
// Возвращаем новые границы в мировых координатах так, чтобы после camera
// transform их экранные координаты совпадали с прежними отступами игрового поля.
function playerMovementBoundsForScale(sceneScale, spriteScale) {
  const safeSceneScale = Math.max(0.01, Number(sceneScale) || 1);
  const safeSpriteScale = Math.max(0.01, Math.min(1, Number(spriteScale) || 1));
  // При большом количестве игроков дракон меньше, поэтому оставляем
  // чуть более широкий безопасный отступ, но не сужаем базовую игровую область.
  const densityPadding = 18 * (1 - safeSceneScale * safeSpriteScale);
  const marginX = 24 + densityPadding;
  const marginTop = 70 + densityPadding;
  const marginBottom = 24 + densityPadding;
  return {
    minX: CX + (marginX - CX) / safeSceneScale,
    maxX: CX + (W - marginX - CX) / safeSceneScale,
    minY: CY + (marginTop - CY) / safeSceneScale,
    maxY: CY + (H - marginBottom - CY) / safeSceneScale,
    marginX,
    marginTop,
    marginBottom
  };
}
function playerMovementBounds() {
  return playerMovementBoundsForScale(sceneCrowdScale(), dragonCrowdScale());
}
function clampPlayerToMovementBounds(p) {
  const bounds = playerMovementBounds();
  p.x = Math.max(bounds.minX, Math.min(bounds.maxX, p.x));
  p.y = Math.max(bounds.minY, Math.min(bounds.maxY, p.y));
  return bounds;
}

// Единая матрица трансформации дракона.
// Порядок полностью совпадает с отрисовкой: translate → scale(face) → rotate(angle).
// Масштаб толпы применяется и к спрайту, и к точке выхода огня изо рта.
// Так уменьшенный дракон не стреляет из прежней, визуально смещённой точки.
function dragonTransform(p, angleOverride) {
  const angle = Number.isFinite(angleOverride)
    ? angleOverride
    : (Number.isFinite(p.dtilt) ? p.dtilt : (p.tilt || 0));

  const face = p.face < 0 ? -1 : 1;
  const cs = Math.cos(angle);
  const sn = Math.sin(angle);
  const scale = dragonCrowdScale();

  return {
    a: face * cs * scale,
    b: sn * scale,
    c: -face * sn * scale,
    d: cs * scale,
    angle,
    face,
    scale
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
  const crowdScale=dragonCrowdScale();
  const stunned=p.asleep&&!p.dead;
  const sh=stunned
    ?(dragonStunnedFor(p.ci)||IMG.dragonStunned||dragonFor(p.ci)||IMG.dragon)
    :(dragonFor(p.ci)||IMG.dragon);

  if(!sh){emoji('🐲',p.x,p.y,46*crowdScale);return}
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
let testLoadMode=false,testBotClock=0,testPerfSamples=[],testPerfRun=null,testPerfLastRaf=0,testLastSnapshotBytes=0;
let enemies=[],notes=[],beams=[],balls=[],pickups=[],parts=[],shake=0,quip='',quipT=0,last=0,shopT=0,spawned=0,inspV=1,chorusCd=6,chorusT=0,chorusBardId=null,tags=[],uid=0,evs=[],active=false,zones=[],bossProjectiles=[],markId=-1,markT=0;
let princessHintT=6,princessHintsShown=new Set();

// ===== Игроки =====
let players=[],me=null,isHost=false,ws=null;
const activePlayerCount=()=>Math.max(1,players.reduce((n,p)=>n+(!p.gone?1:0),0));
// Численность волн растёт мягче числа игроков, чтобы 20 драконов не перегружали поле.
// Командный объём награды при этом масштабируется пропорционально числу участников.
function enemyPopulationFactorForPlayers(count){const n=Math.max(1,Math.min(20,Math.floor(Number(count)||1)));return 1+.85*Math.sqrt(n-1)}
function multiplayerRewardMultiplierForPlayers(count){const n=Math.max(1,Math.min(20,Math.floor(Number(count)||1)));return Math.max(1,n/enemyPopulationFactorForPlayers(n))}
// Точный расчёт с переносом дробного остатка: небольшие награды не теряют и не создают
// валюту из-за округления каждого отдельного дропа. Остатки независимы для золота/свитков
// и для каждого размера команды, поэтому смена числа игроков не искажает баланс.
function allocateScaledReward(base,count,remainder=0){
  if(!(base>0))return{amount:0,remainder:0};
  const exact=base*multiplayerRewardMultiplierForPlayers(count)+Math.max(0,Number(remainder)||0);
  const amount=Math.max(1,Math.floor(exact+1e-9));
  return{amount,remainder:Math.max(0,exact-amount)};
}
const rewardRemainders=Array.from({length:21},()=>[0,0]);
function scaleEnemyRewardAmount(base,count=activePlayerCount(),currency=0){
  const n=Math.max(1,Math.min(20,Math.floor(Number(count)||1)));
  const c=currency===1?1:0;
  const result=allocateScaledReward(base,n,rewardRemainders[n][c]);
  rewardRemainders[n][c]=result.remainder;
  return result.amount;
}
function previewEnemyRewardAmount(base,count){if(!(base>0))return '0';const exact=base*multiplayerRewardMultiplierForPlayers(count),low=Math.floor(exact),high=Math.ceil(exact);return low===high?String(low):low+'–'+high}
function simulateScaledRewards(base,count,drops=1000){
  let remainder=0,total=0;
  for(let i=0;i<drops;i++){const next=allocateScaledReward(base,count,remainder);total+=next.amount;remainder=next.remainder;}
  const average=total/drops;
  const perPlayer=average*enemyPopulationFactorForPlayers(count)/count;
  return{total,average,perPlayer,expected:base};
}
function bossGuardForMaxHp(kind,maxHp){const ratio=BOSS_GUARD_RATIO[kind]||0;return ratio>0?Math.max(1,Math.round(maxHp*ratio)):0}
function pickupMagnetRadiusForBaseReward(base){return base>=10?200:130}
function bossGuardBarLayout(e){const width=e.k==='king'?86:78,height=12,y=e.y-e.t.r-31;return{x:e.x-width/2,y,width,height,hpBarY:e.y-e.t.r-8}}
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
function pos(e){
  const r=cv.getBoundingClientRect();
  const screenX=(e.clientX-r.left)*cvW/r.width-ox;
  const screenY=(e.clientY-r.top)*cvH/r.height-oy;
  // Магазин и HUD не масштабируются вместе с игровым полем.
  // В самой игре возвращаем координаты в мировое пространство камеры.
  if(state==='play'){
    const world=screenToWorldPoint(screenX,screenY);
    mouse.x=world.x;
    mouse.y=world.y;
  }else{
    mouse.x=screenX;
    mouse.y=screenY;
  }
}
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
function quote(key,vars={}){
  const template=pick(Q[key]||['']);
  return template.replace(/\{([a-zA-Z]+)\}/g,(match,name)=>Object.prototype.hasOwnProperty.call(vars,name)?String(vars[name]):match);
}
function sayQ(key,seconds=3,vars={}){say(quote(key,vars),seconds)}
function updatePrincessHints(dt){
  if(TEST_MODE||!isHost||state!=='play')return;
  princessHintT=Math.max(0,princessHintT-dt);
  if(princessHintT>0||quipT>0||phase!=='spawn')return;
  const hint=PRINCESS_HINTS.find(item=>wave>=item.wave&&!princessHintsShown.has(item.id));
  if(!hint){princessHintT=12;return}
  princessHintsShown.add(hint.id);
  say(hint.text,5);
  princessHintT=8;
}
function tag(e,txt){tags.push({x:e.x,y:e.y-34,txt,life:1.3})}
function boom(x,y,col,n){if(isHost&&evs.length<40)evs.push([Math.round(x),Math.round(y),col,n]);spark(x,y,col,n)}
function spark(x,y,col,n){for(let i=0;i<n&&parts.length<400;i++){const a=Math.random()*6.283,v=30+Math.random()*100;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.42+Math.random()*.25,col})}}

// ===== Магазин =====
function buy(p,i){const c=cost(p,i),t=UP[i].t;if(p.w[t]>=c&&!capped(p,i)){p.w[t]-=c;p.lv[i]++;if(i===3){p.sh=shMax(p);p.shT=0}}}
function goOn(){me.ready=true;checkGo()}
function checkGo(){if(players.every(p=>p.gone||p.ready))nextFromShop()}
function nextFromShop(){players.forEach(p=>p.ready=false);state='play';nextWave()}
function buyReq(i){if(isHost)buy(me,i);else net({k:'buy',i})}
function goReq(){if(isHost)goOn();else net({k:'go'})}
function shopClick(){UP.forEach((u,i)=>{const x=SX+i*206;if(mouse.x>x&&mouse.x<x+190&&mouse.y>190&&mouse.y<380)buyReq(i)});if(Math.abs(mouse.x-CX)<110&&mouse.y>450&&mouse.y<498)goReq()}

// ===== Ход игры =====
function resetWorld(){state='play';wave=0;tower=towerMax;score=0;enemies=[];notes=[];beams=[];tags=[];balls=[];pickups=[];parts=[];shake=0;zones=[];bossProjectiles=[];markId=-1;quip='';quipT=0;princessHintT=6;princessHintsShown=new Set();for(const row of rewardRemainders)row[0]=row[1]=0}
function nextWave(){
  wave++;queue=[];spawned=0;
  const n=Math.round((4+wave*2.2)*enemyPopulationFactorForPlayers(activePlayerCount())*(BOSS[wave]?.85:1));
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
  const a=Math.random()*6.283,t=T[k],partySize=activePlayerCount(),s=k==='prince'?1+(partySize-1)*BOSSCFG.hpPrince:k==='king'?1+(partySize-1)*BOSSCFG.hpKing:1+(wave-1)*.2;
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
  if(t.boss){e.guardMax=bossGuardForMaxHp(k,e.max);e.guard=e.guardMax;e.guardFlash=0;e.guardBreakT=0;e.path=makeBossPath(k,e.x,e.y);}
  enemies.push(e);
}
function nx(p,i){return{lv:p.lv.map((v,j)=>j===i?v+1:v)}}
function descNew(p,i){const n=capped(p,i)?p:nx(p,i);
  return['пламени×урон: '+flames(p)+'×'+dmgOf(p)+' → '+flames(n)+'×'+dmgOf(n),
    'выстр./с: '+(1/(.5*Math.pow(.85,p.lv[1]))).toFixed(1)+' → '+(1/(.5*Math.pow(.85,n.lv[1]))).toFixed(1),
    'скорость: '+Math.round(230*(1+.2*p.lv[2]))+' → '+Math.round(230*(1+.2*n.lv[2])),
    'щит: '+shMax(p)+' → '+shMax(n)+', восст. '+(SH_T[n.lv[3]]||'—')+' с'][i]}
function drop(e,o){
  if(isBoss(e)&&activePlayerCount()>1){
    // Боссовая награда общая: итоговый удар не должен определять, кто может купить улучшения.
    const reward=BOSS_REWARDS[e.k]||[0,0];
    const recipients=players.filter(p=>!p.gone);
    for(const p of recipients){p.w[0]+=reward[0];p.w[1]+=reward[1];p.earned+=reward[0]}
    sayQ('bossTeamReward',4,{gold:reward[0],scrolls:reward[1],count:recipients.length});
    tag(e,'НАГРАДА КОМАНДЕ');
    boom(e.x,e.y,'#ffd24d',18);
    return;
  }
  const base={knight:[Math.random()<DROP.chance?1:0,0],bard:[0,1],mage:[2,0],merchant:[2,0],prince:BOSS_REWARDS.prince,king:BOSS_REWARDS.king}[e.k]||[0,0];
  const count=activePlayerCount();
  base.forEach((v,t)=>{if(v){const value=isBoss(e)?v:scaleEnemyRewardAmount(v,count,t);pickups.push({id:++uid,x:e.x+(t?12:-12),y:e.y,v:value,t,magnetRadius:pickupMagnetRadiusForBaseReward(v),life:isBoss(e)?DROP.boss:DROP.life,own:o?o.id:-1,res:o?3:0})}})
}
function toShop(){for(const c of pickups)boom(c.x,c.y,'#9a8aa8',5);pickups=[];for(const p of players){p.asleep=false;p.dead=false;p.h=Math.min(maxH(p),p.h+1);p.inv=0;p.frz=0;p.sh=shMax(p);p.shT=0;p.ready=false}state='shop';shopT=0}

// ===== Способности боссов =====
const BLAST={cd:5,r:55,mult:1};
function resolveEnemyDamage(e,amount){
  let remaining=Math.max(0,Number(amount)||0);
  let mageShield=Math.max(0,Number(e.sh)||0);
  let bossGuard=Math.max(0,Number(e.guard)||0);
  const mageAbsorbed=Math.min(mageShield,remaining);mageShield-=mageAbsorbed;remaining-=mageAbsorbed;
  let guardAbsorbed=0,guardBroken=false;
  if(isBoss(e)&&bossGuard>0&&remaining>0){
    const before=bossGuard;guardAbsorbed=Math.min(bossGuard,remaining);bossGuard-=guardAbsorbed;
    // Удар, который разрушает барьер, не переносит остаток урона на здоровье.
    remaining=0;guardBroken=before>0&&bossGuard<=0;
  }
  return{mageShield,bossGuard,mageAbsorbed,guardAbsorbed,guardBroken,hpDamage:remaining};
}
function onEnemyDefeated(e,o){
  if(e.rewarded)return;e.rewarded=true;if(o)o.kills++;score++;boom(e.x,e.y,'#ff8fa8',14);drop(e,o);
  if(isBoss(e)){if(activePlayerCount()===1)say(pick(Q.kill))}else if(Math.random()<.06)say(pick(Q.kill));
}
function damageEnemy(e,dmg,o,hitX=e.x,hitY=e.y){
  if(!e||e.hp<=0||!(dmg>0))return;
  const result=resolveEnemyDamage(e,dmg);
  e.sh=result.mageShield;e.guard=result.bossGuard;
  if(result.mageAbsorbed>0)boom(hitX,hitY,'#8fd8ff',6);
  if(result.guardAbsorbed>0){e.guardFlash=.18;if(result.guardBroken){e.guardBreakT=1.2;tag(e,'БАРЬЕР СНЯТ!');sayQ('bossGuardBreak',3);boom(e.x,e.y,'#bd8cff',24)}}
  if(result.hpDamage>0)e.hp-=result.hpDamage;
  if(e.hp<=0)onEnemyDefeated(e,o);
}
function explode(b){const o=players[b.owner],dmg=Math.max(1,Math.round(b.dmg*BLAST.mult));
  boom(b.x,b.y,'#ff9a3d',30);boom(b.x,b.y,'#ffe27a',14);shake=Math.max(shake,4);
  for(const e of enemies)if(e.hp>0&&Math.hypot(e.x-b.x,e.y-b.y)<BLAST.r+e.t.r)damageEnemy(e,dmg,o);
  for(const n of notes)if(n.hp>0&&Math.hypot(n.x-b.x,n.y-b.y)<BLAST.r)n.hp=0}
const BOSSCFG={hpPrince:1,hpKing:1.4,roseEvery:9,roseDelay:1.5,roseR:55,castT:7,castBreak:.18,castHit:.25,stun:4,castCd:16,decreeEvery:12,disgraceEvery:9.5,disgraceT:8};
const THROW_T=.8,KING_ACT=1.3,KING_MIN_DECREES=5,KING_MIN_DISGRACES=5,EDICT_KNIGHT_SPEED=1.25;
// Единственная точка расчёта скорости врага: тестовый режим проверяет
// именно эту функцию, поэтому диагностика совпадает с реальной симуляцией.
function enemyMoveSpeed(e,lone,insp){
  const edictBoost=e.k==='knight'&&e.chase?EDICT_KNIGHT_SPEED:1;
  return e.t.sp*(lone?1.8:1)*(e.k==='bard'?1:insp)*edictBoost;
}
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
    :{t1:9,t2:11,stun:0,decreeCount:0,disgraceCount:0,approachStarted:false});

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

        sayQ('princeInterrupted',4);
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
      sayQ('princeProposal',4);
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
    e.path=makeBossPath('king',e.x,e.y,undefined,undefined,0); // После патруля — строго прямая к башне.

    if(!knightsRemain){
      sayQ('kingNoKnights',4);
    }else{
      sayQ('kingApproach',4);
    }
    tag(e,'К башне!');
  }

  // Таймеры независимы: максимум пять указов и максимум пять обвинений.
  // Интервалы одинаковы в одиночной игре и мультиплеере.
  // Обвинения не запускаются, когда живых рыцарей на поле больше нет.
  if(!a.approachStarted){
    if(!decreesDone)a.t1-=dt;
    if(accusationsCanContinue)a.t2-=dt;

    if(!decreesDone&&a.t1<=0){
      a.t1=BOSSCFG.decreeEvery;
      a.pend='decree';
      a.did=false;
      a.thr=a.thrT=KING_ACT;
    }
    else if(accusationsCanContinue&&a.t2<=0){
      a.t2=BOSSCFG.disgraceEvery;
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

  sayQ('princeRing',3);
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
        sayQ('princeRingImpact',4);
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
  const n=Math.min(12,3+Math.ceil(activePlayerCount()*.6));
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

  sayQ('princeRoses',4);
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

  const n=4+Math.ceil(Math.sqrt(activePlayerCount())*2);
  for(let i=0;i<n;i++)spawn('knight');
  const count=a?(a.decreeCount=(a.decreeCount||0)+1):1;
  sayQ(count>=KING_MIN_DECREES?'kingDecreeFinal':'kingDecree',4,{count,max:KING_MIN_DECREES});
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
  sayQ('kingDisgrace',4,{name:p.name,count,max:KING_MIN_DISGRACES});
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
  if(ci[0]>0){const w=110,x=e.x-w/2,y=e.y-e.t.r-(isBoss(e)&&e.guard>0?58:34);
    ctx.fillStyle='#0009';ctx.fillRect(x,y,w,16);ctx.fillStyle='#ffd24d';ctx.fillRect(x,y,w*ci[0]/100,8);ctx.fillStyle='#ff5a4d';ctx.fillRect(x,y+8,w*ci[1]/100,8);
    if(IMG.ring)drawSheet(IMG.ring,6,e.x,y-16,26,(typeof performance!=='undefined'?performance.now():0)/130);else emoji('💍',e.x,y-12,22);text('собьём!',e.x,y+(isBoss(e)&&e.guard>0?22:30),13,'#fbe8d3','italic')}}
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
  if(byFriend)sayQ('wakeFriend');else{p.w[0]=Math.floor(p.w[0]*.75);sayQ('wakeSolo');}}
function hitDragon(p,e){if(TEST_MODE&&testInvulnerable){if(e.k==='note')e.hp=0;return}if(p.sh>0){p.sh--;p.shT=0;p.inv=.8;shake=3;boom(p.x,p.y,'#8fd8ff',10)}else{p.h--;p.inv=1.5;shake=8;boom(p.x,p.y,'#ff6b81',10)}if(e.k==='note')e.hp=0;else damageEnemy(e,1,p,e.x,e.y);
  if(p.h<=0){p.h=0;p.asleep=true;p.wt=wakeTime();p.rv=0;sayQ('dragonDown',4)}}

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
      sayQ('dragonOut',4,{name:p.name});
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

  // Расширяем мировые границы вместе с zoom-out камеры,
  // чтобы управление не упиралось в прежний прямоугольник W×H.
  clampPlayerToMovementBounds(p);

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

function updateTestBots(dt){
  if(!TEST_MODE||!testLoadMode)return;
  testBotClock+=dt;
  for(const p of players){
    if(!p.testDummy||p.gone||p.asleep||p.dead)continue;
    const phase=testBotClock*.82+p.id*2.399963229728653;
    p.in.mx=Math.cos(phase);
    p.in.my=Math.sin(phase*.91+p.id*.17);
    const bounds=playerMovementBounds();
    p.in.ax=Math.max(bounds.minX,Math.min(bounds.maxX,p.x+Math.cos(phase*.73+p.id)*210));
    p.in.ay=Math.max(bounds.minY,Math.min(bounds.maxY,p.y+Math.sin(phase*.79+p.id)*140));
    p.in.fire=true;
    p.in.alt=p.lv[0]>=5&&Math.sin(testBotClock*.55+p.id*1.31)>.88;
  }
}

function update(dt){
  const k=keys;
  Object.assign(me.in,{mx:(k.KeyD||k.ArrowRight?1:0)-(k.KeyA||k.ArrowLeft?1:0),my:(k.KeyS||k.ArrowDown?1:0)-(k.KeyW||k.ArrowUp?1:0),ax:mouse.x,ay:mouse.y,fire:mouse.down,alt:mouse.alt});
  updateTestBots(dt);
  for(const p of players)updatePlayer(p,dt);
  if(!players.some(p=>!p.asleep&&!p.gone)){state='lose';return}
  for(const b of balls){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    for(const e of enemies){if(e.hp>0&&b.life>0&&Math.hypot(e.x-b.x,e.y-b.y)<e.t.r+8){b.life=0;const owner=players[b.owner];damageEnemy(e,b.dmg,owner,b.x,b.y);boom(b.x,b.y,'#ffb347',5)}}}
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

    sayQ('bardChorus',4);
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

  // chorusT is decremented once per frame above; keep the boost timer in sync with its visual effect.
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

    sayQ(!knightsRemain?'kingNoKnights':'kingMarkEnded',4);
  }
}

players.forEach(p=>{
  p.mark=p.id===markId;
});

  for(const e of enemies){if(e.hp<=0)continue;
    e.guardFlash=Math.max(0,(e.guardFlash||0)-dt);e.guardBreakT=Math.max(0,(e.guardBreakT||0)-dt);
    let dx=CX-e.x,dy=CY-e.y,d=Math.hypot(dx,dy);e.chase=0;if(e.actL>0){e.actL-=dt;e.thr=e.actL>0?Math.max(1,Math.round((1-e.actL/e.actT)*100)):0}
    if(e.t.boss)bossAI(e,dt);
    if(markId>=0&&!e.t.rng&&!e.t.boss){const mp=players[markId];dx=mp.x-e.x;dy=mp.y-e.y;d=Math.hypot(dx,dy)||1;e.chase=1}
    const lone=lonely(e);if(lone&&!e.rush){e.rush=true;sayQ('magiAlone',4);}
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
      // Рыцари под королевской опалой активнее преследуют отмеченного дракона.
      // Скорость рассчитывается общей функцией, которую проверяет тестовый режим.
      const sm=enemyMoveSpeed(e,lone,insp);
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
  // Pickups are resolved only by the host. Re-check distance after magnet movement
  // so a coin that enters the collection radius is collected on this same tick.
  const PICKUP_RADIUS=34;
  const PICKUP_MAGNET_SPEED=300;
  for(const c of pickups){
    if(c.got)continue;
    const owner=players.find(p=>p.id===c.own)||null;
    if(!owner||owner.asleep||owner.dead||owner.gone)c.res=0;
    // Preserve the existing lifetime pause while the original owner is asleep.
    if(!owner||!owner.asleep)c.life-=dt;
    c.res=Math.max(0,(c.res||0)-dt);

    let best=null,bd=Infinity;
    for(const p of players){
      if(p.asleep||p.dead||p.gone||(c.res>0&&c.own!==p.id))continue;
      const d=Math.hypot(p.x-c.x,p.y-c.y);
      if(d<bd){bd=d;best=p}
    }

    if(best){
      const magnetRadius=Number.isFinite(c.magnetRadius)?c.magnetRadius:pickupMagnetRadiusForBaseReward(c.v);
      if(bd<magnetRadius&&bd>0){
        const step=Math.min(bd,PICKUP_MAGNET_SPEED*dt);
        c.x+=(best.x-c.x)/bd*step;
        c.y+=(best.y-c.y)/bd*step;
      }
      // Use the updated position, not the pre-magnet distance. The 34px
      // threshold also prevents fast dragons from skipping over small pickups.
      const pickupDistance=Math.hypot(best.x-c.x,best.y-c.y);
      if(pickupDistance<=PICKUP_RADIUS){
        c.got=true;
        c.life=0;
        best.w[c.t]+=c.v;
        if(!c.t){
          best.earned+=c.v;
          best.coinGlow=(best.in&&(best.in.fire||best.in.alt))?0:1.2;
        }
        boom(best.x,best.y,CUR[c.t].c,4);
      }
    }
  }
  for(const c of pickups)if(c.life<=0&&!c.got)boom(c.x,c.y,'#9a8aa8',5);
  pickups=pickups.filter(c=>c.life>0&&!c.got);
  for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}
  parts=parts.filter(p=>p.life>0);
  for(const b of beams)b.life-=dt;
  beams=beams.filter(b=>b.life>0);
  for(const t of tags){t.life-=dt;t.y-=18*dt}
  tags=tags.filter(t=>t.life>0);
  shake=Math.max(0,shake-40*dt);quipT=Math.max(0,quipT-dt);updatePrincessHints(dt);
  if(phase==='break'){phaseT-=dt;if(phaseT<=0)phase='spawn'}
  else if(phase==='clear'){phaseT-=dt;if(phaseT<=0){if(TEST_MODE){phase='break';phaseT=1e9}else toShop()}}
  else{spawnT-=dt;if(queue[0]==='bard'&&queue.length>1&&enemies.filter(x=>x.k==='bard').length>=2+Math.ceil(Math.sqrt(activePlayerCount())))queue.push(queue.shift());
    if(queue[0]==='mage'&&queue.length>1&&(enemies.filter(x=>x.k==='mage').length>=2||spawned<4||!enemies.some(x=>x.t.kind!=='heal')))queue.push(queue.shift());
    if(queue.length&&spawnT<=0&&enemies.length<MAXON+8*(activePlayerCount()-1)){spawn(queue.shift());spawnT=Math.max(TEST_MODE?0.05:0.3,(TEST_MODE?0.14:1.5-wave*0.08)/(1+0.5*Math.sqrt(activePlayerCount()-1)))}
    if(!queue.length&&!enemies.length&&!notes.length){
      if(TEST_MODE){phase='clear';phaseT=.35;sayQ('testWaveClear',3);}
      else if(wave>=TOTAL)state='win';
      else{phase='clear';phaseT=3;sayQ('waveClear',3);
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
  const visualScale=dragonCrowdScale();

  // Масштабируем вместе со спрайтом только декоративные эффекты.
  drawShadow(p.x,p.y+38*visualScale,42*visualScale,12*visualScale,0.18);

  // Compact shield rings, close to the dragon and with a lighter outline.
  if(p.sh>0){
    ctx.save();
    const pulse=.9+.1*Math.sin(now/170+p.id);
    for(let i=0;i<p.sh;i++){
      ctx.strokeStyle='rgba(143,216,255,'+(0.68*pulse)+')';
      ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.arc(p.x,p.y,(38+i*4.5)*visualScale,0,6.283);
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

  // Gold pickup no longer draws a ring around the dragon.

  if(p.dead){
    emoji('💀',p.x,p.y-34*visualScale,26*visualScale);
  }else if(p.asleep){
    text(String(Math.max(0,Math.ceil(p.wt))),p.x,p.y-52*visualScale,16,'#ffdd88');
    ctx.lineWidth=4*visualScale;
    ctx.beginPath();
    ctx.arc(p.x,p.y,36*visualScale,-1.57,-1.57+6.283*Math.min(1,Math.max(p.rv/2,1-p.wt/wakeTime())));
    ctx.stroke();
    ctx.lineWidth=1;
  }

  if(p.mark){
    const t=now/1000;
    ctx.strokeStyle='rgba(255,60,60,'+(.6+.35*Math.sin(t*10))+')';
    ctx.lineWidth=4*visualScale;
    ctx.beginPath();
    ctx.arc(p.x,p.y,48*visualScale,0,6.283);
    ctx.stroke();
    ctx.lineWidth=1;
    drawCrownIcon(p.x,p.y-57*visualScale,34*visualScale,24*visualScale);
  }

  // Merchant's gold-bag effect uses the animated coinBag sprite already in assets.
  if(p.frz>0){
    if(IMG.coinBag)drawSheet(IMG.coinBag,6,p.x+54*visualScale,p.y-38*visualScale,30*visualScale,now/110+p.id);
    else emoji('💰',p.x+54*visualScale,p.y-38*visualScale,22*visualScale);
  }

  text(p.name,p.x,p.y+50*visualScale,14,c);
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
  const padX=15, padY=9, fontSize=17, lineHeight=21, speakerHeight=15;
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
  const maxLines=Math.max(1,Math.floor((viewportHeight-116-padY*2-speakerHeight)/lineHeight));
  if(lines.length>maxLines){
    lines.length=maxLines;
    let last=lines[maxLines-1];
    while(last.length&&ctx.measureText(last+'…').width>maxTextWidth)last=last.slice(0,-1);
    lines[maxLines-1]=last+'…';
  }

  const measuredWidth=Math.max(...lines.map(v=>ctx.measureText(v).width));
  const boxWidth=Math.min(boxMaxWidth,measuredWidth+padX*2);
  const boxHeight=lines.length*lineHeight+padY*2+speakerHeight;
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
  ctx.textBaseline='middle';
  ctx.textAlign='left';
  ctx.font='bold 10px Georgia,serif';
  ctx.fillStyle='#b45d7b';
  ctx.fillText('ПРИНЦЕССА',boxX+padX,boxY+padY+speakerHeight/2);
  ctx.textAlign='center';
  ctx.font='italic '+fontSize+'px Georgia,serif';
  ctx.fillStyle='#3b1c3f';
  lines.forEach((row,i)=>ctx.fillText(row,boxX+boxWidth/2,boxY+padY+speakerHeight+lineHeight*(i+.5),maxTextWidth));
  ctx.restore();
}
function drawShopWrapped(value,x,centerY,maxWidth,fontSize,color,maxLines=2,lineHeight=16){
  const words=String(value||'').split(/\s+/).filter(Boolean);
  const lines=[];
  ctx.save();
  ctx.font=fontSize+'px Georgia,serif';
  let line='';
  for(const word of words){
    const candidate=line?line+' '+word:word;
    if(ctx.measureText(candidate).width<=maxWidth||!line){
      line=candidate;
    }else{
      lines.push(line);
      line=word;
      if(lines.length===maxLines-1)break;
    }
  }
  if(line&&lines.length<maxLines)lines.push(line);
  const consumed=lines.join(' ').length;
  if(consumed<String(value||'').length&&lines.length){
    let last=lines.length-1;
    let shortened=lines[last];
    while(shortened&&ctx.measureText(shortened+'…').width>maxWidth)shortened=shortened.slice(0,-1);
    lines[last]=(shortened||'').trimEnd()+'…';
  }
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillStyle=color;
  const startY=centerY-(lines.length-1)*lineHeight/2;
  lines.forEach((row,i)=>ctx.fillText(row,x,startY+i*lineHeight,maxWidth));
  ctx.restore();
  return lines.length;
}

function drawShop(){
  ctx.globalAlpha=Math.min(1,shopT/.6);ctx.fillStyle='rgba(20,8,35,.9)';ctx.fillRect(-ox,-oy,cvW,cvH);ctx.textAlign='center';
  text('Волна '+wave+' отбита',CX,90,40,'#ff9bb3','italic');
  ctx.textAlign='left';drawIcon(0,CX-120,136,16);text(String(me.w[0]),CX-98,141,28,CUR[0].c);drawIcon(1,CX+30,136,16);text(String(me.w[1]),CX+52,141,28,CUR[1].c);ctx.textAlign='center';
  const rewardScale=multiplayerRewardMultiplierForPlayers(activePlayerCount());
  text(activePlayerCount()>1?'Награды обычных врагов ≈ ×'+rewardScale.toFixed(2)+' · округление без потерь · цены прежние':'Награды и цены: стандартные',CX,171,12,'#cbb5dc');
  UP.forEach((u,i)=>{const x=SX+i*206,y=190,cap=capped(me,i),ok=!cap&&me.w[u.t]>=cost(me,i);
    ctx.fillStyle=ok?'#3a2050':'#2a1740';ctx.strokeStyle=ok?CUR[u.t].c:'#6b4a85';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x,y,190,190,14);ctx.fill();ctx.stroke();ctx.lineWidth=1;
    drawShopWrapped(u.n,x+95,y+36,168,16,'#fbe8d3',1,18);
    drawShopWrapped(descOf(me,i),x+95,y+79,166,13,'#d9c3e8',2,16);
    text('Куплено: '+me.lv[i],x+95,y+125,14,'#d9c3e8');
    if(cap)text('Максимум',x+95,y+158,19,'#8a7096');
    else{ctx.textAlign='right';text(String(cost(me,i)),x+84,y+158,22,ok?CUR[u.t].c:'#8a7096');ctx.textAlign='center';ctx.save();if(!ok)ctx.globalAlpha*=.55;drawIcon(u.t,x+108,y+155,12);ctx.restore();text('['+(i+1)+']',x+160,y+158,14,'#8a7096')}});
  ctx.fillStyle='#ff9bb3';ctx.beginPath();ctx.roundRect(CX-110,450,220,48,12);ctx.fill();text(me.ready?'Ждём остальных':'Дальше',CX,481,22,'#2a1235');
  text('«Клавиши 1–4 — купить улучшение, Пробел — продолжить. Казну бережём!»',CX,545,15,'#d9c3e8','italic');
  text('Осталось '+Math.max(0,Math.ceil(shopLeft))+' с · готовы '+players.filter(p=>p.ready&&!p.gone).length+' из '+players.filter(p=>!p.gone).length,CX,578,16,'#d9c3e8');ctx.globalAlpha=1}
function drawBossGuardBar(e){
  if(!isBoss(e)||!(e.guardMax>0)||!(e.guard>0))return;
  const ratio=Math.max(0,Math.min(1,e.guard/e.guardMax));
  const layout=bossGuardBarLayout(e),{x,y,width:w,height:h}=layout;
  ctx.save();ctx.globalAlpha=.99;
  // Отдельная фиолетовая шкала барьера: голубой круг мага по-прежнему рисуется независимо.
  ctx.fillStyle='rgba(15,8,30,.96)';ctx.strokeStyle=e.guardFlash>0?'#fff7ff':'#d5a7ff';ctx.lineWidth=1.5;
  ctx.shadowColor=e.guardFlash>0?'#fff':'rgba(180,112,255,.55)';ctx.shadowBlur=e.guardFlash>0?9:4;
  ctx.beginPath();ctx.roundRect(x,y,w,h,4);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
  const innerW=Math.max(0,(w-4)*ratio);
  if(innerW>0){
    const grad=ctx.createLinearGradient(x+2,y+2,x+w-2,y+2);grad.addColorStop(0,'#7540b5');grad.addColorStop(.5,'#bd83f4');grad.addColorStop(1,'#f4d6ff');
    ctx.fillStyle=grad;ctx.beginPath();ctx.roundRect(x+2,y+2,innerW,h-4,3);ctx.fill();
  }
  // Маленькие деления помогают читать остаток защиты даже на уменьшенной сцене.
  ctx.save();ctx.beginPath();ctx.roundRect(x+1,y+1,w-2,h-2,3);ctx.clip();
  ctx.strokeStyle='rgba(35,13,55,.42)';ctx.lineWidth=1;
  for(let i=1;i<5;i++){const sx=x+w*i/5;ctx.beginPath();ctx.moveTo(sx,y+2);ctx.lineTo(sx,y+h-2);ctx.stroke()}
  ctx.restore();
  ctx.font='bold 8px Georgia,serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fffaff';ctx.shadowColor='#28123e';ctx.shadowBlur=3;ctx.fillText('БАРЬЕР',e.x,y+h/2+.35);
  ctx.restore();
}

function draw(){tintedNow=false;ctx.setTransform(K,0,0,K,0,0);
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1b1030');g.addColorStop(.6,'#5a2a5e');g.addColorStop(1,'#c4577a');
  if(IMG.bg)drawBg();else{ctx.fillStyle=g;ctx.fillRect(0,0,cvW,cvH);
  ctx.fillStyle='#fbe8d3';for(const s of stars){ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,6.283);ctx.fill()}ctx.globalAlpha=1}
  ctx.translate(ox,oy);
  ctx.save();if(shake)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  // Отдаляем только игровую сцену. HUD, подсказки и магазин остаются прежнего размера.
  const cameraScale=sceneCrowdScale();
  ctx.translate(CX,CY);
  ctx.scale(cameraScale,cameraScale);
  ctx.translate(-CX,-CY);
  ctx.textAlign='center';ctx.textBaseline='middle';
  const drawE=e=>{drawEnemy(e);drawEnemyMarks(e);if(e.sh){ctx.strokeStyle='rgba(143,216,255,.78)';ctx.lineWidth=1.35;ctx.beginPath();ctx.arc(e.x,e.y,e.t.r+3,0,6.283);ctx.stroke();ctx.lineWidth=1}if(
  e.k === 'bard' &&
  chorusT > 0 &&
  e.id === chorusBardId
){
  emoji('🎵',e.x+16,e.y-22,18);
}
    if(isBoss(e))drawBossGuardBar(e);
    if(isBoss(e)||e.hp<e.max){const bw=isBoss(e)?48:36,bh=4,bx=e.x-bw/2,by=e.y-e.t.r-8;ctx.fillStyle='#000b';ctx.fillRect(bx,by,bw,bh);ctx.fillStyle='#ff6b81';ctx.fillRect(bx,by,bw*Math.max(0,e.hp/e.max),bh)}};
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
    text('«WASD / стрелки — летим; ЛКМ — огонь; ПКМ — особая атака после улучшения!»',hudLeft,hudBottom,10,'#e9d9ed','italic');
    ctx.textAlign='right';
    text('«F — полный экран. Вдруг драмы мало!»',hudRight,hudBottom,10,'#e9d9ed','italic');
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

function drawRankMedal(x,y,place,size){
  const palettes={
    1:{ribbon:'#b93f56',ribbon2:'#e36b76',base:'#f2c84b',edge:'#8d5d18',shine:'#fff0a8'},
    2:{ribbon:'#5278b5',ribbon2:'#86a8dc',base:'#dfe8f2',edge:'#596b80',shine:'#ffffff'},
    3:{ribbon:'#9b4938',ribbon2:'#d47a50',base:'#ca8050',edge:'#71402b',shine:'#ffe0bf'}
  };
  const c=palettes[place];
  if(!c)return;
  const r=size*.39;
  ctx.save();
  ctx.translate(x,y);
  ctx.lineJoin='round';
  // Two visible ribbon tails behind the medal face.
  ctx.fillStyle=c.ribbon;
  ctx.beginPath();ctx.moveTo(-r*.66,-r*.42);ctx.lineTo(-r*.5,r*1.16);ctx.lineTo(-r*.02,r*.76);ctx.lineTo(-r*.2,-r*.3);ctx.closePath();ctx.fill();
  ctx.fillStyle=c.ribbon2;
  ctx.beginPath();ctx.moveTo(r*.2,-r*.32);ctx.lineTo(r*.02,r*.76);ctx.lineTo(r*.56,r*1.12);ctx.lineTo(r*.68,-r*.42);ctx.closePath();ctx.fill();
  const gradient=ctx.createRadialGradient(-r*.28,-r*.34,r*.08,0,0,r*1.2);
  gradient.addColorStop(0,c.shine);gradient.addColorStop(.55,c.base);gradient.addColorStop(1,c.edge);
  ctx.fillStyle=gradient;ctx.strokeStyle=c.edge;ctx.lineWidth=Math.max(1,size*.075);
  ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle=c.shine;ctx.lineWidth=Math.max(.7,size*.035);
  ctx.beginPath();ctx.arc(0,0,r*.72,0,Math.PI*2);ctx.stroke();
  // A small contrasting star keeps the silver medal readable at compact row heights.
  ctx.fillStyle=place===2?'#53677f':'#704a1d';
  ctx.beginPath();
  for(let i=0;i<10;i++){
    const a=-Math.PI/2+i*Math.PI/5,rr=i%2===0?r*.43:r*.19;
    const px=Math.cos(a)*rr,py=Math.sin(a)*rr;
    if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
  }
  ctx.closePath();ctx.fill();
  ctx.restore();
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
  const endingLine=state==='win'
    ?'«Башня спасена! Я знала, что драконы — лучшая охрана!»'
    :tower<=0
      ?'«Башня пала… Но это ещё не конец истории!»'
      :'«Драконы пали, но вы сражались как легенды!»';
  text(endingLine,CX,tableY+34,Math.min(38,tableW*.045),'#ff9bb3','italic');

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
    if(i<3)drawRankMedal(rankX,y,i+1,Math.max(16,Math.min(22,rowH*.82)));
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
const net=o=>{
  if(ws&&ws.readyState===1){
    ws.send(JSON.stringify({t:'msg',to:isHost?'all':'host',data:o}));
  }else if(TEST_MODE&&testLoadMode&&o.k==='snap'){
    // Include the host's snapshot-serialization cost in the local benchmark,
    // even though the sandbox intentionally has no live WebSocket connection.
    const payload=JSON.stringify({t:'msg',to:isHost?'all':'host',data:o});
    testLastSnapshotBytes=payload.length;
  }
};
const r1=v=>Math.round(v),r10=v=>Math.round(v*10)/10;
function playerByNid(id){return players.find(p=>p.nid===id)}
function clampP(p){clampPlayerToMovementBounds(p)}

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
  e.ab&&e.ab.stun>0?1:0,
  r10(e.guard||0),r10(e.guardMax||0)
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
  if(now-lastIn>40){lastIn=now;net({k:'in',mx,my,ax:r1(mouse.x),ay:r1(mouse.y),f:!!mouse.down,al:!!mouse.alt})}
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
    stunned:!!e[13],
    guard:e[14]||0,
    guardMax:e[15]||0
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

function recordTestPerformance(t,frameMs,updateMs,drawMs,totalMs){
  const sample={frameMs,updateMs,drawMs,totalMs};
  testPerfSamples.push(sample);
  if(testPerfSamples.length>180)testPerfSamples.shift();
  if(testPerfRun&&!testPerfRun.finishedAt){
    testPerfRun.samples.push(sample);
    if(t-testPerfRun.startedAt>=testPerfRun.durationMs){
      testPerfRun.finishedAt=t;
      testSetLoadMode(false);
    }
  }
}

function loop(t){
  const measuring=TEST_MODE&&typeof performance!=='undefined';
  const loopStart=measuring?performance.now():0;
  const measuredFrameMs=measuring&&testPerfLastRaf>0?Math.max(0,t-testPerfLastRaf):0;
  if(measuring)testPerfLastRaf=t;
  const dt=Math.min(.05,(t-last)/1000||0);last=t;frameDt=dt;
  const updateStart=measuring?performance.now():0;
  if(isHost){
    if(state==='play')update(dt);
    else{parts=[];if(state==='shop'){shopT+=dt;shopLeft=SHOP_TIME-shopT;if(shopLeft<=0)nextFromShop()}}
    sendSnap(t);
  }else guestFrame(dt,t);
  const updateEnd=measuring?performance.now():0;
  draw();
  const drawEnd=measuring?performance.now():0;
  if(measuring)recordTestPerformance(t,measuredFrameMs,updateEnd-updateStart,drawEnd-updateEnd,drawEnd-loopStart);
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
function testSetPlayerCount(count){
  if(!TEST_MODE||!me)return {players:players.length,scale:dragonCrowdScale(),sceneScale:sceneCrowdScale(),spawnLayout:playerSpawnLayoutForCount(players.length)};
  testLoadMode=false;
  testPerfSamples=[];
  testPerfRun=null;
  testPerfLastRaf=0;
  testLastSnapshotBytes=0;
  const target=Math.max(1,Math.min(20,Math.floor(Number(count)||1)));
  const primary=me;
  primary.id=0;
  primary.gone=false;
  primary.asleep=false;
  const primaryPosition=playerSpawnPositionForIndex(0,target);
  primary.x=primaryPosition.x;
  primary.y=primaryPosition.y;
  primary.in.mx=0;
  primary.in.my=0;
  primary.in.ax=CX;
  primary.in.ay=CY;
  players=[primary];

  // Тестовые драконы используют ту же расширяющуюся расстановку, что и настоящая комната.
  // Благодаря этому визуальная проверка 15–20 участников соответствует старту матча.
  for(let i=1;i<target;i++){
    const p=makePlayer(i,i%COLORS.length);
    const position=playerSpawnPositionForIndex(i,target);
    p.name='Тестовый дракон '+(i+1);
    p.nid='test-dummy-'+i;
    p.testDummy=true;
    p.lv=primary.lv.slice();
    p.sh=shMax(p);
    p.x=position.x;
    p.y=position.y;
    p.in.ax=CX;
    p.in.ay=CY;
    p.face=Math.cos((i/target)*Math.PI*2)>=0?1:-1;
    players.push(p);
  }
  if(markId>=players.length){markId=-1;markT=0}
  return {players:players.length,scale:dragonCrowdScale(),sceneScale:sceneCrowdScale(),spawnLayout:playerSpawnLayoutForCount(players.length)};
}
function testSetLoadMode(enabled){
  if(!TEST_MODE)return {active:false,dragons:0};
  testLoadMode=!!enabled;
  for(const p of players){
    if(!p.testDummy)continue;
    p.lv=me.lv.slice();
    if(testLoadMode){
      p.asleep=false;p.dead=false;p.gone=false;p.h=maxH(p);
      p.in.fire=true;
    }else{
      p.in.mx=0;p.in.my=0;p.in.fire=false;p.in.alt=false;
      p.in.ax=p.x;p.in.ay=p.y;
    }
  }
  return {active:testLoadMode,dragons:players.filter(p=>!p.gone).length-1};
}
function testStartHostLoadTest(count,durationSeconds=30){
  if(!TEST_MODE||!me)return {started:false,reason:'Тестовый режим не активен'};
  const composition=testSetPlayerCount(count);
  // Clear wave activity so this benchmark isolates host cost from active dragons,
  // their movement, volleys and projectiles rather than stress-testing enemy spawning.
  testClearActors();
  testSetLoadMode(true);
  const duration=Math.max(5,Math.min(120,Number(durationSeconds)||30));
  testPerfSamples=[];
  testPerfLastRaf=0;
  testLastSnapshotBytes=0;
  testPerfRun={startedAt:typeof performance!=='undefined'?performance.now():0,durationMs:duration*1000,samples:[],finishedAt:0};
  return {started:true,players:composition.players,duration,scale:composition.scale};
}
function testStopHostLoadTest(){
  if(!TEST_MODE)return {stopped:false};
  testSetLoadMode(false);
  if(testPerfRun&&!testPerfRun.finishedAt)testPerfRun.finishedAt=typeof performance!=='undefined'?performance.now():0;
  return {stopped:true,players:players.filter(p=>!p.gone).length};
}
function testPerfInfo(){
  const run=testPerfRun;
  const samples=run?run.samples:(testLoadMode?testPerfSamples:[]);
  const values=key=>samples.map(s=>s[key]).filter(v=>Number.isFinite(v)&&v>0);
  const mean=a=>a.length?a.reduce((sum,v)=>sum+v,0)/a.length:0;
  const p95=a=>{if(!a.length)return 0;const sorted=a.slice().sort((x,y)=>x-y);return sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)]};
  const frames=values('frameMs'),updates=values('updateMs'),draws=values('drawMs'),totals=values('totalMs');
  const avgFrame=mean(frames),frame95=p95(frames),update95=p95(updates),draw95=p95(draws),total95=p95(totals);
  const fps=avgFrame?1000/avgFrame:0;
  let grade='idle',status='Ожидание нагрузочного теста';
  if(samples.length){
    if(fps>=55&&frame95<=20&&total95<=16.7){grade='good';status='Хорошо: близко к стабильным 60 FPS'}
    else if(fps>=45&&frame95<=28&&total95<=25){grade='warn';status='Есть нагрузка: проверьте на компьютере хоста'}
    else{grade='bad';status='Заметные просадки: нагрузка превышает комфортный уровень'}
  }
  const now=typeof performance!=='undefined'?performance.now():0;
  const elapsed=run?Math.min(run.durationMs,Math.max(0,(run.finishedAt||now)-run.startedAt))/1000:0;
  const renderObjects=players.filter(p=>!p.gone).length+enemies.length+balls.length+notes.length+pickups.length+parts.length+zones.length+beams.length+tags.length+bossProjectiles.length;
  return {fps,frameP95Ms:frame95,updateP95Ms:update95,drawP95Ms:draw95,totalP95Ms:total95,
    dragons:players.filter(p=>!p.gone).length,dragonScale:dragonCrowdScale(),sceneScale:sceneCrowdScale(),enemies:enemies.filter(e=>e.hp>0).length,
    projectiles:balls.length,particles:parts.length,renderObjects,snapshotKB:testLastSnapshotBytes/1024,grade,status,
    samples:samples.length,loadMode:testLoadMode,running:!!(run&&!run.finishedAt),done:!!(run&&run.finishedAt),
    elapsedSeconds:elapsed,durationSeconds:run?run.durationMs/1000:0};
}

function testStartEdict(){
  if(!TEST_MODE||!me)return {active:false,knights:0};
  me.asleep=false;
  me.dead=false;
  me.gone=false;
  enemies=enemies.filter(e=>e.k!=='knight');
  markId=me.id;
  markT=BOSSCFG.disgraceT;
  me.mark=true;
  for(let i=0;i<5;i++){
    spawn('knight');
    const knight=enemies[enemies.length-1];
    const angle=i*Math.PI*2/5;
    knight.x=Math.max(42,Math.min(W-42,me.x+Math.cos(angle)*220));
    knight.y=Math.max(76,Math.min(H-42,me.y+Math.sin(angle)*145));
    knight.chase=1;
  }
  say('ТЕСТ ОПАЛЫ: рыцари преследуют отмеченного дракона',3);
  return {active:true,knights:enemies.filter(e=>e.k==='knight'&&e.hp>0).length,duration:markT};
}
function testRunDiagnostics(){
  if(!TEST_MODE)return [];
  const checks=[];
  const add=(id,label,pass,detail)=>checks.push({id,label,pass:!!pass,detail});
  const counts=[1,6,10,15,20];
  const scales=counts.map(dragonCrowdScaleForCount);
  const expected20=.70;
  add('scale-baseline','1–6 драконов сохраняют исходный размер',
    counts.slice(0,2).every((n,i)=>Math.abs(scales[i]-1)<1e-9),'100%');
  add('scale-20','При 20 драконах размер спрайта уменьшается до 70%',
    Math.abs(scales[4]-expected20)<1e-9,(scales[4]*100).toFixed(1)+'%');
  add('scale-smooth','Масштаб драконов плавно уменьшается при росте числа игроков',
    scales.every((v,i)=>i===0||v<=scales[i-1])&&scales.every(v=>v<=1&&v>=.70),
    counts.map((n,i)=>n+': '+(scales[i]*100).toFixed(1)+'%').join(' · '));

  const sceneScales=counts.map(sceneCrowdScaleForCount);
  add('scene-baseline','Сцена не меняет масштаб при 1–6 игроках',
    sceneScales.slice(0,2).every(v=>Math.abs(v-1)<1e-9),'100%');
  add('scene-20','При 20 игроках камера отдаляется до 92%',
    Math.abs(sceneScales[4]-.92)<1e-9,(sceneScales[4]*100).toFixed(1)+'%');
  add('scene-smooth','Масштаб сцены уменьшается плавно и без скачков',
    sceneScales.every((v,i)=>i===0||v<=sceneScales[i-1])&&sceneScales.every(v=>v<=1&&v>=.92),
    counts.map((n,i)=>n+': '+(sceneScales[i]*100).toFixed(1)+'%').join(' · '));

  const spacingChecks=[];
  for(let count=2;count<=20;count++){
    const positions=Array.from({length:count},(_,i)=>playerSpawnPositionForIndex(i,count));
    let nearest=Infinity;
    for(let i=0;i<count;i++)for(let j=i+1;j<count;j++){
      nearest=Math.min(nearest,Math.hypot(positions[i].x-positions[j].x,positions[i].y-positions[j].y));
    }
    const scale=sceneCrowdScaleForCount(count);
    const visualDragon=96*dragonCrowdScaleForCount(count)*scale;
    const screenGap=(nearest-96*dragonCrowdScaleForCount(count))*scale;
    const minX=Math.min(...positions.map(p=>p.x)),maxX=Math.max(...positions.map(p=>p.x));
    const minY=Math.min(...positions.map(p=>p.y)),maxY=Math.max(...positions.map(p=>p.y));
    spacingChecks.push({count,screenGap,visualDragon,inside:minX>=24&&maxX<=W-24&&minY>=70&&maxY<=H-24});
  }
  const minScreenGap=Math.min(...spacingChecks.map(v=>v.screenGap));
  add('spawn-spacing','Стартовая расстановка оставляет зазор между драконами при 2–20 игроках',
    spacingChecks.every(v=>v.screenGap>=5&&v.inside),
    'Минимальный зазор '+minScreenGap.toFixed(1)+' px · все позиции внутри игрового поля');
  const maxLayout=playerSpawnLayoutForCount(20);
  add('spawn-formation-max','При 20 игроках стартовая формация расширяется вместе с размером комнаты',
    maxLayout.radiusX===306&&Math.abs(maxLayout.radiusY-238.68)<1e-8,
    'Полуоси эллипса: '+maxLayout.radiusX.toFixed(0)+' × '+maxLayout.radiusY.toFixed(0)+' мировых px');
  const sampleWorld={x:417,y:263};
  const sampleScreen={x:CX+(sampleWorld.x-CX)*sceneScales[4],y:CY+(sampleWorld.y-CY)*sceneScales[4]};
  const restored=screenToWorldPoint(sampleScreen.x,sampleScreen.y,sceneScales[4]);
  add('scene-input','Обратное преобразование мыши сохраняет точность прицела',
    Math.hypot(restored.x-sampleWorld.x,restored.y-sampleWorld.y)<1e-8,
    'Ошибка координат: '+Math.hypot(restored.x-sampleWorld.x,restored.y-sampleWorld.y).toFixed(8));

  const normalKnight=enemyMoveSpeed({k:'knight',chase:0,t:{sp:T.knight.sp}},false,1);
  const markedKnight=enemyMoveSpeed({k:'knight',chase:1,t:{sp:T.knight.sp}},false,1);
  const unmarkedKnight=enemyMoveSpeed({k:'knight',chase:0,t:{sp:T.knight.sp}},false,1);
  const markedMage=enemyMoveSpeed({k:'mage',chase:1,t:{sp:T.mage.sp}},false,1);
  add('knight-base','Обычная скорость рыцаря не изменилась',
    Math.abs(normalKnight-T.knight.sp)<1e-9,normalKnight.toFixed(1)+' ед./с');
  add('knight-edict','Под опалой рыцарь ускоряется ровно на 25%',
    Math.abs(markedKnight/normalKnight-1.25)<1e-9,normalKnight.toFixed(1)+' → '+markedKnight.toFixed(1)+' ед./с');
  add('knight-scope','Ускорение не действует на неотмеченных рыцарей и других врагов',
    Math.abs(unmarkedKnight-normalKnight)<1e-9&&Math.abs(markedMage-T.mage.sp)<1e-9,
    'Неотмеченный рыцарь: '+unmarkedKnight.toFixed(1)+' · маг: '+markedMage.toFixed(1)+' ед./с');
  add('live-scale','Текущий тестовый состав использует тот же масштаб, что и спрайты',
    Math.abs(dragonTransform(me).scale-dragonCrowdScale())<1e-9,
    players.filter(p=>!p.gone).length+' игроков · '+(dragonCrowdScale()*100).toFixed(1)+'%');
  add('live-scene-scale','Текущая сцена использует масштаб, соответствующий составу игроков',
    Math.abs(sceneCrowdScale()-sceneCrowdScaleForCount(players.filter(p=>!p.gone).length))<1e-9,
    'Сцена '+(sceneCrowdScale()*100).toFixed(1)+'%');

  const baseBounds=playerMovementBoundsForScale(1,1);
  add('player-edge-base','При исходном масштабе сохранены прежние границы движения',
    Math.abs(baseBounds.minX-24)<1e-8&&Math.abs(baseBounds.maxX-(W-24))<1e-8&&Math.abs(baseBounds.minY-70)<1e-8&&Math.abs(baseBounds.maxY-(H-24))<1e-8,
    'X: '+baseBounds.minX.toFixed(1)+'–'+baseBounds.maxX.toFixed(1)+' · Y: '+baseBounds.minY.toFixed(1)+'–'+baseBounds.maxY.toFixed(1));
  const maxMoveBounds=playerMovementBoundsForScale(.92,.70);
  const maxScreenEdges={
    minX:CX+(maxMoveBounds.minX-CX)*.92,
    maxX:CX+(maxMoveBounds.maxX-CX)*.92,
    minY:CY+(maxMoveBounds.minY-CY)*.92,
    maxY:CY+(maxMoveBounds.maxY-CY)*.92
  };
  add('player-edge-expands','При 20 игроках границы движения расширяются вслед за zoom-out',
    maxMoveBounds.minX<24&&maxMoveBounds.maxX>W-24&&maxMoveBounds.minY<70&&maxMoveBounds.maxY>H-24,
    'Мировые X: '+maxMoveBounds.minX.toFixed(1)+'–'+maxMoveBounds.maxX.toFixed(1)+' · Y: '+maxMoveBounds.minY.toFixed(1)+'–'+maxMoveBounds.maxY.toFixed(1));
  add('player-edge-screen-match','Новые границы после отрисовки совпадают с безопасным отступом края сцены',
    Math.abs(maxScreenEdges.minX-maxMoveBounds.marginX)<1e-8&&Math.abs(maxScreenEdges.maxX-(W-maxMoveBounds.marginX))<1e-8&&Math.abs(maxScreenEdges.minY-maxMoveBounds.marginTop)<1e-8&&Math.abs(maxScreenEdges.maxY-(H-maxMoveBounds.marginBottom))<1e-8,
    'Экранные X: '+maxScreenEdges.minX.toFixed(1)+'–'+maxScreenEdges.maxX.toFixed(1)+' · Y: '+maxScreenEdges.minY.toFixed(1)+'–'+maxScreenEdges.maxY.toFixed(1));
  const movementBoundsByCount=counts.map(n=>playerMovementBoundsForScale(sceneCrowdScaleForCount(n),dragonCrowdScaleForCount(n)));
  add('player-edge-growth','Область полёта плавно расширяется для всех контрольных размеров команды',
    movementBoundsByCount.every((b,i)=>i===0||(b.minX<=movementBoundsByCount[i-1].minX&&b.maxX>=movementBoundsByCount[i-1].maxX&&b.minY<=movementBoundsByCount[i-1].minY&&b.maxY>=movementBoundsByCount[i-1].maxY)),
    counts.map((n,i)=>n+' игроков: '+movementBoundsByCount[i].minX.toFixed(0)+'…'+movementBoundsByCount[i].maxX.toFixed(0)).join(' · '));
  const edgeProjectionChecks=movementBoundsByCount.every((b,i)=>{
    const scale=sceneCrowdScaleForCount(counts[i]);
    return Math.abs((CX+(b.minX-CX)*scale)-b.marginX)<1e-7&&Math.abs((CX+(b.maxX-CX)*scale)-(W-b.marginX))<1e-7&&Math.abs((CY+(b.minY-CY)*scale)-b.marginTop)<1e-7&&Math.abs((CY+(b.maxY-CY)*scale)-(H-b.marginBottom))<1e-7;
  });
  add('player-edge-all-counts','Экранные границы корректны не только при 20, но и при 1–15 драконах',
    edgeProjectionChecks,'Проверены 1, 6, 10, 15 и 20 игроков');
  const testClamp={x:W+500,y:H+500};
  const maxBoundsCopy={...maxMoveBounds};
  testClamp.x=Math.max(maxBoundsCopy.minX,Math.min(maxBoundsCopy.maxX,testClamp.x));
  testClamp.y=Math.max(maxBoundsCopy.minY,Math.min(maxBoundsCopy.maxY,testClamp.y));
  add('player-edge-clamp','Функция ограничения позиции использует расширенные границы, а не старый W×H',
    Math.abs(testClamp.x-maxMoveBounds.maxX)<1e-8&&Math.abs(testClamp.y-maxMoveBounds.maxY)<1e-8&&testClamp.x>W-24&&testClamp.y>H-24,
    'Крайняя позиция при 20 игроках: '+testClamp.x.toFixed(1)+', '+testClamp.y.toFixed(1));

  const rewardCounts=[1,6,10,15,20];
  const rewardScales=rewardCounts.map(multiplayerRewardMultiplierForPlayers);
  const goldSim=rewardCounts.map(n=>simulateScaledRewards(1,n,2000));
  const scrollSim=rewardCounts.map(n=>simulateScaledRewards(2,n,2000));
  add('economy-solo','В одиночной игре награды остаются прежними',
    Math.abs(rewardScales[0]-1)<1e-9&&allocateScaledReward(1,1,0).amount===1,'×'+rewardScales[0].toFixed(2));
  add('economy-fair-share','Ожидаемый доход на игрока сохраняется при 1–20 участниках',
    goldSim.every(v=>Math.abs(v.perPlayer-v.expected)<.002)&&scrollSim.every(v=>Math.abs(v.perPlayer-v.expected)<.004),
    rewardCounts.map((n,i)=>n+' игроков: золото '+goldSim[i].perPlayer.toFixed(3)+' / свитки '+scrollSim[i].perPlayer.toFixed(3)).join(' · '));
  add('economy-carry','Дробные остатки округления сохраняют суммарную награду на длинной дистанции',
    rewardCounts.every((n,i)=>Math.abs(goldSim[i].total-2000*rewardScales[i])<1.01&&Math.abs(scrollSim[i].total-4000*rewardScales[i])<1.01),
    'Погрешность суммарной награды не превышает 1 единицы на валюту');
  add('economy-integer','Каждый подобранный дроп остаётся целым и минимум 1',
    rewardCounts.every(n=>{let r=0;for(let i=0;i<200;i++){const v=allocateScaledReward(1,n,r);if(!Number.isInteger(v.amount)||v.amount<1)return false;r=v.remainder}return r>=0&&r<1}),
    'Проверены 200 последовательных дропов для каждой группы');
  add('economy-magnet-stable','Масштаб награды не меняет радиус притяжения случайным образом',
    pickupMagnetRadiusForBaseReward(1)===130&&pickupMagnetRadiusForBaseReward(2)===130&&pickupMagnetRadiusForBaseReward(10)===200,
    'Обычные дропы: 130 px · крупная базовая награда: 200 px');
  const princeReward=BOSS_REWARDS.prince,kingReward=BOSS_REWARDS.king;
  add('boss-party-rewards','Награда босса рассчитана на каждого участника команды',
    princeReward[0]===10&&princeReward[1]===4&&kingReward[0]===20&&kingReward[1]===8,
    'Принц: '+princeReward.join('/')+' · Король: '+kingReward.join('/')+' (золото/свитки)');
  const princeGuard=bossGuardForMaxHp('prince',T.prince.hp),kingGuard=bossGuardForMaxHp('king',T.king.hp);
  add('boss-guard-values','У принца и короля есть отдельная шкала защиты',
    princeGuard===11&&kingGuard===36,
    'Принц: '+princeGuard+' · Король: '+kingGuard+' ед. (15% / 18% HP)');
  const guardLayout=bossGuardBarLayout({k:'king',x:500,y:300,t:T.king});
  add('boss-guard-layout','Фиолетовая шкала находится над полосой здоровья и не сливается с ней',
    guardLayout.y+guardLayout.height<guardLayout.hpBarY&&guardLayout.width>=80&&guardLayout.height>=10,
    'Шкала '+guardLayout.width+'×'+guardLayout.height+' px · зазор до HP '+(guardLayout.hpBarY-(guardLayout.y+guardLayout.height))+' px');
  const princeHp20=T.prince.hp*(1+19*BOSSCFG.hpPrince),kingHp20=T.king.hp*(1+19*BOSSCFG.hpKing);
  const princeGuard20=bossGuardForMaxHp('prince',princeHp20),kingGuard20=bossGuardForMaxHp('king',kingHp20);
  add('boss-guard-party-scaling','Барьер босса масштабируется вместе с его здоровьем при 20 игроках',
    princeGuard20===Math.round(princeHp20*BOSS_GUARD_RATIO.prince)&&kingGuard20===Math.round(kingHp20*BOSS_GUARD_RATIO.king),
    '20 игроков · Принц: '+princeGuard20+'/'+princeHp20+' · Король: '+kingGuard20+'/'+kingHp20);
  const guardHit=resolveEnemyDamage({k:'prince',sh:0,guard:20},10);
  add('boss-guard-absorbs','Пока барьер активен, урон не проходит в здоровье',
    guardHit.bossGuard===10&&guardHit.hpDamage===0,
    'Барьер: 20 → '+guardHit.bossGuard+' · урон здоровью: '+guardHit.hpDamage);
  const breakHit=resolveEnemyDamage({k:'king',sh:0,guard:5},20);
  add('boss-guard-no-overflow','Удар, разрушающий барьер, не пробивает здоровье насквозь',
    breakHit.bossGuard===0&&breakHit.hpDamage===0&&breakHit.guardBroken,
    'Барьер: 5 → 0 · урон здоровью этим ударом: '+breakHit.hpDamage);
  const openHit=resolveEnemyDamage({k:'prince',sh:0,guard:0},7);
  add('boss-guard-open','После снятия барьера здоровье босса снова получает урон',
    openHit.hpDamage===7&&openHit.bossGuard===0,'Урон здоровью: '+openHit.hpDamage);
  const layeredHit=resolveEnemyDamage({k:'king',sh:2,guard:10},3);
  add('boss-guard-distinct','Защита мага и барьер босса работают как отдельные слои',
    layeredHit.mageShield===0&&layeredHit.bossGuard===9&&layeredHit.hpDamage===0,
    'Щит мага: 2 → 0 · барьер босса: 10 → 9');
  return checks;
}
function testInfo(){
  const boss=enemies.find(e=>e.hp>0&&isBoss(e));
  return {wave,state,enemies:enemies.length,queue:queue.length,invulnerable:testInvulnerable,
    players:players.filter(p=>!p.gone).length,dragonScale:dragonCrowdScale(),sceneScale:sceneCrowdScale(),spawnLayout:playerSpawnLayoutForCount(players.filter(p=>!p.gone).length),movementBounds:playerMovementBounds(),
    knights:enemies.filter(e=>e.k==='knight'&&e.hp>0).length,
    chasingKnights:enemies.filter(e=>e.k==='knight'&&e.hp>0&&e.chase).length,
    bossGuard:boss?{kind:boss.k,guard:boss.guard||0,guardMax:boss.guardMax||0,hp:boss.hp,max:boss.max}:null,
    economy:{populationFactor:enemyPopulationFactorForPlayers(activePlayerCount()),rewardMultiplier:multiplayerRewardMultiplierForPlayers(activePlayerCount()),one:previewEnemyRewardAmount(1,activePlayerCount()),two:previewEnemyRewardAmount(2,activePlayerCount()),bossReward:BOSS_REWARDS.prince},
    edict:markId>=0};
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
  players=o.players.map((q,i)=>{const p=makePlayer(i,q.color);p.name=q.name;p.nid=q.id;const position=playerSpawnPositionForIndex(i,o.players.length);p.x=position.x;p.y=position.y;return p});
  me=players.find(p=>p.nid===o.me.id);isHost=!!o.me.host;active=true;towerMax=Math.round(100*(1+.6*Math.sqrt(players.length-1)));
  resetWorld();
  if(isHost){nextWave();sayQ('start',4)}
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
window.Game={start:startGame,startTest,onMsg,testStartWave,testSpawn,testClear:testClearActors,testRepair,testSetUpgrades,testSetInvulnerable,testSetPlayerCount,testSetLoadMode,testStartHostLoadTest,testStopHostLoadTest,testPerfInfo,testStartEdict,testRunDiagnostics,testInfo,get active(){return active}};

})();