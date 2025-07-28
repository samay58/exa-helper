// Bobby Chrome Extension - Enhanced Content Script
// Handles text selection, UI injection, fact-checking, and follow-up questions

// Wait for modules to be ready
let modulesReady = false;

// Check if modules are already ready (in case this loads after ModuleLoader)
if (window.BobbyModules || (window.PromptManager && window.APIClient)) {
  modulesReady = true;
  console.log('Bobby: Modules already loaded, initializing content script');
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
} else {
  // Wait for modules to be ready
  window.addEventListener('bobby-modules-ready', () => {
    modulesReady = true;
    console.log('Bobby: Modules loaded, initializing content script');
    init();
  });
}

// Handle module loading errors
window.addEventListener('bobby-modules-error', (event) => {
  console.error('Bobby: Module loading failed:', event.detail.error);
  console.error('Bobby: Please check your config.js file exists and is properly formatted');
});

// State management
var selectedText = '';
var fabButton = null;
var popupWindow = null;
var currentMode = 'explain';
var currentHistoryId = null;
var dragManager = null;
var buttonManager = null;
var currentResponse = '';

// Initialize content script
function init() {
  console.log('Bobby: init() called, starting initialization...');
  
  // Check if already initialized
  if (window.bobbyInitialized) {
    console.log('Bobby: Already initialized, skipping...');
    return;
  }
  
  try {
    // Check if modules are available
    if (!window.ButtonManager) {
      console.error('Bobby: ButtonManager not available, retrying...');
      setTimeout(init, 100);
      return;
    }
    
    // Reset buttonManager if it was set to something else
    if (buttonManager !== null && !(buttonManager instanceof window.ButtonManager)) {
      console.log('Bobby: buttonManager was corrupted, resetting...');
      buttonManager = null;
    }
    
    console.log('Bobby: Creating ButtonManager instance...');
    // Initialize managers
    buttonManager = new window.ButtonManager();
    console.log('Bobby: ButtonManager created successfully, storing in window for debugging');
    window.bobbyButtonManager = buttonManager; // Store for debugging
    
    // Listen for text selection
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('selectionchange', handleSelectionChange);
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleMessage);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
    
    // Clean up on page navigation
    window.addEventListener('beforeunload', cleanup);
    
    // Mark as initialized
    window.bobbyInitialized = true;
    
    console.log('Bobby Extension initialized successfully');
  } catch (error) {
    console.error('Bobby: Error during initialization:', error);
    console.error('Bobby: Stack trace:', error.stack);
  }
}

// Handle messages from background script
function handleMessage(request, sender, sendResponse) {
  if (request.action === 'analyzeSelection') {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text) {
      selectedText = text;
      showPopup();
    }
  }
  return false;
}

// Handle keyboard shortcuts
function handleKeyboard(e) {
  // Alt + B to analyze selected text
  if (e.altKey && e.key === 'b') {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text) {
      selectedText = text;
      showPopup();
    }
  }
  
  // Escape to close popup
  if (e.key === 'Escape' && popupWindow) {
    closePopup();
  }
}

// Handle text selection
function handleTextSelection(event) {
  if (!modulesReady) return;
  
  // Small delay to ensure selection is complete
  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text && text.length > 3 && text.length < 5000) {
      selectedText = text;
      showFAB(event.clientX, event.clientY);
    } else if (!text && fabButton) {
      hideFAB();
    }
  }, 10);
}

// Handle selection change
function handleSelectionChange() {
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  if (!text && fabButton && !popupWindow) {
    hideFAB();
  }
}

