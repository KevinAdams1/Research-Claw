#!/usr/bin/env node
/**
 * Minimal test: send text-only chat.send WITHOUT config changes.
 * Goal: verify chat events are received at all.
 */
import { randomUUID, webcrypto } from 'crypto';
import http from 'http';

const { subtle } = webcrypto;
const GW_HOST = '127.0.0.1';
const GW_PORT = 28789;

function b64url(buf) {
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function buildFrame(json) {
  const payload = Buffer.from(JSON.stringify(json), 'utf8');
  const mask = Buffer.from(randomUUID().replace(/-/g, '').slice(0, 8), 'hex');
  let header;
  if (payload.length < 126) {
    header = Buffer.alloc(6); header[0] = 0x81; header[1] = 0x80 | payload.length;
    mask.copy(header, 2);
  } else if (payload.length < 65536) {
    header = Buffer.alloc(8); header[0] = 0x81; header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2); mask.copy(header, 4);
  } else {
    header = Buffer.alloc(14); header[0] = 0x81; header[1] = 0x80 | 127;
    header.writeUInt32BE(0, 2); header.writeUInt32BE(payload.length, 6);
    mask.copy(header, 10);
  }
  const masked = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i % 4];
  return Buffer.concat([header, masked]);
}

function parseFrames(buf) {
  const messages = [];
  while (buf.length >= 2) {
    const fin = (buf[0] & 0x80) !== 0;
    const opcode = buf[0] & 0x0f;
    const hasMask = (buf[1] & 0x80) !== 0;
    let len = buf[1] & 0x7f;
    let off = 2;
    if (len === 126) { if (buf.length < 4) break; len = buf.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (buf.length < 10) break; len = Number(buf.readBigUInt64BE(2)); off = 10; }
    if (hasMask) off += 4;
    if (buf.length < off + len) break;
    let data = buf.subarray(off, off + len);
    if (hasMask) { const mk = buf.subarray(off - 4, off); data = Buffer.from(data); for (let i = 0; i < data.length; i++) data[i] ^= mk[i % 4]; }
    if (opcode === 1 && fin) messages.push(data.toString('utf8'));
    else if (opcode === 8) messages.push(null);
    buf = buf.subarray(off + len);
  }
  return { messages, remaining: buf };
}

// Generate identity
const keyPair = await subtle.generateKey('Ed25519', true, ['sign', 'verify']);
const rawPub = await subtle.exportKey('raw', keyPair.publicKey);
const publicKey = b64url(rawPub);
const deviceId = bytesToHex(new Uint8Array(await subtle.digest('SHA-256', rawPub)));
const sign = async (p) => b64url(await subtle.sign('Ed25519', keyPair.privateKey, new TextEncoder().encode(p)));

console.log('Device:', deviceId.slice(0, 16) + '...');

// Connect
const wsKey = Buffer.from(randomUUID().replace(/-/g, ''), 'hex').toString('base64');
const req = http.request({
  host: GW_HOST, port: GW_PORT, path: '/', method: 'GET',
  headers: {
    Connection: 'Upgrade', Upgrade: 'websocket',
    'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': wsKey,
    Origin: `http://${GW_HOST}:${GW_PORT}`,
  },
});

let frameBuf = Buffer.alloc(0);
let challengeNonce = null;
const pending = new Map();
const chatEvents = [];
let socket;

function wsSend(json) { socket.write(buildFrame(json)); }
function rpc(method, params) {
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 30000);
    pending.set(id, { resolve, reject, timer });
    wsSend({ type: 'req', id, method, params });
  });
}

let challengeResolve;
const challengePromise = new Promise(r => { challengeResolve = r; });

req.on('upgrade', async (_res, sock) => {
  socket = sock;
  sock.on('data', (d) => {
    frameBuf = Buffer.concat([frameBuf, d]);
    const { messages, remaining } = parseFrames(frameBuf);
    frameBuf = remaining;
    for (const msg of messages) {
      if (msg === null) { console.log('[FRAME] close'); continue; }
      let frame;
      try { frame = JSON.parse(msg); } catch { continue; }

      const summary = frame.type === 'event'
        ? `event=${frame.event} ${frame.event === 'chat' ? 'state=' + frame.payload?.state : ''}`
        : `ok=${frame.ok}`;
      console.log(`[FRAME] ${frame.type} ${summary}`);

      if (frame.type === 'res') {
        const e = pending.get(frame.id);
        if (e) { clearTimeout(e.timer); pending.delete(frame.id); frame.ok ? e.resolve(frame.payload) : e.reject(new Error(JSON.stringify(frame.error))); }
      } else if (frame.type === 'event') {
        if (frame.event === 'connect.challenge') {
          challengeNonce = frame.payload?.nonce ?? '';
          challengeResolve();
        } else if (frame.event === 'chat') {
          chatEvents.push(frame.payload);
        } else if (frame.event === 'shutdown') {
          console.log('!!! GATEWAY SHUTDOWN EVENT RECEIVED !!!');
        }
      }
    }
  });
  sock.on('error', (e) => console.error('Socket error:', e.message));
  sock.on('close', () => console.log('Socket closed'));
});

req.on('error', (e) => { console.error('Connect failed:', e.message); process.exit(1); });
req.end();

await challengePromise;

// Authenticate
const signedAt = Date.now();
const clientId = 'openclaw-control-ui';
const sigPayload = ['v3', deviceId, clientId, 'ui', 'operator', 'operator.read,operator.write,operator.admin', String(signedAt), '', challengeNonce, 'node', ''].join('|');
const signature = await sign(sigPayload);
const hello = await rpc('connect', {
  minProtocol: 3, maxProtocol: 3,
  client: { id: clientId, version: '0.3.0-test', platform: 'node', mode: 'ui' },
  role: 'operator', scopes: ['operator.read', 'operator.write', 'operator.admin'],
  device: { id: deviceId, publicKey, signature, signedAt, nonce: challengeNonce },
});
console.log('Authenticated! Server version:', hello?.serverVersion || '?');

// Check current config first
const snap = await rpc('config.get', {});
const cfg = snap?.config || {};
const primary = cfg?.agents?.defaults?.model?.primary || '(none)';
console.log('Current model:', primary);

// Send simple text-only message
const sk = `test-simple-${Date.now()}`;
console.log(`\nSending text message on session: ${sk}`);
const result = await rpc('chat.send', {
  message: 'Hello, please respond with exactly: PONG',
  sessionKey: sk,
  idempotencyKey: randomUUID(),
});
console.log('chat.send result:', JSON.stringify(result));

// Wait for chat events
console.log('Waiting up to 60s for chat events...');
const deadline = Date.now() + 60000;
while (Date.now() < deadline) {
  const final = chatEvents.find(e => e.state === 'final' || e.state === 'error');
  if (final) break;
  await new Promise(r => setTimeout(r, 500));
}

console.log(`\n=== Chat events received: ${chatEvents.length} ===`);
for (const e of chatEvents) {
  const text = e.message?.text || (Array.isArray(e.message?.content) ? e.message.content.filter(c => c.type === 'text').map(c => c.text).join('') : '');
  console.log(`  state=${e.state} sessionKey=${e.sessionKey} text="${text.slice(0, 150)}"`);
}

socket.end();
process.exit(chatEvents.some(e => e.state === 'final') ? 0 : 1);
