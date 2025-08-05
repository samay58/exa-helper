# Bobby Chrome Extension - Changelog

## [1.0.3] - 2025-08-05

### 🐛 Critical Bug Fixes

#### Complete Blur Removal
- **Fixed extreme text blur**: All text is now crystal clear and readable
  - Set all blur CSS variables to 0px
  - Removed backdrop-filter from main popup container
  - Replaced all blur effects with none throughout the interface
  - Increased background opacity for better contrast (85% light, 90% dark)

### 🚀 Improvements

- **Maintained glassmorphism**: Achieved through transparency and gradients only
- **Better readability**: No blur affecting child content
- **Preserved animations**: All liquid glass effects still work
- **Enhanced contrast**: Higher opacity backgrounds improve text visibility

### 📝 Technical Details

- Total blur instances removed: 30+
- Background opacity: 0.4 → 0.85 (light mode), 0.35 → 0.9 (dark mode)
- All `backdrop-filter: blur(...)` replaced with `backdrop-filter: none`
- Kept `saturate()` effects for color vibrancy

---

## [1.0.2] - 2025-07-30 (Afternoon)

### 🐛 Bug Fixes

#### Fact-Check Display
- **Fixed ERROR status for successful evaluations**: Claims now display correct status
  - Enhanced JSON extraction to handle prefixed responses
  - Improved fallback logic to avoid false errors
  - Added colon detection for "Here is my evaluation:" style responses

### 🚀 Improvements

- **Better error recovery**: Defaults to 'unverifiable' instead of 'error'
- **Enhanced debugging**: Added console logging throughout fact-check pipeline
- **Smarter text parsing**: Detects assessment in 15+ different phrase patterns

---

## [1.0.1] - 2025-07-30 (Morning)

### 🐛 Bug Fixes

#### Fact-Check Module
- **Fixed JSON parsing failures**: AI responses now reliably return JSON format
  - Strengthened prompts with "RESPOND WITH ONLY JSON:" directive
  - Reduced temperature to 0.1 for consistent formatting
  - Added retry logic (up to 3 attempts) for claim extraction
  - Implemented robust fallback parsing for non-JSON responses

#### Storage Management
- **Resolved quota exceeded errors**: Extension now handles storage limits gracefully
  - Automatic cleanup keeps only last 50 history entries
  - Proactive cleanup when history exceeds 70 entries
  - Cache clearing when total storage exceeds 5MB
  - Non-blocking save operations ensure core functionality continues

### 🚀 Improvements

- **Better error handling**: User-friendly messages replace technical errors
- **Enhanced loading states**: Visual feedback during fact-check processing
- **Improved reliability**: Fact-check works even when auxiliary features fail
- **Performance**: Added 500ms delay between claim verifications to prevent rate limits

### 📝 Technical Details

- Storage limits: 50 history entries (cleanup at 70)
- Factcheck temperature: 0.1 (previously 0.7)
- Claim extraction: 3 retry attempts with fallback
- JSON extraction: Multiple regex patterns for robustness

---

## [1.0.0] - 2025-07-28

### ✨ Initial Release

- AI-powered text analysis with multiple modes
- Fact-checking with Exa integration
- Beautiful glassmorphism UI design
- Support for Anthropic Claude and OpenAI
- History tracking and caching
- Dark/light mode support
- PDF compatibility