// Сервер «Башни принцессы»: раздаёт файлы из public/, ведёт лобби и пересылает сообщения между игроками.
// Саму игру считает браузер хоста (первого вошедшего в комнату), сервер игровой логики не содержит.
// Лобби в два этапа: «сбор» (игроки заходят) и «выбор» (хост нажал «Все в сборе», драконов на 2 больше, чем игроков).
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
// Файлы сайта лежат в public/. Если папки нет, ищем рядом с сервером (только .html).
const PUB = fs.existsSync(path.join(__dirname, 'public')) ? path.join(__dirname, 'public') : __dirname;
const MAX_PLAYERS = 16, NCOLORS = 16, SPARE = 2, MIN_DRAGONS = 4;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.end('ok'); return; }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.normalize(path.join(PUB, p));
  if (!f.startsWith(PUB)) { res.writeHead(403).end(); return; }
  if (PUB === __dirname && path.extname(f) !== '.html') { res.writeHead(404).end('Not found'); return; }
  fs.readFile(f, (err, data) => {
    if (err) {
      console.log('404:', f);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Файл не найден на сервере: ' + p + '\nПроверьте, что index.html лежит в папке public.');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(data);
  });
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
const rooms = new Map();   // код -> { host, clients: Map(id -> клиент), n, started, phase: 'gather'|'pick', k }

const sendRaw = (c, s) => { if (c.ws.readyState === 1) c.ws.send(s); };
const send = (c, o) => sendRaw(c, JSON.stringify(o));
const list = r => [...r.clients.values()].map(c => ({ id: c.id, name: c.name, host: c.id === r.host, color: c.color, ready: c.ready, hover: c.hover }));
const state = r => ({ t: 'players', players: list(r), phase: r.phase, k: r.k });
const toAll = (r, o, except) => { const s = JSON.stringify(o); for (const c of r.clients.values()) if (c !== except) sendRaw(c, s); };
const resetPicks = r => { for (const o of r.clients.values()) { o.ready = false; o.color = -1; o.hover = -1; } };

function leave(c) {
  const r = rooms.get(c.room);
  if (!r) return;
  r.clients.delete(c.id);
  if (c.id === r.host) { toAll(r, { t: 'host_left' }); for (const o of r.clients.values()) o.room = null; rooms.delete(c.room); }
  else if (r.clients.size) toAll(r, state(r));
  else rooms.delete(c.room);
  c.room = null;
}

wss.on('connection', ws => {
  const c = { ws, id: null, room: null, name: '', color: -1, ready: false, hover: -1 };
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('error', () => {});
  ws.on('close', () => leave(c));
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'echo') return send(c, { t: 'echo', ts: m.ts });                 // замер задержки до сервера
    if (m.t === 'join') {
      leave(c);
      const code = String(m.room || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      if (!code) return send(c, { t: 'error', msg: 'Нужен код комнаты' });
      let r = rooms.get(code);
      if (m.create && r) return send(c, { t: 'error', msg: 'Комната с таким кодом уже есть' });
      if (!m.create && !r) return send(c, { t: 'error', msg: 'Такой комнаты нет: хост ещё не создал её' });
      if (!r) { r = { host: null, clients: new Map(), n: 0, started: false, phase: 'gather', k: 0 }; rooms.set(code, r); }
      if (r.started) return send(c, { t: 'error', msg: 'Игра в этой комнате уже идёт' });
      if (r.phase === 'pick') return send(c, { t: 'error', msg: 'Хост уже начал выбор драконов. Попросите его вернуться к сбору и зайдите снова' });
      if (r.clients.size >= MAX_PLAYERS) return send(c, { t: 'error', msg: 'Комната заполнена' });
      c.color = -1; c.hover = -1; c.ready = false;
      c.id = String(++r.n); c.room = code;
      c.name = String(m.name || 'Игрок ' + c.id).slice(0, 20);
      r.clients.set(c.id, c);
      if (!r.host) r.host = c.id;                                               // первый вошедший становится хостом
      send(c, { t: 'joined', id: c.id, host: c.id === r.host, room: code, players: list(r), phase: r.phase, k: r.k });
      toAll(r, state(r), c);
      return;
    }
    const r = rooms.get(c.room);
    if (!r) return;
    const isHost = c.id === r.host;
    if (m.t === 'lock' && isHost && r.phase === 'gather') {                    // «Все в сборе»: фиксируем состав и число драконов
      r.phase = 'pick'; r.k = Math.min(NCOLORS, Math.max(MIN_DRAGONS, r.clients.size + SPARE));
      resetPicks(r); toAll(r, state(r));
    } else if (m.t === 'reopen' && isHost && r.phase === 'pick') {              // вернуться к сбору: выборы сбрасываются
      r.phase = 'gather'; r.k = 0; resetPicks(r); toAll(r, state(r));
    } else if (m.t === 'hover' && r.phase === 'pick') {                         // «примерка»: другие видят, на кого смотрят, цвет не блокируется
      if (c.ready) return;
      const i = m.color | 0;
      c.hover = (i >= 0 && i < r.k) ? i : -1;
      toAll(r, state(r));
    } else if (m.t === 'ready' && r.phase === 'pick') {
      if (m.ready) {                                                            // «Готов» закрепляет выбранного дракона
        const i = m.color | 0;
        if (i < 0 || i >= r.k) return send(c, { t: 'error', msg: 'Сначала выберите дракона' });
        if ([...r.clients.values()].some(o => o !== c && o.ready && o.color === i)) return send(c, { t: 'error', msg: 'Этот дракон уже занят, выберите другого' });
        c.color = i; c.hover = -1; c.ready = true;
      } else { c.ready = false; c.color = -1; c.hover = -1; }                   // снятие готовности освобождает дракона
      toAll(r, state(r));
    } else if (m.t === 'start' && isHost && r.phase === 'pick') {
      const used = new Set([...r.clients.values()].filter(o => o.ready).map(o => o.color));
      const auto = [];                                                          // кто не закрепил дракона, получает свободного (сначала того, на кого смотрел)
      for (const o of r.clients.values()) {
        if (o.ready) continue;
        const i = (o.hover >= 0 && !used.has(o.hover)) ? o.hover : [...Array(r.k).keys()].find(k => !used.has(k));
        o.color = i; o.ready = true; o.hover = -1; used.add(i); auto.push(o.id);
      }
      r.started = true; r.phase = 'play'; toAll(r, { t: 'started', players: list(r), auto });
    } else if (m.t === 'msg') {
      const out = JSON.stringify({ t: 'msg', from: c.id, data: m.data });
      if (isHost) {                                                             // хост пишет всем или одному игроку
        if (m.to === 'all') { for (const o of r.clients.values()) if (o !== c) sendRaw(o, out); }
        else { const o = r.clients.get(String(m.to)); if (o) sendRaw(o, out); }
      } else { const h = r.clients.get(r.host); if (h) sendRaw(h, out); }       // игроки пишут только хосту
    }
  });
});

// пинги каждые 25 секунд, чтобы соединения не считались простаивающими
setInterval(() => wss.clients.forEach(ws => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }), 25000);

server.listen(PORT, () => {
  console.log('Сервер запущен на порту ' + PORT);
  console.log('Файлы сайта ищутся в:', PUB, fs.existsSync(PUB) ? fs.readdirSync(PUB) : 'папки нет');
});
