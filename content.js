// Bobby Chrome Extension - Enhanced Content Script
// Handles text selection, UI injection, fact-checking, and follow-up questions

// Load V2 styles if glassmorphism is enabled
if (window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM) {
  const v2Styles = document.createElement('link');
  v2Styles.rel = 'stylesheet';
  v2Styles.href = chrome.runtime.getURL('styles-v2.css');
  document.head.appendChild(v2Styles);
}

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
var particleEffects = null;
var contentAnalyzer = null;
var interactionEffects = null;
var themeManager = null;

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
    
    // Initialize V2 modules if enabled
    if (window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_PARTICLE_EFFECTS && window.ParticleEffects) {
      particleEffects = new window.ParticleEffects();
      console.log('Bobby: ParticleEffects initialized');
    }
    
    if (window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_CONTEXT_AWARE && window.ContentAnalyzer) {
      contentAnalyzer = new window.ContentAnalyzer();
      console.log('Bobby: ContentAnalyzer initialized');
    }
    
    if (window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_SPRING_ANIMATIONS && window.InteractionEffects) {
      interactionEffects = new window.InteractionEffects();
      console.log('Bobby: InteractionEffects initialized');
    }
    
    if (window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_ADAPTIVE_THEME && window.ThemeManager) {
      themeManager = new window.ThemeManager();
      console.log('Bobby: ThemeManager initialized');
    }
    
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
    const showClass = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM ? 'bobby-show' : 'bobby-fab-show';
    fabButton.classList.add(showClass);
  });
}

// Create floating action button
function createFAB() {
  fabButton = document.createElement('button');
  const useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM;
  fabButton.className = useV2 ? 'bobby-fab-v2' : 'bobby-fab';
  fabButton.innerHTML = '✨';
  fabButton.title = 'Analyze with Bobby (Alt+B)';
  
  fabButton.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Add particle effect if enabled
    if (particleEffects && window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_PARTICLE_EFFECTS) {
      particleEffects.burst(e.clientX, e.clientY, 10);
    }
    
    showPopup();
    hideFAB();
  });
  
  // Add hover particles if enabled
  if (particleEffects && window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_PARTICLE_EFFECTS) {
    particleEffects.attachToElement(fabButton, {
      event: 'mouseenter',
      count: 3,
      continuous: false
    });
  }
  
  document.body.appendChild(fabButton);
  
  // Apply adaptive theme if enabled
  if (themeManager && window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_ADAPTIVE_THEME) {
    themeManager.applyTheme(fabButton);
  }
}

