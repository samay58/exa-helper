// Bobby Chrome Extension - API Client Module
// Handles all API communications with caching and error handling

class APIClient {
  constructor(config) {
    this.config = config;
    this.cache = new Map();
    this.requestQueue = [];
    this.isProcessing = false;
    
    // Determine which API to use by default
    this.useAnthropic = config.USE_ANTHROPIC && 
                       config.ANTHROPIC_API_KEY && 
                       config.ANTHROPIC_API_KEY !== 'sk-ant-api03-YOUR-ANTHROPIC-API-KEY-HERE';
  }
  
  /**
   * Analyze text using the configured AI provider
   */
  async analyze(messages, options = {}) {
    if (this.useAnthropic) {
      return this.analyzeWithAnthropic(messages, options);
    } else {
      return this.analyzeWithOpenAI(messages, options);
    }
  }
  
  /**
   * Make a request to Anthropic API
   */
  async analyzeWithAnthropic(messages, options = {}) {
    const cacheKey = this.getCacheKey('anthropic', messages);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { result: cached, fromCache: true };
    }
    
    try {
      // Convert messages format if needed
      const anthropicMessages = messages.map(msg => ({
        role: msg.role === 'system' ? 'user' : msg.role,
        content: msg.content
      }));
      
      // If there's a system message, prepend it to the first user message
      const systemMessage = messages.find(m => m.role === 'system');
      if (systemMessage) {
        anthropicMessages[0].content = `${systemMessage.content}\n\n${anthropicMessages[0].content}`;
      }
      
      const response = await this.makeRequest('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: options.model || this.config.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620',
          messages: anthropicMessages.filter(m => m.role !== 'system'),
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature || 0.7
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
      }
      
      const data = await response.json();
      const result = data.content[0].text;
      
      // Cache the result
      this.addToCache(cacheKey, result);
      
      return { result, fromCache: false };
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error(`Failed to analyze text: ${error.message}`);
    }
  }
  
  /**
   * Make a request to OpenAI API
   */
  async analyzeWithOpenAI(messages, options = {}) {
    const cacheKey = this.getCacheKey('openai', messages);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { result: cached, fromCache: true };
    }
    
    try {
      const response = await this.makeRequest('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: options.model || this.config.OPENAI_MODEL || 'gpt-4-turbo-preview',
          messages: messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000,
          top_p: options.topP || 1,
          frequency_penalty: options.frequencyPenalty || 0,
          presence_penalty: options.presencePenalty || 0
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
      }
      
      const data = await response.json();
      const result = data.choices[0].message.content;
      
      // Cache the result
      this.addToCache(cacheKey, result);
      
      return { result, fromCache: false };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`Failed to analyze text: ${error.message}`);
    }
  }
  
  /**
   * Search for sources using Exa API
   */
  async searchWithExa(query, options = {}) {
    if (!this.config.EXA_API_KEY) {
      throw new Error('Exa API key not configured');
    }
    
    const cacheKey = this.getCacheKey('exa', query);
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { sources: cached, fromCache: true };
    }
    
    try {
      // Primary: x-api-key header + camelCase body
      const body = {
        query,
        numResults: options.numResults || 5,
        useAutoprompt: options.useAutoprompt !== false,
        type: options.type || 'neural',
        includeDomains: options.includeDomains,
        excludeDomains: options.excludeDomains,
        startPublishedDate: options.startDate,
        endPublishedDate: options.endDate,
        contents: { text: true }
      };

      let response = await this.makeRequest('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.EXA_API_KEY
        },
        body: JSON.stringify(body)
      });

      // Fallbacks
      if (!response.ok && (response.status === 402 || response.status === 400 || response.status === 401 || response.status === 403)) {
        // Authorization header variant
        response = await this.makeRequest('https://api.exa.ai/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.EXA_API_KEY}`
          },
          body: JSON.stringify(body)
        });
      }
      if (!response.ok && (response.status === 402 || response.status === 400)) {
        // keyword type without autoprompt
        const body2 = { ...body, type: 'keyword', useAutoprompt: false };
        response = await this.makeRequest('https://api.exa.ai/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.EXA_API_KEY
          },
          body: JSON.stringify(body2)
        });
      }

      if (!response.ok) {
        throw new Error(`Exa API error: ${response.status}`);
      }

      const data = await response.json();

      // Normalize
      const sources = (data.results || []).map(result => ({
        title: result.title || result.name || '',
        url: result.url || result.link || '',
        snippet: result.snippet || result.text || result.content || (result.contents && (result.contents.text || result.contents.snippet)) || '',
        publishedDate: result.published_date || result.publishedDate,
        score: result.score,
        author: result.author
      }));

      this.addToCache(cacheKey, sources);
      return { sources, fromCache: false };
    } catch (error) {
      console.error('Exa API error:', error);
      throw new Error(`Failed to search sources: ${error.message}`);
    }
  }
  
  /**
   * Query Perplexity API
   */
  async queryPerplexity(query, options = {}) {
    if (!this.config.PERPLEXITY_API_KEY) {
      throw new Error('Perplexity API key not configured');
    }
    
    // Note: Perplexity API implementation would go here
    // This is a placeholder as the actual API format may vary
    throw new Error('Perplexity integration pending API documentation');
  }
  
  /**
   * Make a generic HTTP request with retry logic
   */
  async makeRequest(url, options, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });
        
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : (i + 1) * 2000;
          await this.delay(delay);
          continue;
        }
        
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.delay((i + 1) * 1000);
      }
    }
  }
  
  /**
   * Generate cache key
   */
  getCacheKey(service, data) {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    const hash = this.simpleHash(dataStr);
    return `${service}_${hash}`;
  }
  
  /**
   * Simple hash function for cache keys
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Get from cache
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }
  
  /**
   * Add to cache
   */
  addToCache(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
  
  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Validate API keys
   */
  async validateApiKeys() {
    const results = {
      anthropic: false,
      openai: false,
      exa: false,
      perplexity: false
    };
    
    // Test Anthropic
    if (this.config.ANTHROPIC_API_KEY && this.config.ANTHROPIC_API_KEY !== 'sk-ant-api03-YOUR-ANTHROPIC-API-KEY-HERE') {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: this.config.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1
          })
        });
        results.anthropic = response.ok || response.status === 400; // 400 might mean valid key but bad request
      } catch (error) {
        results.anthropic = false;
      }
    }
    
    // Test OpenAI
    if (this.config.OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${this.config.OPENAI_API_KEY}`
          }
        });
        results.openai = response.ok;
      } catch (error) {
        results.openai = false;
      }
    }
    
    // Test Exa
    if (this.config.EXA_API_KEY) {
      try {
        const response = await this.searchWithExa('test', { numResults: 1 });
        results.exa = true;
      } catch (error) {
        results.exa = false;
      }
    }
    
    return results;
  }
  
  /**
   * Get API usage stats
   */
  getUsageStats() {
    return {
      cacheSize: this.cache.size,
      cacheHits: this.cacheHits || 0,
      cacheMisses: this.cacheMisses || 0,
      totalRequests: (this.cacheHits || 0) + (this.cacheMisses || 0)
    };
  }
}

// Export for use in extension
window.APIClient = APIClient;