// Show floating action button
function showFAB(x, y) {
  // Ensure buttonManager is initialized before showing FAB
  if (!buttonManager && window.ButtonManager) {
    console.log('Bobby: Initializing ButtonManager in showFAB...');
    buttonManager = new window.ButtonManager();
    window.bobbyButtonManager = buttonManager;
  }
  
  if (!fabButton) {
    createFAB();
  }
  
  // Position FAB near selection
  const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
  fabButton.style.left = `${rect.right + 10}px`;
  fabButton.style.top = `${rect.top - 10}px`;
  fabButton.style.display = 'block';
  
  // Add show animation
  requestAnimationFrame(() => {
    fabButton.classList.add('bobby-fab-show');
  });
}

// Create floating action button
function createFAB() {
  fabButton = document.createElement('button');
  fabButton.className = 'bobby-fab';
  fabButton.innerHTML = '✨';
  fabButton.title = 'Analyze with Bobby (Alt+B)';
  
  fabButton.addEventListener('click', (e) => {
    e.stopPropagation();
    showPopup();
    hideFAB();
  });
  
  document.body.appendChild(fabButton);
}

// Hide floating action button
function hideFAB() {
  if (fabButton) {
    fabButton.classList.remove('bobby-fab-show');
    setTimeout(() => {
      if (fabButton) {
        fabButton.style.display = 'none';
      }
    }, 200);
  }
}

// Show analysis popup
async function showPopup() {
  console.log('Bobby: showPopup called, buttonManager:', !!buttonManager, 'window.ButtonManager:', !!window.ButtonManager);
  
  // Ensure buttonManager is initialized (check for both null and false)
  if (!buttonManager || buttonManager === false) {
    console.error('Bobby: Cannot show popup - ButtonManager not initialized');
    // Try to initialize it if the module is available
    if (window.ButtonManager) {
      console.log('Bobby: Attempting to create ButtonManager now...');
      buttonManager = new window.ButtonManager();
      window.bobbyButtonManager = buttonManager; // Store for debugging
    } else {
      console.error('Bobby: ButtonManager module not available');
      return;
    }
  }
  
  if (popupWindow) {
    closePopup();
  }
  
  // Create popup container
  popupWindow = document.createElement('div');
  popupWindow.className = 'bobby-popup';
  
  // Create collapsed text preview
  const textPreview = selectedText.length > 50 
    ? `${selectedText.substring(0, 50)}...` 
    : selectedText;
  
  popupWindow.innerHTML = `
    <div class="bobby-header">
      <div class="bobby-drag-handle">⋮⋮</div>
      <h3>Bobby AI Assistant</h3>
      <div class="bobby-header-actions"></div>
    </div>
    
    <div class="bobby-selected-context">
      <div class="bobby-context-header">
        <span class="bobby-context-label">Selected text:</span>
        <span class="bobby-context-preview">"${escapeHtml(textPreview)}"</span>
        ${selectedText.length > 50 ? '<button class="bobby-context-toggle">▼</button>' : ''}
      </div>
      <div class="bobby-context-full" style="display: none;">
        <p>${escapeHtml(selectedText)}</p>
      </div>
    </div>
    
    <div class="bobby-prompt-bar">
      ${createPromptButtons()}
    </div>
    
    <div class="bobby-content">
      <div class="bobby-result">
        <div class="bobby-loader">
          <div class="bobby-spinner"></div>
          <p>Choose an analysis mode above...</p>
        </div>
      </div>
    </div>
    
    <div class="bobby-footer">
      <button class="bobby-followup-btn">
        <span>💬</span> Ask Follow-up Question
      </button>
    </div>
    
    <div class="bobby-resize-handle"></div>
  `;
  
  // Add to page
  document.body.appendChild(popupWindow);
  
  // Add action buttons to header
  const headerActions = popupWindow.querySelector('.bobby-header-actions');
  const actionButtons = buttonManager.createActionButtons();
  headerActions.appendChild(actionButtons.copy);
  headerActions.appendChild(actionButtons.favorite);
  headerActions.appendChild(actionButtons.close);
  
  // Set initial position
  positionPopup();
  
  // Setup drag manager
  dragManager = new window.DragManager(popupWindow, {
    handle: '.bobby-drag-handle',
    onDragEnd: () => dragManager.savePosition()
  });
  
  // Restore saved position if available
  dragManager.restorePosition();
  
  // Setup event handlers
  setupPopupEvents();
  
  // Animate in
  requestAnimationFrame(() => {
    popupWindow.classList.add('bobby-popup-show');
  });
  
  // Don't analyze immediately - wait for user to select a mode
}

