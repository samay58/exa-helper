// MessageTypes - central action constants for background messaging
// Keeps action names consistent across content and background

window.MessageTypes = Object.freeze({
  ANALYZE_TEXT: 'analyzeText',
  FACT_CHECK: 'factCheck',
  EXA_SEARCH: 'exaSearch',
  EXA_ANSWER: 'exaAnswer',
  PERPLEXITY_QUERY: 'perplexityQuery',
  SAVE_API_KEYS: 'saveApiKeys',
  GET_CONFIG: 'getConfig',
  VALIDATE_API_KEY: 'validateApiKey',
  LOAD_OPTIONAL_MODULES: 'loadOptionalModules'
});

