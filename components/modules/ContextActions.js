// Bobby Chrome Extension - Context Actions Module
// Defines actions and prompts for different content types

class ContextActions {
  constructor() {
    // Define comprehensive action configurations
    this.actions = {
      // Code-related actions
      debug: {
        name: 'Debug',
        icon: '🐛',
        description: 'Find and fix issues in code',
        systemPrompt: 'You are an expert debugger. Analyze the code for bugs, potential issues, and suggest fixes.',
        userPrompt: (text) => `Debug the following code. Identify any bugs, potential issues, edge cases, and provide fixes with explanations:\n\n${text}`
      },
      
      optimize: {
        name: 'Optimize',
        icon: '⚡',
        description: 'Improve code performance',
        systemPrompt: 'You are a performance optimization expert who understands algorithms, data structures, and language-specific optimizations. You balance readability with performance.',
        userPrompt: (text) => `Optimize this code for better performance:\n\n1. **Performance Analysis**: Identify bottlenecks and inefficiencies\n2. **Time Complexity**: Current vs. optimized complexity\n3. **Memory Usage**: How to reduce memory footprint\n4. **Optimized Solution**: Provide improved code\n5. **Trade-offs**: Explain any readability vs. performance considerations\n\nCode to optimize:\n${text}`
      },
      
      addComments: {
        name: 'Add Comments',
        icon: '💬',
        description: 'Add helpful comments to code',
        systemPrompt: 'You are a code documentation expert. Add clear, helpful comments that explain what the code does.',
        userPrompt: (text) => `Add comprehensive comments to the following code. Include function descriptions, parameter explanations, and inline comments for complex logic:\n\n${text}`
      },
      
      convertLanguage: {
        name: 'Convert',
        icon: '🔄',
        description: 'Convert to another language',
        systemPrompt: 'You are a polyglot programmer expert at converting code between languages while maintaining functionality.',
        userPrompt: (text, options = {}) => `Convert the following code to ${options.targetLanguage || 'Python'}. Maintain the same functionality and include explanations of language-specific changes:\n\n${text}`
      },
      
      explainCode: {
        name: 'Explain',
        icon: '💡',
        description: 'Explain how code works',
        systemPrompt: 'You are a programming instructor who explains code clearly to developers of all levels.',
        userPrompt: (text) => `Explain how the following code works. Break down the logic, describe what each part does, and explain the overall purpose:\n\n${text}`
      },
      
      // Number/Data actions
      visualize: {
        name: 'Visualize',
        icon: '📊',
        description: 'Create visual representation',
        systemPrompt: 'You are a data visualization expert. Suggest appropriate charts and visualizations for data.',
        userPrompt: (text) => `Analyze the following numerical data and suggest the best ways to visualize it. Provide chart recommendations and explain what insights each visualization would reveal:\n\n${text}`
      },
      
      calculate: {
        name: 'Calculate',
        icon: '🧮',
        description: 'Perform calculations',
        systemPrompt: 'You are a mathematical expert. Perform calculations accurately and show your work.',
        userPrompt: (text) => `Perform calculations on the following numbers/data. Show all steps, provide totals, averages, percentages, and any other relevant calculations:\n\n${text}`
      },
      
      analyzeTrends: {
        name: 'Analyze Trends',
        icon: '📈',
        description: 'Identify patterns and trends',
        systemPrompt: 'You are a data analyst expert at identifying trends, patterns, and insights in numerical data.',
        userPrompt: (text) => `Analyze the following data for trends, patterns, and insights. Identify any notable changes, correlations, or predictions:\n\n${text}`
      },
      
      compare: {
        name: 'Compare',
        icon: '⚖️',
        description: 'Compare values and metrics',
        systemPrompt: 'You are an analyst skilled at comparing data points and highlighting differences.',
        userPrompt: (text) => `Compare the values in the following data. Highlight differences, calculate percentage changes, and provide insights:\n\n${text}`
      },
      
      formatNumbers: {
        name: 'Format',
        icon: '📝',
        description: 'Format numbers for clarity',
        systemPrompt: 'You are an expert at formatting numerical data for clarity and readability.',
        userPrompt: (text) => `Format the following numbers for better readability. Add thousands separators, round appropriately, convert units if needed, and organize in a clear table:\n\n${text}`
      },
      
      // Foreign text actions
      translate: {
        name: 'Translate',
        icon: '🌐',
        description: 'Translate to another language',
        systemPrompt: 'You are a professional translator who provides accurate, natural-sounding translations.',
        userPrompt: (text, options = {}) => `Translate the following text to ${options.targetLanguage || 'English'}. Provide a natural translation that preserves meaning and tone:\n\n${text}`
      },
      
      pronounce: {
        name: 'Pronounce',
        icon: '🗣️',
        description: 'Show pronunciation guide',
        systemPrompt: 'You are a language instructor who helps with pronunciation using phonetic spelling and IPA.',
        userPrompt: (text) => `Provide a pronunciation guide for the following text. Include phonetic spelling, IPA notation if applicable, and tips for correct pronunciation:\n\n${text}`
      },
      
      culturalContext: {
        name: 'Cultural Context',
        icon: '🎭',
        description: 'Explain cultural significance',
        systemPrompt: 'You are a cultural expert who explains the cultural context and significance of language and expressions.',
        userPrompt: (text) => `Explain the cultural context of the following text. Include cultural significance, when/how it\'s used, and any important nuances:\n\n${text}`
      },
      
      transliterate: {
        name: 'Transliterate',
        icon: '🔤',
        description: 'Convert to Latin alphabet',
        systemPrompt: 'You are an expert at transliterating text from various scripts to the Latin alphabet.',
        userPrompt: (text) => `Transliterate the following text to the Latin alphabet. Provide the most common romanization system and pronunciation guide:\n\n${text}`
      },
      
      grammarCheck: {
        name: 'Grammar',
        icon: '📖',
        description: 'Check grammar and usage',
        systemPrompt: 'You are a language expert who checks grammar and provides corrections with explanations.',
        userPrompt: (text) => `Check the grammar of the following text. Identify any errors, suggest corrections, and explain the grammar rules:\n\n${text}`
      },
      
      // Technical term actions
      define: {
        name: 'Define',
        icon: '📚',
        description: 'Define technical terms',
        systemPrompt: 'You are a technical expert who provides clear, comprehensive definitions of technical terms.',
        userPrompt: (text) => `Define the following technical terms. Provide clear explanations, context, and real-world applications:\n\n${text}`
      },
      
      examples: {
        name: 'Examples',
        icon: '💡',
        description: 'Show practical examples',
        systemPrompt: 'You are an educator who provides clear, practical examples to illustrate concepts.',
        userPrompt: (text) => `Provide practical examples of the following concepts. Include code examples, real-world applications, and use cases:\n\n${text}`
      },
      
      diagram: {
        name: 'Visual Diagram',
        icon: '🎨',
        description: 'Create visual explanation',
        systemPrompt: 'You are a visual communication expert who creates clear diagrams and visual explanations.',
        userPrompt: (text) => `Create a visual diagram or flowchart to explain the following concept. Describe the diagram in detail using ASCII art or structured description:\n\n${text}`
      },
      
      relatedConcepts: {
        name: 'Related Concepts',
        icon: '🔗',
        description: 'Explore related topics',
        systemPrompt: 'You are an expert at connecting concepts and identifying related topics for deeper understanding.',
        userPrompt: (text) => `Identify and explain concepts related to the following topics. Show how they connect and provide a learning path:\n\n${text}`
      },
      
      simplify: {
        name: 'Simplify',
        icon: '🎯',
        description: 'Simplify complex terms',
        systemPrompt: 'You are an expert at simplifying complex technical concepts for broader audiences.',
        userPrompt: (text) => `Simplify the following technical content. Use analogies, plain language, and clear explanations:\n\n${text}`
      },
      
      // Claim/fact actions
      findSources: {
        name: 'Find Sources',
        icon: '📰',
        description: 'Find supporting sources',
        systemPrompt: 'You are a research expert who identifies what sources would support or refute claims.',
        userPrompt: (text) => `Identify what sources would be needed to verify the following claims. Suggest specific types of sources and search strategies:\n\n${text}`
      },
      
      counterArguments: {
        name: 'Counter Arguments',
        icon: '⚔️',
        description: 'Present opposing views',
        systemPrompt: 'You are a debate expert who presents balanced counter-arguments and alternative perspectives.',
        userPrompt: (text) => `Present counter-arguments to the following claims. Include alternative perspectives and potential weaknesses:\n\n${text}`
      },
      
      provideContext: {
        name: 'Context',
        icon: '🌍',
        description: 'Add missing context',
        systemPrompt: 'You are an expert at providing historical, social, and situational context for claims and statements.',
        userPrompt: (text) => `Provide important context for the following statements. Include background information, relevant history, and current situation:\n\n${text}`
      },
      
      verify: {
        name: 'Verify',
        icon: '✅',
        description: 'Verify accuracy',
        systemPrompt: 'You are a fact-checking expert who verifies claims using logical analysis and knowledge.',
        userPrompt: (text) => `Verify the accuracy of the following statements. Identify which parts are likely true, false, or need more information:\n\n${text}`
      },
      
      // Creative text actions
      rewriteStyle: {
        name: 'Rewrite Style',
        icon: '✍️',
        description: 'Change writing style',
        systemPrompt: 'You are a creative writer who can adapt text to different styles and tones.',
        userPrompt: (text, options = {}) => `Rewrite the following text in a ${options.style || 'more formal'} style. Maintain the core message while changing the tone:\n\n${text}`
      },
      
      expand: {
        name: 'Expand',
        icon: '📝',
        description: 'Expand and elaborate',
        systemPrompt: 'You are a creative writer who expands ideas with rich detail and engaging content.',
        userPrompt: (text) => `Expand the following text with more detail, examples, and elaboration. Make it more comprehensive and engaging:\n\n${text}`
      },
      
      makeFunnier: {
        name: 'Make Funnier',
        icon: '😄',
        description: 'Add humor',
        systemPrompt: 'You are a comedy writer who adds appropriate humor while maintaining the message.',
        userPrompt: (text) => `Make the following text funnier. Add appropriate humor, wordplay, or witty observations:\n\n${text}`
      },
      
      analyzeTone: {
        name: 'Tone Analysis',
        icon: '🎭',
        description: 'Analyze writing tone',
        systemPrompt: 'You are a writing analyst who identifies tone, mood, and emotional content in text.',
        userPrompt: (text) => `Analyze the tone of the following text. Identify the mood, emotional content, formality level, and intended audience:\n\n${text}`
      },
      
      critique: {
        name: 'Critique',
        icon: '📋',
        description: 'Provide writing critique',
        systemPrompt: 'You are a writing coach who provides constructive critique and improvement suggestions.',
        userPrompt: (text) => `Critique the following text. Identify strengths, weaknesses, and provide specific suggestions for improvement:\n\n${text}`
      },
      
      // General actions (fallback)
      explain: {
        name: 'Explain',
        icon: '💡',
        description: 'Explain in simple terms',
        systemPrompt: 'You are an expert educator who explains complex topics in clear, accessible language.',
        userPrompt: (text) => `Explain the following text in clear, simple terms. Break down complex ideas and provide context:\n\n${text}`
      },
      
      summarize: {
        name: 'Summarize',
        icon: '📝',
        description: 'Create concise summary',
        systemPrompt: 'You are an expert at creating concise, informative summaries that capture key points.',
        userPrompt: (text) => `Summarize the following text concisely. Include main points and key takeaways:\n\n${text}`
      },
      
      keyPoints: {
        name: 'Key Points',
        icon: '🔑',
        description: 'Extract main ideas',
        systemPrompt: 'You are skilled at identifying and extracting the most important information.',
        userPrompt: (text) => `Extract the key points from the following text. Present as a clear, bulleted list:\n\n${text}`
      },
      
      eli5: {
        name: 'ELI5',
        icon: '👶',
        description: 'Explain like I\'m 5',
        systemPrompt: 'You explain complex topics in very simple terms that a 5-year-old could understand.',
        userPrompt: (text) => `Explain the following as if to a 5-year-old. Use simple words and fun analogies:\n\n${text}`
      }
    };
  }