// Create prompt buttons
function createPromptButtons() {
  const promptManager = new window.PromptManager();
  const buttons = promptManager.createAllButtons();
  
  return buttons.map(btn => btn.html).join('');
}

// Position popup window
function positionPopup() {
  const selection = window.getSelection();
  if (selection.rangeCount === 0) return;
  
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  const popupWidth = 480;
  const popupHeight = 400;
  
  let left = rect.left;
  let top = rect.bottom + 10;
  
  // Adjust if would go off screen
  if (left + popupWidth > window.innerWidth) {
    left = window.innerWidth - popupWidth - 20;
  }
  if (top + popupHeight > window.innerHeight) {
    top = rect.top - popupHeight - 10;
  }
  
  popupWindow.style.left = `${Math.max(20, left)}px`;
  popupWindow.style.top = `${Math.max(20, top)}px`;
  popupWindow.style.width = `${popupWidth}px`;
}

// Setup popup event handlers
function setupPopupEvents() {
  // Close button handled by ButtonManager
  window.bobbyClose = closePopup;
  
  // Prompt buttons
  popupWindow.querySelectorAll('.bobby-prompt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = e.currentTarget.dataset.mode;
      // Update UI to show active mode
      popupWindow.querySelectorAll('.bobby-prompt-btn').forEach(b => {
        b.classList.remove('active');
      });
      e.currentTarget.classList.add('active');
      switchMode(mode);
    });
  });
  
  // Context toggle
  const contextToggle = popupWindow.querySelector('.bobby-context-toggle');
  if (contextToggle) {
    contextToggle.addEventListener('click', () => {
      const fullContext = popupWindow.querySelector('.bobby-context-full');
      const isVisible = fullContext.style.display !== 'none';
      fullContext.style.display = isVisible ? 'none' : 'block';
      contextToggle.textContent = isVisible ? '▼' : '▲';
    });
  }
  
  // Follow-up button
  const followupBtn = popupWindow.querySelector('.bobby-followup-btn');
  if (followupBtn) {
    followupBtn.addEventListener('click', () => {
      showFollowUpInput();
    });
  }
  
  // Make resizable
  const resizeHandle = popupWindow.querySelector('.bobby-resize-handle');
  resizeHandle.addEventListener('mousedown', startResizing);
  
  // Global functions for buttons
  window.bobbyFollowUp = showFollowUpInput;
  window.currentHistoryId = null;
}

