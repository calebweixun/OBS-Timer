// Run with: node_modules/.bin/electron make-icon.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs   = require('fs');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1024, height: 1024,
    show: false,
    webPreferences: { offscreen: true },
  });

  const html = `<!DOCTYPE html>
<html><body style="margin:0;background:transparent">
<canvas id="c" width="1024" height="1024"></canvas>
<script>
const c = document.getElementById('c');
const ctx = c.getContext('2d');
const S = 1024;
const cx = S/2, cy = S/2, r = S/2;

// ── Background: rounded square ──
const bg = ctx.createLinearGradient(0, 0, 0, S);
bg.addColorStop(0, '#1c1c1e');
bg.addColorStop(1, '#111113');
const rr = 220;
ctx.beginPath();
ctx.moveTo(rr, 0);
ctx.lineTo(S - rr, 0);
ctx.quadraticCurveTo(S, 0, S, rr);
ctx.lineTo(S, S - rr);
ctx.quadraticCurveTo(S, S, S - rr, S);
ctx.lineTo(rr, S);
ctx.quadraticCurveTo(0, S, 0, S - rr);
ctx.lineTo(0, rr);
ctx.quadraticCurveTo(0, 0, rr, 0);
ctx.closePath();
ctx.fillStyle = bg;
ctx.fill();

// ── Subtle inner glow ──
const glow = ctx.createRadialGradient(cx, cy-80, 0, cx, cy, 420);
glow.addColorStop(0, 'rgba(80,180,255,0.07)');
glow.addColorStop(1, 'rgba(0,0,0,0)');
ctx.fillStyle = glow;
ctx.fill();

// ── Clock face ring ──
const faceR = 370;
ctx.beginPath();
ctx.arc(cx, cy, faceR, 0, Math.PI * 2);
ctx.strokeStyle = 'rgba(255,255,255,0.08)';
ctx.lineWidth = 2;
ctx.stroke();

// ── Hour tick marks ──
for (let i = 0; i < 12; i++) {
  const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
  const isMajor = i % 3 === 0;
  const len = isMajor ? 32 : 16;
  const inner = faceR - len;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
  ctx.lineTo(cx + Math.cos(angle) * (faceR - 4), cy + Math.sin(angle) * (faceR - 4));
  ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.22)';
  ctx.lineWidth = isMajor ? 6 : 3;
  ctx.lineCap = 'round';
  ctx.stroke();
}

// ── Accent ring (inner) ──
ctx.beginPath();
ctx.arc(cx, cy, faceR - 48, 0, Math.PI * 2);
ctx.strokeStyle = 'rgba(255,255,255,0.04)';
ctx.lineWidth = 1;
ctx.stroke();

// Helper to draw a rounded hand
function hand(angle, len, width, color) {
  const rad = angle - Math.PI / 2;
  const ex = cx + Math.cos(rad) * len;
  const ey = cy + Math.sin(rad) * len;
  const bx = cx - Math.cos(rad) * (width * 1.5);
  const by = cy - Math.sin(rad) * (width * 1.5);
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(ex, ey);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

// 10:10 — classic watch display time
const hourAngle   = ((10 + 10/60) / 12) * Math.PI * 2;
const minuteAngle = (10 / 60) * Math.PI * 2;

// Hand shadows
ctx.shadowColor = 'rgba(0,0,0,0.6)';
ctx.shadowBlur  = 18;
hand(hourAngle,   220, 22, '#ffffff');
hand(minuteAngle, 300, 14, '#ffffff');
ctx.shadowBlur = 0;

// Hour hand
hand(hourAngle,   220, 22, '#ffffff');

// Minute hand with blue tip
hand(minuteAngle, 300, 14, '#ffffff');
// Blue tip on minute hand
const mRad = minuteAngle - Math.PI / 2;
const tipLen = 80;
ctx.beginPath();
ctx.moveTo(cx + Math.cos(mRad) * 220, cy + Math.sin(mRad) * 220);
ctx.lineTo(cx + Math.cos(mRad) * 300, cy + Math.sin(mRad) * 300);
ctx.strokeStyle = '#4db8ff';
ctx.lineWidth = 14;
ctx.lineCap = 'round';
ctx.stroke();

// Second hand (pointing to 35 sec)
const secondAngle = (35 / 60) * Math.PI * 2;
hand(secondAngle, 320, 5, '#ff6b6b');
// counter-balance
const sRad = secondAngle - Math.PI / 2;
ctx.beginPath();
ctx.moveTo(cx - Math.cos(sRad) * 60, cy - Math.sin(sRad) * 60);
ctx.lineTo(cx, cy);
ctx.strokeStyle = '#ff6b6b';
ctx.lineWidth = 5;
ctx.lineCap = 'round';
ctx.stroke();

// ── Center cap ──
ctx.beginPath();
ctx.arc(cx, cy, 18, 0, Math.PI * 2);
ctx.fillStyle = '#ffffff';
ctx.fill();
ctx.beginPath();
ctx.arc(cx, cy, 10, 0, Math.PI * 2);
ctx.fillStyle = '#1c1c1e';
ctx.fill();

window._done = c.toDataURL('image/png');
</script>
</body></html>`;

  win.loadURL('data:text/html,' + encodeURIComponent(html));
  win.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      win.webContents.executeJavaScript('window._done').then(dataUrl => {
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
        const outPath = path.join(__dirname, 'build', 'icon.png');
        fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
        console.log('Saved:', outPath);
        app.quit();
      });
    }, 400);
  });
});
