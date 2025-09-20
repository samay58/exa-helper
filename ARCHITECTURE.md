# Bobby Extension Architecture

This document maps the extension lifecycle, data flow, and storage so contributors can navigate the codebase quickly.

## Lifecycle
- `manifest.json` (MV3):
  - Background service worker: `background.js` (API calls, context menus, message hub).
  - Content scripts: `config.js` → core modules → `ModuleLoader.js` → `content.js`.
  - Pages: `pages/options.html/js`, `pages/popup.html/js`, `pages/history.html/js`.

## Messaging
Actions are centralized in `components/modules/MessageTypes.js` and wrapped by `components/modules/BackgroundClient.js`.
- `analyzeText` → LLM provider (Anthropic/OpenAI) with caching.
- `exaSearch` / `exaAnswer` → Exa search and synthesis.
- `factCheck` → Exa search + LLM evaluation pipeline.
- `saveApiKeys` / `getConfig` / `validateApiKey` → configuration.

## Modules
- `PromptManager`: prompt templates and mode generation.
- `APIClient`: client-side API abstraction (used by legacy flows and pages).
- `UIComponents`, `ButtonManager`, `DragManager`: UI and interaction.
- `HistoryManager`: reads/writes `chrome.storage.local` under `bobby_history`.
- `HallucinationDetector`: orchestrates fact-check flow via background messaging.
- `ModuleLoader`: verifies required modules, injects optional modules based on feature flags, emits `bobby-modules-ready`.
- `BackgroundClient`: Promise wrapper for runtime messaging.
- `MessageTypes`: action constants.
- `ConfigService`: safe content-side accessors for `BOBBY_CONFIG`.

## Storage
- History key: `bobby_history` (array of entries with fields: `id`, `timestamp`, `text`, `response`, `mode`, `metadata`, `followUps`).
- Cache: background stores `cache_<key>` in `chrome.storage.local` (TTL from `CONFIG.CACHE_DURATION`).
- UI state: popup size in `chrome.storage.local` (`bobbyPopupSize`), position saved by `DragManager` in `localStorage` per-host.

## Security Notes
- `config.js` is no longer under `web_accessible_resources` to avoid web page fetches. Content scripts still load it as part of `content_scripts`.
- Secrets are only used by the background network calls; content uses messaging to background.

## Adding a Module
1. Place file in `components/modules/`.
2. Add to `manifest.json` `content_scripts.js` list (after `config.js`).
3. If required at startup, add the name to `ModuleLoader.js` `requiredModules`.
4. If optional, use `ModuleLoader.loadOptionalModules()` based on a feature flag.

## Message Flow Examples
Selection → Popup → Analyze:
1. User selects text; `content.js` shows FAB/popup.
2. User clicks a mode; `PromptManager` generates messages.
3. `content.js` sends `analyzeText` to background.
4. Background calls Anthropic/OpenAI, caches, and returns `{ success, result }`.
5. `HistoryManager` saves the entry under `bobby_history`.

Fact-check:
1. `HallucinationDetector.extractClaims()` → background `analyzeText` (JSON-only prompt).
2. For each claim: `exaSearch` to gather sources → `analyzeText` for JSON evaluation.
3. Aggregated results rendered; history saved.