// Switch analysis mode
function switchMode(mode) {
  currentMode = mode;
  
  // Update active button
  popupWindow.querySelectorAll('.bobby-prompt-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  
  // Special handling for fact check
  if (mode === 'factcheck') {
    showFactCheckView();
  } else {
    analyzeText(mode);
  }
}

// Analyze text with selected mode
async function analyzeText(mode) {
  const resultDiv = popupWindow.querySelector('.bobby-result');
  const ui = new window.UIComponents();
  resultDiv.innerHTML = ui.createLoader('Analyzing text...');
  
  try {
    // Send message to background script with error handling
    let response;
    try {
      response = await chrome.runtime.sendMessage({
        action: 'analyzeText',
        text: selectedText,
        mode: mode
      });
    } catch (sendError) {
      // Handle cases where extension context is invalidated
      if (sendError.message.includes('Extension context invalidated')) {
        displayError('Extension was updated. Please refresh the page and try again.');
        return;
      }
      throw sendError;
    }
    
    if (response && response.success) {
      currentResponse = response.result;
      displayResult(response.result, response.fromCache);
      
      // Save to history
      const historyEntry = await window.HistoryManager.addToHistory(
        selectedText,
        response.result,
        mode
      );
      window.currentHistoryId = historyEntry.id;
      
    } else {
      displayError(response?.error || 'Unknown error occurred');
    }
  } catch (error) {
    displayError(error.message);
  }
}

// Show fact check view
async function showFactCheckView() {
  const resultDiv = popupWindow.querySelector('.bobby-result');
  const ui = new window.UIComponents();
  
  // Show loading state
  resultDiv.innerHTML = `
    <div class="bobby-fact-check-header">
      <span class="bobby-exa-badge">🔍</span>
      <h4>Fact Checking with Exa</h4>
    </div>
    ${ui.createLoader('Extracting claims and verifying...')}
  `;
  
  try {
    const detector = new window.HallucinationDetector(
      window.BOBBY_CONFIG.OPENAI_API_KEY,
      window.BOBBY_CONFIG.EXA_API_KEY
    );
    
    // Extract claims
    const claims = await detector.extractClaims(selectedText);
    
    // Update UI to show progress
    resultDiv.innerHTML = `
      <div class="bobby-fact-check-header">
        <span class="bobby-exa-badge">🔍</span>
        <h4>Fact Checking with Exa</h4>
      </div>
      ${ui.createLoader(`Verifying ${claims.length} claims...`)}
      ${ui.createProgressBar(0, 'Verification Progress')}
    `;
    
    // Verify each claim with rate limiting
    const verifications = [];
    for (let i = 0; i < claims.length; i++) {
      const claim = claims[i];
      const progress = Math.round(((i + 1) / claims.length) * 100);
      
      // Update progress
      const progressBar = resultDiv.querySelector('.bobby-progress-fill');
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }
      
      try {
        const verification = await detector.verifyClaim(claim.claim, claim.original_text);
        verifications.push(verification);
        
        // Add a small delay between API calls to avoid rate limits
        if (i < claims.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        }
      } catch (verifyError) {
        console.error('Error verifying claim:', verifyError);
        // Continue with error result for this claim
        verifications.push({
          claim: claim.claim,
          assessment: 'error',
          confidence: 0,
          summary: verifyError.message.includes('Rate limit') ? 'Rate limit reached' : 'Verification failed',
          sources: []
        });
      }
    }
    
    // Format and display results only if we have verifications
    if (verifications && verifications.length > 0) {
      const results = detector.formatResults(claims, verifications);
      displayFactCheckResults(results);
      
      // Save to history
      const historyEntry = await window.HistoryManager.addToHistory(
        selectedText,
        JSON.stringify(results),
        'factcheck',
        { factCheckData: results }
      );
      window.currentHistoryId = historyEntry.id;
    } else {
      throw new Error('No claims could be verified. Please try again later.');
    }
    
  } catch (error) {
    console.error('Error during fact check:', error);
    // Show user-friendly error message
    if (error.message.includes('Rate limit') || error.message.includes('429')) {
      displayError('⏳ Rate limit exceeded. Please wait a moment and try again. Consider upgrading your OpenAI plan for higher limits.');
    } else if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('400')) {
      displayError('Invalid API key. Please update your OpenAI API key in config.js and reload the extension.');
    } else {
      displayError(error.message);
    }
  }
}

