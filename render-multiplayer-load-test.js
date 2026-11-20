#!/usr/bin/env node
'use strict';

// Controlled WebSocket load test for Princess in the Tower.
// Simulates one room with up to 20 clients: lobby -> character selection -> play.
// It does not alter game source files. Run only against a service you own/control.

const { WebSocket } = require('ws');
const { randomBytes } = require('node:crypto');

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const urlArg = arg('url', '');
const playerCount = Math.max(2, Math.min(20, Number(arg('players', '20')) || 20));
const durationSec = Math.max(10, Math.min(180, Number(arg('duration', '60')) || 60));
const rampMs = Math.max(100, Math.min(2000, Number(arg('ramp-ms', '250')) || 250));

if (!urlArg || !/^https?:\/\//i.test(urlArg)) {
  console.error('Usage: node render-multiplayer-load-test.js --url https://YOUR-SERVICE.onrender.com [--players 20] [--duration 60]');
  process.exit(2);
}

const wsUrl = urlArg.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:').replace(/\/$/, '') + '/ws';
const roomCode = `LT${randomBytes(4).toString('hex').toUpperCase()}`;
const clients = [];
const timers = [];
const rtts = [];
const snapshotIntervals = [];
let sentSnapshots = 0;
let receivedSnapshots = 0;
let sentInputs = 0;
let receivedInputsAtHost = 0;
let receivedEchoes = 0;
let serverErrors = 0;
let bytesSent = 0;
let bytesReceived = 0;
let lastError = null;
let shuttingDown = false;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const percentile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
};

function send(client, message) {
  if (client.ws.readyState !== WebSocket.OPEN) return false;
  const payload = JSON.stringify(message);
  bytesSent += Buffer.byteLength(payload);
  client.ws.send(payload);
  return true;
}

function createClient(index) {
  const ws = new WebSocket(wsUrl, { handshakeTimeout: 15000, perMessageDeflate: false });
  const client = { index, ws, messages: [], waiters: [], connected: false, lastSnapshotAt: 0 };

  ws.on('message', raw => {
    bytesReceived += raw.length;
    let message;
    try { message = JSON.parse(raw.toString('utf8')); }
    catch { lastError = `Client ${index + 1}: received invalid JSON`; return; }

    if (message.t === 'error') {
      serverErrors++;
      lastError = `Client ${index + 1}: ${message.msg || 'server error'}`;
    }
    if (message.t === 'msg' && message.data?.k === 'snap' && index !== 0) {
      receivedSnapshots++;
      const now = Date.now();
      if (client.lastSnapshotAt) snapshotIntervals.push(now - client.lastSnapshotAt);
      client.lastSnapshotAt = now;
    }
    if (message.t === 'msg' && message.data?.k === 'in' && index === 0) receivedInputsAtHost++;
    if (message.t === 'echo') {
      receivedEchoes++;
      if (Number.isFinite(message.ts)) rtts.push(Math.max(0, Date.now() - message.ts));
    }

    if (message.t !== 'msg' && message.t !== 'echo') client.messages.push(message);
    for (let i = client.waiters.length - 1; i >= 0; i--) {
      const waiter = client.waiters[i];
      if (waiter.predicate(message)) {
        client.waiters.splice(i, 1);
        clearTimeout(waiter.timer);
        waiter.resolve(message);
      }
    }
  });

  ws.on('error', error => { lastError = `Client ${index + 1}: ${error.message}`; });
  ws.on('close', (code, reason) => {
    client.closed = true;
    if (!shuttingDown) lastError = `Client ${index + 1} disconnected unexpectedly (${code}: ${reason.toString()})`;
  });
  return client;
}

function waitFor(client, predicate, timeoutMs = 12000, description = 'expected server message') {
  const previous = client.messages.find(predicate);
  if (previous) return Promise.resolve(previous);
  return new Promise((resolve, reject) => {
    const waiter = {
      predicate, resolve,
      timer: setTimeout(() => {
        const index = client.waiters.indexOf(waiter);
        if (index >= 0) client.waiters.splice(index, 1);
        reject(new Error(`Timeout waiting for ${description} on client ${client.index + 1}`));
      }, timeoutMs)
    };
    client.waiters.push(waiter);
  });
}

