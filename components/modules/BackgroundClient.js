// BackgroundClient - thin promise-based wrapper around chrome.runtime.sendMessage
// Avoids scattering string action names and ad-hoc message shapes

(function() {
  'use strict';

  class BackgroundClient {
    constructor() {
      this.actions = window.MessageTypes || {};
    }

    send(action, payload = {}) {
      return new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage({ action, ...payload }, (response) => {
            const lastErr = chrome.runtime.lastError;
            if (lastErr) return reject(new Error(lastErr.message));
            if (!response || response.success === false) {
              return reject(new Error(response?.error || 'Unknown error'));
            }
            resolve(response);
          });
        } catch (e) {
          reject(e);
        }
      });
    }

    analyzeText({ text, mode, systemPrompt, userPrompt }) {
      return this.send(this.actions.ANALYZE_TEXT || 'analyzeText', {
        text,
        mode,
        systemPrompt,
        userPrompt
      });
    }

    exaSearch({ query, num_results = 5 }) {
      return this.send(this.actions.EXA_SEARCH || 'exaSearch', { query, num_results });
    }

    exaAnswer({ question, context }) {
      return this.send(this.actions.EXA_ANSWER || 'exaAnswer', { question, context });
    }

    factCheck({ text }) {
      return this.send(this.actions.FACT_CHECK || 'factCheck', { text });
    }

    getConfig() {
      return this.send(this.actions.GET_CONFIG || 'getConfig');
    }

    validateApiKey({ provider, apiKey }) {
      return this.send(this.actions.VALIDATE_API_KEY || 'validateApiKey', { provider, apiKey });
    }
  }

  window.BackgroundClient = BackgroundClient;
})();