// Display fact check results
function displayFactCheckResults(results) {
  const resultDiv = popupWindow.querySelector('.bobby-result');
  const ui = new window.UIComponents();
  
  // Calculate score color based on reliability
  const scoreColor = results.overallScore >= 80 ? '#4ade80' : 
                     results.overallScore >= 60 ? '#fbbf24' : 
                     results.overallScore >= 40 ? '#fb923c' : '#ef4444';
  
  const summaryHtml = `
    <div class="bobby-fact-check-summary">
      <div class="bobby-score-circle" style="--score-color: ${scoreColor}">
        <svg viewBox="0 0 100 100" class="bobby-score-ring">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" stroke-width="8"/>
          <circle cx="50" cy="50" r="45" fill="none" stroke="${scoreColor}" stroke-width="8"
                  stroke-dasharray="${results.overallScore * 2.83} 283"
                  stroke-dashoffset="0"
                  transform="rotate(-90 50 50)"/>
        </svg>
        <div class="bobby-score-text">
          <span class="bobby-score-value">${results.overallScore}%</span>
          <span class="bobby-score-label">Reliability</span>
        </div>
      </div>
      <div class="bobby-claim-stats">
        ${results.summary.true > 0 ? `
        <div class="bobby-stat bobby-stat-true">
          <span class="bobby-stat-icon">✅</span>
          <span class="bobby-stat-count">${results.summary.true}</span>
          <span class="bobby-stat-label">True</span>
        </div>` : ''}
        ${results.summary.false > 0 ? `
        <div class="bobby-stat bobby-stat-false">
          <span class="bobby-stat-icon">❌</span>
          <span class="bobby-stat-count">${results.summary.false}</span>
          <span class="bobby-stat-label">False</span>
        </div>` : ''}
        ${results.summary.partially_true > 0 ? `
        <div class="bobby-stat bobby-stat-partial">
          <span class="bobby-stat-icon">⚠️</span>
          <span class="bobby-stat-count">${results.summary.partially_true}</span>
          <span class="bobby-stat-label">Partial</span>
        </div>` : ''}
        ${results.summary.unverifiable > 0 ? `
        <div class="bobby-stat bobby-stat-unverifiable">
          <span class="bobby-stat-icon">❓</span>
          <span class="bobby-stat-count">${results.summary.unverifiable}</span>
          <span class="bobby-stat-label">Unverifiable</span>
        </div>` : ''}
        ${results.summary.needs_context > 0 ? `
        <div class="bobby-stat bobby-stat-context">
          <span class="bobby-stat-icon">📋</span>
          <span class="bobby-stat-count">${results.summary.needs_context}</span>
          <span class="bobby-stat-label">Needs Context</span>
        </div>` : ''}
      </div>
    </div>
  `;
  
  const claimsHtml = results.verifications.map((v, index) => {
    const statusClass = `bobby-claim-${v.assessment}`;
    const statusIcon = getStatusIcon(v.assessment);
    const statusLabel = getStatusLabel(v.assessment);
    
    return `
      <div class="bobby-claim-card ${statusClass}">
        <div class="bobby-claim-header">
          <span class="bobby-claim-status">
            <span class="bobby-status-icon">${statusIcon}</span>
            <span class="bobby-status-label">${statusLabel}</span>
          </span>
          <span class="bobby-confidence-badge" style="opacity: ${v.confidence / 100}">
            ${v.confidence}% confident
          </span>
        </div>
        <div class="bobby-claim-content">
          <p class="bobby-claim-text">"${escapeHtml(v.claim)}"</p>
          <p class="bobby-assessment-text">${escapeHtml(v.summary)}</p>
          ${v.fixed_text !== v.originalText ? 
            `<div class="bobby-corrected-text">
              <span class="bobby-corrected-label">✏️ Suggested correction:</span>
              <p>"${escapeHtml(v.fixed_text)}"</p>
            </div>` : ''}
        </div>
        ${v.sources && v.sources.length > 0 ?
          `<div class="bobby-claim-sources">
            <span class="bobby-sources-label">📚 Sources:</span>
            <div class="bobby-sources-list">
              ${v.sources.map((s, i) => 
                `<a href="${s.url}" target="_blank" rel="noopener" class="bobby-source-link">
                  <span class="bobby-source-number">[${i + 1}]</span>
                  ${escapeHtml(s.title)}
                </a>`
              ).join('')}
            </div>
          </div>` : ''}
      </div>
    `;
  }).join('');
  
  resultDiv.innerHTML = `
    <div class="bobby-fact-check-container">
      <div class="bobby-fact-check-header">
        <div class="bobby-exa-badge">
          <span>Powered by</span>
          <img src="${chrome.runtime.getURL('assets/icons/exa-logo.png')}" alt="Exa" class="bobby-exa-logo">
        </div>
        <h4>Fact Check Analysis</h4>
      </div>
      ${summaryHtml}
      <div class="bobby-claims-section">
        <h5 class="bobby-claims-title">Verified Claims (${results.verifications.length})</h5>
        <div class="bobby-claims-list">
          ${claimsHtml}
        </div>
      </div>
    </div>
  `;
  
  // Save fact check results to history
  window.HistoryManager.addToHistory(
    selectedText,
    JSON.stringify(results),
    'factcheck',
    { factCheckResults: results }
  ).then(entry => {
    window.currentHistoryId = entry.id;
  });
}

