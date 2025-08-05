// Bobby Chrome Extension - Background Service Worker
// Handles API requests and message passing between content scripts and APIs

// Import configuration
let CONFIG = null;

// Load configuration
async function loadConfig() {
  try {
    // First try to load from config.js
    const response = await fetch(chrome.runtime.getURL('config.js'));
    const configText = await response.text();
    // Execute config in a safe context
    const fileConfig = new Function(configText + '; return CONFIG;')();
    
    // Then check if there's stored config from options
    const stored = await chrome.storage.local.get('apiConfig');
    
    // Smart merge: use stored config for keys that are set, but preserve file config for others
    if (stored.apiConfig) {
      CONFIG = { ...fileConfig };
      
      // Only override specific keys if they're actually set in storage
      if (stored.apiConfig.OPENAI_API_KEY && 
          stored.apiConfig.OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE' &&
          stored.apiConfig.OPENAI_API_KEY !== '') {
        CONFIG.OPENAI_API_KEY = stored.apiConfig.OPENAI_API_KEY;
      }
      if (stored.apiConfig.OPENAI_MODEL) {
        CONFIG.OPENAI_MODEL = stored.apiConfig.OPENAI_MODEL;
      }
      if (stored.apiConfig.EXA_API_KEY && stored.apiConfig.EXA_API_KEY !== '') {
        CONFIG.EXA_API_KEY = stored.apiConfig.EXA_API_KEY;
      }
      if (stored.apiConfig.PERPLEXITY_API_KEY && stored.apiConfig.PERPLEXITY_API_KEY !== '') {
        CONFIG.PERPLEXITY_API_KEY = stored.apiConfig.PERPLEXITY_API_KEY;
      }
      
      // Handle Anthropic settings from storage if available
      if (stored.apiConfig.ANTHROPIC_API_KEY && 
          stored.apiConfig.ANTHROPIC_API_KEY !== 'sk-ant-api03-YOUR-ANTHROPIC-API-KEY-HERE' &&
          stored.apiConfig.ANTHROPIC_API_KEY !== '') {
        CONFIG.ANTHROPIC_API_KEY = stored.apiConfig.ANTHROPIC_API_KEY;
      }
      if (stored.apiConfig.ANTHROPIC_MODEL) {
        CONFIG.ANTHROPIC_MODEL = stored.apiConfig.ANTHROPIC_MODEL;
      }
      if (stored.apiConfig.USE_ANTHROPIC !== undefined) {
        CONFIG.USE_ANTHROPIC = stored.apiConfig.USE_ANTHROPIC;
      }
      
      console.log('Bobby: Merged config from file and extension options');
    } else {
      CONFIG = fileConfig;
      console.log('Bobby: Using config from config.js only');
    }
    
    console.log('Bobby: Config loaded', {
      hasOpenAI: !!CONFIG.OPENAI_API_KEY && CONFIG.OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE',
      hasAnthropic: !!CONFIG.ANTHROPIC_API_KEY && CONFIG.ANTHROPIC_API_KEY !== 'sk-ant-api03-YOUR-ANTHROPIC-API-KEY-HERE',
      useAnthropic: CONFIG.USE_ANTHROPIC
    });
    
    // Validate API keys on load
    if (CONFIG.USE_ANTHROPIC && CONFIG.ANTHROPIC_API_KEY && 
        CONFIG.ANTHROPIC_API_KEY !== 'sk-ant-api03-YOUR-ANTHROPIC-API-KEY-HERE') {
      const validation = await validateAnthropicKey(CONFIG.ANTHROPIC_API_KEY);
      if (!validation.valid) {
        console.error('Bobby: Anthropic API key validation failed:', validation.error);
      } else {
        console.log('Bobby: Anthropic API key validated successfully', validation.warning || '');
      }
    }
  } catch (error) {
    console.error('Failed to load config:', error);
    // Fallback to stored config if available
    const stored = await chrome.storage.local.get('apiConfig');
    if (stored.apiConfig) {
      CONFIG = stored.apiConfig;
      console.log('Bobby: Using fallback config from storage');
    }
  }
}

