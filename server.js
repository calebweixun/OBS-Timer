const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

let ROOT = __dirname;
let DATA_DIR = __dirname;
const settingsPath = () => path.join(DATA_DIR, 'settings.json');

// ── Default global config ───────────────────────────────────
const DEFAULT_GLOBAL = {
  style:  { fg: '#ffffff', bg: 'transparent', font: "ui-monospace,'SF Mono','Courier New',monospace" },
  flash:  { fg: '#ffffff', bg: '#ff0000', interval: 500, flashOnEnd: true },
  border: { visible: false, color: '#ffffff', width: 3, radius: 24, style: 'solid', inset: 30, flash: false, flashColor: '#ff0000' },
};

// ── Settings (presets + global — persisted to settings.json) ─
let savedSettings = { presets: [], global: JSON.parse(JSON.stringify(DEFAULT_GLOBAL)), app: { port: 8080 } };

function loadSettings() {
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.presets) savedSettings.presets = parsed.presets;
    if (parsed.global)  savedSettings.global  = { ...JSON.parse(JSON.stringify(DEFAULT_GLOBAL)), ...parsed.global };
    if (parsed.app)     savedSettings.app     = { ...savedSettings.app, ...parsed.app };
  } catch {}
}

function writeSettings() {
  try { fs.writeFileSync(settingsPath(), JSON.stringify(savedSettings, null, 2)); } catch (e) { console.error('settings save error:', e.message); }
}

// ── Server state ────────────────────────────────────────────
const state = {
  mode:       'clock',
  timer:      { total: 0, remaining: 0, paused: false },
  text:       '',
  title:      '',
  style:      { fg: '#ffffff', bg: 'transparent', font: "ui-monospace,'SF Mono','Courier New',monospace" },
  flash:      { active: false, fg: '#ffffff', bg: '#ff0000', interval: 500 },
  flashOnEnd: true,
  border:     { visible: false, color: '#ffffff', width: 3, radius: 24, style: 'solid', inset: 30, flash: false, flashColor: '#ff0000' },
  overlay:    { text: '', active: false, seq: 0 },
  global:     JSON.parse(JSON.stringify(DEFAULT_GLOBAL)),
};

// Apply saved global to state on startup
loadSettings();
Object.assign(state.global, savedSettings.global);

// ── SSE clients ─────────────────────────────────────────────
const clients = new Set();

function broadcast() {
  const msg = `data: ${JSON.stringify(state)}\n\n`;
  for (const res of clients) res.write(msg);
}

// ── Timer tick ──────────────────────────────────────────────
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

// ── Command handler ─────────────────────────────────────────
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
      state.text         = cmd.text || '';
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

    // ── Overlay: show text above clock/timer without replacing it ──
    case 'overlay':
      state.overlay.text   = cmd.text || '';
      state.overlay.active = !!state.overlay.text;
      state.overlay.seq    = (state.overlay.seq + 1) % 1000;
      break;

    case 'clearOverlay':
      state.overlay.text   = '';
      state.overlay.active = false;
      break;

    // ── Global style/flash/border ──────────────────────────
    case 'global':
      if (cmd.style) {
        Object.assign(state.global.style, cmd.style);
        Object.assign(state.style, cmd.style);
      }
      if (cmd.flash) {
        Object.assign(state.global.flash, cmd.flash);
        if (cmd.flash.fg       !== undefined) state.flash.fg       = cmd.flash.fg;
        if (cmd.flash.bg       !== undefined) state.flash.bg       = cmd.flash.bg;
        if (cmd.flash.interval !== undefined) state.flash.interval = Number(cmd.flash.interval);
        if (cmd.flash.flashOnEnd !== undefined) state.flashOnEnd   = !!cmd.flash.flashOnEnd;
      }
      if (cmd.border) {
        Object.assign(state.global.border, cmd.border);
        Object.assign(state.border, cmd.border);
      }
      savedSettings.global = JSON.parse(JSON.stringify(state.global));
      writeSettings();
      break;
  }
  broadcast();
}

// ── HTTP server ─────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
};

const server = http.createServer((req, res) => {
  const urlObj   = new URL(req.url, 'http://localhost');
  const pathname = urlObj.pathname;

  // SSE stream
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

  // Settings persistence API
  if (pathname === '/api/info' && req.method === 'GET') {
    const addresses = Object.values(os.networkInterfaces()).flat()
      .filter(item => item && item.family === 'IPv4' && !item.internal)
      .map(item => item.address);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ port: savedSettings.app.port, addresses }));
    return;
  }

  if (pathname === '/api/settings') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(savedSettings));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', d => body += d);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (Array.isArray(data.presets)) savedSettings.presets = data.presets;
          if (data.app) {
            const port = Number(data.app.port);
            if (!Number.isInteger(port) || port < 1024 || port > 65535) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end('{"ok":false,"error":"Port must be between 1024 and 65535"}');
              return;
            }
            savedSettings.app = { ...savedSettings.app, port };
          }
          if (data.global) {
            savedSettings.global = data.global;
            // Also update live state so new clients get current global
            Object.assign(state.global.style,  data.global.style  || {});
            Object.assign(state.global.flash,  data.global.flash  || {});
            Object.assign(state.global.border, data.global.border || {});
          }
          writeSettings();
        } catch {}
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      });
      return;
    }
  }

  // Static files
  const aliases = { '/': '/remote.html', '/index.html': '/remote.html', '/clock.html': '/playclock.html' };
  const file = path.join(ROOT, aliases[pathname] || pathname);
  const ext  = path.extname(file);

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

function start(port, root, options = {}) {
  if (root) ROOT = root;
  if (options.dataDir) DATA_DIR = options.dataDir;
  loadSettings();
  Object.assign(state.global.style,  savedSettings.global.style  || {});
  Object.assign(state.global.flash,  savedSettings.global.flash  || {});
  Object.assign(state.global.border, savedSettings.global.border || {});
  savedSettings.app.port = port;
  writeSettings();
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => {
      server.removeListener('error', reject);
      console.log(`\nOBS Timer  http://localhost:${port}`);
      console.log(`  listening   →  0.0.0.0:${port}`);
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