// Get status icon for assessment
function getStatusIcon(assessment) {
  const icons = {
    'true': '✅',
    'false': '❌',
    'partially_true': '⚠️',
    'unverifiable': '❓',
    'needs_context': '📋',
    'error': '⚡'
  };
  return icons[assessment] || '❓';
}

// Get status label for assessment
function getStatusLabel(assessment) {
  const labels = {
    'true': 'Verified',
    'false': 'False',
    'partially_true': 'Partially True',
    'unverifiable': 'Unverifiable',
    'needs_context': 'Needs Context',
    'error': 'Error'
  };
  return labels[assessment] || 'Unknown';
}

// Show follow-up input
function showFollowUpInput() {
  const footer = popupWindow.querySelector('.bobby-footer');
  
  // Check if follow-up input already exists
  const existingInput = popupWindow.querySelector('.bobby-followup-input-container');
  if (existingInput) {
    existingInput.remove();
    return;
  }
  
  // Create follow-up input container
  const followUpContainer = document.createElement('div');
  followUpContainer.className = 'bobby-followup-input-container';
  followUpContainer.innerHTML = `
    <div class="bobby-followup-header">
      <span>💬 Ask a follow-up question</span>
      <button class="bobby-followup-close">✕</button>
    </div>
    <div class="bobby-followup-input-wrapper">
      <textarea class="bobby-followup-input" 
        placeholder="What would you like to know more about?" 
        rows="2"></textarea>
      <button class="bobby-followup-submit" title="Ask Question (Ctrl+Enter)">
        <span>→</span>
      </button>
    </div>
  `;
  
  // Insert above footer
  footer.parentNode.insertBefore(followUpContainer, footer);
  
  // Focus on textarea
  const textarea = followUpContainer.querySelector('.bobby-followup-input');
  textarea.focus();
  
  // Handle close
  followUpContainer.querySelector('.bobby-followup-close').addEventListener('click', () => {
    followUpContainer.remove();
  });
  
  // Handle submit
  const submitBtn = followUpContainer.querySelector('.bobby-followup-submit');
  const submitQuestion = () => {
    const question = textarea.value.trim();
    if (question) {
      handleFollowUp(question);
      followUpContainer.remove();
    }
  };
  
  submitBtn.addEventListener('click', submitQuestion);
  
  // Submit on Enter (Ctrl/Cmd + Enter)
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitQuestion();
    }
  });
}

