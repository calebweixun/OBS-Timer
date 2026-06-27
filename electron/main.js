const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const ROOT = path.join(__dirname, '..');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width:     1080,
    height:    780,
    minWidth:  800,
    minHeight: 600,
    title:     'OBS Timer Remote',
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
    },
  });

  Menu.setApplicationMenu(null);

  win.loadURL(`http://localhost:${PORT}/remote.html`);

  win.on('closed', () => { win = null; });
}

app.whenReady().then(async () => {
  const { start } = require('../server');
  await start(PORT, ROOT);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