// Initialize on installation
chrome.runtime.onInstalled.addListener(async () => {
  await loadConfig();
  console.log('Bobby Extension installed successfully');
  
  // Create context menu item
  chrome.contextMenus.create({
    id: 'bobby-analyze',
    title: 'Analyze with Bobby',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'bobby-analyze' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'analyzeSelection',
      text: info.selectionText
    });
  }
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle async messages properly
  (async () => {
    try {
      // Always reload config to ensure we have the latest API keys
      await loadConfig();
      
      // Handle the message
      await handleMessageAsync(request, sender, sendResponse);
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  // Return true to indicate async response
  return true;
});

// Main message handler (async version)
async function handleMessageAsync(request, sender, sendResponse) {
  switch (request.action) {
    case 'analyzeText':
      await handleAnalyzeText(request, sendResponse);
      break;
      
    case 'factCheck':
      await handleFactCheck(request, sendResponse);
      break;
      
    case 'exaAnswer':
      await handleExaAnswer(request, sendResponse);
      break;
      
    case 'perplexityQuery':
      await handlePerplexityQuery(request, sendResponse);
      break;
      
    case 'exaSearch':
      await handleExaSearch(request, sendResponse);
      break;
      
    case 'saveApiKeys':
      await handleSaveApiKeys(request, sendResponse);
      break;
      
    case 'getConfig':
      sendResponse({ success: true, config: CONFIG });
      break;
      
    case 'validateApiKey':
      await handleValidateApiKey(request, sendResponse);
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
      break;
  }
}

// AI API handler - supports both Anthropic and OpenAI
async function handleAnalyzeText(request, sendResponse) {
  const { text, mode, systemPrompt, userPrompt } = request;
  
  // Check if config is loaded
  if (!CONFIG) {
    await loadConfig();
  }
  
  // Determine which API to use
  const useAnthropic = CONFIG.USE_ANTHROPIC && CONFIG.ANTHROPIC_API_KEY && 
                      CONFIG.ANTHROPIC_API_KEY !== 'sk-ant-api03-YOUR-ANTHROPIC-API-KEY-HERE';
  
  console.log('Bobby: API Selection:', useAnthropic ? 'Using Anthropic Claude 3.5 Sonnet' : 'Using OpenAI (fallback)');
  
  if (useAnthropic) {
    await handleAnthropicRequest(text, mode, systemPrompt, userPrompt, sendResponse);
  } else {
    await handleOpenAIRequest(text, mode, systemPrompt, userPrompt, sendResponse);
  }
}

// Anthropic API handler
async function handleAnthropicRequest(text, mode, systemPrompt, userPrompt, sendResponse) {
  try {
    console.log('Bobby: Using Anthropic API with Claude 3.5 Sonnet');
    console.log('Bobby: API Key present:', !!CONFIG.ANTHROPIC_API_KEY);
    console.log('Bobby: API Key starts with:', CONFIG.ANTHROPIC_API_KEY ? CONFIG.ANTHROPIC_API_KEY.substring(0, 15) + '...' : 'No key');
    
    // Validate API key before making request
    const validation = await validateAnthropicKey(CONFIG.ANTHROPIC_API_KEY);
    if (!validation.valid) {
      throw new Error(`API key validation failed: ${validation.error}`);
    }
    if (validation.warning) {
      console.warn('Bobby: API key warning:', validation.warning);
    }
    
    // Check cache first
    const cacheKey = `anthropic_${text.substring(0, 50)}_${mode}`;
    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      sendResponse({ success: true, result: cached, fromCache: true });
      return;
    }
    
    // Use provided userPrompt or generate based on mode
    const prompt = userPrompt || generatePrompt(text, mode);
    
    // Use custom system prompt if provided, otherwise use default
    const systemMessage = systemPrompt || 'You are Bobby, a helpful AI assistant. Be concise and direct. Avoid lengthy explanations. Get straight to the point.';
    
    // Prepare request body with proper Anthropic message structure
    const requestBody = {
      model: CONFIG.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620',
      system: systemMessage,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: mode === 'eli5' ? 400 : (mode === 'summarize' ? 300 : 600),
      temperature: mode === 'extractClaims' || mode === 'factcheck' ? 0.1 : 0.7
    };
    
    console.log('Bobby: Sending request to Anthropic API');
    console.log('Bobby: Request model:', requestBody.model);
    
    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Bobby: Anthropic API error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        headers: Object.fromEntries([...response.headers.entries()])
      });
      
      if (response.status === 401) {
        throw new Error(`Authentication failed (401). This usually means:\n- Your API key is invalid or revoked\n- Your API key doesn't have the necessary permissions\n- There's an issue with your Anthropic account\n\nPlease verify your API key at https://console.anthropic.com/account/keys`);
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (response.status === 400) {
        const errorMessage = errorData.error?.message || 'Invalid request';
        throw new Error(`Bad request (400): ${errorMessage}`);
      } else {
        throw new Error(`API error (${response.status}): ${errorData.error?.message || response.statusText || 'Unknown error'}`);
      }
    }
    
    const data = await response.json();
    const result = data.content[0].text;
    
    // Cache the response
    await cacheResponse(cacheKey, result);
    
    sendResponse({ success: true, result });
  } catch (error) {
    console.error('Error in handleAnthropicRequest:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// OpenAI API handler (fallback)
async function handleOpenAIRequest(text, mode, systemPrompt, userPrompt, sendResponse) {
  // Validate API key
  if (!CONFIG.OPENAI_API_KEY || CONFIG.OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE' || CONFIG.OPENAI_API_KEY === '') {
    console.error('Bobby: Invalid OpenAI API key in config');
    sendResponse({ 
      success: false, 
      error: 'OpenAI API key not configured. Please add your API key in the extension options or config.js file.' 
    });
    return;
  }
  
  try {
    console.log('Bobby: Making OpenAI API request with key starting with:', CONFIG.OPENAI_API_KEY.substring(0, 10) + '...');
    
    // Check cache first
    const cacheKey = `openai_${text.substring(0, 50)}_${mode}`;
    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      sendResponse({ success: true, result: cached, fromCache: true });
      return;
    }
    
    // Use provided userPrompt or generate based on mode
    const prompt = userPrompt || generatePrompt(text, mode);
    
    // Use custom system prompt if provided, otherwise use default
    const systemMessage = systemPrompt || 'You are Bobby, a helpful AI assistant that provides clear, concise insights about text. Format your responses with proper markdown for readability.';
    
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: mode === 'extractClaims' ? 'gpt-3.5-turbo' : (CONFIG.OPENAI_MODEL || 'gpt-4-turbo-preview'),
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: mode === 'extractClaims' ? 0.3 : 0.7,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Bobby: OpenAI API error:', response.status, errorData);
      
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key in the extension options or config.js file.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (response.status === 400) {
        throw new Error('Invalid request. The API key may be malformed or expired.');
      } else {
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }
    }
    
    const data = await response.json();
    const result = data.choices[0].message.content;
    
    // Cache the response
    await cacheResponse(cacheKey, result);
    
    sendResponse({ success: true, result });
  } catch (error) {
    console.error('Error in handleOpenAIRequest:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Exa API handler for fact-checking
async function handleFactCheck(request, sendResponse) {
  const { text } = request;
  
  try {
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.EXA_API_KEY}`
      },
      body: JSON.stringify({
        query: text,
        num_results: 5,
        use_autoprompt: true,
        type: 'neural',
        contents: {
          text: true
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Exa API error: ${response.status}`);
    }
    
    const data = await response.json();
    sendResponse({ success: true, sources: data.results });
  } catch (error) {
    console.error('Error in handleFactCheck:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Exa Search API handler (for fact-checking)
async function handleExaSearch(request, sendResponse) {
  const { query, num_results = 5 } = request;
  
  try {
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.EXA_API_KEY}`
      },
      body: JSON.stringify({
        query,
        num_results,
        use_autoprompt: true,
        type: 'neural',
        contents: {
          text: true
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Exa API error: ${response.status}`);
    }
    
    const data = await response.json();
    sendResponse({ success: true, results: data.results });
  } catch (error) {
    console.error('Error in handleExaSearch:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle Exa Answer API for follow-up questions
async function handleExaAnswer(request, sendResponse) {
  const { question, context } = request;
  
  try {
    // Use Exa search with context
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.EXA_API_KEY}`
      },
      body: JSON.stringify({
        query: question,
        num_results: 3,
        use_autoprompt: true,
        type: 'neural',
        contents: {
          text: true
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Exa API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Use GPT to synthesize answer from search results
    const answer = await synthesizeAnswer(question, data.results);
    sendResponse({ success: true, answer, sources: data.results });
  } catch (error) {
    console.error('Error in handleExaAnswer:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Synthesize answer from search results using AI
async function synthesizeAnswer(question, sources) {
  const sourcesText = sources.map((s, i) => 
    `[${i + 1}] ${s.title}\n${s.text || s.snippet || ''}\n`
  ).join('\n');

  const useAnthropic = CONFIG.USE_ANTHROPIC && CONFIG.ANTHROPIC_API_KEY && 
                      CONFIG.ANTHROPIC_API_KEY !== 'sk-ant-api03-YOUR-ANTHROPIC-API-KEY-HERE';

  try {
    let response, data, content;
    
    if (useAnthropic) {
      // Use Anthropic API
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CONFIG.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: CONFIG.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620',
          messages: [
            {
              role: 'user',
              content: `You are a helpful assistant that answers questions based on provided sources. Always cite your sources using [1], [2], etc.\n\nBased on these sources, answer the question: "${question}"\n\nSources:\n${sourcesText}`
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }
      
      data = await response.json();
      content = data.content[0].text;
    } else {
      // Use OpenAI API
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: CONFIG.OPENAI_MODEL || 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that answers questions based on provided sources. Always cite your sources using [1], [2], etc.'
            },
            {
              role: 'user',
              content: `Based on these sources, answer the question: "${question}"\n\nSources:\n${sourcesText}`
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      
      data = await response.json();
      content = data.choices[0].message.content;
    }
    
    return {
      content: content,
      sources: sources.map((s, i) => ({
        number: i + 1,
        title: s.title,
        url: s.url
      }))
    };
  } catch (error) {
    console.error('Error synthesizing answer:', error);
    throw error;
  }
}

// Perplexity API handler
async function handlePerplexityQuery(request, sendResponse) {
  const { query } = request;
  
  try {
    // Implementation for Perplexity API
    // Note: Actual Perplexity API endpoint and format may vary
    sendResponse({ 
      success: true, 
      result: 'Perplexity integration pending API documentation' 
    });
  } catch (error) {
    console.error('Error in handlePerplexityQuery:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Save API keys handler
async function handleSaveApiKeys(request, sendResponse) {
  const { keys } = request;
  
  try {
    await chrome.storage.local.set({ apiConfig: keys });
    CONFIG = { ...CONFIG, ...keys };
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving API keys:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Validate API key handler
async function handleValidateApiKey(request, sendResponse) {
  const { provider, apiKey } = request;
  
  try {
    let validation;
    if (provider === 'anthropic') {
      validation = await validateAnthropicKey(apiKey || CONFIG.ANTHROPIC_API_KEY);
    } else if (provider === 'openai') {
      validation = await validateOpenAIKey(apiKey || CONFIG.OPENAI_API_KEY);
    } else {
      throw new Error('Invalid provider specified');
    }
    
    sendResponse({ success: true, ...validation });
  } catch (error) {
    console.error('Error validating API key:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Generate prompt based on analysis mode
function generatePrompt(text, mode) {
  // Check if we're using Anthropic for more direct prompts
  const useAnthropic = CONFIG?.USE_ANTHROPIC;
  
  const prompts = {
    explain: `${useAnthropic ? '' : 'Explain the following text in clear, simple terms:\n\n'}"${text}"`,
    summarize: `${useAnthropic ? 'Summarize: ' : 'Provide a concise summary of the following text:\n\n'}"${text}"`,
    keyPoints: `${useAnthropic ? 'Key points from: ' : 'Extract and list the key points from the following text:\n\n'}"${text}"`,
    eli5: `${useAnthropic ? 'Using only simple words a 5-year-old would understand, explain: ' : 'Explain the following text as if I\'m 5 years old:\n\n'}"${text}"`,
    technical: `${useAnthropic ? 'Technical analysis of: ' : 'Provide a detailed technical analysis of the following text:\n\n'}"${text}"`,
    examples: `${useAnthropic ? 'Examples illustrating: ' : 'Provide relevant examples that illustrate the concepts in the following text:\n\n'}"${text}"`,
    proscons: `${useAnthropic ? 'Pros and cons in: ' : 'List the pros and cons or advantages and disadvantages discussed in the following text:\n\n'}"${text}"`,
    factcheck: `${useAnthropic ? 'Factual claims to verify in: ' : 'Identify any factual claims in the following text that should be verified:\n\n'}"${text}"`,
    extractClaims: `You are a claim extraction system. Your response must be ONLY a JSON array with no other text.

Extract verifiable factual claims from this text: "${text}"

Rules:
- Each claim must be a complete sentence with subject, verb, and object
- Include names, numbers, and specific details in the claim
- Each claim should stand alone without needing external context
- Focus on statements that can be fact-checked

Required JSON structure:
[{"claim": "complete sentence here.", "original_text": "source text", "type": "category"}]

Valid types: statistical, historical, scientific, technological, general

Example input: "Ford CEO Jim Farley said AI will eliminate 50% of white-collar jobs by 2030."
Example output: [{"claim": "Ford CEO Jim Farley said AI will eliminate 50% of white-collar jobs by 2030.", "original_text": "Ford CEO Jim Farley said AI will eliminate 50% of white-collar jobs by 2030.", "type": "statistical"}]

CRITICAL: Output ONLY the JSON array. No explanations, no markdown, just the array.`
  };
  
  return prompts[mode] || prompts.explain;
}

// Cache management
async function getCachedResponse(key) {
  const cache = await chrome.storage.local.get(`cache_${key}`);
  const cached = cache[`cache_${key}`];
  
  if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
    return cached.data;
  }
  
  return null;
}

async function cacheResponse(key, data) {
  await chrome.storage.local.set({
    [`cache_${key}`]: {
      data,
      timestamp: Date.now()
    }
  });
}

// API Key Validation Functions
async function validateAnthropicKey(apiKey) {
  // Check format
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, error: 'API key is missing or invalid type' };
  }
  
  if (!apiKey.startsWith('sk-ant-')) {
    return { valid: false, error: 'API key should start with "sk-ant-"' };
  }
  
  if (apiKey.length < 50) {
    return { valid: false, error: 'API key appears too short' };
  }
  
  // Test with a minimal API call
  try {
    console.log('Bobby: Testing Anthropic API key...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5
      })
    });
    
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        valid: false, 
        error: `Authentication failed: ${errorData.error?.message || 'Invalid API key'}` 
      };
    }
    
    if (response.status === 429) {
      // Rate limit means key is valid but overused
      return { valid: true, warning: 'API key is valid but rate limited' };
    }
    
    if (response.ok) {
      return { valid: true };
    }
    
    return { 
      valid: false, 
      error: `API test failed with status ${response.status}` 
    };
  } catch (error) {
    return { 
      valid: false, 
      error: `Network error: ${error.message}` 
    };
  }
}

async function validateOpenAIKey(apiKey) {
  // Check format
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, error: 'API key is missing or invalid type' };
  }
  
  if (!apiKey.startsWith('sk-')) {
    return { valid: false, error: 'API key should start with "sk-"' };
  }
  
  // Test with a minimal API call
  try {
    console.log('Bobby: Testing OpenAI API key...');
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }
    
    if (response.status === 429) {
      return { valid: true, warning: 'API key is valid but rate limited' };
    }
    
    if (response.ok) {
      return { valid: true };
    }
    
    return { 
      valid: false, 
      error: `API test failed with status ${response.status}` 
    };
  } catch (error) {
    return { 
      valid: false, 
      error: `Network error: ${error.message}` 
    };
  }
}

// Initialize configuration on startup
loadConfig();