const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;

// ── Server state ───────────────────────────────────────────
const state = {
  mode:  'clock',   // clock | timer | text | hidden
  timer: { total: 0, remaining: 0, paused: false },
  text:  '',
  title: '',
  style: { fg: '#ffffff', bg: 'transparent' },
  flash: { active: false, bg: '#ff0000', fg: '#ffffff', interval: 500 },
};

// ── SSE clients ────────────────────────────────────────────
const clients = new Set();

function broadcast() {
  const msg = `data: ${JSON.stringify(state)}\n\n`;
  for (const res of clients) res.write(msg);
}

// ── Timer tick (server-side) ───────────────────────────────
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
      state.flash.active = true;
      broadcast();
    }
  }, 1000);
}

// ── Command handler ────────────────────────────────────────
function handle(cmd) {
  switch (cmd.type) {
    case 'timer':
      stopTick();
      state.mode          = 'timer';
      state.flash.active  = false;
      state.timer.total   = Number(cmd.seconds) || 0;
      state.timer.remaining = state.timer.total;
      state.timer.paused  = false;
      if (cmd.title !== undefined) state.title = cmd.title;
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
      state.text         = cmd.text || '';
      if (cmd.title !== undefined) state.title = cmd.title;
      break;

    case 'hide':
      stopTick();
      state.mode         = 'hidden';
      state.flash.active = false;
      break;

    case 'style':
      if (cmd.fg !== undefined) state.style.fg = cmd.fg;
      if (cmd.bg !== undefined) state.style.bg = cmd.bg;
      break;

    case 'flash':
      if (cmd.fg       !== undefined) state.flash.fg       = cmd.fg;
      if (cmd.bg       !== undefined) state.flash.bg       = cmd.bg;
      if (cmd.interval !== undefined) state.flash.interval = Number(cmd.interval);
      if (cmd.active   !== undefined) state.flash.active   = Boolean(cmd.active);
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

http.createServer((req, res) => {
  const urlObj   = new URL(req.url, 'http://localhost');
  const pathname = urlObj.pathname;

  // SSE
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

  // Command API
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

  // Static files — alias legacy routes
  const aliases = { '/': '/remote.html', '/index.html': '/remote.html', '/clock.html': '/playclock.html' };
  const file = path.join(__dirname, aliases[pathname] || pathname);
  const ext  = path.extname(file);

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });

}).listen(PORT, () => {
  console.log(`\nOBS Timer  http://localhost:${PORT}`);
  console.log(`  remote     →  http://localhost:${PORT}/remote.html`);
  console.log(`  playclock  →  http://localhost:${PORT}/playclock.html\n`);
});
