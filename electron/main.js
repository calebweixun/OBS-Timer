const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

let win = null;

function createWindow() {
  const isMac = process.platform === 'darwin';
  win = new BrowserWindow({
    width:     1080,
    height:    780,
    minWidth:  800,
    minHeight: 600,
    title:     'OBS Timer Remote',
    frame:     isMac,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac ? { trafficLightPosition: { x: 14, y: 12 } } : {}),
    backgroundColor: '#0d0d0d',
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  Menu.setApplicationMenu(null);

  win.loadURL(`http://localhost:${activePort}/remote.html`);

  win.on('closed', () => { win = null; });
}

function readSavedPort() {
  const envPort = Number(process.env.PORT);
  if (Number.isInteger(envPort) && envPort >= 1024 && envPort <= 65535) return envPort;
  try {
    const settings = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'settings.json'), 'utf8'));
    const savedPort = Number(settings.app && settings.app.port);
    if (Number.isInteger(savedPort) && savedPort >= 1024 && savedPort <= 65535) return savedPort;
  } catch {}
  return 8080;
}

let activePort = 8080;

app.whenReady().then(async () => {
  activePort = readSavedPort();
  const { start } = require('../server');
  await start(activePort, ROOT, { dataDir: app.getPath('userData') });

  ipcMain.on('window-control', (event, action) => {
    const target = BrowserWindow.fromWebContents(event.sender);
    if (!target) return;
    if (action === 'close') target.close();
    if (action === 'minimize') target.minimize();
    if (action === 'maximize') target.isMaximized() ? target.unmaximize() : target.maximize();
  });
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
