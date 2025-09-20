// Bobby Chrome Extension - Prompt Manager Module
// Manages prompt templates and analysis modes

class PromptManager {
  constructor() {
    // Check if context-aware mode is enabled
    this.useContextAware = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_CONTEXT_AWARE || false;
    
    // Disable context-aware in minimal mode to avoid loading heavy modules
    if (window.BOBBY_CONFIG?.FEATURE_FLAGS?.MINIMAL_MODE) {
      this.useContextAware = false;
    }
    
    // Initialize ContentAnalyzer and ContextActions if available
    if (this.useContextAware && window.ContentAnalyzer && window.ContextActions) {
      this.contentAnalyzer = new window.ContentAnalyzer();
      this.contextActions = new window.ContextActions();
    }
    // If modules are missing, gracefully disable context-aware
    if (this.useContextAware && (!this.contentAnalyzer || !this.contextActions)) {
      this.useContextAware = false;
    }
    
    // Global style guardrails to avoid rigid, robotic outputs
    this.styleGuardrails = [
      'Lead immediately with the core insight; no throat-clearing.',
      "Avoid generic openers like 'This passage…', 'The author…', 'In this text…', and filler like 'Okay,' 'Let\'s imagine…', or 'Imagine…'.",
      "Don't restate the prompt or describe your steps.",
      'Keep it tight and natural; only as long as needed for clarity.',
      'Use at most one quick analogy or example if it helps—keep it short.',
      'Prefer one short paragraph; use a short bullet list only if it adds clarity.',
      'No headings unless clearly helpful; avoid boilerplate transitions like “In conclusion”.',
      'Avoid baby talk; be clear and crisp.',
      'Use concrete verbs and specifics; avoid hedging like "seems", "maybe", or "likely" unless truly warranted.',
      'Write with energy and specificity; avoid bland generalities.',
      'End with a complete sentence; do not end with trailing ellipses (…).'
    ].join(' ');
    this.modes = {
      explain: {
        name: 'Explain',
        icon: '💡',
        description: 'Clear, intuitive explanation',
        systemPrompt: `Your explanations are crisp, memorable, clear and intuitive. Use analogies and examples only when they truly help.Keep it conversational but insightful.`,
        userPrompt: (text) => `Give me a clear, intuitive explanation of this concept / highlighted text. Focus on making it truly click for me - what's the key insight here? Make it high quality and intuitive:\n\n"${text}"`
      },
      
      summarize: {
        name: 'Summarize',
        icon: '📝',
        description: 'Concise summary of content',
        systemPrompt: `You create sharp, scannable summaries that capture what actually matters. You have a gift for distilling complexity into clarity without losing nuance. Your summaries feel complete yet effortless to read - never bloated, never missing the point.`,
        userPrompt: (text) => `Summarize this content, capturing the essential points and main thrust. Be concise but complete - give me exactly what I need to understand what this is about:\n\n"${text}"`
      },
      
      keyPoints: {
        name: 'Key Points',
        icon: '🔑',
        description: 'Extract main ideas',
        systemPrompt: `You have a laser focus for what truly matters. You extract the core ideas that someone would highlight or remember - the insights that change understanding, the facts that drive decisions, the concepts that everything else builds on.`,
        userPrompt: (text) => `Extract the key points from this text - the ideas that matter most, the insights worth remembering, the core facts or arguments. Give me the essential takeaways:\n\n"${text}"`
      },
      
      eli5: {
        name: 'ELI5',
        icon: '👶',
        description: 'Explain Like I\'m 5',
        systemPrompt: `You explain complex things using simple language and familiar comparisons that a 10 year old would understand.`,
        userPrompt: (text) => `Explain this in the simplest possible way, like you're talking to a curious 10-year-old.\n\n"${text}"`
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
        content: [
          mode.systemPrompt,
          `Style guardrails: ${this.styleGuardrails}`,
          varietyHints ? `${varietyHints}` : null
        ].filter(Boolean).join('\n\n')
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
        'Lead with the core insight, then one quick example if helpful.',
        'Use a concise, concrete analogy only if it adds clarity.',
        'Prefer concrete language over abstractions.',
        'Focus on what changes in understanding.'
      ],
      eli5: [
        'Use one small, familiar comparison—keep it brief.',
        'Keep sentences short and direct without baby talk.',
        'Describe with everyday objects the child already knows.',
        'Skip long scene-setting; get straight to the point.'
      ],
      summarize: [
        'Capture the core message in plain language.',
        'Prefer substance over structure—no filler.',
        'Cut repetition and throat-clearing.',
        'Include only what a skim-reader must know.'
      ],
      keyPoints: [
        'Use a short bullet list of essentials only if clearer than a paragraph.',
        'Make each point standalone and useful.',
        'Combine key facts with actionable insights.',
        'Order by importance.'
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
        <button class="bobby-prompt-btn" data-mode="${modeKey}" title="${mode.description}" ${mode.isSpecial ? 'data-special="true" data-prompt="factcheck"' : ''}>
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
    if (!this.useContextAware || !this.contentAnalyzer || !this.contextActions) {
      // Return legacy buttons
      return {
        buttons: this.createAllButtons(),
        contentType: 'general'
      };
    }
    
    const contextData = this.getContextActions(text);
    // Handle legacy fallback shape (array of modes)
    if (Array.isArray(contextData)) {
      return {
        buttons: this.createAllButtons(),
        contentType: 'general'
      };
    }
    const actions = Array.isArray(contextData.actions) ? contextData.actions : [];
    const buttons = actions.map(action => this.createContextButton(action, contextData.contentType));
    
    return {
      buttons: buttons,
      contentType: contextData.contentType,
      analysis: contextData.analysis
    };
  }
}

// Export for use in extension
window.PromptManager = PromptManager;
