// Bobby Chrome Extension - Module Loader
// Verifies all modules are loaded and initializes global APIs

(async function() {
  'use strict';

  // Initialize modules when DOM is ready
  async function initializeModules() {
    if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: Initializing module system...');
    
    // Check config is available
    if (!window.BOBBY_CONFIG) {
      if (window.BOBBY_CONFIG?.DEBUG_MODE) {
        console.error('Bobby: Critical error - BOBBY_CONFIG not found');
        console.error('Bobby: Extension will not function without proper config.js');
      }
      
      window.dispatchEvent(new CustomEvent('bobby-modules-error', { 
        detail: { error: 'BOBBY_CONFIG not found' } 
      }));
      return;
    }
    
    if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: Config verified, BOBBY_CONFIG available');
    
    // List of required modules - these should already be loaded by manifest.json
    const requiredModules = [
      'PromptManager', 'APIClient', 'UIComponents', 
      'ButtonManager', 'HistoryManager', 'DragManager', 
      'HallucinationDetector'
    ];
    
    // Verify all modules are available
    let allModulesAvailable = true;
    const missingModules = [];
    
    for (const moduleName of requiredModules) {
      if (!window[moduleName]) {
        if (window.BOBBY_CONFIG?.DEBUG_MODE) console.error(`Bobby: Module ${moduleName} not available`);
        missingModules.push(moduleName);
        allModulesAvailable = false;
      } else {
        if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log(`Bobby: Module ${moduleName} verified`);
      }
    }
    
    if (!allModulesAvailable) {
      if (window.BOBBY_CONFIG?.DEBUG_MODE) {
        console.error('Bobby: Missing modules:', missingModules);
        console.error('Bobby: Some features may not work properly');
      }
      
      window.dispatchEvent(new CustomEvent('bobby-modules-error', { 
        detail: { 
          error: 'Missing modules', 
          missingModules: missingModules 
        } 
      }));
      return;
    }
    
    if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: All modules verified and available');

    // Conditionally load optional modules only when corresponding flags are enabled
    await loadOptionalModules();
    
    // Initialize global API functions
    try {
      initializeGlobalAPIs();
      if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: Global APIs initialized');
    } catch (error) {
      if (window.BOBBY_CONFIG?.DEBUG_MODE) console.error('Bobby: Error initializing APIs:', error);
    }
    
    // Dispatch event to notify that modules are ready
    window.dispatchEvent(new CustomEvent('bobby-modules-ready'));
    if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: Module system ready');
  }

  // Determine minimal mode
  function isMinimal() {
    try {
      const flags = window.BOBBY_CONFIG && window.BOBBY_CONFIG.FEATURE_FLAGS;
      if (!flags || flags.MINIMAL_MODE === undefined) return true;
      return !!flags.MINIMAL_MODE;
    } catch (_) {
      return true;
    }
  }

  // Dynamically load a module script if not already present
  function loadScript(relativePath) {
    return new Promise((resolve, reject) => {
      const url = chrome.runtime.getURL(relativePath);
      // Avoid duplicate loads
      if (document.querySelector(`script[data-bobby-module="${relativePath}"]`)) return resolve();
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.defer = true;
      script.dataset.bobbyModule = relativePath;
      script.onload = () => resolve();
      script.onerror = (e) => reject(new Error(`Failed to load ${relativePath}`));
      (document.head || document.documentElement).appendChild(script);
    });
  }

  // Load optional modules based on feature flags (skips in minimal mode)
  async function loadOptionalModules() {
    const flags = window.BOBBY_CONFIG?.FEATURE_FLAGS || {};
    if (isMinimal()) {
      if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: Minimal mode enabled; skipping optional modules');
      return;
    }
    // Build file list to inject via background (MV3-safe)
    const files = [];
    if (flags.USE_CONTEXT_AWARE) {
      if (!window.ContentAnalyzer) files.push('components/modules/ContentAnalyzer.js');
      if (!window.ContextActions) files.push('components/modules/ContextActions.js');
    }
    if (flags.USE_PARTICLE_EFFECTS && !window.ParticleEffects) {
      files.push('components/modules/ParticleEffects.js');
    }
    if (flags.USE_SPRING_ANIMATIONS && !window.InteractionEffects) {
      files.push('components/modules/InteractionEffects.js');
    }
    if (flags.USE_ADAPTIVE_THEME && !window.ThemeManager) {
      files.push('components/modules/ThemeManager.js');
    }
    if (flags.RAUNO_MODE) {
      if (!window.RaunoEffects) files.push('components/modules/RaunoEffects.js');
      if (!window.GridSystem) files.push('components/modules/GridSystem.js');
    }
    if (!files.length) return;
    try {
      const resp = await chrome.runtime.sendMessage({ action: 'loadOptionalModules', files });
      if (!resp?.success) {
        if (window.BOBBY_CONFIG?.DEBUG_MODE) console.warn('Bobby: Optional module injection reported failure:', resp?.error);
      } else if (window.BOBBY_CONFIG?.DEBUG_MODE) {
        console.log(`Bobby: Injected ${resp.injected || files.length} optional modules`);
      }
    } catch (e) {
      if (window.BOBBY_CONFIG?.DEBUG_MODE) console.warn('Bobby: Optional module injection failed:', e?.message || e);
    }
  }

  // Initialize global API functions for backward compatibility
  function initializeGlobalAPIs() {
    // Make sure we have the config
    if (!window.BOBBY_CONFIG) {
      if (window.BOBBY_CONFIG?.DEBUG_MODE) console.error('Bobby: Config not loaded');
      return;
    }

    // Create APIClient instance
    const apiClient = new window.APIClient(window.BOBBY_CONFIG);
    
    // Global API functions
    window.sendToOpenAI = async (text, promptType) => {
      const promptManager = new window.PromptManager();
      const mode = promptType || 'explain';
      const messages = promptManager.generatePrompt(text, mode);
      
      try {
        const result = await apiClient.analyzeWithOpenAI(messages);
        return {
          choices: [{
            message: {
              content: result.result
            }
          }]
        };
      } catch (error) {
        if (window.BOBBY_CONFIG?.DEBUG_MODE) console.error('Error calling OpenAI:', error);
        throw error;
      }
    };

    window.sendToPerplexity = async (query) => {
      try {
        const result = await apiClient.queryPerplexity(query);
        return result;
      } catch (error) {
        if (window.BOBBY_CONFIG?.DEBUG_MODE) console.error('Error calling Perplexity:', error);
        throw error;
      }
    };

    window.sendFollowUpQuestion = async (question, context, usePerplexity = false) => {
      if (usePerplexity) {
        return window.sendToPerplexity(question);
      } else {
        const messages = [
          {
            role: 'system',
            content: 'You are a helpful AI assistant answering follow-up questions.'
          },
          {
            role: 'assistant',
            content: context
          },
          {
            role: 'user',
            content: question
          }
        ];
        
        const result = await apiClient.analyzeWithOpenAI(messages);
        return {
          choices: [{
            message: {
              content: result.result
            }
          }]
        };
      }
    };

    window.factCheck = async (text) => {
      const detector = new window.HallucinationDetector(
        window.BOBBY_CONFIG.OPENAI_API_KEY,
        window.BOBBY_CONFIG.EXA_API_KEY
      );
      
      const claims = await detector.extractClaims(text);
      const verifications = await Promise.all(
        claims.map(claim => detector.verifyClaim(claim.claim, claim.original_text))
      );
      
      return detector.formatResults(verifications);
    };

    // Prompt management functions
    window.createPromptButton = (promptId) => {
      const promptManager = new window.PromptManager();
      return promptManager.createPromptButton(promptId);
    };

    window.handlePromptChange = async (text, promptType) => {
      const response = await window.sendToOpenAI(text, promptType);
      return response;
    };

    // Format content based on prompt type
    window.formatContent = async (promptType, content, originalText) => {
      // This is a placeholder - in the actual implementation,
      // this would format the content based on the prompt type
      return content;
    };

    // Expose other utilities
    window.BobbyModules = {
      PromptManager: window.PromptManager,
      APIClient: window.APIClient,
      UIComponents: window.UIComponents,
      ButtonManager: window.ButtonManager,
      HistoryManager: window.HistoryManager,
      DragManager: window.DragManager,
      HallucinationDetector: window.HallucinationDetector
    };

    if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: Global APIs initialized');
  }

  // Initialize modules immediately since they're pre-loaded by manifest
  initializeModules();
})();
