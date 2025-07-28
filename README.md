# Bobby - AI Text Assistant Chrome Extension

Bobby is a beautiful Chrome extension that provides instant AI-powered insights for any text you highlight on the web. With a modern, draggable interface inspired by leading design systems, Bobby transforms how you read and understand content online.

## ✨ Features

- **Instant Analysis**: Highlight any text and get immediate AI-powered insights
- **Dual AI Support**: Works with both Anthropic Claude 3.5 Sonnet and OpenAI GPT models
- **Multiple Analysis Modes**:
  - 💡 **Explain**: Clear explanations of complex concepts
  - 📝 **Summarize**: Concise summaries of content
  - 🔑 **Key Points**: Extract main ideas
  - 👶 **ELI5**: Explain Like I'm 5
  - 🔧 **Technical**: In-depth technical analysis
  - 📚 **Examples**: Relevant examples and use cases
  - ⚖️ **Pros & Cons**: Balanced analysis
  - ✓ **Fact Check**: Verify claims with sources

- **Beautiful UI**:
  - Modern design inspired by Antinote, Warp, ChatGPT, and Claude.ai
  - Draggable and resizable popup window
  - Smooth animations and micro-interactions
  - Full dark mode support
  - Translucent backgrounds with blur effects

- **Smart Features**:
  - Response caching to save API costs
  - History tracking
  - PDF support
  - Keyboard shortcuts
  - Cross-site compatibility

## 🚀 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/bobby-extension.git
   cd bobby-extension
   ```

2. **Set up API keys**:
   - Copy `config.example.js` to `config.js`
   - Add your API keys:
     - [Anthropic API Key](https://console.anthropic.com/) (recommended - Claude 3.5 Sonnet)
     - [OpenAI API Key](https://platform.openai.com/api-keys) (fallback option)
     - [Exa API Key](https://exa.ai) (optional, for fact-checking)
     - [Perplexity API Key](https://perplexity.ai) (optional, for research)
   - Set `USE_ANTHROPIC: true` to use Claude (avoids rate limits)

3. **Load the extension in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the extension directory

4. **Enable PDF support** (optional):
   - In Chrome extensions settings, enable "Allow access to file URLs" for Bobby

## 📖 How to Use

1. **Highlight any text** on a webpage or PDF
2. **Click the Bobby button** (✨) that appears near your selection
3. **Choose an analysis mode** from the prompt bar
4. **Read the AI-generated insights** in the beautiful popup window
5. **Drag to reposition** or resize the window as needed
6. **Use follow-up questions** for deeper understanding

## ⌨️ Keyboard Shortcuts

- `Alt + B` - Analyze selected text
- `Esc` - Close Bobby popup
- `Tab` - Navigate between modes
- `Enter` - Confirm selection

## 🛠️ Configuration

Access Bobby's settings by:
1. Clicking the Bobby extension icon
2. Selecting "Configure API Keys"

Settings include:
- API key management
- Theme preferences (Light/Dark/Auto)
- Maximum text length
- History tracking toggle
- Response caching options

## 🏗️ Architecture

Bobby is built with a modular architecture:

```
bobby-extension/
├── manifest.json          # Chrome extension manifest
├── background.js          # Service worker for API requests
├── content.js            # UI injection and interactions
├── styles.css            # Modern design system
├── components/modules/   # Reusable modules
│   ├── PromptManager.js  # Prompt templates
│   ├── APIClient.js      # API communications
│   └── UIComponents.js   # UI elements
└── pages/               # Extension pages
    ├── popup.html       # Extension popup
    └── options.html     # Settings page
```

## 🎨 Design System

Bobby's UI is inspired by:
- **Antinote**: Minimal, warm aesthetics
- **Warp Terminal**: Modern, translucent interfaces
- **ChatGPT**: Clean, friendly interactions
- **Claude.ai**: Frosted glass effects
- **Spark Email**: Vibrant accent colors

Color palette:
- Warm gradient: `#FF9472 → #F2709C`
- Dark mode: Deep purples and charcoal
- Translucent backgrounds with backdrop blur

## 🔒 Privacy & Security

- API keys are stored locally in your browser
- No data is sent to external servers except API providers
- No tracking or analytics
- All communications over HTTPS

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- OpenAI for GPT API
- Exa for fact-checking capabilities
- The design teams behind our UI inspirations

---

Made with ❤️ for better web reading