  /**
   * Get action configuration by ID
   */
  getAction(actionId) {
    return this.actions[actionId] || null;
  }

  /**
   * Get all actions for a content type
   */
  getActionsForType(contentType) {
    const typeActionMap = {
      code: ['debug', 'optimize', 'addComments', 'convertLanguage', 'explainCode'],
      numbers: ['visualize', 'calculate', 'analyzeTrends', 'compare', 'formatNumbers'],
      foreignText: ['translate', 'pronounce', 'culturalContext', 'transliterate', 'grammarCheck'],
      technical: ['define', 'examples', 'diagram', 'relatedConcepts', 'simplify'],
      claims: ['factcheck', 'findSources', 'counterArguments', 'provideContext', 'verify'],
      creative: ['rewriteStyle', 'expand', 'makeFunnier', 'analyzeTone', 'critique'],
      general: ['explain', 'summarize', 'keyPoints', 'eli5', 'factcheck']
    };
    
    const actionIds = typeActionMap[contentType] || typeActionMap.general;
    return actionIds.map(id => ({ id, ...this.actions[id] }));
  }

  /**
   * Generate formatted prompt for an action
   */
  generatePrompt(actionId, text, options = {}) {
    const action = this.getAction(actionId);
    if (!action) return null;
    
    return {
      systemPrompt: action.systemPrompt,
      userPrompt: action.userPrompt(text, options),
      metadata: {
        actionId,
        actionName: action.name,
        contentLength: text.length
      }
    };
  }

  /**
   * Get quick action suggestions based on content
   */
  getQuickActions(contentAnalysis) {
    const quickActions = [];
    const primary = contentAnalysis.primary;
    
    // Add primary type quick actions
    if (primary.type === 'code' && primary.language) {
      quickActions.push({
        id: 'convertLanguage',
        options: { targetLanguage: 'Python' },
        label: 'Convert to Python'
      });
    }
    
    if (primary.type === 'foreignText' && primary.detectedLanguage) {
      quickActions.push({
        id: 'translate',
        options: { targetLanguage: 'English' },
        label: 'Translate to English'
      });
    }
    
    if (primary.type === 'numbers' && primary.dataType === 'financial') {
      quickActions.push({
        id: 'visualize',
        options: { chartType: 'line' },
        label: 'Show Trend Chart'
      });
    }
    
    return quickActions;
  }
}

// Export for use in extension
window.ContextActions = ContextActions;