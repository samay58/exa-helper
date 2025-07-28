// Bobby Chrome Extension - Options Page Script

// Load saved settings on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  
  // Setup event listeners
  document.getElementById('settings-form').addEventListener('submit', saveSettings);
  document.getElementById('reset-btn').addEventListener('click', resetSettings);
  
  // Show/hide API key on click
  document.querySelectorAll('input[type="password"]').forEach(input => {
    input.addEventListener('click', function() {
      if (this.type === 'password' && this.value) {
        this.type = 'text';
        setTimeout(() => {
          this.type = 'password';
        }, 2000);
      }
    });
  });
});

// Load settings from storage
async function loadSettings() {
  try {
    const settings = await chrome.storage.local.get([
      'apiConfig',
      'theme',
      'maxTextLength',
      'enableHistory',
      'enableCache'
    ]);
    
    // Load API keys
    if (settings.apiConfig) {
      // Anthropic settings
      document.getElementById('use-anthropic').checked = settings.apiConfig.USE_ANTHROPIC || false;
      document.getElementById('anthropic-key').value = settings.apiConfig.ANTHROPIC_API_KEY || '';
      document.getElementById('anthropic-model').value = settings.apiConfig.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620';
      
      // OpenAI settings
      document.getElementById('openai-key').value = settings.apiConfig.OPENAI_API_KEY || '';
      document.getElementById('openai-model').value = settings.apiConfig.OPENAI_MODEL || 'gpt-4-turbo-preview';
      
      // Other API keys
      document.getElementById('exa-key').value = settings.apiConfig.EXA_API_KEY || '';
      document.getElementById('perplexity-key').value = settings.apiConfig.PERPLEXITY_API_KEY || '';
    }
    
    // Load preferences
    document.getElementById('theme').value = settings.theme || 'auto';
    document.getElementById('max-text').value = settings.maxTextLength || 5000;
    document.getElementById('enable-history').checked = settings.enableHistory !== false;
    document.getElementById('enable-cache').checked = settings.enableCache !== false;
    
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

// Save settings
async function saveSettings(e) {
  e.preventDefault();
  
  try {
    const useAnthropic = document.getElementById('use-anthropic').checked;
    const anthropicKey = document.getElementById('anthropic-key').value.trim();
    const openaiKey = document.getElementById('openai-key').value.trim();
    
    // Validate required fields based on selection
    if (useAnthropic && !anthropicKey) {
      showStatus('Anthropic API key is required when using Claude', 'error');
      return;
    }
    if (!useAnthropic && !openaiKey) {
      showStatus('OpenAI API key is required when not using Claude', 'error');
      return;
    }
    
    // Prepare settings object
    const settings = {
      apiConfig: {
        USE_ANTHROPIC: useAnthropic,
        ANTHROPIC_API_KEY: anthropicKey,
        ANTHROPIC_MODEL: document.getElementById('anthropic-model').value,
        OPENAI_API_KEY: openaiKey,
        OPENAI_MODEL: document.getElementById('openai-model').value,
        EXA_API_KEY: document.getElementById('exa-key').value.trim(),
        PERPLEXITY_API_KEY: document.getElementById('perplexity-key').value.trim()
      },
      theme: document.getElementById('theme').value,
      maxTextLength: parseInt(document.getElementById('max-text').value),
      enableHistory: document.getElementById('enable-history').checked,
      enableCache: document.getElementById('enable-cache').checked
    };
    
    // Save to storage
    await chrome.storage.local.set(settings);
    
    // Notify background script
    await chrome.runtime.sendMessage({
      action: 'saveApiKeys',
      keys: settings.apiConfig
    });
    
    showStatus('Settings saved successfully!', 'success');
    
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', 'error');
  }
}

// Reset settings to defaults
async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults?')) {
    return;
  }
  
  try {
    // Clear storage
    await chrome.storage.local.clear();
    
    // Reset form
    document.getElementById('settings-form').reset();
    document.getElementById('use-anthropic').checked = false;
    document.getElementById('anthropic-model').value = 'claude-3-5-sonnet-20240620';
    document.getElementById('openai-model').value = 'gpt-4-turbo-preview';
    document.getElementById('theme').value = 'auto';
    document.getElementById('max-text').value = '5000';
    document.getElementById('enable-history').checked = true;
    document.getElementById('enable-cache').checked = true;
    
    showStatus('Settings reset to defaults', 'success');
    
  } catch (error) {
    console.error('Error resetting settings:', error);
    showStatus('Error resetting settings', 'error');
  }
}

// Show status message
function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusEl.className = 'status';
  }, 3000);
}