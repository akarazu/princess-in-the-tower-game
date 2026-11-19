const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const { WebSocket } = require('ws');

const projectRoot = path.resolve(__dirname, '..');

async function getFreePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const { port } = listener.address();
  await new Promise(resolve => listener.close(resolve));
  return port;
}

async function waitForHealth(baseUrl, child) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('Server exited before becoming ready');
    try {
      const status = await httpRequest(baseUrl + '/health');
      if (status.statusCode === 200 && status.body === 'ok') return;
    } catch {
      // The server may still be starting.
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Server did not become ready in time');
}

function httpRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ statusCode: response.statusCode, body, headers: response.headers }));
    }).on('error', reject);
  });
}

async function connectClient(wsUrl) {
  const socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });

  const messages = [];
  const waiters = [];
  socket.on('message', raw => {
    let message;
    try {
      message = JSON.parse(raw.toString('utf8'));
    } catch {
      return;
    }
    const index = waiters.findIndex(waiter => waiter.predicate(message));
    if (index >= 0) {
      const [waiter] = waiters.splice(index, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(message);
    } else {
      messages.push(message);
    }
  });

  return {
    socket,
    send(message) {
      socket.send(JSON.stringify(message));
    },
    next(predicate, timeoutMs = 3000) {
      const index = messages.findIndex(predicate);
      if (index >= 0) return Promise.resolve(messages.splice(index, 1)[0]);
      return new Promise((resolve, reject) => {
        const waiter = {
          predicate,
          resolve,
          timer: setTimeout(() => {
            const current = waiters.indexOf(waiter);
            if (current >= 0) waiters.splice(current, 1);
            reject(new Error('Timed out waiting for WebSocket message'));
          }, timeoutMs)
        };
        waiters.push(waiter);
      });
    },
    close() {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.terminate();
      }
    }
  };
}

test('server is safe to serve files and supports a 20-player room', async t => {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const wsUrl = `ws://127.0.0.1:${port}/ws`;
  const child = spawn(process.execPath, ['server.js'], {
    cwd: projectRoot,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'ignore', 'pipe']
  });
  const clients = [];

  t.after(async () => {
    clients.forEach(client => client.close());
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await new Promise(resolve => {
        const timer = setTimeout(resolve, 1000);
        child.once('exit', () => { clearTimeout(timer); resolve(); });
      });
    }
  });

  await waitForHealth(baseUrl, child);

  const health = await httpRequest(baseUrl + '/health');
  assert.equal(health.statusCode, 200);
  assert.equal(health.body, 'ok');

  const index = await httpRequest(baseUrl + '/');
  assert.equal(index.statusCode, 200);
  assert.match(index.body, /Princess in the Tower/);

  const gameScript = await httpRequest(baseUrl + '/game.js');
  assert.equal(gameScript.statusCode, 200);
  assert.match(gameScript.body, /function startGame/);

  const siblingName = `public-private-${process.pid}`;
  const siblingDir = path.join(projectRoot, siblingName);
  const siblingSecret = path.join(siblingDir, 'test-secret.txt');
  fs.mkdirSync(siblingDir, { recursive: true });
  fs.writeFileSync(siblingSecret, 'must not be served');
  try {
    const traversal = await httpRequest(baseUrl + `/%2e%2e%2f${siblingName}%2ftest-secret.txt`);
    assert.equal(traversal.statusCode, 403, 'path traversal must not expose a sibling directory');
  } finally {
    fs.rmSync(siblingDir, { recursive: true, force: true });
  }

  // The lobby must provide 22 choices: one unique dragon per player plus two spare.
  const paletteContext = {};
  const sharedSource = fs.readFileSync(path.join(projectRoot, 'public/shared.js'), 'utf8');
  vm.runInNewContext(sharedSource + '\nglobalThis.__palette = COLORS;', paletteContext);
  assert.equal(paletteContext.__palette.length, 22);

  for (let i = 0; i < 20; i++) {
    const client = await connectClient(wsUrl);
    clients.push(client);
    client.send({
      t: 'join',
      room: 'LOAD20',
      name: `Player ${i + 1}`,
      create: i === 0
    });
    const joined = await client.next(message => message.t === 'joined');
    assert.equal(joined.host, i === 0);
  }

  const overflow = await connectClient(wsUrl);
  clients.push(overflow);
  overflow.send({ t: 'join', room: 'LOAD20', name: 'Extra player', create: false });
  const full = await overflow.next(message => message.t === 'error');
  assert.match(full.msg, /maximum 20/);

  clients[0].send({ t: 'lock' });
  const picking = await clients[0].next(message => message.t === 'players' && message.phase === 'pick');
  assert.equal(picking.players.length, 20);
  assert.equal(picking.k, 22);

  clients[0].send({ t: 'start' });
  const started = await clients[0].next(message => message.t === 'started');
  assert.equal(started.players.length, 20);
  const colors = started.players.map(player => player.color);
  assert.equal(new Set(colors).size, 20, 'every player must receive a unique color');
  assert.ok(colors.every(color => Number.isInteger(color) && color >= 0 && color < 22));

  const snapshot = {
    k: 'snap', q: ['', 0],
    P: Array.from({ length: 20 }, () => Array(18).fill(0)),
    E: [], Z: [], B: [], N: [], K: [], M: [], G: [], R: [], V: []
  };
  clients[0].send({ t: 'msg', to: 'all', data: snapshot });
  const forwardedSnapshot = await clients[1].next(message => message.t === 'msg' && message.data?.k === 'snap');
  assert.equal(forwardedSnapshot.from, started.players[0].id);

  clients[1].send({
    t: 'msg', to: 'host',
    // The browser's previous guest client sent numeric 1/0 flags.
    // Keep accepting that wire format so cached clients can still shoot.
    data: { k: 'in', mx: 9, my: -9, ax: 9000, ay: -9000, f: 1, al: 1 }
  });
  const forwardedInput = await clients[0].next(message => message.t === 'msg' && message.from === started.players[1].id && message.data?.k === 'in');
  assert.deepEqual(
    [forwardedInput.data.mx, forwardedInput.data.my, forwardedInput.data.ax, forwardedInput.data.ay],
    [1, -1, 4096, -2048]
  );
  assert.equal(forwardedInput.data.f, true, 'numeric fire flag must reach the host as true');
  assert.equal(forwardedInput.data.al, true, 'numeric special-attack flag must reach the host as true');

  clients[1].send({
    t: 'msg', to: 'host',
    data: { k: 'in', mx: 0, my: 0, ax: 100, ay: 100, f: false, al: false }
  });
  const releasedInput = await clients[0].next(message => message.t === 'msg' && message.from === started.players[1].id && message.data?.k === 'in');
  assert.equal(releasedInput.data.f, false, 'released fire input must reach the host as false');
  assert.equal(releasedInput.data.al, false, 'released special-attack input must reach the host as false');
});