async function connect(client) {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Connection timeout for client ${client.index + 1}`)), 15000);
    client.ws.once('open', () => { clearTimeout(timer); client.connected = true; resolve(); });
    client.ws.once('error', error => { clearTimeout(timer); reject(error); });
  });
}

function makeSnapshot(players) {
  const rows = (count, width, seed) => Array.from({ length: count }, (_, row) =>
    Array.from({ length: width }, (_, col) => ((row + 1) * (col + 2) + seed) % 97)
  );
  return {
    k: 'snap', st: 'play', ph: 'play', w: 4, tw: 100, sc: 500,
    q: ['', 0], cT: 0, cC: 3, cb: null, iv: 1, sl: 0, sk: 0,
    P: rows(players, 18, 1), E: rows(28, 18, 2), Z: rows(6, 7, 3),
    B: rows(36, 6, 4), N: rows(18, 8, 5), K: rows(20, 6, 6),
    M: rows(10, 5, 7), G: rows(20, 4, 8), R: rows(6, 10, 9), V: rows(10, 4, 10)
  };
}

async function main() {
  console.log(`Target: ${wsUrl}`);
  console.log(`Room: ${roomCode} | Players: ${playerCount} | Load period: ${durationSec}s`);
  console.log('Starting controlled test traffic.');
  for (let i = 0; i < playerCount; i++) {
    const client = createClient(i);
    clients.push(client);
    await connect(client);
    const joinedWait = waitFor(client, message => message.t === 'joined', 12000, 'joined');
    send(client, { t: 'join', room: roomCode, name: `Load ${i + 1}`, create: i === 0 });
    await joinedWait;
    if (i < playerCount - 1) await sleep(rampMs);
    process.stdout.write(`\rConnected ${i + 1}/${playerCount} players`);
  }
  console.log('\nAll simulated players joined.');

  const pickWait = waitFor(clients[0], message => message.t === 'players' && message.phase === 'pick', 12000, 'dragon selection phase');
  send(clients[0], { t: 'lock' });
  await pickWait;
  const startedWaiters = clients.map(client => waitFor(client, message => message.t === 'started', 12000, 'game started'));
  send(clients[0], { t: 'start' });
  await Promise.all(startedWaiters);
  console.log('Game phase started for all simulated players.');

  const snapshot = makeSnapshot(playerCount);
  const snapshotPayloadBytes = Buffer.byteLength(JSON.stringify({ t: 'msg', to: 'all', data: snapshot }));
  console.log(`Synthetic snapshot size: ${snapshotPayloadBytes.toLocaleString()} bytes`);
  timers.push(setInterval(() => {
    if (send(clients[0], { t: 'msg', to: 'all', data: snapshot })) sentSnapshots++;
  }, 80));
  for (let i = 1; i < clients.length; i++) {
    let tick = 0;
    timers.push(setInterval(() => {
      tick++;
      if (send(clients[i], { t: 'msg', to: 'host', data: { k: 'in', mx: tick % 2 ? 1 : -1, my: 0, ax: 960 + (tick % 100), ay: 540, f: tick % 3 === 0, al: false } })) sentInputs++;
    }, 40));
  }
  for (const client of clients) timers.push(setInterval(() => send(client, { t: 'echo', ts: Date.now() }), 1000));

  const testStart = Date.now();
  const reportTimer = setInterval(() => {
    const elapsed = Math.max(1, Math.round((Date.now() - testStart) / 1000));
    const open = clients.filter(client => client.ws.readyState === WebSocket.OPEN).length;
    const p95 = percentile(rtts, 0.95);
    process.stdout.write(`\r${elapsed}s | open ${open}/${playerCount} | snapshots ${sentSnapshots} sent / ${receivedSnapshots} received | inputs ${sentInputs} sent / ${receivedInputsAtHost} at host | RTT p95 ${p95 == null ? 'n/a' : `${p95}ms`}   `);
  }, 1000);

  await sleep(durationSec * 1000);
  clearInterval(reportTimer);
  console.log('\n\nTest traffic finished. Collecting final counters...');
  await sleep(1000);
  const elapsedSec = Math.max(1, (Date.now() - testStart) / 1000);
  const openCount = clients.filter(client => client.ws.readyState === WebSocket.OPEN).length;
  const summary = {
    target: urlArg, room: roomCode, players: playerCount, durationSeconds: Number(elapsedSec.toFixed(1)),
    openConnectionsAtEnd: `${openCount}/${playerCount}`, hostSnapshotsSent: sentSnapshots,
    guestSnapshotDeliveries: receivedSnapshots, guestInputsSent: sentInputs,
    inputsReceivedByHost: receivedInputsAtHost, echoReplies: receivedEchoes,
    rttMs: rtts.length ? { p50: percentile(rtts, 0.50), p95: percentile(rtts, 0.95), max: Math.max(...rtts) } : null,
    snapshotIntervalMs: snapshotIntervals.length ? { p50: percentile(snapshotIntervals, 0.50), p95: percentile(snapshotIntervals, 0.95), max: Math.max(...snapshotIntervals) } : null,
    bytesSentFromTestClients: bytesSent, bytesReceivedByTestClients: bytesReceived,
    serverErrors, unexpectedDisconnect: lastError
  };
  console.log('\nRESULT');
  console.log(JSON.stringify(summary, null, 2));
  if (openCount !== playerCount || serverErrors || lastError) process.exitCode = 1;
}

function cleanup() {
  shuttingDown = true;
  for (const timer of timers) clearInterval(timer);
  for (const client of clients) {
    for (const waiter of client.waiters) { clearTimeout(waiter.timer); waiter.reject(new Error('Test cleanup')); }
    client.waiters.length = 0;
    if (client.ws.readyState === WebSocket.OPEN || client.ws.readyState === WebSocket.CONNECTING) {
      try { client.ws.close(1000, 'Load test finished'); } catch { client.ws.terminate(); }
    }
  }
  setTimeout(() => {
    for (const client of clients) if (client.ws.readyState !== WebSocket.CLOSED) client.ws.terminate();
  }, 1200).unref();
}

main().catch(error => {
  console.error(`\nLOAD TEST FAILED: ${error.message}`);
  process.exitCode = 1;
}).finally(cleanup);
