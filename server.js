// Сервер-ретранслятор для «Башни принцессы».
// Раздаёт файлы из public/ и пересылает сообщения между игроками одной комнаты по WebSocket.
// Игру считает браузер хоста (первого вошедшего в комнату), сервер логики не содержит.
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, 'public');
const MAX_PLAYERS = 8;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.end('ok'); return; }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.normalize(path.join(PUB, p));
  if (!f.startsWith(PUB)) { res.writeHead(403).end(); return; }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(data);
  });
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
const rooms = new Map();   // код комнаты -> { host, clients: Map(id -> клиент), n }

const send = (c, o) => { if (c.ws.readyState === 1) c.ws.send(JSON.stringify(o)); };
const list = r => [...r.clients.values()].map(c => ({ id: c.id, name: c.name, host: c.id === r.host }));

function leave(c) {
  const r = rooms.get(c.room);
  if (!r) return;
  r.clients.delete(c.id);
  if (c.id === r.host) {                       // хост вышел: комната закрывается
    for (const o of r.clients.values()) { send(o, { t: 'host_left' }); o.room = null; }
    rooms.delete(c.room);
  } else if (r.clients.size) {
    for (const o of r.clients.values()) send(o, { t: 'players', players: list(r) });
  } else rooms.delete(c.room);
  c.room = null;
}

wss.on('connection', ws => {
  const c = { ws, id: null, room: null, name: '' };
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('error', () => {});
  ws.on('close', () => leave(c));
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'echo') return send(c, { t: 'echo', ts: m.ts });          // для замера задержки до сервера
    if (m.t === 'join') {
      leave(c);
      const code = String(m.room || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      if (!code) return send(c, { t: 'error', msg: 'Нужен код комнаты' });
      let r = rooms.get(code);
      if (!r) { r = { host: null, clients: new Map(), n: 0 }; rooms.set(code, r); }
      if (r.clients.size >= MAX_PLAYERS) return send(c, { t: 'error', msg: 'Комната заполнена' });
      c.id = String(++r.n); c.room = code; c.name = String(m.name || 'Игрок ' + c.id).slice(0, 20);
      r.clients.set(c.id, c);
      if (!r.host) r.host = c.id;                                         // первый вошедший становится хостом
      send(c, { t: 'joined', id: c.id, host: c.id === r.host, room: code, players: list(r) });
      for (const o of r.clients.values()) if (o !== c) send(o, { t: 'players', players: list(r) });
      return;
    }
    if (m.t === 'msg' && c.room) {
      const r = rooms.get(c.room); if (!r) return;
      const out = { t: 'msg', from: c.id, data: m.data };
      if (c.id === r.host) {                                              // хост пишет всем или одному игроку
        if (m.to === 'all') { for (const o of r.clients.values()) if (o !== c) send(o, out); }
        else { const o = r.clients.get(String(m.to)); if (o) send(o, out); }
      } else { const h = r.clients.get(r.host); if (h) send(h, out); }    // игроки пишут только хосту
    }
  });
});

// пинги каждые 25 секунд, чтобы соединения не считались простаивающими
setInterval(() => wss.clients.forEach(ws => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }), 25000);

server.listen(PORT, () => console.log('Сервер запущен на порту ' + PORT));
