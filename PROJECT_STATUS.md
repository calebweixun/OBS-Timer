# OBS Timer Remote — Project Status

Last verified: 2026-06-27 (Asia/Taipei)

## Canonical repository state

- Repository: `calebweixun/OBS-Timer`
- Default branch: `master`
- Current version: `1.2.0`
- Verified `master` commit before this documentation update: `e88df0b`
- `mine` is the writable fork remote; `origin` is the upstream `feather0611/OBS-Timer` repository.
- PRs #1–#4 are merged. Their merge commits and post-merge GitHub Actions runs were verified.

## Architecture

| File | Responsibility |
| --- | --- |
| `electron/main.js` | Starts the embedded HTTP server, creates the desktop window, loads the persisted port, and implements native/custom window chrome. |
| `electron/preload.js` | Exposes limited desktop window controls through `contextBridge`. |
| `server.js` | HTTP static server, command API, settings API, LAN information API, SSE state broadcast, and server-side countdown tick. |
| `remote.html` | Remote-control UI, presets, global styles, drag sorting, keyboard navigation, OBS instructions, and persistent port UI. |
| `playclock.html` | Transparent OBS browser-source output for clock, countdown, title, overlay text, flash, and border. |
| `build/icon.png` / `build/icon.icns` | Packaged application icons. |
| `make-icon.js` | Reproducible source script for `build/icon.png`. Run with `npm run icon`. |

The application intentionally uses plain HTML/CSS/JavaScript and Node's built-in HTTP server. Electron and Electron Builder are development dependencies.

## Runtime and persistence

- The server listens on `0.0.0.0`, so devices on the same LAN can open the remote UI.
- Default port is `8080`; valid persisted ports are `1024–65535`.
- A changed port takes effect after restarting the desktop app.
- In Electron, settings are stored under `app.getPath('userData')/settings.json`, not inside read-only `app.asar`.
- In standalone Node mode, settings default to the project directory's `settings.json`.
- Persisted data contains `presets`, `global`, and `app.port`.
- Remote control currently has no authentication. Only run it on a trusted network.

## HTTP surface

- `GET /remote.html` — remote-control UI.
- `GET /playclock.html` — OBS browser-source output.
- `GET /events` — SSE stream of complete runtime state.
- `POST /api/command` — timer, clock, text, visibility, style, flash, border, and overlay commands.
- `GET|POST /api/settings` — persistent presets, global configuration, and app port.
- `GET /api/info` — active port and non-internal IPv4 addresses for LAN instructions.

## Completed product behavior

- Server-driven countdown synchronized through SSE.
- Persistent presets and global output styling.
- Overlay text, end flash, and configurable border.
- Playclock title uses nearly the full viewport width before wrapping.
- Grid drag insertion indicators appear on the left/right edges; list indicators remain top/bottom.
- Grid keyboard navigation uses the computed column count: Up/Down cross rows, Left/Right move backward/forward.
- Desktop UI fills the window width.
- macOS uses native traffic lights aligned to the 38px title bar.
- Windows/Linux use custom controls on the right.
- The title bar displays the real project icon; browser-only remote pages do not display desktop controls.
- OBS help shows the local Playclock URL, a LAN remote URL, and persistent port controls.

## Build and release

Local commands:

```bash
npm ci
npm run electron
npm run build:mac
npm run build:win
npm run build:linux
npm run icon
```

`.github/workflows/build.yml` builds macOS, Windows, and Linux on pushes to `master`/`main`, pull requests, tags, and manual dispatches. Installers are retained as workflow artifacts for 14 days.

Tags matching `v*` additionally run `Publish GitHub Release`: all platform artifacts are downloaded, a GitHub Release is created with generated notes, and installers are attached. After merging a release-ready change:

```bash
git switch master
git pull --ff-only mine master
git tag v1.2.0
git push mine v1.2.0
```

Use a new semantic version if `v1.2.0` already exists. The package version and tag should match.

## Verified commit / PR ledger

| Feature commits | PR | Merge commit | Result |
| --- | --- | --- | --- |
| `34dc175` | #1 | `06a2855` | LAN binding, persistent port, frameless desktop shell, cross-platform builds. |
| `3122c51`, `0200167` | #2 | `5e10919` | Platform chrome, full-width UI, Playclock width, grid drag and keyboard behavior, xattr docs. |
| `8de3d69`, `11e786a` | #3 | `8fba4b3` | Native macOS controls, real app icon, tag-to-Release automation. |
| `b67e11d` | #4 | `e88df0b` | Native macOS traffic-light vertical alignment. |

All PR and post-merge build workflows listed above completed successfully as of the verification date.

## Known limitations / next work

1. No version tag or GitHub Release exists yet. The tag-only Release job has not had a real end-to-end tag execution.
2. macOS builds are not signed with a Developer ID and are not notarized. Other Macs may require the documented quarantine override for trusted development builds.
3. The macOS build is runner-native, not explicitly Universal. Decide whether to publish separate `arm64`/`x64` artifacts or a Universal build before a broad release.
4. Remote-control endpoints are unauthenticated on the LAN.
5. There is no automated unit or browser test suite; current verification is packaging, API smoke testing, UI inspection, and GitHub Actions builds.

## Change discipline

- Do not write runtime settings into packaged resources or `app.asar`.
- Preserve backward compatibility for the `settings.json` shape.
- Do not expose Electron window controls to ordinary remote browsers.
- Keep platform-specific title-bar behavior separate: native macOS controls, custom Windows/Linux controls.
- Do not commit `node_modules/`, `dist/`, runtime `settings.json`, logs, or `.DS_Store`.
- Before publishing: run relevant local checks, push through a PR, verify all three platform jobs, merge, then create the version tag.
