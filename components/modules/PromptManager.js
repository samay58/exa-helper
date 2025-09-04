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
        description: 'Analogy-first, 2–3 short sentences',
        systemPrompt: 'You explain like a friendly neighbor, not a professor. Use only common words a 10-year-old knows. Maximum 2–3 short sentences. First: simple "It\'s like …" analogy. Second: what it actually does. Third (optional): one everyday example. Stay under 50 words total.',
        userPrompt: (text) => `Explain in 2–3 short sentences (max 50 words). Start with "It\'s like …", then say what it does; optionally give one everyday example:\n\n"${text}"\n\nKeep it plain, concrete, and skimmable.`
      },
      
      summarize: {
        name: 'Summarize',
        icon: '📝',
        description: 'Concise summary of content',
        systemPrompt: 'You create extremely concise summaries using bullet points for clarity. Maximum 3 key points, each under 15 words. Focus only on the most essential information. No preamble or conclusion.',
        userPrompt: (text) => `Summarize in exactly 3 bullet points (max 15 words each):\n\n"${text}"\n\nFormat:\n• [Most important point]\n• [Second key point]\n• [Third essential point]`
      },
      
      keyPoints: {
        name: 'Key Points',
        icon: '🔑',
        description: 'Extract main ideas',
        systemPrompt: 'You extract only the most crucial points. Maximum 5 points. Each point must be one complete sentence under 20 words. Be extremely selective - quality over quantity.',
        userPrompt: (text) => `List the 3-5 most important points (one sentence each, under 20 words):\n\n"${text}"\n\nFormat:\n1. [First key point]\n2. [Second key point]\n3. [Third key point]`
      },
      
      eli5: {
        name: 'ELI5',
        icon: '👶',
        description: 'Explain Like I\'m 5',
        systemPrompt: 'You explain like talking to a 5-year-old. Use only simple, common words. Maximum 3-5 SHORT sentences total. Each sentence must be under 15 words. Include ONE fun comparison or analogy. No complex concepts.',
        userPrompt: (text) => `In 3-5 simple sentences (each under 15 words), explain this like I\'m 5:\n\n"${text}"\n\nRules: Simple words only. One fun comparison. Maximum 5 sentences, each under 15 words.`
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
    
    // Add variety to responses with contextual hints
    const varietyHints = this.getVarietyHint(modeKey);
    
    const messages = [
      {
        role: 'system',
        content: mode.systemPrompt + (varietyHints ? `\n\n${varietyHints}` : '')
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
   * Get variety hint to avoid repetitive responses
   */
  getVarietyHint(modeKey) {
    const hints = {
      explain: [
        'Use a practical example or analogy to illustrate the concept.',
        'Start with a relatable scenario that demonstrates the concept.',
        'Frame the explanation through a real-world lens.',
        'Connect the concept to everyday experiences.'
      ],
      eli5: [
        'Use an analogy with toys, animals, or everyday objects.',
        'Compare it to something from a child\'s daily life.',
        'Use a simple story or scenario to explain.',
        'Relate it to playing games or simple activities.'
      ],
      summarize: [
        'Focus on the actionable takeaways.',
        'Highlight the most surprising or important aspects.',
        'Emphasize the practical implications.',
        'Extract the core message or thesis.'
      ],
      keyPoints: [
        'Prioritize by impact or importance.',
        'Focus on what would be most useful to remember.',
        'Extract both facts and insights.',
        'Balance detail with clarity.'
      ]
    };
    
    const modeHints = hints[modeKey];
    if (!modeHints) return null;
    
    // Return a random hint for variety
    return modeHints[Math.floor(Math.random() * modeHints.length)];
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
