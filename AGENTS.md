# Codex Project Instructions

Read `PROJECT_STATUS.md` before making changes. It is the canonical technical handoff and current-state ledger. Read `README.md` for user-facing behavior and setup.

## Working rules

- Canonical writable repository: `calebweixun/OBS-Timer` (`mine` remote). `origin` is upstream and is not the publication target.
- Default branch is `master`. Create a focused `codex/<description>` branch for changes.
- Preserve unrelated user work and inspect `git status` before staging.
- Stage explicit files; never default to `git add -A` in a mixed worktree.
- Validate JavaScript with `node --check` where applicable and run the relevant Electron Builder command.
- Changes to build/release behavior must be verified in GitHub Actions on macOS, Windows, and Linux.
- Runtime settings belong in Electron `userData`, never packaged resources.
- The server intentionally binds to `0.0.0.0`; call out the unauthenticated trusted-LAN constraint when changing networking.
- Update `PROJECT_STATUS.md` when architecture, release state, known limitations, or completed behavior changes.

## Useful commands

```bash
npm ci
npm run electron
npm run build:mac -- --dir --publish never
node --check electron/main.js
node --check electron/preload.js
node --check server.js
```
