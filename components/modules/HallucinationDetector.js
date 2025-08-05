// Bobby Chrome Extension - Hallucination Detector Module
// Implements fact-checking workflow inspired by Exa's hallucination detector
// Extracts factual claims, searches for sources, and verifies accuracy

class HallucinationDetector {
  constructor(openaiApiKey, exaApiKey) {
    this.openaiApiKey = openaiApiKey;
    this.exaApiKey = exaApiKey;
    this.cache = new Map();
  }

  /**
   * Extract factual claims from text using GPT
   */
  async extractClaims(text) {
    const cacheKey = `claims_${this.hashText(text)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let retries = 2;
    let lastError = null;

    while (retries >= 0) {
      try {
        // Use Chrome runtime messaging to avoid direct API calls
        const response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: 'analyzeText',
            text: text,
            mode: 'extractClaims'
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error || 'Unknown error'));
            }
          });
        });

        let content = response.result;
        console.log('Bobby: Raw claim extraction response:', content);
        
        // Aggressive JSON extraction
        content = this.extractJSON(content);
        
        // Parse JSON response
        let claims;
        try {
          claims = JSON.parse(content);
          // Validate the structure
          if (!Array.isArray(claims)) {
            throw new Error('Claims must be an array');
          }
          // Validate and clean each claim object
          claims = claims.filter(claim => {
            return claim && typeof claim === 'object' && 
                   claim.claim && typeof claim.claim === 'string' &&
                   claim.claim.trim().length > 10; // Minimum claim length
          }).map(claim => ({
            claim: claim.claim.trim(),
            original_text: claim.original_text || claim.claim,
            type: claim.type || 'general'
          }));
          
          if (claims.length === 0) {
            throw new Error('No valid claims extracted');
          }
        } catch (e) {
          console.warn('Failed to parse claims JSON, attempt', 3 - retries, ':', e);
          if (retries === 0) {
            // Final fallback - extract sentences manually
            console.log('Bobby: Using fallback claim extraction');
            claims = this.parseClaimsFromText(text);
          } else {
            throw e; // Retry with simplified prompt
          }
        }
        
        this.cache.set(cacheKey, claims);
        return claims;
      } catch (error) {
        console.error('Error extracting claims, retries left:', retries, error);
        lastError = error;
        retries--;
        
        if (retries >= 0) {
          // Wait a bit before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // If all retries failed, use fallback
    console.log('Bobby: All claim extraction attempts failed, using direct text parsing');
    const fallbackClaims = this.parseClaimsFromText(text);
    this.cache.set(cacheKey, fallbackClaims);
    return fallbackClaims;
  }

  /**
   * Verify a single claim by searching for sources
   */
  async verifyClaim(claim, originalText) {
    try {
      // Search for sources about this claim
      const sources = await this.searchSources(claim.claim || claim);
      
      // Evaluate claim against sources
      const evaluation = await this.evaluateClaim(
        claim.claim || claim, 
        sources, 
        originalText
      );
      
      return {
        claim: claim.claim || claim,
        ...evaluation,
        sources
      };
    } catch (error) {
      console.error('Error verifying claim:', error);
      return {
        claim: claim.claim || claim,
        assessment: 'error',
        confidence: 0,
        summary: `Verification failed: ${error.message.includes('Rate limit') ? 'API rate limit reached. Please wait a moment before trying again.' : error.message || 'Unknown error occurred while verifying this claim.'}`,
        sources: []
      };
    }
  }

  /**
   * Search for sources using Exa API
   */
  async searchSources(claim) {
    try {
      // Use Chrome runtime messaging to avoid CORS issues
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'exaSearch',
          query: claim,
          num_results: 5
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || 'Unknown error'));
          }
        });
      });
      
      return response.results || [];
    } catch (error) {
      console.error('Error searching sources:', error);
      return [];
    }
  }

  /**
   * Evaluate claim against sources using GPT
   */
  async evaluateClaim(claim, sources, originalText) {
    const sourcesText = sources.map((s, i) => 
      `Source ${i + 1}: ${s.title}\nURL: ${s.url}\nContent: ${s.text || s.snippet || ''}\n`
    ).join('\n');

    try {
      // Use Chrome runtime messaging for API call
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'analyzeText',
          text: `RESPOND WITH ONLY JSON:

Claim to evaluate: "${claim}"

Sources:
${sourcesText || 'No sources found'}

TASK: Output a JSON object evaluating this claim.`,
          mode: 'factcheck',
          systemPrompt: `You are a JSON-only fact-checking system. You MUST respond with ONLY a JSON object, no other text.

Required JSON format:
{"assessment": "true|false|partially_true|unverifiable|needs_context", "confidence": 0-100, "summary": "One sentence", "supporting_sources": [1,2,3]}

Example response:
{"assessment": "true", "confidence": 85, "summary": "The claim is supported by source 1 and 2.", "supporting_sources": [1, 2]}

CRITICAL RULES:
1. Start your response with { and end with }
2. No text before or after the JSON
3. No explanations, no markdown, ONLY JSON
4. assessment must be one of: true, false, partially_true, unverifiable, needs_context
5. confidence must be a number 0-100
6. summary must be one concise sentence
7. supporting_sources must be an array of source numbers

DO NOT write any other text. Begin with { and end with }.`
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || 'Unknown error'));
          }
        });
      });

      let content = response.result;
      console.log('Bobby: Raw evaluation response:', content);
      
      // Extract JSON from response
      content = this.extractEvaluationJSON(content);
      
      // Parse JSON response
      try {
        const result = JSON.parse(content);
        // Validate and ensure all required fields
        const evaluation = {
          assessment: result.assessment || 'error',
          confidence: typeof result.confidence === 'number' ? result.confidence : 0,
          summary: result.summary || 'Unable to evaluate claim.',
          supporting_sources: Array.isArray(result.supporting_sources) ? result.supporting_sources : []
        };
        console.log('Bobby: Parsed evaluation from JSON:', evaluation);
        return evaluation;
      } catch (e) {
        console.warn('Failed to parse evaluation JSON:', e);
        console.log('Bobby: Attempting fallback text extraction for:', response.result);
        // Try to extract from plain text
        const fallbackResult = this.extractEvaluationFromText(response.result);
        console.log('Bobby: Fallback extraction result:', fallbackResult);
        return fallbackResult;
      }
    } catch (error) {
      console.error('Error evaluating claim:', error);
      // Don't throw - return error result
      return {
        assessment: 'error',
        confidence: 0,
        summary: error.message.includes('Rate limit') ? 
          'Rate limit reached. Please try again in a moment.' : 
          'Unable to verify this claim due to a technical error.',
        supporting_sources: []
      };
    }
  }

  /**
   * Format fact-check results for display
   */
  formatResults(claims, verifications) {
    const summary = {
      true: 0,
      false: 0,
      partially_true: 0,
      unverifiable: 0,
      needs_context: 0,
      error: 0
    };

    verifications.forEach(v => {
      if (summary[v.assessment] !== undefined) {
        summary[v.assessment]++;
      }
    });

    const overallScore = this.calculateOverallScore(summary);

    return {
      summary,
      overallScore,
      verifications,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate overall reliability score
   */
  calculateOverallScore(summary) {
    const weights = {
      true: 1,
      partially_true: 0.5,
      needs_context: 0.5,
      unverifiable: 0.3,
      false: 0,
      error: 0  // Errors don't count toward score
    };

    let score = 0;
    let totalWeight = 0;

    Object.keys(weights).forEach(key => {
      if (summary[key] && key !== 'error') {  // Exclude errors from calculation
        score += summary[key] * weights[key];
        totalWeight += summary[key];
      }
    });

    return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
  }

  /**
   * Fallback claim parser if JSON parsing fails
   */
  parseClaimsFromText(text) {
    const claims = [];
    
    // Split text into sentences more intelligently
    // Handle abbreviations and decimal numbers
    const sentences = this.splitIntoSentences(text);
    
    sentences.forEach((sentence) => {
      const trimmed = sentence.trim();
      
      // Only include meaningful claims
      if (trimmed && trimmed.length > 20 && /[a-zA-Z0-9]/.test(trimmed)) {
        // Ensure the claim ends with proper punctuation
        let cleanClaim = trimmed;
        if (!/[.!?]$/.test(cleanClaim)) {
          cleanClaim += '.';
        }
        
        // Determine claim type based on content
        let type = 'general';
        if (/\d+\s*%|\d+\s*percent/i.test(cleanClaim)) {
          type = 'statistical';
        } else if (/\d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)/i.test(cleanClaim)) {
          type = 'historical';
        } else if (/(?:study|research|experiment|data|evidence)/i.test(cleanClaim)) {
          type = 'scientific';
        } else if (/(?:AI|artificial intelligence|machine learning|algorithm|technology|software|hardware)/i.test(cleanClaim)) {
          type = 'technological';
        }
        
        claims.push({
          claim: cleanClaim,
          original_text: cleanClaim,
          type: type
        });
      }
    });

    // If no claims found, create one from the whole text
    if (claims.length === 0) {
      const cleanText = text.trim().replace(/\s+/g, ' ');
      const truncated = cleanText.length > 200 ? cleanText.substring(0, 197) + '...' : cleanText;
      claims.push({
        claim: truncated,
        original_text: text,
        type: 'general'
      });
    }

    return claims;
  }

  /**
   * Split text into sentences handling edge cases
   */
  splitIntoSentences(text) {
    // Replace known abbreviations with placeholders
    const abbrevs = {
      'Mr.': 'Mr<DOT>',
      'Mrs.': 'Mrs<DOT>',
      'Dr.': 'Dr<DOT>',
      'Prof.': 'Prof<DOT>',
      'Sr.': 'Sr<DOT>',
      'Jr.': 'Jr<DOT>',
      'Co.': 'Co<DOT>',
      'Inc.': 'Inc<DOT>',
      'Ltd.': 'Ltd<DOT>',
      'Corp.': 'Corp<DOT>',
      'vs.': 'vs<DOT>',
      'e.g.': 'eg<DOT>',
      'i.e.': 'ie<DOT>',
      'etc.': 'etc<DOT>',
      'U.S.': 'US<DOT>',
      'U.K.': 'UK<DOT>'
    };
    
    let processed = text;
    for (const [abbrev, placeholder] of Object.entries(abbrevs)) {
      processed = processed.replace(new RegExp(abbrev.replace('.', '\\.'), 'g'), placeholder);
    }
    
    // Split on sentence boundaries
    const sentences = processed.match(/[^.!?]+[.!?]+/g) || [processed];
    
    // Restore abbreviations
    return sentences.map(s => {
      let restored = s;
      for (const [abbrev, placeholder] of Object.entries(abbrevs)) {
        restored = restored.replace(new RegExp(placeholder, 'g'), abbrev);
      }
      return restored.trim();
    }).filter(s => s.length > 0);
  }

  /**
   * Extract JSON from text that might contain extra content
   */
  extractJSON(text) {
    if (!text || typeof text !== 'string') {
      return '[]';
    }
    
    // Remove common prefixes that LLMs add
    let cleaned = text.trim();
    
    // Remove markdown code blocks
    cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    
    // Remove common phrases
    const phrasesToRemove = [
      /^Here (?:is|are) the extracted claims?:?\s*/i,
      /^The extracted claims? (?:is|are):?\s*/i,
      /^JSON:?\s*/i,
      /^Output:?\s*/i,
      /^Result:?\s*/i,
      /^Claims?:?\s*/i
    ];
    
    for (const phrase of phrasesToRemove) {
      cleaned = cleaned.replace(phrase, '');
    }
    
    // Try to find JSON array
    const arrayMatch = cleaned.match(/\[\s*\{[^\[\]]*\}\s*(?:,\s*\{[^\[\]]*\}\s*)*\]/);
    if (arrayMatch) {
      try {
        // Validate it's proper JSON
        JSON.parse(arrayMatch[0]);
        return arrayMatch[0];
      } catch (e) {
        // Continue to next method
      }
    }
    
    // Try to find JSON object and wrap in array
    const objectMatch = cleaned.match(/\{[^{}]*(?:"claim"\s*:\s*"[^"]+")[^{}]*\}/);
    if (objectMatch) {
      try {
        JSON.parse(objectMatch[0]);
        return `[${objectMatch[0]}]`;
      } catch (e) {
        // Continue to next method
      }
    }
    
    // Last resort - check if the whole thing is valid JSON
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return cleaned;
      } else if (typeof parsed === 'object' && parsed.claim) {
        return `[${cleaned}]`;
      }
    } catch (e) {
      // Not valid JSON
    }
    
    // Return empty array if no JSON found
    return '[]';
  }

  /**
   * Try to extract assessment from non-JSON response
   */
  extractAssessment(text) {
    const lowerText = text.toLowerCase();
    
    // Check for error indicators first
    if (lowerText.includes('error') || 
        lowerText.includes('failed') || 
        lowerText.includes('invalid') ||
        lowerText.includes('could not') ||
        lowerText.includes('unable to')) {
      return 'error';
    }
    
    // Check for specific assessment patterns
    // Use more specific patterns to avoid false positives
    if ((lowerText.includes('claim is true') || 
         lowerText.includes('verified as true') || 
         lowerText.includes('this is true')) && 
        !lowerText.includes('false')) {
      return 'true';
    } else if ((lowerText.includes('claim is false') || 
                lowerText.includes('verified as false') || 
                lowerText.includes('this is false')) && 
               !lowerText.includes('true')) {
      return 'false';
    } else if (lowerText.includes('partially true') || 
               lowerText.includes('partly true') ||
               lowerText.includes('partially correct')) {
      return 'partially_true';
    } else if (lowerText.includes('unverifiable') || 
               lowerText.includes('cannot verify') ||
               lowerText.includes('cannot be verified')) {
      return 'unverifiable';
    } else if (lowerText.includes('needs context') || 
               lowerText.includes('requires context') ||
               lowerText.includes('contextual')) {
      return 'needs_context';
    }
    
    // Default to error if no clear assessment found
    return 'error';
  }

  /**
   * Extract evaluation JSON from response
   */
  extractEvaluationJSON(text) {
    if (!text || typeof text !== 'string') {
      return '{}';
    }
    
    // Clean the text
    let cleaned = text.trim();
    
    // Remove markdown code blocks
    cleaned = cleaned.replace(/```json\\s*/gi, '').replace(/```\\s*/g, '');
    
    // Handle common prefixes like "Here is my evaluation in JSON format:"
    const colonIndex = cleaned.indexOf(':');
    if (colonIndex > 0 && colonIndex < 100) {
      // Check if there's a '{' after the colon
      const afterColon = cleaned.substring(colonIndex + 1).trim();
      if (afterColon.startsWith('{')) {
        cleaned = afterColon;
      }
    }
    
    // Try to find a complete JSON object with evaluation fields
    // More comprehensive regex that handles nested objects and arrays
    const objectMatch = cleaned.match(/\{[^{}]*"assessment"\s*:\s*"[^"]+?"[^{}]*(?:\{[^{}]*\}|\[[^\]]*\])*[^{}]*\}/);
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0]);
        if (parsed.assessment) {
          console.log('Bobby: Successfully extracted JSON from response');
          return objectMatch[0];
        }
      } catch (e) {
        console.warn('Bobby: Found JSON-like structure but parsing failed:', e);
      }
    }
    
    // Try finding JSON that might be on multiple lines
    const multilineMatch = cleaned.match(/\{\s*\n?\s*"assessment"[\s\S]*?\n?\s*\}/);
    if (multilineMatch) {
      try {
        const parsed = JSON.parse(multilineMatch[0]);
        if (parsed.assessment) {
          console.log('Bobby: Successfully extracted multiline JSON');
          return multilineMatch[0];
        }
      } catch (e) {
        // Continue to next method
      }
    }
    
    // Try the whole string after removing common phrases
    const phrasesToRemove = [
      /^.*?evaluation.*?:?\s*/i,
      /^.*?JSON format.*?:?\s*/i,
      /^.*?response.*?:?\s*/i
    ];
    
    let stripped = cleaned;
    for (const phrase of phrasesToRemove) {
      stripped = stripped.replace(phrase, '');
    }
    
    try {
      const parsed = JSON.parse(stripped);
      if (parsed.assessment) {
        console.log('Bobby: Successfully parsed stripped JSON');
        return stripped;
      }
    } catch (e) {
      // Not valid JSON
    }
    
    console.warn('Bobby: Could not extract valid JSON from evaluation response');
    return '{}';
  }

  /**
   * Extract evaluation from plain text response
   */
  extractEvaluationFromText(text) {
    const lowerText = text.toLowerCase();
    
    // Determine assessment - be more thorough in checking
    let assessment = 'unverifiable'; // Default to unverifiable instead of error
    
    // Check for "true" assessment - look for various patterns
    if ((lowerText.includes('"assessment": "true"') || 
         lowerText.includes('"assessment":"true"') ||
         lowerText.includes('assessment is true') ||
         lowerText.includes('claim is true') ||
         lowerText.includes('claim is accurate') ||
         lowerText.includes('claim is correct') ||
         lowerText.includes('this is true')) && 
        !lowerText.includes('not true') && 
        !lowerText.includes('false')) {
      assessment = 'true';
    } 
    // Check for "false" assessment
    else if ((lowerText.includes('"assessment": "false"') || 
              lowerText.includes('"assessment":"false"') ||
              lowerText.includes('assessment is false') ||
              lowerText.includes('claim is false') ||
              lowerText.includes('claim is incorrect') ||
              lowerText.includes('this is false')) && 
             !lowerText.includes('not false')) {
      assessment = 'false';
    } 
    // Check for partially true
    else if (lowerText.includes('partially true') || 
             lowerText.includes('partly true') ||
             lowerText.includes('partially correct') ||
             lowerText.includes('"assessment": "partially_true"')) {
      assessment = 'partially_true';
    } 
    // Check for unverifiable
    else if (lowerText.includes('unverifiable') || 
             lowerText.includes('cannot verify') ||
             lowerText.includes('cannot be verified') ||
             lowerText.includes('"assessment": "unverifiable"')) {
      assessment = 'unverifiable';
    } 
    // Check for needs context
    else if (lowerText.includes('needs context') || 
             lowerText.includes('requires context') ||
             lowerText.includes('need more context') ||
             lowerText.includes('"assessment": "needs_context"')) {
      assessment = 'needs_context';
    }
    // Only mark as error if we see explicit error indicators
    else if (lowerText.includes('error') || 
             lowerText.includes('failed') ||
             lowerText.includes('unable to evaluate')) {
      assessment = 'error';
    }
    
    // Extract confidence if mentioned
    let confidence = 0;
    const confidenceMatch = text.match(/(\d+)%?\s*(?:confidence|certain)/i);
    if (confidenceMatch) {
      confidence = parseInt(confidenceMatch[1]);
    } else {
      // Default confidence based on assessment
      const defaultConfidence = {
        'true': 75,
        'false': 75,
        'partially_true': 60,
        'unverifiable': 30,
        'needs_context': 40,
        'error': 0
      };
      confidence = defaultConfidence[assessment] || 0;
    }
    
    // Create summary - look for key phrases
    let summary = 'Unable to evaluate claim based on available sources.';
    
    // Try to find a conclusion or summary statement
    const summaryPatterns = [
      /(?:in summary|in conclusion|overall|therefore)[^.!?]*[.!?]/i,
      /(?:the claim|this claim)[^.!?]*(?:is|appears|seems)[^.!?]*[.!?]/i,
      /(?:evidence|sources|data)[^.!?]*(?:suggest|indicate|show)[^.!?]*[.!?]/i,
      /"summary"\s*:\s*"([^"]+)"/i  // Look for JSON summary field
    ];
    
    for (const pattern of summaryPatterns) {
      const match = text.match(pattern);
      if (match) {
        // If it's the JSON pattern, use the captured group
        summary = match[1] || match[0].trim();
        break;
      }
    }
    
    // If no pattern matched, use first sentence
    if (summary === 'Unable to evaluate claim based on available sources.') {
      const sentences = text.match(/[^.!?]+[.!?]/g) || [text];
      if (sentences[0]) {
        summary = sentences[0].trim();
      }
    }
    
    // Limit summary length
    if (summary.length > 150) {
      summary = summary.substring(0, 147) + '...';
    }
    
    return {
      assessment,
      confidence,
      summary,
      supporting_sources: []
    };
  }

  /**
   * Simple hash function for caching
   */
  hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }
}

// Export for use in content script
window.HallucinationDetector = HallucinationDetector;