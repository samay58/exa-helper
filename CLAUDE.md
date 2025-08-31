# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Bobby** is a Chrome Extension (Manifest V3) that provides AI-powered text analysis through a modern interface. Users highlight text on any webpage or PDF to get instant insights using Anthropic Claude, OpenAI, Exa, and Perplexity APIs.

### Current Development Status
The project has recently undergone significant updates:
- New glassmorphism UI system (styles-v2.css, styles-rauno.css)
- **Premium Rauno design system** - Complete redesign from Swiss minimalism to world-class modern UI
- Enhanced module system with GridSystem and RaunoEffects
- Improved error handling and storage management
- Design system documentation (BOBBY_MASTER_BRIEF.md, EXECUTIVE_BRIEF.md, RAUNO_DESIGN_AESTHETIC.md, DESIGN_EVOLUTION.md)

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
4. Select the extension directory
5. For PDF support: Enable "Allow access to file URLs" in extension details
```

### Debugging & Testing
- Open Chrome DevTools on any page to see console logs
- Check for errors in chrome://extensions/ page
- Test text selection on different sites (especially PDFs)
- Verify API calls in Network tab of DevTools
- **Important**: Check background script console for API errors (right-click extension → Inspect views: service worker)

### Manual Testing Checklist
1. Text selection on regular websites
2. Text selection on PDFs
3. Button layout in light/dark modes
4. Popup dragging near screen edges
5. API responses for all prompt modes (Explain, Summarize, Key Points, etc.)
6. Error handling for rate limits and network failures
7. Fact-check feature with Exa integration
8. History tracking and storage management

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

## Blur Management Guidelines

**CRITICAL UPDATE (Session 15)**: All blur has been removed for maximum text clarity
- ALL blur values are now set to 0px to ensure crystal clear text
- Glassmorphism is achieved through transparency and gradients only
- Background opacity increased to 85% (light) and 90% (dark) for better contrast
- Content areas must have NO blur (`backdrop-filter: none`)
- Parent container blur affects ALL child content - avoid at all costs

**Current blur values in styles-v2.css (as of Session 15):**
- `--liquid-blur-heavy`: 0px (no blur)
- `--liquid-blur-medium`: 0px (no blur)
- `--liquid-blur-soft`: 0px (no blur)
- `--liquid-blur-subtle`: 0px (no blur)

**Glassmorphism without blur:**
- Use semi-transparent backgrounds (rgba with 0.85+ opacity)
- Apply gradient overlays for depth
- Keep saturate() effects for color vibrancy
- Use subtle shadows and borders for definition

## JSON Parsing in AI Responses

**Problem**: AI responses often include explanatory text around JSON, causing parsing failures

**Solution**: Implemented in `HallucinationDetector.js`:
1. **Stronger Prompts**: 
   - Start with "RESPOND WITH ONLY JSON:"
   - Provide explicit format examples
   - Use temperature 0.1 for consistency
2. **Enhanced extractJSON() Method**: 
   - Detects and strips text before colons (e.g., "Here is my evaluation:")
   - Multiple regex patterns for nested objects and arrays
   - Handles multiline JSON extraction
   - Removes common phrases like "evaluation", "JSON format"
3. **Retry Logic**: Up to 3 attempts for claim extraction
4. **Robust Fallbacks**: 
   - extractEvaluationFromText() with 15+ pattern checks
   - Defaults to 'unverifiable' instead of 'error'
   - Extracts JSON fields from within text
   - Smart error detection only for explicit failures

**Key Pattern**:
```javascript
// Extract JSON from mixed content
const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
if (arrayMatch) return arrayMatch[0];
```

## Storage Management

**Problem**: Chrome storage quota exceeded errors interrupting functionality

**Solution**: Implemented in `HistoryManager.js`:
1. **Automatic Cleanup**:
   - Keeps only last 50 history entries
   - Removes 20 oldest when quota exceeded
   - Clears cache if storage > 5MB
2. **Proactive Management**:
   - Cleanup on init if > 70 entries
   - Non-blocking save operations
3. **Graceful Degradation**:
   - Core features work without history
   - Silent logging for non-critical errors

## Important File References

- **background.js:169-282** - Anthropic/OpenAI API request handling
- **background.js:232** - Temperature settings (0.1 for factcheck/extractClaims)
- **background.js:625-643** - extractClaims prompt (JSON-only format)
- **content.js:688-699** - Non-blocking history saves
- **content.js:813-825** - Fact-check history error handling
- **content.js:838-840** - Storage quota error suppression
- **styles-v2.css:2709-2823** - Improved loading/error states
- **styles-v2.css:43-46** - Blur variables (all set to 0px as of Session 15)
- **styles-v2.css:28-29, 106-107** - Background opacity settings (0.85/0.9)
- **components/modules/HallucinationDetector.js:15-93** - Claim extraction with retries
- **components/modules/HallucinationDetector.js:175-203** - Strengthened evaluation prompt
- **components/modules/HallucinationDetector.js:518-592** - Enhanced JSON extraction with colon handling
- **components/modules/HallucinationDetector.js:597-651** - Improved fallback parsing with 15+ patterns
- **components/modules/HistoryManager.js:245-303** - Storage cleanup implementation

## Design System Constraints

### Rauno-Inspired Aesthetic Implementation
The extension follows design principles from RAUNO_DESIGN_AESTHETIC.md:
- **Grid System**: Uses GridSystem.js with visible alignment guides
- **Motion**: Choreographed sequences under 200ms for performance
- **Depth**: Achieved through layering and transparency, NOT blur on text
- **Typography**: System font stack with consistent baseline alignment
- **Color**: Minimal palette with single accent color for contrast

### New Glassmorphism & Effects
When `USE_GLASSMORPHISM: true` in config:
- styles-v2.css loads with modern glass effects
- RaunoEffects.js provides sophisticated animations
- GridSystem.js manages spatial layout
- ParticleEffects.js adds visual polish (if enabled)

## Design System Evolution (Latest Session)

### Rauno System Transformation
The Rauno design system underwent a complete redesign from blocky/childish appearance to premium modern interface:

**Key Improvements:**
- **Design Tokens**: 11+ gray shades, full accent palette, refined spacing (16 increments)
- **Typography**: Perfect fourth scale (1.333 ratio) for dramatic hierarchy
- **Components**: Floating cards, glass-morphic buttons, segmented controls
- **Animations**: 7 easing curves, staggered entrances, micro-interactions
- **Dark Mode**: RGBA-based colors, 6-16% opacity borders for subtle depth

**Design Principles Applied:**
- Layer shadows for realistic depth (multi-layer system)
- Subtle grain textures for premium feel
- Gradient overlays for depth without blur
- Sub-200ms animations for snappy interactions
- Custom scrollbars and selection colors

**Files Modified:**
- `styles-rauno.css` - Complete overhaul with modern design system
- `config.js` - Enable RAUNO_MODE for testing

## Known Issues & Solutions

### Module Loading Race Conditions
The extension uses sequential script loading which can cause race conditions. Always check module availability:
```javascript
if (!window.ButtonManager) {
  console.error('ButtonManager not loaded');
  return;
}
```

### Chrome Storage Quota
HistoryManager.js automatically manages storage:
- Keeps only last 50 entries
- Cleans up when quota exceeded
- Non-blocking saves to prevent UI freezes

### API Response JSON Parsing
HallucinationDetector handles malformed JSON from AI:
- Strips explanatory text before JSON
- Multiple extraction patterns
- Fallback parsing with 15+ regex patterns
- Temperature 0.1 for consistency

## Architecture Documentation

### Key Design Documents
1. **BOBBY_MASTER_BRIEF.md** - Comprehensive rebuild strategy with learnings from 15+ dev sessions
2. **EXECUTIVE_BRIEF.md** - Detailed current architecture analysis and problems
3. **RAUNO_DESIGN_AESTHETIC.md** - Design system inspired by Rauno Freiberg's work
4. **CLAUDE_COLD_START_PROMPT.md** - Context for Claude when starting fresh sessions

### Recommended Reading Order
For major refactoring or architectural changes:
1. Read EXECUTIVE_BRIEF.md for current state analysis
2. Review BOBBY_MASTER_BRIEF.md for lessons learned
3. Check DESIGN_EVOLUTION.md for design system transformation process
4. Check RAUNO_DESIGN_AESTHETIC.md for evolved design principles
5. Reference this CLAUDE.md for practical development
6. Review SESSION_LOG.md for recent session progress