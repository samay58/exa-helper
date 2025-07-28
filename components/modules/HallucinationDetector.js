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
      
      // Extract JSON from response if it contains extra text
      content = this.extractJSON(content);
      
      // Parse JSON response
      let claims;
      try {
        claims = JSON.parse(content);
        // Validate the structure
        if (!Array.isArray(claims)) {
          throw new Error('Claims must be an array');
        }
        // Validate each claim object
        claims = claims.filter(claim => {
          return claim && typeof claim === 'object' && 
                 claim.claim && typeof claim.claim === 'string';
        });
      } catch (e) {
        console.warn('Failed to parse claims JSON:', e);
        // Fallback parsing if not JSON
        claims = this.parseClaimsFromText(response.result);
      }
      
      this.cache.set(cacheKey, claims);
      return claims;
    } catch (error) {
      console.error('Error extracting claims:', error);
      throw error;
    }
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
          text: `Claim: "${claim}"
              
Original text: "${originalText}"

Sources found:
${sourcesText || 'No sources found'}

Evaluate this claim and provide your assessment.`,
          mode: 'factcheck',
          systemPrompt: `You are a fact-checker evaluating claims against reliable sources.
Evaluate the given claim using the provided sources and return a JSON object with:
- assessment: "true", "false", "partially_true", "unverifiable", or "needs_context"
- confidence: 0-100 (your confidence in the assessment)
- summary: Brief explanation of your assessment
- fixed_text: Corrected version of the original text (if needed)
- supporting_sources: Array of source indices that support or refute the claim

Return ONLY the JSON object, no other text.`
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
      
      // Extract JSON from response if it contains extra text
      content = this.extractJSON(content);
      
      // Parse JSON response
      try {
        const result = JSON.parse(content);
        // Validate required fields
        if (!result.assessment || !result.confidence !== undefined) {
          throw new Error('Invalid evaluation response structure');
        }
        return result;
      } catch (e) {
        console.warn('Failed to parse evaluation JSON:', e);
        // Try to extract meaningful information from the response
        const assessment = this.extractAssessment(response.result);
        return {
          assessment: assessment || 'error',
          confidence: 0,
          summary: 'Unable to verify this claim due to a technical issue. The AI response could not be parsed correctly. Please try again or rephrase the claim.',
          fixed_text: originalText,
          supporting_sources: []
        };
      }
    } catch (error) {
      console.error('Error evaluating claim:', error);
      throw error;
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
    
    // Improved regex to capture complete sentences including those with abbreviations
    const sentenceRegex = /[^.!?]+(?:[.!?](?![.!?])|[.!?]+)/g;
    const sentences = text.match(sentenceRegex) || [text];
    
    sentences.forEach((sentence) => {
      const trimmed = sentence.trim();
      
      // Only include meaningful claims (not too short, not just punctuation)
      if (trimmed && trimmed.length > 30 && /[a-zA-Z0-9]/.test(trimmed)) {
        // Ensure the claim ends with proper punctuation
        let cleanClaim = trimmed;
        if (!/[.!?]$/.test(cleanClaim)) {
          cleanClaim += '.';
        }
        
        // Check if it's likely a factual claim (contains numbers, dates, names, or assertions)
        const hasFactualElements = /\d+|(?:January|February|March|April|May|June|July|August|September|October|November|December)|(?:is|are|was|were|has|have|had|will|would|can|could|should|must)|(?:[A-Z][a-z]+\s+){1,}/g.test(cleanClaim);
        
        if (hasFactualElements) {
          claims.push({
            claim: cleanClaim,
            original_text: cleanClaim,
            type: 'factual'
          });
        }
      }
    });

    // If no claims found, try to extract at least one meaningful statement
    if (claims.length === 0) {
      const firstMeaningfulSentence = sentences.find(s => s.trim().length > 50);
      if (firstMeaningfulSentence) {
        claims.push({
          claim: firstMeaningfulSentence.trim(),
          original_text: firstMeaningfulSentence.trim(),
          type: 'general'
        });
      } else {
        // Last resort: take first 200 chars
        claims.push({
          claim: text.substring(0, 200).trim() + '...',
          original_text: text,
          type: 'general'
        });
      }
    }

    return claims;
  }

  /**
   * Extract JSON from text that might contain extra content
   */
  extractJSON(text) {
    // First, try to find JSON array in the text
    const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      return arrayMatch[0];
    }
    
    // If no array found, try to find JSON object
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      // Wrap single object in array
      return `[${objectMatch[0]}]`;
    }
    
    // Return original text if no JSON found
    return text;
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