// Сервер «Башни принцессы»: раздаёт файлы из public/, ведёт лобби и пересылает сообщения между игроками.
// Саму игру считает браузер хоста (первого вошедшего в комнату), сервер игровой логики не содержит.
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
// Файлы сайта лежат в public/. Если папки нет, ищем рядом с сервером (только .html).
const PUB = fs.existsSync(path.join(__dirname, 'public')) ? path.join(__dirname, 'public') : __dirname;
const MAX_PLAYERS = 16, NCOLORS = 16;
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
const rooms = new Map();   // код -> { host, clients: Map(id -> клиент), n, started }

const sendRaw = (c, s) => { if (c.ws.readyState === 1) c.ws.send(s); };
const send = (c, o) => sendRaw(c, JSON.stringify(o));
const list = r => [...r.clients.values()].map(c => ({ id: c.id, name: c.name, host: c.id === r.host, color: c.color, ready: c.ready }));
const toAll = (r, o, except) => { const s = JSON.stringify(o); for (const c of r.clients.values()) if (c !== except) sendRaw(c, s); };

function leave(c) {
  const r = rooms.get(c.room);
  if (!r) return;
  r.clients.delete(c.id);
  if (c.id === r.host) { toAll(r, { t: 'host_left' }); for (const o of r.clients.values()) o.room = null; rooms.delete(c.room); }
  else if (r.clients.size) toAll(r, { t: 'players', players: list(r) });
  else rooms.delete(c.room);
  c.room = null;
}

wss.on('connection', ws => {
  const c = { ws, id: null, room: null, name: '', color: 0, ready: false };
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
      if (!r) { r = { host: null, clients: new Map(), n: 0, started: false }; rooms.set(code, r); }
      if (r.started) return send(c, { t: 'error', msg: 'Игра в этой комнате уже идёт' });
      if (r.clients.size >= MAX_PLAYERS) return send(c, { t: 'error', msg: 'Комната заполнена' });
      const used = new Set([...r.clients.values()].map(o => o.color));
      c.color = [...Array(NCOLORS).keys()].find(i => !used.has(i));            // первый свободный цвет
      c.id = String(++r.n); c.room = code; c.ready = false;
      c.name = String(m.name || 'Игрок ' + c.id).slice(0, 20);
      r.clients.set(c.id, c);
      if (!r.host) r.host = c.id;                                               // первый вошедший становится хостом
      send(c, { t: 'joined', id: c.id, host: c.id === r.host, room: code, players: list(r) });
      toAll(r, { t: 'players', players: list(r) }, c);
      return;
    }
    const r = rooms.get(c.room);
    if (!r) return;
    if (m.t === 'pick' && !r.started) {                                         // выбор цвета: занятый нельзя
      const i = m.color | 0;
      if (i < 0 || i >= NCOLORS) return;
      if ([...r.clients.values()].some(o => o !== c && o.color === i)) return send(c, { t: 'error', msg: 'Этот цвет только что заняли' });
      c.color = i; toAll(r, { t: 'players', players: list(r) });
    } else if (m.t === 'ready' && !r.started) {
      c.ready = !!m.ready; toAll(r, { t: 'players', players: list(r) });
    } else if (m.t === 'start' && c.id === r.host && !r.started) {
      if ([...r.clients.values()].some(o => o !== c && !o.ready)) return send(c, { t: 'error', msg: 'Не все игроки готовы' });
      r.started = true; toAll(r, { t: 'started', players: list(r) });
    } else if (m.t === 'msg') {
      const out = JSON.stringify({ t: 'msg', from: c.id, data: m.data });
      if (c.id === r.host) {                                                    // хост пишет всем или одному игроку
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
