// Bobby Chrome Extension - Prompt Manager Module
// Manages prompt templates and analysis modes

class PromptManager {
  constructor() {
    // Check if context-aware mode is enabled
    this.useContextAware = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_CONTEXT_AWARE || false;
    
    // Initialize ContentAnalyzer and ContextActions if available
    if (this.useContextAware && window.ContentAnalyzer && window.ContextActions) {
      this.contentAnalyzer = new window.ContentAnalyzer();
      this.contextActions = new window.ContextActions();
    }
    this.modes = {
      explain: {
        name: 'Explain',
        icon: '💡',
        description: 'Clear explanation of complex concepts',
        systemPrompt: 'You are an expert at clear, concise explanations. Be direct and focused. Aim for 2-3 short paragraphs that capture the essence without unnecessary detail. Start immediately with the explanation.',
        userPrompt: (text) => `Explain this clearly and concisely in 2-3 paragraphs. Focus on what it means and why it matters:\n\n"${text}"`
      },
      
      summarize: {
        name: 'Summarize',
        icon: '📝',
        description: 'Concise summary of content',
        systemPrompt: 'You create tight, focused summaries. Be extremely concise - aim for 1-2 short paragraphs maximum. Include only the most essential information. Start immediately with the summary.',
        userPrompt: (text) => `Summarize the key points in 1-2 tight paragraphs. Include only what\'s most important:\n\n"${text}"`
      },
      
      keyPoints: {
        name: 'Key Points',
        icon: '🔑',
        description: 'Extract main ideas',
        systemPrompt: 'You extract only the most crucial points. Be extremely selective - include only 3-5 key points that truly matter. Each point should be one clear, concise sentence.',
        userPrompt: (text) => `List the 3-5 most important points from this text. One clear sentence per point:\n\n"${text}"`
      },
      
      eli5: {
        name: 'ELI5',
        icon: '👶',
        description: 'Explain Like I\'m 5',
        systemPrompt: 'You explain things using only simple words and fun comparisons. Keep it short and playful - like a quick bedtime story. No long explanations, just the simple truth in 1-2 short paragraphs.',
        userPrompt: (text) => `Explain this using simple words and fun comparisons, like talking to a 5-year-old:\n\n"${text}"`
      },
      
      factcheck: {
        name: 'Fact Check',
        icon: '🔍',
        description: 'Verify with Exa',
        systemPrompt: 'You are a meticulous fact-checker with expertise in identifying claims that require verification. You distinguish between facts, opinions, and speculation. You understand the importance of source credibility and context in evaluating truth claims.',
        userPrompt: (text) => `Analyze this text for factual claims that should be verified:\n\n1. **Extract specific claims** (facts presented as true)\n2. **Categorize each claim** (statistical, historical, scientific, etc.)\n3. **Assess verification priority** (which claims are most important to verify?)\n4. **Suggest verification approach** (what sources or methods would best verify each claim?)\n\nBe specific about numbers, dates, names, and technical assertions.\n\nText to fact-check:\n"${text}"`,
        isSpecial: true  // Flag to indicate this uses Exa API
      }
    };
    
    this.followUpPrompts = [
      "Can you elaborate on this?",
      "What are the implications of this?",
      "Can you provide more examples?",
      "What's the historical context?",
      "How does this relate to current events?",
      "What are common misconceptions about this?",
      "What should I learn next?",
      "Can you explain the technical details?"
    ];
  }
  
  /**
   * Get all available modes
   */
  getModes() {
    return Object.keys(this.modes);
  }
  
  /**
   * Get mode details
   */
  getMode(modeKey) {
    return this.modes[modeKey] || this.modes.explain;
  }
  
  /**
   * Generate a complete prompt for the AI
   */
  generatePrompt(text, modeKey, options = {}) {
    const mode = this.getMode(modeKey);
    
    const messages = [
      {
        role: 'system',
        content: mode.systemPrompt + '\n\nBe concise and direct. Avoid unnecessary elaboration. Get to the point quickly.'
      },
      {
        role: 'user',
        content: mode.userPrompt(text)
      }
    ];
    
    // Add context if provided
    if (options.context) {
      messages[0].content += `\n\nAdditional context: ${options.context}`;
    }
    
    // Add follow-up if this is a continuation
    if (options.previousResponse) {
      messages.push({
        role: 'assistant',
        content: options.previousResponse
      });
      messages.push({
        role: 'user',
        content: options.followUpQuestion || "Please continue or provide more details."
      });
    }
    
    return messages;
  }
  
  /**
   * Get a random follow-up prompt
   */
  getRandomFollowUp() {
    return this.followUpPrompts[Math.floor(Math.random() * this.followUpPrompts.length)];
  }
  
  /**
   * Create prompt button HTML
   */
  createPromptButton(modeKey) {
    const mode = this.getMode(modeKey);
    return {
      key: modeKey,
      html: `
        <button class="bobby-prompt-btn" data-mode="${modeKey}" title="${mode.description}">
          <span class="bobby-prompt-icon">${mode.icon}</span>
          <span>${mode.name}</span>
        </button>
      `,
      mode: mode
    };
  }
  
