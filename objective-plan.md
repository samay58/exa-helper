# Bobby Chrome Extension - Project Objectives & Architecture

## 🎯 Core Objective

Build a Chrome extension that provides instant AI-powered insights for any highlighted text on webpages or PDFs, featuring a beautiful, modern interface inspired by leading design systems.

## 🏛️ Immutable Architecture Principles

### 1. **Modular Design**
- Separate concerns into distinct modules
- Each module has a single responsibility
- Easy to maintain, test, and extend

### 2. **API Integration**
- **OpenAI GPT**: Primary content analysis engine
- **Exa**: Fact-checking and source verification
- **Perplexity**: Additional research capabilities

### 3. **User Experience First**
- Instant response to text selection
- Non-intrusive floating action button
- Draggable, resizable popup window
- Works seamlessly on both webpages and PDFs

### 4. **Design System**
- Modern, warm color palette
- Translucent backgrounds with blur effects
- Smooth animations and micro-interactions
- Full dark mode support
- Geist font for clean typography

## 📦 Core Components

### Background Service Worker (`background.js`)
- Handles all API communications
- Manages authentication
- Processes requests from content scripts
- Implements response caching

### Content Script (`content.js`)
- Monitors text selection
- Injects UI elements
- Manages user interactions
- Handles popup lifecycle

### Module System (`components/modules/`)
- **PromptManager**: Template management for different analysis modes
- **APIClient**: Centralized API communication with caching
- **ButtonManager**: Dynamic button creation and management
- **UIComponents**: Reusable UI elements library
- **HistoryManager**: Local storage of user interactions
- **DragManager**: Draggable and resizable functionality

## 🎨 Analysis Modes

1. **Explain** (💡) - Clear explanation of complex concepts
2. **Summarize** (📝) - Concise summary of content
3. **Key Points** (🔑) - Extract main ideas
4. **ELI5** (👶) - Explain Like I'm 5
5. **Technical** (🔧) - In-depth technical analysis
6. **Examples** (📚) - Provide relevant examples
7. **Pros & Cons** (⚖️) - Balanced analysis
8. **Fact Check** (✓) - Verify claims with sources

## 🔒 Security & Privacy

- API keys stored locally in user's browser
- No data sent to external servers except API providers
- All communications over HTTPS
- No tracking or analytics

## 📐 Technical Constraints

- Chrome Extension Manifest V3
- Maximum popup width: 480px (resizable to 800px)
- Minimum popup width: 300px
- Support for Chrome PDF viewer and PDF.js
- Response caching for efficiency

## 🚀 Success Metrics

1. **Instant Response**: < 100ms to show FAB after text selection
2. **Fast Analysis**: < 3s for API response
3. **Smooth Animations**: 60fps for all interactions
4. **Cross-Site Compatibility**: Works on 99% of websites
5. **PDF Support**: Full functionality in PDF contexts

---

*This document represents the immutable core architecture and objectives of the Bobby Chrome Extension project. Any changes to these principles require careful consideration and should be documented in logs.md.*

## 🚀 Next Phase Planning

### Phase 1: Testing & Stabilization ✅
- Fixed icon loading errors
- Resolved CORS issues  
- Enhanced fact-check UI
- Fixed initialization bugs
- Ready for user testing with API keys

### Phase 2: Enhanced Features (Planned)
1. **Voice Input**
   - Add microphone button for voice questions
   - Integrate speech-to-text API
   
2. **Export Capabilities**
   - Export analysis as PDF
   - Copy formatted markdown
   - Share via email
   
3. **Custom Prompts**
   - User-defined prompt templates
   - Save favorite prompts
   - Quick access menu

4. **Multi-language Support**
   - Detect content language
   - Translate responses
   - Localized UI

5. **Performance Optimizations**
   - Lazy loading for modules
   - Improved caching strategy
   - Reduced memory footprint

### Phase 3: Enterprise Features (Future)
- Team sharing and collaboration
- API usage analytics
- Custom branding options
- SSO integration