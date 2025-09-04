# Bobby - AI Text Analysis Chrome Extension

## What it is

Bobby is a Chrome extension that provides instant AI-powered text analysis. Highlight any text on a webpage or PDF to get explanations, summaries, key points, and fact-checking powered by Claude 3.5 Sonnet, OpenAI GPT, and Exa search.

## Quick start

```bash
# Clone the repository
git clone https://github.com/yourusername/bobby-extension.git
cd bobby-extension

# Copy config template
cp config.example.js config.js

# Add your API keys to config.js:
# - ANTHROPIC_API_KEY (recommended) or OPENAI_API_KEY
# - EXA_API_KEY for fact-checking
# - Optional: PERPLEXITY_API_KEY

# Load extension in Chrome:
1. Open chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the extension directory
5. For PDFs: Enable "Allow access to file URLs"
```

## Features

- **Explain** - Get clear explanations of complex text
- **Summarize** - Quick summaries of long content
- **Key Points** - Extract main ideas
- **Simplify** - Make text easier to understand
- **Pros & Cons** - Analyze advantages and disadvantages
- **Fact Check** - Verify claims with web sources via Exa
- **Follow-up** - Ask questions about the selected text
- **History** - Track your analysis sessions

## Configuration

Edit `config.js` to customize:

- **API Provider**: Set `USE_ANTHROPIC: true` for Claude (recommended for rate limits)
- **UI Settings**: Theme, popup width, animation speed
- **Feature Flags**: Enable glassmorphism UI, particle effects, context-aware buttons
- **Max text length**: Default 5000 characters

## Usage

1. Select any text on a webpage or PDF
2. Bobby popup appears with action buttons
3. Click an action to analyze the text
4. Drag popup to reposition
5. Click star to save to history
6. Use fullscreen mode for longer content

## API Keys

Get your keys from:
- [Anthropic Console](https://console.anthropic.com/) - For Claude
- [OpenAI Platform](https://platform.openai.com/) - For GPT
- [Exa.ai](https://exa.ai) - For fact-checking

## Keyboard Shortcuts

- `Esc` - Close popup
- Click outside popup to dismiss

## Development

The extension uses Manifest V3 and requires no build step. Structure:

- `background.js` - Service worker for API calls
- `content.js` - Content script for UI
- `components/modules/` - Modular functionality
- `styles-v2.css` - Modern glassmorphism styles
- `pages/` - Extension pages (history, options, popup)

## Privacy

- API keys stored locally in `config.js`
- No telemetry or tracking
- History stored in Chrome local storage
- All API calls made from background script

## Troubleshooting

- Check API keys in `config.js`
- View console for errors (F12)
- Check service worker logs in chrome://extensions/
- Ensure "Allow access to file URLs" for PDFs
- Try `USE_ANTHROPIC: false` if rate limited

## License

MIT