  /**
   * Create all prompt buttons
   */
  createAllButtons() {
    return this.getModes().map(modeKey => this.createPromptButton(modeKey));
  }
  
  /**
   * Get prompt for specific use cases
   */
  getSpecialPrompt(type, text, data = {}) {
    const specialPrompts = {
      codeAnalysis: {
        system: 'You are an expert programmer who can analyze code in any language and explain it clearly.',
        user: `Analyze the following code, explain what it does, identify any issues, and suggest improvements:\n\n\`\`\`\n${text}\n\`\`\``
      },
      
      languageTranslation: {
        system: 'You are a professional translator with expertise in multiple languages.',
        user: `Translate the following text to ${data.targetLanguage || 'English'}. Preserve the meaning and tone:\n\n"${text}"`
      },
      
      academicAnalysis: {
        system: 'You are an academic expert who can analyze scholarly content and provide insights.',
        user: `Provide an academic analysis of the following text, including its main arguments, methodology, and significance:\n\n"${text}"`
      },
      
      creativeRewrite: {
        system: 'You are a creative writer who can rewrite content in different styles and tones.',
        user: `Rewrite the following text in a ${data.style || 'more engaging'} style:\n\n"${text}"`
      }
    };
    
    return specialPrompts[type] || null;
  }

  /**
   * Analyze content and get suggested actions (V2 feature)
   */
  analyzeContent(text) {
    if (!this.useContextAware || !this.contentAnalyzer) {
      return null;
    }
    
    return this.contentAnalyzer.analyzeContent(text);
  }

  /**
   * Get context-aware actions for content (V2 feature)
   */
  getContextActions(text) {
    if (!this.useContextAware || !this.contentAnalyzer || !this.contextActions) {
      // Return legacy modes if context-aware is disabled
      return this.getModes().map(mode => ({
        id: mode,
        ...this.modes[mode]
      }));
    }
    
    // Analyze content
    const analysis = this.contentAnalyzer.analyzeContent(text);
    
    // Get suggested actions
    const suggestedActions = this.contentAnalyzer.getSuggestedActions(analysis);
    
    // Map to full action details
    const actions = suggestedActions.all.map(action => {
      const fullAction = this.contextActions.getAction(action.prompt);
      return {
        id: action.id,
        name: action.name,
        icon: action.icon,
        prompt: action.prompt,
        special: action.special || false,
        description: fullAction?.description || action.name,
        isPrimary: suggestedActions.primary.includes(action)
      };
    });
    
    return {
      contentType: analysis.primary.type,
      confidence: analysis.primary.confidence,
      actions: actions,
      analysis: analysis
    };
  }

  /**
   * Generate prompt from context action (V2 feature)
   */
  generateContextPrompt(actionId, text, options = {}) {
    if (!this.useContextAware || !this.contextActions) {
      // Fallback to legacy prompt generation
      return this.generatePrompt(text, actionId, options);
    }
    
    const prompt = this.contextActions.generatePrompt(actionId, text, options);
    if (!prompt) {
      // Fallback to legacy if action not found
      return this.generatePrompt(text, actionId, options);
    }
    
    const messages = [
      {
        role: 'system',
        content: prompt.systemPrompt + '\n\nFormat your response with clear headings and bullet points where appropriate. Use markdown for better readability.'
      },
      {
        role: 'user',
        content: prompt.userPrompt
      }
    ];
    
    // Add follow-up if this is a continuation
    if (options.previousResponse) {
      messages.push({
        role: 'assistant',
        content: options.previousResponse
      });
      messages.push({
        role: 'user',
        content: options.followUpQuestion || "Please continue or provide more details."
      });
    }
    
    return messages;
  }

  /**
   * Create context-aware button HTML (V2 feature)
   */
  createContextButton(action, contentType) {
    const className = this.useContextAware ? 'bobby-action-btn-v2' : 'bobby-prompt-btn';
    const containerClass = contentType ? `bobby-context-${contentType}` : '';
    
    return {
      key: action.id,
      html: `
        <button class="${className}" 
                data-action="${action.id}" 
                data-prompt="${action.prompt || action.id}"
                title="${action.description || action.name}"
                ${action.special ? 'data-special="true"' : ''}>
          <span class="bobby-action-icon">${action.icon}</span>
          <span>${action.name}</span>
          ${this.useContextAware ? '<span class="bobby-tooltip-v2">' + (action.description || action.name) + '</span>' : ''}
        </button>
      `,
      action: action,
      containerClass: containerClass
    };
  }

  /**
   * Create all buttons based on content (V2 compatible)
   */
  createContentButtons(text) {
    if (!this.useContextAware) {
      // Return legacy buttons
      return {
        buttons: this.createAllButtons(),
        contentType: 'general'
      };
    }
    
    const contextData = this.getContextActions(text);
    const buttons = contextData.actions.map(action => 
      this.createContextButton(action, contextData.contentType)
    );
    
    return {
      buttons: buttons,
      contentType: contextData.contentType,
      analysis: contextData.analysis
    };
  }
}

// Export for use in extension
window.PromptManager = PromptManager;