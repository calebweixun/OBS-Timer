# OBS Timer Remote

倒數計時遙控台 — 專為 OBS Studio 設計的即時計時控制器。

> Fork 自 [feather0611/OBS-Timer](https://github.com/feather0611/OBS-Timer)，全面重構為 Remote + Playclock 雙頁面架構。

---

## 概覽

| 畫面 | 用途 |
|------|------|
| **Remote** (`/remote.html`) | 操作介面，在電腦瀏覽器或手機上使用 |
| **Playclock** (`/playclock.html`) | 顯示畫面，加入 OBS 的「瀏覽器來源」 |

Remote 透過 SSE（Server-Sent Events）即時推播到所有連線的 Playclock，計時由伺服器端驅動，不受客戶端影響。

---

## 快速啟動

### 方式一：Node.js（推薦）

```bash
# 預設 port 8080
./start.sh

# 自訂 port
./start.sh 9191
```

啟動後開啟瀏覽器前往 `http://localhost:8080/remote.html`。

### 方式二：Electron 桌面應用

```bash
npm install
npm run electron
```

Electron 模式會自動開啟 Remote 視窗，無需手動打開瀏覽器。
服務會監聽所有網路介面（`0.0.0.0`），可由同一區網的手機或平板遙控。請只在信任的網路中使用。

可在 Remote 的「OBS 操作說明 → 更換 Port」永久設定連接埠；重新啟動 App 後生效。

### 方式三：打包成獨立應用

```bash
npm install
npm run build:mac    # macOS .dmg
npm run build:win    # Windows .exe
npm run build:linux  # Linux .AppImage
```

輸出在 `dist/` 目錄。

每次 push、pull request 或手動執行 GitHub Actions 時，也會自動建置 macOS、Windows、Linux 安裝檔並保存為 workflow artifacts。

---

## OBS 設定

1. OBS → 場景 → 右鍵加入來源 → **瀏覽器**
2. URL 填入：`http://localhost:8080/playclock.html`
3. 寬度 `1280`，高度 `720`
4. 勾選「場景啟動時重整瀏覽器」
5. 確定

---

## Remote 操作

### Preset Pad
- **點擊 Pad** → 立即啟動倒數，套用該 Pad 儲存的所有設定
- **Hover → ✎** → 開啟編輯器

### 每個 Preset 各自儲存

| 設定項目 | 說明 |
|----------|------|
| 標籤 / 畫面標題 | 遙控按鈕名稱 vs 顯示在 OBS 上的標題文字 |
| 倒數時間 | 分 + 秒 |
| 文字色 / 底色 | Playclock 的前景與背景色 |
| 字體 | SF Mono、SF Pro、Helvetica Neue、Georgia、Impact、Courier New |
| 閃爍設定 | 結束時自動閃爍、顏色 A/B、間隔 ms |
| 邊框 | 顯示與否、顏色、粗細、圓角、內距、線形、隨閃爍變色 |

### Transport 控制列

| 按鈕 | 說明 |
|------|------|
| 繼續 | 從暫停處繼續倒數 |
| 暫停 | 暫停目前倒數 |
| 重置 | 回到初始時間並重啟 |
| 時鐘 | 切換為即時時鐘模式 |
| 隱藏 | 隱藏 Playclock 所有顯示 |

### 快速文字
輸入文字後按「傳送」或 Enter，直接顯示在 Playclock 上。

---

## Playclock 模式說明

| 模式 | 說明 |
|------|------|
| `clock` | 顯示目前時間（HH:MM:SS） |
| `timer` | 顯示倒數，由伺服器端計時 |
| `text` | 顯示自訂文字 |
| `hidden` | 清空畫面 |

---

## API（進階）

### POST `/api/command`

```json
// 啟動倒數（完整 preset）
{
  "type": "timer",
  "seconds": 300,
  "title": "休息時間",
  "style":  { "fg": "#ffffff", "bg": "transparent", "font": "..." },
  "flash":  { "fg": "#ffffff", "bg": "#ff0000", "interval": 500, "flashOnEnd": true },
  "border": { "visible": true, "color": "#ffffff", "width": 3, "radius": 24,
               "style": "solid", "inset": 30, "flash": false, "flashColor": "#ff0000" }
}

// 其他指令
{ "type": "pause" }
{ "type": "resume" }
{ "type": "reset" }
{ "type": "clock" }
{ "type": "hide" }
{ "type": "text", "text": "Hello", "title": "" }
```

### GET `/events`

SSE 串流，每次狀態變更推播完整 `state` JSON。

---

## 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `PORT` | `8080` | 伺服器 port |

---

## 技術架構

- **零 npm 依賴**：純 Node.js http 模組，不需要安裝任何套件即可作為 CLI 執行
- **SSE 即時推播**：Remote 發送指令 → 伺服器更新狀態 → 廣播到所有 Playclock
- **伺服器端計時**：Timer tick 在 `server.js` 中運行，確保多個客戶端時間一致
- **Electron 選用**：`electron/main.js` 內嵌 HTTP server，無需另開終端機

---

## 授權 License

MIT
