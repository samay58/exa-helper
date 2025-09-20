// Bobby Chrome Extension Configuration Template
// IMPORTANT: Copy this file to config.js and add your API keys
// WARNING: Never commit config.js with real API keys to version control!
//
// Instructions:
// 1. Copy this file: cp config.example.js config.js
// 2. Choose your AI provider:
//    - For Anthropic (recommended): Get API key from https://console.anthropic.com/account/keys
//    - For OpenAI (fallback): Get API key from https://platform.openai.com/api-keys
// 3. Get your Exa API key from: https://exa.ai
// 4. Replace the placeholder values below with your actual keys
// 5. Set USE_ANTHROPIC to true for Claude or false for OpenAI
// 6. Reload the extension in Chrome

const CONFIG = {
  // Anthropic API Configuration (Recommended - Higher rate limits)
  // Get your API key from: https://console.anthropic.com/account/keys
  ANTHROPIC_API_KEY: 'sk-ant-api03-YOUR-ANTHROPIC-API-KEY-HERE', // Must start with 'sk-ant-'
  ANTHROPIC_MODEL: 'claude-3-5-sonnet-20240620', // Options: 'claude-3-5-sonnet-20240620', 'claude-3-opus-20240229'
  USE_ANTHROPIC: true, // Set to true to use Anthropic instead of OpenAI
  
  // OpenAI API Configuration (Fallback option)
  // Get your API key from: https://platform.openai.com/api-keys
  OPENAI_API_KEY: 'sk-YOUR-OPENAI-API-KEY-HERE', // Must start with 'sk-'
  OPENAI_MODEL: 'gpt-4-turbo-preview', // Options: 'gpt-4-turbo-preview', 'gpt-3.5-turbo'
  // Note: Fact-checking automatically uses gpt-3.5-turbo to reduce costs and rate limits
  
  // Exa API Configuration (for fact-checking and web search)
  // Get your API key from: https://exa.ai
  EXA_API_KEY: 'YOUR_EXA_API_KEY_HERE',
  
  // Perplexity API Configuration (optional)
  // Get your API key from: https://www.perplexity.ai/settings/api
  PERPLEXITY_API_KEY: '', // Leave empty if not using
  
  // Extension Settings
  MAX_TEXT_LENGTH: 5000, // Maximum characters to analyze
  CACHE_DURATION: 3600000, // Cache responses for 1 hour (in milliseconds)
  
  // UI Settings
  DEFAULT_THEME: 'auto', // 'light', 'dark', or 'auto'
  POPUP_WIDTH: 480, // Default popup width in pixels
  ANIMATION_SPEED: 200, // Animation duration in milliseconds
  
  // Feature Flags
  ENABLE_HISTORY: true,          // Enable conversation history
  ENABLE_FACT_CHECK: true,       // Enable fact-checking with Exa
  ENABLE_FOLLOW_UP: true,        // Enable follow-up questions
  MAX_HISTORY_ITEMS: 100,        // Maximum history entries to store

  // Visual Upgrade Feature Flags (set to true to enable new features)
  FEATURE_FLAGS: {
    // Performance-first minimal mode: disables non-essential effects and animations
    MINIMAL_MODE: true,         // Enable lighter UI/logic for better performance
    USE_CONTEXT_AWARE: false,     // Enable context-aware action buttons
    USE_GLASSMORPHISM: false,     // Enable glassmorphism visual effects
    USE_PARTICLE_EFFECTS: false,  // Enable particle animations on hover
    USE_SPRING_ANIMATIONS: false, // Enable spring physics animations
    USE_LEGACY_UI: true,          // Use original UI (disable for v2)
    USE_ADAPTIVE_THEME: false,    // Enable page-adaptive theming
    USE_WEB_SEARCH: true,         // Use Anthropic Web Search tool for primary modes
    USE_HAPTIC_FEEDBACK: false,   // Enable haptic feedback on mobile
    USE_COMMAND_PALETTE: false,   // Disable Cmd/Ctrl+K command palette by default
    USE_MASCOT: true              // Show Bobby mascot in header + loader
  },
  
  // Debug Settings
  DEBUG_MODE: false,
  LOG_API_CALLS: false
};

// Make available globally for extension
window.BOBBY_CONFIG = CONFIG;

// Log confirmation (remove in production)
console.log('Bobby: config.js loaded (using example template)');