// Hide floating action button
function hideFAB() {
  if (fabButton) {
    const showClass = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM ? 'bobby-show' : 'bobby-fab-show';
    fabButton.classList.remove(showClass);
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
  const useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM;
  popupWindow.className = useV2 ? 'bobby-popup-v2' : 'bobby-popup';
  
  // Create collapsed text preview
  const textPreview = selectedText.length > 50 
    ? `${selectedText.substring(0, 50)}...` 
    : selectedText;
  
  popupWindow.innerHTML = `
    <div class="bobby-glass-grain"></div>
    <div class="bobby-header">
      <div class="bobby-drag-handle">⋮⋮</div>
      <img src="${chrome.runtime.getURL('assets/icons/bobby-typeface-logo.png')}" alt="Bobby" class="bobby-logo">
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
    
    <div class="${useV2 ? 'bobby-content-v2' : 'bobby-content'}">
      <div class="${useV2 ? 'bobby-result-v2' : 'bobby-result'}">
        ${useV2 ? 
          new window.UIComponents().createGlassmorphismLoader('Choose an analysis mode above...') :
          `<div class="bobby-loader">
            <div class="bobby-spinner"></div>
            <p>Choose an analysis mode above...</p>
          </div>`
        }
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
  
  // Apply adaptive theme if enabled
  if (themeManager && window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_ADAPTIVE_THEME) {
    themeManager.applyTheme(popupWindow);
  }
  
  // Add action buttons to header
  const headerActions = popupWindow.querySelector('.bobby-header-actions');
  const actionButtons = buttonManager.createActionButtons();
  headerActions.appendChild(actionButtons.copy);
  // Only add favorite button if there's enough space
  // Commenting out for now to clean up the UI
  // headerActions.appendChild(actionButtons.favorite);
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
  
  // Animate in with spring physics if enabled
  requestAnimationFrame(() => {
    const useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM;
    const showClass = useV2 ? 'bobby-show' : 'bobby-popup-show';
    
    if (window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_SPRING_ANIMATIONS) {
      popupWindow.classList.add(showClass);
      // Add slide-in effect
      if (interactionEffects) {
        interactionEffects.slideIn(popupWindow, 'bottom', 30);
      }
    } else {
      popupWindow.classList.add(showClass);
    }
  });
  
  // Attach interaction effects to all buttons
  if (interactionEffects && window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_SPRING_ANIMATIONS) {
    setTimeout(() => {
      popupWindow.querySelectorAll('button').forEach(btn => {
        interactionEffects.attachToElement(btn, {
          click: true,
          hover: true,
          ripple: true
        });
      });
    }, 100);
  }
  
  // Don't analyze immediately - wait for user to select a mode
}

// Create prompt buttons with better layout
function createPromptButtons() {
  const promptManager = new window.PromptManager();
  const useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM;
  
  // Define primary and secondary actions
  const primaryModes = ['explain', 'summarize', 'keyPoints'];
  const secondaryModes = ['eli5', 'factcheck'];
  
  let allButtons;
  if (window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_CONTEXT_AWARE) {
    const contextData = promptManager.createContentButtons(selectedText);
    if (popupWindow && contextData.contentType) {
      popupWindow.classList.add(`bobby-context-${contextData.contentType}`);
    }
    allButtons = contextData.buttons;
  } else {
    allButtons = promptManager.createAllButtons();
  }
  
  // Separate buttons into primary and secondary
  const primaryButtons = allButtons.filter(btn => {
    // For V1 buttons, use btn.key; for V2 buttons, check btn.action
    const modeKey = btn.key || btn.action || btn.mode;
    return primaryModes.includes(modeKey);
  });
  
  const secondaryButtons = allButtons.filter(btn => {
    // For V1 buttons, use btn.key; for V2 buttons, check btn.action
    const modeKey = btn.key || btn.action || btn.mode;
    return secondaryModes.includes(modeKey);
  });
  
  // Create HTML structure
  return `
    <div class="bobby-primary-actions">
      ${primaryButtons.map(btn => btn.html).join('')}
    </div>
    <div class="bobby-secondary-actions">
      ${secondaryButtons.map(btn => {
        // Convert to icon-only for secondary actions
        const parser = new DOMParser();
        const doc = parser.parseFromString(btn.html, 'text/html');
        const button = doc.querySelector('button');
        if (button) {
          button.classList.add('bobby-icon-only');
          // Get name and icon from the button object
          const name = btn.mode?.name || btn.action?.name || btn.name || 'Action';
          const icon = btn.mode?.icon || btn.action?.icon || btn.icon || '🔍';
          button.setAttribute('title', name);
          button.setAttribute('aria-label', name);
          button.innerHTML = icon;
        }
        return button ? button.outerHTML : btn.html;
      }).join('')}
    </div>
  `;
}

// Position popup window with smart positioning
function positionPopup() {
  const selection = window.getSelection();
  if (selection.rangeCount === 0) return;
  
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  const MARGIN = 40; // Comfortable margin from edges
  const popupWidth = 480;
  const popupHeight = 400;
  
  // Get viewport dimensions
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY
  };
  
  // Calculate initial position (centered on selection)
  let position = {
    x: rect.left + (rect.width / 2) - (popupWidth / 2),
    y: rect.bottom + 20
  };
  
  // Constrain horizontally with margins
  position.x = Math.max(MARGIN, Math.min(position.x, viewport.width - popupWidth - MARGIN));
  
  // Check if popup would go below viewport
  if (position.y + popupHeight > viewport.height - MARGIN) {
    // Try positioning above the selection
    position.y = rect.top - popupHeight - 20;
    
    // If still doesn't fit, center in viewport
    if (position.y < MARGIN) {
      position.x = (viewport.width - popupWidth) / 2;
      position.y = (viewport.height - popupHeight) / 2;
    }
  }
  
  // Ensure minimum margin from top
  position.y = Math.max(MARGIN, position.y);
  
  // Apply position
  popupWindow.style.left = `${position.x}px`;
  popupWindow.style.top = `${position.y}px`;
  popupWindow.style.width = `${popupWidth}px`;
  
  // Store initial position for drag manager
  popupWindow.dataset.initialX = position.x;
  popupWindow.dataset.initialY = position.y;
}

// Setup popup event handlers
function setupPopupEvents() {
  // Close button handled by ButtonManager
  window.bobbyClose = closePopup;
  
  // Prompt buttons (support both v1 and v2 buttons, including in button groups)
  const buttonSelector = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_CONTEXT_AWARE 
    ? '.bobby-action-btn-v2, .bobby-prompt-btn' 
    : '.bobby-prompt-btn';
    
  // Select buttons from both primary and secondary actions
  const allButtons = popupWindow.querySelectorAll(`
    .bobby-primary-actions ${buttonSelector},
    .bobby-secondary-actions ${buttonSelector},
    .bobby-prompt-bar > ${buttonSelector}
  `);
  
  allButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = e.currentTarget.dataset.mode || e.currentTarget.dataset.action;
      const prompt = e.currentTarget.dataset.prompt;
      const isSpecial = e.currentTarget.dataset.special === 'true';
      
      // Add particle effect on click if enabled
      if (particleEffects && window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_PARTICLE_EFFECTS) {
        const rect = e.currentTarget.getBoundingClientRect();
        particleEffects.burst(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
          8
        );
      }
      
      // Add interaction effect if enabled
      if (interactionEffects && window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_SPRING_ANIMATIONS) {
        interactionEffects.popButton(e.currentTarget);
      }
      
      // Disable all buttons during processing
      const allActionButtons = popupWindow.querySelectorAll(`
        .bobby-primary-actions ${buttonSelector},
        .bobby-secondary-actions ${buttonSelector},
        .bobby-prompt-bar > ${buttonSelector}
      `);
      allActionButtons.forEach(b => {
        b.classList.remove('active');
        b.disabled = true;
      });
      
      // Mark clicked button as active and loading
      const clickedButton = e.currentTarget;
      clickedButton.classList.add('active', 'loading');
      
      // Handle special actions
      if (isSpecial && prompt === 'factcheck') {
        showFactCheckView().finally(() => {
          // Re-enable buttons after processing
          allActionButtons.forEach(b => b.disabled = false);
          clickedButton.classList.remove('loading');
        });
      } else {
        analyzeText(mode, prompt).finally(() => {
          // Re-enable buttons after processing
          allActionButtons.forEach(b => b.disabled = false);
          clickedButton.classList.remove('loading');
        });
      }
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
function switchMode(mode, prompt = null) {
  currentMode = mode;
  
  // Update active button (support both v1 and v2)
  const buttonSelector = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_CONTEXT_AWARE 
    ? '.bobby-action-btn-v2, .bobby-prompt-btn' 
    : '.bobby-prompt-btn';
    
  popupWindow.querySelectorAll(buttonSelector).forEach(btn => {
    const btnMode = btn.dataset.mode || btn.dataset.action;
    btn.classList.toggle('active', btnMode === mode);
  });
  
  // Special handling for fact check
  if (mode === 'factcheck' || prompt === 'factcheck') {
    showFactCheckView();
  } else {
    analyzeText(mode, prompt);
  }
}

// Analyze text with selected mode
async function analyzeText(mode, prompt = null) {
  const useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM;
  const resultDiv = popupWindow.querySelector(useV2 ? '.bobby-result-v2' : '.bobby-result');
  const ui = new window.UIComponents();
  resultDiv.innerHTML = ui.createLoader('Analyzing text...');
  
  try {
    // Send message to background script with error handling
    let response;
    try {
      // Get prompts from PromptManager
      const promptManager = new window.PromptManager();
      const promptMessages = promptManager.generatePrompt(selectedText, mode);
      
      const message = {
        action: 'analyzeText',
        text: selectedText,
        mode: mode
      };
      
      // Add system and user prompts from PromptManager
      if (promptMessages && promptMessages.length > 0) {
        const systemMessage = promptMessages.find(m => m.role === 'system');
        const userMessage = promptMessages.find(m => m.role === 'user');
        
        if (systemMessage) {
          message.systemPrompt = systemMessage.content;
        }
        if (userMessage) {
          // Extract just the prompt part, not the full text
          message.userPrompt = userMessage.content;
        }
      }
      
      // Add context-aware prompt if available
      if (prompt && window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_CONTEXT_AWARE) {
        message.prompt = prompt;
      }
      
      response = await chrome.runtime.sendMessage(message);
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
      
      // Save to history (non-blocking)
      try {
        const historyEntry = await window.HistoryManager.addToHistory(
          selectedText,
          response.result,
          mode
        );
        window.currentHistoryId = historyEntry.id;
      } catch (historyError) {
        console.warn('Bobby: Could not save to history (non-fatal):', historyError);
        // Continue without history - analysis still works
      }
      
    } else {
      displayError(response?.error || 'Unknown error occurred');
    }
  } catch (error) {
    displayError(error.message);
  }
}

// Show fact check view
async function showFactCheckView() {
  const useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM;
  const resultDiv = popupWindow.querySelector(useV2 ? '.bobby-result-v2' : '.bobby-result');
  const ui = new window.UIComponents();
  
  // Show loading state with skeleton loaders
  resultDiv.innerHTML = `
    <div class="bobby-fact-check-header">
      <span class="bobby-exa-badge">🔍</span>
      <h4>Fact Checking with Exa</h4>
    </div>
    <div class="bobby-fact-check-progress">
      <div class="bobby-progress-header">
        <h5 class="bobby-progress-title">Extracting claims...</h5>
        <span class="bobby-progress-count">
          <div class="bobby-skeleton-confidence" style="display: inline-block;"></div>
        </span>
      </div>
      <div class="bobby-progress-status">Analyzing text for verifiable claims...</div>
    </div>
    <div class="bobby-fact-check-skeleton">
      ${[1,2,3].map(() => `
        <div class="bobby-skeleton-claim">
          <div class="bobby-skeleton-header">
            <div class="bobby-skeleton-status"></div>
            <div class="bobby-skeleton-confidence"></div>
          </div>
          <div class="bobby-skeleton-text"></div>
          <div class="bobby-skeleton-text short"></div>
        </div>
      `).join('')}
    </div>
  `;
  
  try {
    const detector = new window.HallucinationDetector(
      window.BOBBY_CONFIG.OPENAI_API_KEY,
      window.BOBBY_CONFIG.EXA_API_KEY
    );
    
    // Extract claims with better error handling
    let claims;
    try {
      claims = await detector.extractClaims(selectedText);
      console.log('Bobby: Extracted claims:', claims);
    } catch (extractError) {
      console.error('Bobby: Failed to extract claims:', extractError);
      displayError('Unable to extract claims from the selected text. Please try selecting a clearer passage with factual statements.');
      return;
    }
    
    if (!claims || claims.length === 0) {
      displayError('No verifiable claims found in the selected text. Please select text that contains factual statements.');
      return;
    }
    
    // Update UI to show progress
    resultDiv.innerHTML = `
      <div class="bobby-fact-check-header">
        <span class="bobby-exa-badge">🔍</span>
        <h4>Fact Checking with Exa</h4>
      </div>
      <div class="bobby-fact-check-progress">
        <div class="bobby-progress-header">
          <h5 class="bobby-progress-title">Verifying Claims</h5>
          <span class="bobby-progress-count">${claims.length} ${claims.length === 1 ? 'claim' : 'claims'} found</span>
        </div>
        ${ui.createProgressBar(0, '')}
        <p class="bobby-progress-status">Analyzing claim 1 of ${claims.length}...</p>
      </div>
    `;
    
    // Verify each claim with rate limiting
    const verifications = [];
    for (let i = 0; i < claims.length; i++) {
      const claim = claims[i];
      const progress = Math.round(((i + 1) / claims.length) * 100);
      
      // Update progress
      const progressBar = resultDiv.querySelector('.bobby-progress-fill');
      const progressStatus = resultDiv.querySelector('.bobby-progress-status');
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }
      if (progressStatus) {
        progressStatus.textContent = `Analyzing claim ${i + 1} of ${claims.length}...`;
      }
      
      // Always await the verification (it now handles errors internally)
      const verification = await detector.verifyClaim(claim, selectedText);
      verifications.push(verification);
      
      // Update UI to show claim status
      if (resultDiv.querySelector('.bobby-fact-check-claims')) {
        updateClaimInUI(i, verification);
      }
      
      // Add a small delay between API calls to avoid rate limits
      if (i < claims.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      }
    }
    
    // Format and display results only if we have verifications
    if (verifications && verifications.length > 0) {
      const results = detector.formatResults(claims, verifications);
      displayFactCheckResults(results);
      
      // Save to history (non-blocking)
      try {
        const historyEntry = await window.HistoryManager.addToHistory(
          selectedText,
          JSON.stringify(results),
          'factcheck',
          { factCheckData: results }
        );
        window.currentHistoryId = historyEntry.id;
      } catch (historyError) {
        console.warn('Bobby: Could not save to history (non-fatal):', historyError);
        // Continue without history - don't interrupt the user experience
      }
    } else {
      throw new Error('No claims could be verified. Please try again later.');
    }
    
  } catch (error) {
    console.error('Error during fact check:', error);
    // Show user-friendly error message
    if (error.message.includes('Rate limit') || error.message.includes('429')) {
      displayError('Rate limit exceeded. Please wait a moment and try again.');
    } else if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('400')) {
      displayError('Invalid API key. Please check your configuration and reload the extension.');
    } else if (error.message.includes('quota')) {
      // Storage quota error - but fact check still completed
      console.warn('Bobby: Storage quota exceeded, but fact-check completed successfully');
      // Don't show error to user since the main functionality worked
    } else {
      displayError('Unable to complete fact-check. Please try selecting different text.');
    }
  }
}

// Update claim status in UI during processing
function updateClaimInUI(index, verification) {
  const claimElements = document.querySelectorAll('.bobby-fact-check-claim');
  if (claimElements[index]) {
    const element = claimElements[index];
    element.classList.remove('processing');
    element.classList.add(verification.assessment);
    
    // Update status icon
    const statusIcon = element.querySelector('.bobby-claim-status-icon');
    if (statusIcon) {
      statusIcon.textContent = getStatusIcon(verification.assessment);
    }
  }
}

// Display fact check results
function displayFactCheckResults(results) {
  const useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM;
  const resultDiv = popupWindow.querySelector(useV2 ? '.bobby-result-v2' : '.bobby-result');
  const ui = new window.UIComponents();
  
  // Calculate score status based on reliability
  const scoreStatus = results.overallScore >= 80 ? 'high' : 
                      results.overallScore >= 60 ? 'medium' : 
                      results.overallScore >= 40 ? 'low' : 'critical';
  
  const summaryHtml = `
    <div class="bobby-fact-check-hero">
      <div class="bobby-reliability-score-hero">
        <div class="bobby-score-ring bobby-score-${scoreStatus}">
          <span class="bobby-score-value">${results.overallScore}%</span>
        </div>
        <h3 class="bobby-reliability-title">Overall Reliability</h3>
      </div>
      <div class="bobby-claim-breakdown">
        ${results.summary.true > 0 ? `
        <div class="bobby-breakdown-item bobby-breakdown-true">
          <span class="bobby-breakdown-icon">✓</span>
          <span class="bobby-breakdown-count">${results.summary.true}</span>
          <span class="bobby-breakdown-label">Verified</span>
        </div>` : ''}
        ${results.summary.false > 0 ? `
        <div class="bobby-breakdown-item bobby-breakdown-false">
          <span class="bobby-breakdown-icon">✗</span>
          <span class="bobby-breakdown-count">${results.summary.false}</span>
          <span class="bobby-breakdown-label">False</span>
        </div>` : ''}
        ${results.summary.partially_true > 0 ? `
        <div class="bobby-breakdown-item bobby-breakdown-partial">
          <span class="bobby-breakdown-icon">≈</span>
          <span class="bobby-breakdown-count">${results.summary.partially_true}</span>
          <span class="bobby-breakdown-label">Partial</span>
        </div>` : ''}
        ${results.summary.unverifiable > 0 ? `
        <div class="bobby-breakdown-item bobby-breakdown-unverifiable">
          <span class="bobby-breakdown-icon">?</span>
          <span class="bobby-breakdown-count">${results.summary.unverifiable}</span>
          <span class="bobby-breakdown-label">Unverifiable</span>
        </div>` : ''}
        ${results.summary.needs_context > 0 ? `
        <div class="bobby-breakdown-item bobby-breakdown-context">
          <span class="bobby-breakdown-icon">⚡</span>
          <span class="bobby-breakdown-count">${results.summary.needs_context}</span>
          <span class="bobby-breakdown-label">Contextual</span>
        </div>` : ''}
        ${results.summary.error > 0 ? `
        <div class="bobby-breakdown-item bobby-breakdown-error">
          <span class="bobby-breakdown-icon">⚠</span>
          <span class="bobby-breakdown-count">${results.summary.error}</span>
          <span class="bobby-breakdown-label">Error</span>
        </div>` : ''}
      </div>
    </div>
  `;
  
  const claimsHtml = results.verifications.map((v, index) => {
    console.log(`Bobby: Rendering claim ${index}:`, v);
    const statusClass = `bobby-claim-${v.assessment}`;
    const statusIcon = getStatusIcon(v.assessment);
    const statusLabel = getStatusLabel(v.assessment);
    
    // Clean up summary - remove JSON references and technical language
    let cleanSummary = v.summary;
    if (cleanSummary && (cleanSummary.includes('JSON') || cleanSummary.includes('extracted claims'))) {
      // Extract only the verification reasoning
      const reasonMatch = cleanSummary.match(/The claim is (.*?)(?:\.|$)/i);
      cleanSummary = reasonMatch ? reasonMatch[0] : 'Verified based on available sources.';
    }
    
    return `
      <div class="bobby-claim-card-v3 bobby-claim-${v.assessment}">
        <div class="bobby-claim-header-v3">
          <div class="bobby-claim-status-v3">
            <span class="bobby-status-icon-v3">${statusIcon}</span>
            <span class="bobby-status-label-v3">${statusLabel}</span>
          </div>
          <span class="bobby-confidence-v3">${v.confidence}% confidence</span>
        </div>
        <div class="bobby-claim-content-v3">
          <p class="bobby-claim-text-v3">${escapeHtml(v.claim)}</p>
          <p class="bobby-verification-text-v3">${escapeHtml(cleanSummary || '')}</p>
        </div>
        ${v.sources && v.sources.length > 0 ?
          `<div class="bobby-sources-v3">
            ${v.sources.slice(0, 4).map((s, i) => {
              let domain = '';
              try {
                domain = new URL(s.url).hostname.replace('www.', '');
              } catch (e) {
                domain = 'source';
              }
              return `
                <a href="${s.url}" target="_blank" rel="noopener" class="bobby-source-icon-v3" 
                   title="${escapeHtml(s.title || domain)}">
                  <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=16" 
                       alt="${domain}" onerror="this.style.display='none'" />
                </a>
              `;
            }).join('')}
            ${v.sources.length > 4 ? `
              <span class="bobby-source-more-v3">+${v.sources.length - 4}</span>
            ` : ''}
          </div>` : ''}
      </div>
    `;
  }).join('');
  
  resultDiv.innerHTML = `
    <div class="bobby-fact-check-container-v2">
      <div class="bobby-fact-check-header-v2">
        <h4 class="bobby-fact-check-title">Fact Check Analysis</h4>
        <div class="bobby-exa-badge-v2">
          <span>Powered by Exa</span>
        </div>
      </div>
      ${summaryHtml}
      <div class="bobby-claims-section-v2">
        <h5 class="bobby-claims-title-v2">Claims Analysis</h5>
        <div class="bobby-claims-list-v2">
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
      <button class="bobby-followup-close" type="button" aria-label="Close follow-up">✕</button>
    </div>
    <form class="bobby-followup-form">
      <div class="bobby-followup-input-wrapper">
        <textarea class="bobby-followup-input" 
          placeholder="What would you like to know more about?" 
          rows="2"
          spellcheck="false"
          autocomplete="off"
          aria-label="Follow-up question"></textarea>
        <button class="bobby-followup-submit" type="submit" title="Ask Question (Ctrl+Enter)" aria-label="Submit question">
          <span>→</span>
        </button>
      </div>
    </form>
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
  
  // Handle form submit
  const form = followUpContainer.querySelector('.bobby-followup-form');
  const submitQuestion = (e) => {
    if (e) e.preventDefault();
    const question = textarea.value.trim();
    if (question) {
      handleFollowUp(question);
      followUpContainer.remove();
    }
  };
  
  form.addEventListener('submit', submitQuestion);
  
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
  const useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM;
  const resultDiv = popupWindow.querySelector(useV2 ? '.bobby-result-v2' : '.bobby-result');
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
  const useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM;
  const resultDiv = popupWindow.querySelector(useV2 ? '.bobby-result-v2' : '.bobby-result');
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
  const analysisClass = useV2 ? 'bobby-analysis-v2' : 'bobby-analysis';
  const markdownClass = useV2 ? 'bobby-markdown-v2' : 'bobby-markdown';
  
  resultDiv.innerHTML = `
    <div class="${analysisClass}">
      <div class="bobby-followup-question">
        <strong>Q:</strong> ${escapeHtml(question)}
      </div>
      <div class="${markdownClass}">${formattedAnswer}</div>
    </div>
  `;
}


// Display analysis result
function displayResult(result, fromCache = false) {
  const useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM;
  const resultDiv = popupWindow.querySelector(useV2 ? '.bobby-result-v2' : '.bobby-result');
  const ui = new window.UIComponents();
  
  const analysisClass = useV2 ? 'bobby-analysis-v2' : 'bobby-analysis';
  const markdownClass = useV2 ? 'bobby-markdown-v2' : 'bobby-markdown';
  
  resultDiv.innerHTML = `
    <div class="${analysisClass}">
      ${fromCache ? '<p class="bobby-cache-notice">📦 From cache</p>' : ''}
      <div class="${markdownClass}">${ui.markdownToHtml(result)}</div>
    </div>
  `;
}

// Display error message
function displayError(error) {
  const useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM;
  const resultDiv = popupWindow.querySelector(useV2 ? '.bobby-result-v2' : '.bobby-result');
  const ui = new window.UIComponents();
  
  // Add reload hint for certain errors
  let details = 'Please check your API configuration in the extension options.';
  if (error.includes('Rate limit') || error.includes('API')) {
    details += ' If you recently updated config.js, reload the extension in chrome://extensions/';
  }
  
  resultDiv.innerHTML = ui.createError(error, details);
}

// Close popup
function closePopup() {
  if (popupWindow) {
    const useSpring = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_SPRING_ANIMATIONS;
    
    const useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM;
    const showClass = useV2 ? 'bobby-show' : 'bobby-popup-show';
    
    popupWindow.classList.remove(showClass);
    
    // Clean up particle handlers if attached
    if (particleEffects) {
      popupWindow.querySelectorAll('button').forEach(btn => {
        particleEffects.detachFromElement(btn);
      });
    }
    
    setTimeout(() => {
      if (popupWindow) {
        popupWindow.remove();
        popupWindow = null;
        dragManager = null;
        currentHistoryId = null;
      }
    }, useSpring ? 400 : 200); // Longer delay for spring animations
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