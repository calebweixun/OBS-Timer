const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;

// ── Server state ───────────────────────────────────────────
const state = {
  mode:       'clock',
  timer:      { total: 0, remaining: 0, paused: false },
  text:       '',
  title:      '',
  style:      { fg: '#ffffff', bg: 'transparent', font: "ui-monospace,'SF Mono','Courier New',monospace" },
  flash:      { active: false, fg: '#ffffff', bg: '#ff0000', interval: 500 },
  flashOnEnd: true,
  border:     { visible: false, color: '#ffffff', width: 3, radius: 24, style: 'solid', inset: 30, flash: false, flashColor: '#ff0000' },
};

// ── SSE clients ────────────────────────────────────────────
const clients = new Set();

function broadcast() {
  const msg = `data: ${JSON.stringify(state)}\n\n`;
  for (const res of clients) res.write(msg);
}

// ── Timer tick ─────────────────────────────────────────────
let tick = null;

function stopTick() {
  if (tick) { clearInterval(tick); tick = null; }
}

function startTick() {
  stopTick();
  tick = setInterval(() => {
    if (state.timer.remaining > 0) {
      state.timer.remaining--;
      broadcast();
    }
    if (state.timer.remaining === 0) {
      stopTick();
      if (state.flashOnEnd) state.flash.active = true;
      broadcast();
    }
  }, 1000);
}

// ── Command handler ────────────────────────────────────────
function handle(cmd) {
  switch (cmd.type) {

    case 'timer':
      stopTick();
      state.mode            = 'timer';
      state.flash.active    = false;
      state.timer.total     = Number(cmd.seconds) || 0;
      state.timer.remaining = state.timer.total;
      state.timer.paused    = false;
      if (cmd.title  !== undefined) state.title = cmd.title;
      if (cmd.style)  Object.assign(state.style, cmd.style);
      if (cmd.border) Object.assign(state.border, cmd.border);
      if (cmd.flash) {
        state.flashOnEnd = cmd.flash.flashOnEnd !== false;
        const { flashOnEnd, ...fs } = cmd.flash;
        Object.assign(state.flash, fs, { active: false });
      }
      if (state.timer.total > 0) startTick();
      break;

    case 'pause':
      if (state.mode === 'timer' && !state.timer.paused) {
        state.timer.paused = true;
        stopTick();
      }
      break;

    case 'resume':
      if (state.mode === 'timer' && state.timer.paused && state.timer.remaining > 0) {
        state.timer.paused = false;
        startTick();
      }
      break;

    case 'reset':
      if (state.mode === 'timer') {
        state.timer.remaining = state.timer.total;
        state.timer.paused    = false;
        state.flash.active    = false;
        startTick();
      }
      break;

    case 'clock':
      stopTick();
      state.mode         = 'clock';
      state.flash.active = false;
      break;

    case 'text':
      stopTick();
      state.mode         = 'text';
      state.flash.active = false;
      state.text         = cmd.text  || '';
      if (cmd.title !== undefined) state.title = cmd.title;
      break;

    case 'hide':
      stopTick();
      state.mode         = 'hidden';
      state.flash.active = false;
      break;

    case 'style':
      if (cmd.fg   !== undefined) state.style.fg   = cmd.fg;
      if (cmd.bg   !== undefined) state.style.bg   = cmd.bg;
      if (cmd.font !== undefined) state.style.font = cmd.font;
      break;

    case 'flash':
      if (cmd.fg       !== undefined) state.flash.fg       = cmd.fg;
      if (cmd.bg       !== undefined) state.flash.bg       = cmd.bg;
      if (cmd.interval !== undefined) state.flash.interval = Number(cmd.interval);
      if (cmd.active   !== undefined) state.flash.active   = Boolean(cmd.active);
      break;

    case 'border':
      Object.assign(state.border, cmd);
      delete state.border.type;
      break;
  }
  broadcast();
}

// ── HTTP server ────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
};

let ROOT = __dirname;

const server = http.createServer((req, res) => {
  const urlObj   = new URL(req.url, 'http://localhost');
  const pathname = urlObj.pathname;

  if (pathname === '/events') {
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    });
    res.write(`data: ${JSON.stringify(state)}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (pathname === '/api/command' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try { handle(JSON.parse(body)); } catch {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    });
    return;
  }

  const aliases = { '/': '/remote.html', '/index.html': '/remote.html', '/clock.html': '/playclock.html' };
  const file = path.join(ROOT, aliases[pathname] || pathname);
  const ext  = path.extname(file);

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

function start(port, root) {
  if (root) ROOT = root;
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      console.log(`\nOBS Timer  http://localhost:${port}`);
      console.log(`  remote     →  http://localhost:${port}/remote.html`);
      console.log(`  playclock  →  http://localhost:${port}/playclock.html\n`);
      resolve(port);
    });
  });
}

if (require.main === module) {
  start(Number(process.env.PORT) || 8080);
}

module.exports = { start };
