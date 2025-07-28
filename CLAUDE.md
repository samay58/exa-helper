# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Bobby** is a Chrome Extension (Manifest V3) that provides AI-powered text analysis through a modern interface. Users highlight text on any webpage or PDF to get instant insights using Anthropic Claude, OpenAI, Exa, and Perplexity APIs.

## Development Setup & Commands

### Initial Setup
1. Copy `config.example.js` to `config.js`
2. Add API keys to `config.js`:
   - `ANTHROPIC_API_KEY` - Primary AI provider (Claude 3.5 Sonnet)
   - `OPENAI_API_KEY` - Fallback AI provider
   - `EXA_API_KEY` - Required for fact-checking feature
   - `PERPLEXITY_API_KEY` - Optional for enhanced research
3. Set `USE_ANTHROPIC: true` to use Claude (recommended to avoid rate limits)

### Loading the Extension
```bash
# No build step required - Chrome loads JS files directly
# In Chrome:
1. Navigate to chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the /Users/samaydhawan/exa-helper directory
```

### Debugging & Testing
- Open Chrome DevTools on any page to see console logs
- Check for errors in chrome://extensions/ page
- Test text selection on different sites (especially PDFs)
- Verify API calls in Network tab of DevTools
- **Important**: Check background script console for API errors (right-click extension → Inspect views: service worker)

### Common Console Commands
```javascript
// Check current config
console.log(window.BOBBY_CONFIG);

// Check module loading
console.log(window.buttonManager);
console.log(window.dragManager);

// Trigger popup manually
window.showPopup();

// Check selected text
console.log(window.selectedText);
```

## Architecture & Module System

### Module Loading Flow
1. **manifest.json** loads all scripts in order as content scripts
2. **config.js** sets `window.BOBBY_CONFIG` with API keys and feature flags
3. **Module files** (PromptManager, APIClient, etc.) attach to `window`
4. **ModuleLoader.js** verifies all modules are available
5. **content.js** initializes UI and event handlers

### Key Architectural Decisions

**Module Pattern**: Each module is a class that attaches to `window`:
```javascript
class ModuleName {
  // implementation
}
window.ModuleName = ModuleName;
```

**State Management**: Global variables in content.js manage state:
- `buttonManager` - UI button creation and management
- `dragManager` - Popup dragging functionality
- `selectedText` - Currently highlighted text
- `popupWindow` - Active popup DOM element

**API Communication Flow**:
1. Content script captures user action
2. Sends message to background.js via `chrome.runtime.sendMessage`
3. Background script makes API call (avoids CORS)
4. Returns response to content script
5. Content script updates UI

**Anthropic API Integration**:
- Uses `x-api-key` header instead of Authorization
- Requires `anthropic-dangerous-direct-browser-access: true` header
- Supports proper system/user message separation
- Model: `claude-3-5-sonnet-20240620`

### Feature Flags
Located in `config.js` under `FEATURE_FLAGS`:
- `USE_GLASSMORPHISM` - Must be `true` for V2 styles to load
- `USE_CONTEXT_AWARE` - Enables smart button selection
- `USE_PARTICLE_EFFECTS` - Visual effects on interactions
- `USE_LEGACY_UI` - Should be `false` for modern UI

## CSS Architecture

### Two Style Systems
1. **styles.css** - Legacy/fallback styles
2. **styles-v2.css** - Modern glassmorphism styles (requires USE_GLASSMORPHISM: true)

### CSS Loading Logic
```javascript
// In content.js
if (window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM) {
  const v2Styles = document.createElement('link');
  v2Styles.href = chrome.runtime.getURL('styles-v2.css');
  document.head.appendChild(v2Styles);
}
```

### Button Layout Classes
- `.bobby-primary-actions` - Horizontal button group container
- `.bobby-secondary-actions` - Icon-only button container
- `.bobby-prompt-btn` - Individual button styling

## Critical Implementation Notes

### ButtonManager Initialization
The `buttonManager` variable must be initialized before showing popup. Current workaround in content.js:
```javascript
if (!buttonManager || buttonManager.isCorrupted) {
  buttonManager = new window.ButtonManager();
}
```

### API Provider Selection
The extension supports both Anthropic Claude and OpenAI:
- Set `USE_ANTHROPIC: true` in config.js to use Claude (recommended)
- Claude 3.5 Sonnet avoids rate limits that occur with OpenAI
- Automatic fallback to OpenAI if Anthropic key not configured
- API key validation on startup

### Content Script Context
Scripts run in isolated world, separate from page JavaScript. Use `window` object for inter-module communication.

### API Key Security
Keys are stored in `config.js` (gitignored). Background script loads config dynamically to access keys.

