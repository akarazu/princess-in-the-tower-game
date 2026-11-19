// Сервер «Башни принцессы»: раздаёт файлы из public/, ведёт лобби и пересылает сообщения между игроками.
// Саму игру считает браузер хоста (первого вошедшего в комнату), сервер игровой логики не содержит.
// Рассчитан на небольшие игровые сессии до 20 участников.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT) || 3000;
const PUB = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : __dirname;

const MAX_PLAYERS = 20;
const NCOLORS = 22; // 20 игроков + 2 запасных цвета
const SPARE = 2;
const MIN_DRAGONS = 4;
const MAX_CONNECTIONS = 60; // запас для 2 одновременных комнат и повторных подключений
const MAX_PENDING_BYTES = 1024 * 1024;
const MAX_PAYLOAD = 64 * 1024;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.json': 'application/json; charset=utf-8'
};

function isInsideDirectory(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (
    relative !== '..' &&
    !relative.startsWith('..' + path.sep) &&
    !path.isAbsolute(relative)
  );
}

const server = http.createServer((req, res) => {
  let requestUrl;
  try {
    requestUrl = new URL(req.url, 'http://localhost');
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Bad request');
    return;
  }

  if (requestUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('ok');
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' }).end('Method not allowed');
    return;
  }

  let requestedPath;
  try {
    requestedPath = decodeURIComponent(requestUrl.pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Bad request');
    return;
  }

  if (requestedPath.includes('\0')) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Bad request');
    return;
  }
  if (requestedPath.endsWith('/')) requestedPath += 'index.html';

  // Resolve from the public root and check the relative path, not a string prefix.
  const filePath = path.resolve(PUB, '.' + requestedPath);
  if (!isInsideDirectory(PUB, filePath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Forbidden');
    return;
  }
  if (PUB === __dirname && path.extname(filePath) !== '.html') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
      }).end('Not found');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const headers = {
      'Content-Type': TYPES[extension] || 'application/octet-stream',
      'Cache-Control': ['.html', '.js'].includes(extension) ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin'
    };
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});

const wss = new WebSocketServer({
  server,
  path: '/ws',
  maxPayload: MAX_PAYLOAD,
  perMessageDeflate: false
});

const rooms = new Map();

function sendRaw(client, payload) {
  const socket = client.ws;
  if (!socket || socket.readyState !== 1) return false;

  // Do not let a slow browser accumulate an unbounded queue of game snapshots.
  if (socket.bufferedAmount > MAX_PENDING_BYTES) {
    socket.close(1013, 'Connection too slow');
    return false;
  }

  socket.send(payload, error => {
    if (error && socket.readyState === 1) socket.terminate();
  });
  return true;
}

const send = (client, message) => sendRaw(client, JSON.stringify(message));
const list = room => [...room.clients.values()].map(client => ({
  id: client.id,
  name: client.name,
  host: client.id === room.host,
  color: client.color,
  ready: client.ready,
  hover: client.hover
}));
const state = room => ({ t: 'players', players: list(room), phase: room.phase, k: room.k });

function toAll(room, message, except) {
  const payload = JSON.stringify(message);
  for (const client of room.clients.values()) {
    if (client !== except) sendRaw(client, payload);
  }
}

function resetPicks(room) {
  for (const client of room.clients.values()) {
    client.ready = false;
    client.color = -1;
    client.hover = -1;
  }
}

function leave(client) {
  const room = rooms.get(client.room);
  if (!room) return;

  room.clients.delete(client.id);
  if (client.id === room.host) {
    toAll(room, { t: 'host_left' });
    for (const other of room.clients.values()) other.room = null;
    rooms.delete(client.room);
  } else if (room.clients.size) {
    toAll(room, state(room));
  } else {
    rooms.delete(client.room);
  }
  client.room = null;
}

function allowRate(client, key, limit, windowMs = 1000) {
  const now = Date.now();
  const current = client.rates.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    client.rates.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= limit) return false;
  current.count++;
  return true;
}