// Handle follow-up question
async function handleFollowUp(question) {
  const resultDiv = popupWindow.querySelector('.bobby-result');
  const ui = new window.UIComponents();
  
  resultDiv.innerHTML = ui.createLoader('Finding answer...');
  
  try {
    // Use Exa Answer API with error handling
    let response;
    try {
      response = await chrome.runtime.sendMessage({
        action: 'exaAnswer',
        question: question,
        context: currentResponse
      });
    } catch (sendError) {
      // Handle cases where extension context is invalidated
      if (sendError.message.includes('Extension context invalidated')) {
        displayError('Extension was updated. Please refresh the page and try again.');
        return;
      }
      throw sendError;
    }
    
    if (response && response.success) {
      displayFollowUpAnswer(question, response.answer);
      
      // Save to history as follow-up
      if (window.currentHistoryId) {
        await window.HistoryManager.addFollowUp(
          window.currentHistoryId,
          question,
          response.answer.content
        );
      }
    } else {
      displayError(response?.error || 'Unknown error occurred');
    }
  } catch (error) {
    displayError(error.message);
  }
}

// Display follow-up answer
function displayFollowUpAnswer(question, answer) {
  const resultDiv = popupWindow.querySelector('.bobby-result');
  const ui = new window.UIComponents();
  
  // First convert markdown to HTML
  let formattedAnswer = ui.markdownToHtml(answer.content);
  
  // Then replace citation markers [1], [2], etc. with inline hyperlinks
  if (answer.sources && answer.sources.length > 0) {
    answer.sources.forEach(source => {
      const citationPattern = new RegExp(`\\[${source.number}\\]`, 'g');
      const citationLink = `[<a href="${source.url}" target="_blank" rel="noopener" class="bobby-inline-citation">${source.number}</a>]`;
      formattedAnswer = formattedAnswer.replace(citationPattern, citationLink);
    });
  }
  
  // Display in a clean, styled format similar to regular analysis
  resultDiv.innerHTML = `
    <div class="bobby-analysis">
      <div class="bobby-followup-question">
        <strong>Q:</strong> ${escapeHtml(question)}
      </div>
      <div class="bobby-markdown">${formattedAnswer}</div>
    </div>
  `;
}


// Display analysis result
function displayResult(result, fromCache = false) {
  const resultDiv = popupWindow.querySelector('.bobby-result');
  const ui = new window.UIComponents();
  
  resultDiv.innerHTML = `
    <div class="bobby-analysis">
      ${fromCache ? '<p class="bobby-cache-notice">📦 From cache</p>' : ''}
      <div class="bobby-markdown">${ui.markdownToHtml(result)}</div>
    </div>
  `;
}

// Display error message
function displayError(error) {
  const resultDiv = popupWindow.querySelector('.bobby-result');
  const ui = new window.UIComponents();
  
  resultDiv.innerHTML = ui.createError(
    error,
    'Please check your API configuration in the extension options.'
  );
}

// Close popup
function closePopup() {
  if (popupWindow) {
    popupWindow.classList.remove('bobby-popup-show');
    setTimeout(() => {
      if (popupWindow) {
        popupWindow.remove();
        popupWindow = null;
        dragManager = null;
        currentHistoryId = null;
      }
    }, 200);
  }
}

// Resizing functionality
let isResizing = false;
function startResizing(e) {
  isResizing = true;
  const startX = e.clientX;
  const startWidth = popupWindow.offsetWidth;
  const startHeight = popupWindow.offsetHeight;
  
  function handleMouseMove(e) {
    if (!isResizing) return;
    
    const newWidth = Math.max(300, Math.min(800, startWidth + (e.clientX - startX)));
    popupWindow.style.width = `${newWidth}px`;
  }
  
  function handleMouseUp() {
    isResizing = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeSelection' && request.text) {
    selectedText = request.text;
    showPopup();
    sendResponse({ success: true });
  }
  return false; // Synchronous response
});

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Cleanup function
function cleanup() {
  if (fabButton) {
    fabButton.remove();
    fabButton = null;
  }
  if (popupWindow) {
    popupWindow.remove();
    popupWindow = null;
  }
  if (dragManager) {
    dragManager.destroy();
    dragManager = null;
  }
  if (buttonManager) {
    // ButtonManager doesn't have a destroy method, just reset it
    buttonManager = null;
  }
}

// Initialization is now handled at the top of the file