## Current Issues & Solutions

### Excessive Blur (Session 11) - RESOLVED ✅
**Problem**: Interface was unreadable with 40px blur values
**Solution**: Reduced all blur values to 4px max, removed blur from content areas
- Main popup: 4px blur
- Content areas: no blur
- Buttons: 2px blur
- Maintained glassmorphism with restraint

### Fact-Check JSON Parsing (Session 11) - RESOLVED ✅
**Problem**: "Failed to parse evaluation response" errors
**Solution**: Improved JSON extraction and error handling
- Updated prompts to explicitly request "ONLY JSON"
- Added extractJSON() method to handle mixed content
- Implemented fallback parsing methods
- Better error messages instead of failures

### Anthropic Integration (Session 9) - RESOLVED ✅
**Solution**: Successfully switched to Anthropic Claude 3.5 Sonnet
- No more rate limit errors
- Added proper CORS headers for browser access
- Implemented API key validation
- Optimized prompts for concise outputs

### Button Layout Issues (Session 8) - RESOLVED ✅
**Problem**: Buttons display incorrectly when styles don't load properly
**Solution**: Ensure `USE_GLASSMORPHISM: true` in config.js
**Fixed**: Added button styles to both CSS files for compatibility

## Testing Checklist

When making changes, test:
1. Text selection on regular websites
2. Text selection on PDFs
3. Button layout in light/dark modes
4. Popup dragging near screen edges
5. API responses for all modes
6. Error handling for rate limits
7. Console for any errors

## Blur Management Guidelines (Session 11)

**IMPORTANT**: Keep blur values minimal for readability
- Maximum blur should be 4-6px for main elements
- Content areas should have NO blur (`backdrop-filter: none`)
- Button areas can handle light blur (2px max)
- Multiple blur layers compound quickly and create unusable interfaces

**Current blur values in styles-v2.css:**
- `--liquid-blur-heavy`: 6px (for backgrounds only)
- `--liquid-blur-medium`: 4px (main popup)
- `--liquid-blur-soft`: 2px (buttons, UI elements)
- `--liquid-blur-subtle`: 1px (minimal effects)

## JSON Parsing in AI Responses (Session 11)

**Problem**: AI responses often include explanatory text around JSON, causing parsing failures

**Solution**: Implemented in `HallucinationDetector.js`:
1. **Explicit Prompts**: Always request "Return ONLY the JSON array" with examples
2. **extractJSON() Method**: Uses regex to find JSON within mixed content
3. **Validation**: Check structure before using parsed data
4. **Fallbacks**: extractAssessment() for non-JSON responses

**Key Pattern**:
```javascript
// Extract JSON from mixed content
const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
if (arrayMatch) return arrayMatch[0];
```

## Important File References

- **background.js:169-282** - Anthropic/OpenAI API request handling
- **background.js:614-760** - API key validation functions
- **background.js:625-651** - extractClaims prompt (complete sentences required)
- **content.js:293-315** - Popup creation and initialization
- **content.js:832-889** - Fact-check results display with error handling
- **content.js:710-737** - Skeleton loader implementation
- **styles-v2.css:24-28** - Reduced blur value definitions
- **styles-v2.css:986-1009** - Semi-transparent analysis panels
- **styles-v2.css:2063-2235** - Fact-check hero section styling
- **styles-v2.css:2316-2318, 2442-2444** - Error status styling
- **components/modules/PromptManager.js:15-50** - Optimized AI prompts
- **components/modules/HallucinationDetector.js:338-378** - extractAssessment with error priority
- **components/modules/HallucinationDetector.js:261-311** - Improved claim parsing

## UI Performance Guidelines (Session 12)

**Blur Management**:
- Maximum blur: 3px for backgrounds, 1-2px for UI elements
- Content areas: NO blur for readability
- Multiple blur layers compound - avoid stacking

**Panel Transparency**:
- Light mode: rgba(255,255,255,0.25) for integration
- Dark mode: rgba(30,36,48,0.35) for consistency
- Avoid opaque backgrounds that break visual flow

**Error Handling**:
- Always check for error indicators first in parsing
- Display clear, actionable error messages
- Exclude errors from reliability calculations
- Use distinct visual styling (red #dc2626)

## Session Logs Reference

See `logs.md` for detailed session history:
- Session 12: UI polish, blur reduction, fact-check error handling
- Session 11: Excessive blur fixes, fact-check JSON parsing
- Session 9: Anthropic API integration & prompt optimization
- Session 8: Button layout fixes & rate limit issues
- Session 7: Visual Polish V2 implementation
- Earlier sessions: Core functionality implementation