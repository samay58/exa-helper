// Bobby Chrome Extension - Module Loader
// Verifies all modules are loaded and initializes global APIs

(async function() {
  'use strict';

  // Initialize modules when DOM is ready
  async function initializeModules() {
    console.log('Bobby: Initializing module system...');
    
    // Check config is available
    if (!window.BOBBY_CONFIG) {
      console.error('Bobby: Critical error - BOBBY_CONFIG not found');
      console.error('Bobby: Extension will not function without proper config.js');
      
      window.dispatchEvent(new CustomEvent('bobby-modules-error', { 
        detail: { error: 'BOBBY_CONFIG not found' } 
      }));
      return;
    }
    
    console.log('Bobby: Config verified, BOBBY_CONFIG available');
    
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
        console.error(`Bobby: Module ${moduleName} not available`);
        missingModules.push(moduleName);
        allModulesAvailable = false;
      } else {
        console.log(`Bobby: Module ${moduleName} verified`);
      }
    }
    
    if (!allModulesAvailable) {
      console.error('Bobby: Missing modules:', missingModules);
      console.error('Bobby: Some features may not work properly');
      
      window.dispatchEvent(new CustomEvent('bobby-modules-error', { 
        detail: { 
          error: 'Missing modules', 
          missingModules: missingModules 
        } 
      }));
      return;
    }
    
    console.log('Bobby: All modules verified and available');
    
    // Initialize global API functions
    try {
      initializeGlobalAPIs();
      console.log('Bobby: Global APIs initialized');
    } catch (error) {
      console.error('Bobby: Error initializing APIs:', error);
    }
    
    // Dispatch event to notify that modules are ready
    window.dispatchEvent(new CustomEvent('bobby-modules-ready'));
    console.log('Bobby: Module system ready');
  }

  // Initialize global API functions for backward compatibility
  function initializeGlobalAPIs() {
    // Make sure we have the config
    if (!window.BOBBY_CONFIG) {
      console.error('Bobby: Config not loaded');
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
        console.error('Error calling OpenAI:', error);
        throw error;
      }
    };

    window.sendToPerplexity = async (query) => {
      try {
        const result = await apiClient.queryPerplexity(query);
        return result;
      } catch (error) {
        console.error('Error calling Perplexity:', error);
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

    console.log('Bobby: Global APIs initialized');
  }

  // Initialize modules immediately since they're pre-loaded by manifest
  initializeModules();
})();