function finiteNumber(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const SNAPSHOT_ARRAY_LIMITS = {
  P: MAX_PLAYERS,
  E: 100,
  Z: 100,
  B: 500,
  N: 100,
  K: 100,
  M: 100,
  G: 100,
  R: 100,
  V: 40
};

function isValidSnapshot(data) {
  if (!data || data.k !== 'snap' || !Array.isArray(data.q) || data.q.length < 2) return false;
  for (const [key, limit] of Object.entries(SNAPSHOT_ARRAY_LIMITS)) {
    if (!Array.isArray(data[key]) || data[key].length > limit) return false;
    if (data[key].some(row => !Array.isArray(row))) return false;
  }
  return data.P.every(row => row.length >= 18) &&
    data.E.every(row => row.length >= 14) &&
    data.Z.every(row => row.length >= 7) &&
    data.B.every(row => row.length >= 6) &&
    data.N.every(row => row.length >= 7) &&
    data.K.every(row => row.length >= 6) &&
    data.M.every(row => row.length >= 5) &&
    data.G.every(row => row.length >= 4) &&
    data.R.every(row => row.length >= 10) &&
    data.V.every(row => row.length >= 4);
}

wss.on('connection', ws => {
  if (wss.clients.size > MAX_CONNECTIONS) {
    ws.close(1013, 'Server is busy');
    return;
  }

  const client = {
    ws,
    id: null,
    room: null,
    name: '',
    color: -1,
    ready: false,
    hover: -1,
    rates: new Map()
  };

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('error', () => {});
  ws.on('close', () => leave(client));

  ws.on('message', raw => {
    let message;
    try {
      message = JSON.parse(raw.toString('utf8'));
    } catch {
      return;
    }
    if (!message || typeof message !== 'object' || Array.isArray(message)) return;
    if (!allowRate(client, 'all', 80)) return;

    if (message.t === 'echo') {
      if (!allowRate(client, 'echo', 5)) return;
      return send(client, {
        t: 'echo',
        ts: Number.isFinite(message.ts) ? message.ts : null
      });
    }

    if (message.t === 'join') {
      if (!allowRate(client, 'lobby', 10)) return;

      const code = String(message.room || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      if (!code) return send(client, { t: 'error', msg: 'Нужен код комнаты' });

      leave(client);
      let room = rooms.get(code);
      if (message.create === true && room) {
        return send(client, { t: 'error', msg: 'Комната с таким кодом уже есть' });
      }
      if (message.create !== true && !room) {
        return send(client, { t: 'error', msg: 'Такой комнаты нет: хост ещё не создал её' });
      }
      if (!room) {
        room = { host: null, clients: new Map(), n: 0, started: false, phase: 'gather', k: 0 };
        rooms.set(code, room);
      }
      if (room.started) return send(client, { t: 'error', msg: 'Игра в этой комнате уже идёт' });
      if (room.phase === 'pick') {
        return send(client, { t: 'error', msg: 'Хост уже начал выбор драконов. Попросите его вернуться к сбору и зайдите снова' });
      }
      if (room.clients.size >= MAX_PLAYERS) {
        return send(client, { t: 'error', msg: 'Комната заполнена (максимум 20 игроков)' });
      }

      client.color = -1;
      client.hover = -1;
      client.ready = false;
      client.id = String(++room.n);
      client.room = code;
      client.name = String(message.name || 'Игрок ' + client.id).replace(/[\r\n\t]+/g, ' ').trim().slice(0, 20) || 'Игрок ' + client.id;
      room.clients.set(client.id, client);
      if (!room.host) room.host = client.id;

      send(client, {
        t: 'joined',
        id: client.id,
        host: client.id === room.host,
        room: code,
        players: list(room),
        phase: room.phase,
        k: room.k
      });
      toAll(room, state(room), client);
      return;
    }

    const room = rooms.get(client.room);
    if (!room || !client.id) return;
    const isHost = client.id === room.host;

    if (message.t === 'lock' && isHost && room.phase === 'gather') {
      if (!allowRate(client, 'lobby', 10)) return;
      room.phase = 'pick';
      room.k = Math.min(NCOLORS, Math.max(MIN_DRAGONS, room.clients.size + SPARE));
      resetPicks(room);
      toAll(room, state(room));
    } else if (message.t === 'reopen' && isHost && room.phase === 'pick') {
      if (!allowRate(client, 'lobby', 10)) return;
      room.phase = 'gather';
      room.k = 0;
      resetPicks(room);
      toAll(room, state(room));
    } else if (message.t === 'hover' && room.phase === 'pick') {
      if (!allowRate(client, 'lobby', 20) || client.ready) return;
      const index = Number(message.color);
      client.hover = Number.isInteger(index) && index >= 0 && index < room.k ? index : -1;
      toAll(room, state(room));
    } else if (message.t === 'ready' && room.phase === 'pick') {
      if (!allowRate(client, 'lobby', 10)) return;
      if (message.ready === true) {
        const index = Number(message.color);
        if (!Number.isInteger(index) || index < 0 || index >= room.k) {
          return send(client, { t: 'error', msg: 'Сначала выберите дракона' });
        }
        if ([...room.clients.values()].some(other => other !== client && other.ready && other.color === index)) {
          return send(client, { t: 'error', msg: 'Этот дракон уже занят, выберите другого' });
        }
        client.color = index;
        client.hover = -1;
        client.ready = true;
      } else if (message.ready === false) {
        client.ready = false;
        client.color = -1;
        client.hover = -1;
      } else {
        return;
      }
      toAll(room, state(room));
    } else if (message.t === 'start' && isHost && room.phase === 'pick') {
      if (!allowRate(client, 'lobby', 5)) return;
      const used = new Set(
        [...room.clients.values()]
          .filter(other => other.ready && Number.isInteger(other.color) && other.color >= 0 && other.color < room.k)
          .map(other => other.color)
      );
      const freeColors = Array.from({ length: room.k }, (_, index) => index).filter(index => !used.has(index));
      const auto = [];

      for (const other of room.clients.values()) {
        if (other.ready) continue;
        const preferred = Number.isInteger(other.hover) && other.hover >= 0 && !used.has(other.hover)
          ? other.hover
          : freeColors.shift();
        if (!Number.isInteger(preferred)) {
          return send(client, { t: 'error', msg: 'Не удалось назначить драконов всем игрокам. Вернитесь к выбору и попробуйте снова.' });
        }
        other.color = preferred;
        other.ready = true;
        other.hover = -1;
        used.add(preferred);
        const freeIndex = freeColors.indexOf(preferred);
        if (freeIndex >= 0) freeColors.splice(freeIndex, 1);
        auto.push(other.id);
      }

      room.started = true;
      room.phase = 'play';
      toAll(room, { t: 'started', players: list(room), auto });
    } else if (message.t === 'msg') {
      const data = message.data;
      if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.k !== 'string') return;

      if (isHost) {
        // Only the host may broadcast authoritative world snapshots.
        if (data.k !== 'snap' || message.to !== 'all') return;
        if (!allowRate(client, 'snap', 18) || !isValidSnapshot(data)) return;
        toAll(room, { t: 'msg', from: client.id, data }, client);
        return;
      }

      const host = room.clients.get(room.host);
      if (!host) return;

      if (data.k === 'in') {
        if (!allowRate(client, 'input', 35)) return;
        const safeInput = {
          k: 'in',
          mx: clamp(finiteNumber(data.mx), -1, 1),
          my: clamp(finiteNumber(data.my), -1, 1),
          ax: clamp(finiteNumber(data.ax), -4096, 4096),
          ay: clamp(finiteNumber(data.ay), -2048, 2048),
          // Accept booleans (current clients) and 1/0 (older cached clients).
          f: data.f === true || data.f === 1,
          al: data.al === true || data.al === 1
        };
        send(host, { t: 'msg', from: client.id, data: safeInput });
      } else if (data.k === 'buy') {
        if (!allowRate(client, 'action', 6) || !Number.isInteger(data.i) || data.i < 0 || data.i > 3) return;
        send(host, { t: 'msg', from: client.id, data: { k: 'buy', i: data.i } });
      } else if (data.k === 'go') {
        if (!allowRate(client, 'action', 6)) return;
        send(host, { t: 'msg', from: client.id, data: { k: 'go' } });
      }
    }
  });
});

// Heartbeat detects half-open connections without adding frequent application traffic.
const heartbeat = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 25000);

server.on('close', () => clearInterval(heartbeat));

server.listen(PORT, () => {
  console.log('Сервер запущен на порту ' + PORT);
  console.log('Файлы сайта ищутся в:', PUB);
});
