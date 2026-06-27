# Claude Project Instructions

Start with `PROJECT_STATUS.md`; it is the single source of truth for architecture, merged work, verification, release state, and known limitations. Use `README.md` for user-facing setup and operation.

## Project guardrails

- Work against `calebweixun/OBS-Timer` and its `mine` remote. `origin` points to upstream `feather0611/OBS-Timer`.
- Default branch is `master`; use a focused feature branch and PR for changes.
- Inspect the existing implementation before editing. The UI is intentionally dependency-light plain HTML/CSS/JavaScript.
- Preserve the persisted `settings.json` schema (`presets`, `global`, `app.port`) and Electron `userData` storage.
- Keep macOS native window controls separate from Windows/Linux custom controls.
- Do not expose desktop window IPC controls to LAN browser clients.
- Validate syntax, package locally when practical, and require all three GitHub Actions platform jobs to pass.
- Update `PROJECT_STATUS.md` whenever the documented state changes.

## Development

```bash
npm ci
npm run electron
npm run build:mac -- --dir --publish never
```

Do not commit generated `node_modules/`, `dist/`, runtime settings, or logs. Do not create a release by hand from a normal commit: merge first, then push a matching `v*` tag so the release workflow attaches all platform installers.
