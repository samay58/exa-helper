// Bobby Chrome Extension - Content Analyzer Module
// Detects content type and suggests appropriate actions

class ContentAnalyzer {
  constructor() {
    // Define patterns for content detection
    this.patterns = {
      code: {
        patterns: [
          /function\s*\(/,
          /\bclass\s+\w+/,
          /\bdef\s+\w+/,
          /\bimport\s+/,
          /\bconst\s+\w+\s*=/,
          /\blet\s+\w+\s*=/,
          /\bvar\s+\w+\s*=/,
          /\{[\s\S]*\}/,
          /\bif\s*\(/,
          /\bfor\s*\(/,
          /\bwhile\s*\(/,
          /=>\s*{/,
          /\breturn\s+/,
          /;$/m
        ],
        minMatches: 2,
        languages: this.detectProgrammingLanguage.bind(this)
      },
      
      numbers: {
        patterns: [
          /\b\d+\.?\d*%/g,  // Percentages
          /\$\d+\.?\d*/g,    // Dollar amounts
          /€\d+\.?\d*/g,     // Euro amounts
          /£\d+\.?\d*/g,     // Pound amounts
          /\b\d{1,3}(,\d{3})+/g, // Large numbers with commas
          /\b\d+\.?\d*\s*(million|billion|trillion|k|m|b)/gi,
          /\b\d+\/\d+/g,     // Fractions
          /\b\d+\.\d+/g,     // Decimals
          /\b\d{4,}/g        // Years or large numbers
        ],
        minMatches: 3,
        dataType: this.detectDataType.bind(this)
      },
      
      foreignText: {
        patterns: [
          /[\u3040-\u309F\u30A0-\u30FF]/,  // Japanese
          /[\u4E00-\u9FFF]/,                // Chinese
          /[\u1100-\u11FF\uAC00-\uD7AF]/,  // Korean
          /[\u0600-\u06FF]/,                // Arabic
          /[\u0590-\u05FF]/,                // Hebrew
          /[\u0400-\u04FF]/,                // Cyrillic
          /[\u0100-\u017F]/,                // Latin Extended
          /[\u1E00-\u1EFF]/,                // Latin Extended Additional
          /[àáäâèéëêìíïîòóöôùúüûñç]/i,     // Common accented characters
        ],
        minMatches: 5,
        language: this.detectLanguage.bind(this)
      },
      
      technical: {
        patterns: [
          /\b(API|SDK|UI|UX|CPU|GPU|RAM|SSD|HTTP|HTTPS|URL|JSON|XML|SQL)\b/g,
          /\b(algorithm|database|framework|library|protocol|architecture)\b/gi,
          /\b(machine learning|artificial intelligence|blockchain|quantum)\b/gi,
          /\b(frontend|backend|fullstack|devops|microservice)\b/gi,
          /\b(react|angular|vue|node|python|java|javascript)\b/gi,
          /\b[A-Z]{2,}[a-z]+[A-Z][a-zA-Z]*/g, // CamelCase technical terms
        ],
        minMatches: 2,
        domain: this.detectTechnicalDomain.bind(this)
      },
      
      claims: {
        patterns: [
          /\b(study|research|report|survey)\s+(shows?|finds?|suggests?|indicates?)/gi,
          /\b(according to|based on|as per)\b/gi,
          /\b\d+%\s+of\s+/gi,
          /\b(proven|confirmed|verified|established)\b/gi,
          /\b(fact|truth|evidence|data)\b/gi,
          /\b(always|never|all|none|every)\b/gi,
          /\b(causes?|leads? to|results? in)\b/gi,
          /\b(scientists?|researchers?|experts?|studies)\s+(say|claim|believe)/gi,
        ],
        minMatches: 2,
        claimType: this.detectClaimType.bind(this)
      },
      
      creative: {
        patterns: [
          /\b(story|poem|novel|narrative|tale)\b/gi,
          /\b(character|plot|theme|metaphor|simile)\b/gi,
          /[!?]{2,}/g,  // Multiple punctuation
          /\b(beautiful|amazing|wonderful|terrible|horrible)\b/gi,
          /\b(imagine|dream|wish|hope|feel)\b/gi,
          /"[^"]+"/g,    // Quoted dialogue
          /\.\.\./g,     // Ellipsis
        ],
        minMatches: 3,
        style: this.detectWritingStyle.bind(this)
      }
    };
  }

  /**
   * Analyze content and return detected types with confidence scores
   */
  analyzeContent(text) {
    const results = [];
    const normalizedText = text.toLowerCase();
    const wordCount = text.split(/\s+/).length;
    
    // Check each content type
    for (const [type, config] of Object.entries(this.patterns)) {
      let matchCount = 0;
      const matchedPatterns = [];
      
      // Test each pattern
      for (const pattern of config.patterns) {
        const matches = text.match(pattern);
        if (matches) {
          matchCount += matches.length;
          matchedPatterns.push({
            pattern: pattern.toString(),
            matches: matches.slice(0, 3) // Store first 3 matches
          });
        }
      }
      
      // Calculate confidence based on matches and text length
      if (matchCount >= config.minMatches) {
        const confidence = Math.min(
          (matchCount / config.minMatches) * 0.5 + 
          (matchCount / wordCount) * 0.5,
          1.0
        );
        
        const result = {
          type,
          confidence,
          matchCount,
          matchedPatterns
        };
        
        // Add additional analysis if available
        if (config.languages) {
          result.language = config.languages(text);
        }
        if (config.dataType) {
          result.dataType = config.dataType(text);
        }
        if (config.language) {
          result.detectedLanguage = config.language(text);
        }
        if (config.domain) {
          result.domain = config.domain(text);
        }
        if (config.claimType) {
          result.claimType = config.claimType(text);
        }
        if (config.style) {
          result.style = config.style(text);
        }
        
        results.push(result);
      }
    }
    
    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);
    
    // Add general type if no specific type detected
    if (results.length === 0) {
      results.push({
        type: 'general',
        confidence: 1.0,
        matchCount: 0
      });
    }
    
    return {
      primary: results[0],
      secondary: results.slice(1),
      all: results,
      isMultiType: results.length > 1 && results[1].confidence > 0.3
    };
  }

  /**
   * Detect programming language from code
   */
  detectProgrammingLanguage(text) {
    const languagePatterns = {
      javascript: [/\bconst\s+/, /\blet\s+/, /=>\s*{/, /\bfunction\s*\(/, /\.js$/],
      python: [/\bdef\s+/, /\bimport\s+/, /\bprint\s*\(/, /\bif\s+.*:/, /\.py$/],
      java: [/\bpublic\s+class/, /\bprivate\s+/, /\bSystem\.out/, /\.java$/],
      cpp: [/\#include\s*</, /\bstd::/, /\bint\s+main/, /\.cpp$/],
      html: [/<\w+>/, /<\/\w+>/, /<!DOCTYPE/, /\.html$/],
      css: [/\{[\s\S]*:\s*[\s\S]*;[\s\S]*\}/, /\.\w+\s*\{/, /\#\w+\s*\{/, /\.css$/],
      sql: [/\bSELECT\s+/i, /\bFROM\s+/i, /\bWHERE\s+/i, /\bINSERT\s+INTO/i],
    };
    
    const scores = {};
    for (const [lang, patterns] of Object.entries(languagePatterns)) {
      scores[lang] = patterns.filter(p => p.test(text)).length;
    }
    
    const topLang = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)[0];
    
    return topLang && topLang[1] > 0 ? topLang[0] : 'unknown';
  }

  /**
   * Detect type of numerical data
   */
  detectDataType(text) {
    if (/\$|€|£|¥/.test(text)) return 'financial';
    if (/%/.test(text)) return 'percentage';
    if (/\d{4}/.test(text) && /\b(19|20)\d{2}\b/.test(text)) return 'temporal';
    if (/\b\d+\s*(km|mi|m|ft|kg|lb|°C|°F)\b/i.test(text)) return 'measurement';
    return 'statistical';
  }

  /**
   * Detect foreign language
   */
  detectLanguage(text) {
    // Simple detection based on character ranges
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'japanese';
    if (/[\u4E00-\u9FFF]/.test(text)) return 'chinese';
    if (/[\u1100-\u11FF\uAC00-\uD7AF]/.test(text)) return 'korean';
    if (/[\u0600-\u06FF]/.test(text)) return 'arabic';
    if (/[\u0590-\u05FF]/.test(text)) return 'hebrew';
    if (/[\u0400-\u04FF]/.test(text)) return 'cyrillic';
    if (/[àáäâèéëêìíïîòóöôùúüûñç]/i.test(text)) return 'latin-extended';
    return 'unknown';
  }

  /**
   * Detect technical domain
   */
  detectTechnicalDomain(text) {
    const domains = {
      web: /\b(html|css|javascript|react|angular|vue|frontend|backend)\b/gi,
      data: /\b(database|sql|mongodb|redis|elasticsearch|data)\b/gi,
      ml: /\b(machine learning|ai|neural|deep learning|tensorflow|pytorch)\b/gi,
      cloud: /\b(aws|azure|gcp|kubernetes|docker|microservice)\b/gi,
      security: /\b(security|encryption|authentication|vulnerability|firewall)\b/gi,
      mobile: /\b(ios|android|swift|kotlin|react native|flutter)\b/gi,
    };
    
    const scores = {};
    for (const [domain, pattern] of Object.entries(domains)) {
      const matches = text.match(pattern);
      scores[domain] = matches ? matches.length : 0;
    }
    
    const topDomain = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)[0];
    
    return topDomain && topDomain[1] > 0 ? topDomain[0] : 'general';
  }

  /**
   * Detect claim type
   */
  detectClaimType(text) {
    if (/\b(study|research|report|survey)\b/i.test(text)) return 'research';
    if (/\b\d+%\s+of\s+/i.test(text)) return 'statistical';
    if (/\b(always|never|all|none|every)\b/i.test(text)) return 'absolute';
    if (/\b(causes?|leads? to|results? in)\b/i.test(text)) return 'causal';
    return 'general';
  }

  /**
   * Detect writing style
   */
  detectWritingStyle(text) {
    if (/[!?]{2,}/.test(text)) return 'emphatic';
    if (/"[^"]+"/.test(text)) return 'dialogue';
    if (/\b(beautiful|amazing|wonderful)\b/i.test(text)) return 'descriptive';
    if (/\b(I|me|my|mine)\b/i.test(text)) return 'personal';
    return 'narrative';
  }

  /**
   * Get suggested actions based on content type
   */
  getSuggestedActions(contentAnalysis) {
    const actionMap = {
      code: [
        { id: 'debug', name: 'Debug', icon: '🐛', prompt: 'debug' },
        { id: 'optimize', name: 'Optimize', icon: '⚡', prompt: 'optimize' },
        { id: 'comment', name: 'Add Comments', icon: '💬', prompt: 'addComments' },
        { id: 'convert', name: 'Convert', icon: '🔄', prompt: 'convertLanguage' },
        { id: 'explain', name: 'Explain', icon: '💡', prompt: 'explainCode' }
      ],
      numbers: [
        { id: 'visualize', name: 'Visualize', icon: '📊', prompt: 'visualize' },
        { id: 'calculate', name: 'Calculate', icon: '🧮', prompt: 'calculate' },
        { id: 'compare', name: 'Compare', icon: '⚖️', prompt: 'compare' },
        { id: 'trends', name: 'Analyze Trends', icon: '📈', prompt: 'analyzeTrends' },
        { id: 'format', name: 'Format', icon: '📝', prompt: 'formatNumbers' }
      ],
      foreignText: [
        { id: 'translate', name: 'Translate', icon: '🌐', prompt: 'translate' },
        { id: 'pronounce', name: 'Pronounce', icon: '🗣️', prompt: 'pronounce' },
        { id: 'culture', name: 'Cultural Context', icon: '🎭', prompt: 'culturalContext' },
        { id: 'transliterate', name: 'Transliterate', icon: '🔤', prompt: 'transliterate' },
        { id: 'grammar', name: 'Grammar', icon: '📖', prompt: 'grammarCheck' }
      ],
      technical: [
        { id: 'define', name: 'Define', icon: '📚', prompt: 'define' },
        { id: 'examples', name: 'Examples', icon: '💡', prompt: 'examples' },
        { id: 'diagram', name: 'Visual Diagram', icon: '🎨', prompt: 'diagram' },
        { id: 'related', name: 'Related Concepts', icon: '🔗', prompt: 'relatedConcepts' },
        { id: 'simplify', name: 'Simplify', icon: '🎯', prompt: 'simplify' }
      ],
      claims: [
        { id: 'factcheck', name: 'Fact Check', icon: '🔍', prompt: 'factcheck', special: true },
        { id: 'sources', name: 'Find Sources', icon: '📰', prompt: 'findSources' },
        { id: 'counter', name: 'Counter Arguments', icon: '⚔️', prompt: 'counterArguments' },
        { id: 'context', name: 'Context', icon: '🌍', prompt: 'provideContext' },
        { id: 'verify', name: 'Verify', icon: '✅', prompt: 'verify' }
      ],
      creative: [
        { id: 'rewrite', name: 'Rewrite Style', icon: '✍️', prompt: 'rewriteStyle' },
        { id: 'expand', name: 'Expand', icon: '📝', prompt: 'expand' },
        { id: 'funny', name: 'Make Funnier', icon: '😄', prompt: 'makeFunnier' },
        { id: 'tone', name: 'Tone Analysis', icon: '🎭', prompt: 'analyzeTone' },
        { id: 'critique', name: 'Critique', icon: '📋', prompt: 'critique' }
      ],
      general: [
        { id: 'explain', name: 'Explain', icon: '💡', prompt: 'explain' },
        { id: 'summarize', name: 'Summarize', icon: '📝', prompt: 'summarize' },
        { id: 'keypoints', name: 'Key Points', icon: '🔑', prompt: 'keyPoints' },
        { id: 'eli5', name: 'ELI5', icon: '👶', prompt: 'eli5' },
        { id: 'factcheck', name: 'Fact Check', icon: '🔍', prompt: 'factcheck', special: true }
      ]
    };
    
    const primaryActions = actionMap[contentAnalysis.primary.type] || actionMap.general;
    
    // If multi-type content, add some secondary actions
    if (contentAnalysis.isMultiType && contentAnalysis.secondary.length > 0) {
      const secondaryType = contentAnalysis.secondary[0].type;
      const secondaryActions = actionMap[secondaryType] || [];
      
      // Add 1-2 secondary actions that don't duplicate primary
      const additionalActions = secondaryActions
        .filter(sa => !primaryActions.find(pa => pa.id === sa.id))
        .slice(0, 2);
      
      return {
        primary: primaryActions,
        additional: additionalActions,
        all: [...primaryActions, ...additionalActions]
      };
    }
    
    return {
      primary: primaryActions,
      additional: [],
      all: primaryActions
    };
  }
}

// Export for use in extension
window.ContentAnalyzer = ContentAnalyzer;