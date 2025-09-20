# Repository Guidelines

## Project Structure & Module Organization
- Manifest V3 Chrome extension (no build step).
- `background.js` — service worker, API calls, context menu.
- `content.js` — selection UI, orchestration; loads optional styles via flags.
- `components/modules/*.js` — self‑contained modules (e.g., `PromptManager.js`, `APIClient.js`).
- `pages/` — extension pages: `options.html/js`, `popup.html/js`, `history.html/js`.
- `assets/` — icons and images; `styles.css`, `styles-v2.css`, `styles-rauno.css`.
- `config.example.js` → copy to `config.js` (secrets); `manifest.json` defines load order.

## Build, Test, and Development Commands
- Setup: `cp config.example.js config.js` then add API keys.
- Load locally: Chrome → `chrome://extensions` → enable Developer mode → Load unpacked → select repo root.
- Reload after edits: click “Reload” on the extension. Use DevTools for `background.js` and page consoles.
- Optional package: `zip -r bobby-extension.zip . -x "*.git*" "config.js" "node_modules/*"`.

## Coding Style & Naming Conventions
- JavaScript (ES2020+), 2‑space indent, semicolons, single quotes.
- Files in `components/modules/` use PascalCase (one class/module per file).
- Functions/methods: camelCase; constants: UPPER_SNAKE_CASE.
- Keep modules small and pure; prefer early returns; avoid global state except via `window.BOBBY_CONFIG` and documented events (e.g., `bobby-modules-ready`).

## Testing Guidelines
- No unit test framework configured; validate manually:
  - Text selection flow, context menu “Analyze with Bobby”.
  - Options page saves and merges config; API key tests/logs.
  - Fact‑check mode requires `EXA_API_KEY`.
  - PDFs: enable “Allow access to file URLs”.
- Debug: `chrome://extensions` → service worker logs; page console for content script.

## Commit & Pull Request Guidelines
- Commits: concise, imperative; optional scope prefix (`repo:`, `ui:`, `docs:`). Example: `ui: refine popup animations`.
- PRs include: summary, rationale, screenshots/GIFs for UI, test plan, linked issue(s).
- Call out changes to `manifest.json` or permissions explicitly.
- Never commit `config.js` or secrets (gitignored). Update README/docs when behavior changes.

## Security & Configuration Tips
- Keep `host_permissions` minimal; add only when required.
- Adding a core module? Include it in `manifest.json` `content_scripts.js` and `requiredModules` in `components/modules/ModuleLoader.js`.
