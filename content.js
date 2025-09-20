// Bobby Chrome Extension - Enhanced Content Script
// Handles text selection, UI injection, fact-checking, and follow-up questions

// Load appropriate styles based on feature flags
if (window.BOBBY_CONFIG?.FEATURE_FLAGS?.RAUNO_MODE) {
  // Load Rauno design system CSS
  const raunoStyles = document.createElement('link');
  raunoStyles.rel = 'stylesheet';
  raunoStyles.href = chrome.runtime.getURL('styles-rauno.css');
  document.head.appendChild(raunoStyles);
} else if (window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM) {
  // Load V2 glassmorphism styles
  const v2Styles = document.createElement('link');
  v2Styles.rel = 'stylesheet';
  v2Styles.href = chrome.runtime.getURL('styles-v2.css');
  document.head.appendChild(v2Styles);
}

// Wait for modules to be ready
let modulesReady = false;

// Minimal mode helper
function isMinimal() {
  try {
    // Default to true if flag is undefined (opt-in to better performance by default)
    const flags = window.BOBBY_CONFIG && window.BOBBY_CONFIG.FEATURE_FLAGS;
    if (!flags || flags.MINIMAL_MODE === undefined) return true;
    return !!flags.MINIMAL_MODE;
  } catch (_) {
    return true;
  }
}

// Check if modules are already ready (in case this loads after ModuleLoader)
if (window.BobbyModules || (window.PromptManager && window.APIClient)) {
  modulesReady = true;
  if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: Modules already loaded, initializing content script');
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
    if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: Modules loaded, initializing content script');
    init();
  });
}

// Handle module loading errors
window.addEventListener('bobby-modules-error', (event) => {
  if (window.BOBBY_CONFIG?.DEBUG_MODE) {
    console.error('Bobby: Module loading failed:', event.detail.error);
    console.error('Bobby: Please check your config.js file exists and is properly formatted');
  }
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

// Conversation threading state
var conversationThread = {
  originalText: '',        // The originally selected text
  originalUrl: '',         // The page URL where text was selected
  conversations: [],       // Array of {question, answer, mode, timestamp} pairs
  startTime: null,        // When conversation started
  lastActivity: null      // Last interaction time
};

// Initialize content script
function init() {
  if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: init() called, starting initialization...');
  
  // Check if already initialized
  if (window.bobbyInitialized) {
    if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: Already initialized, skipping...');
    return;
  }
  
  try {
    // Check if modules are available
    if (!window.ButtonManager) {
      if (window.BOBBY_CONFIG?.DEBUG_MODE) console.error('Bobby: ButtonManager not available, retrying...');
      setTimeout(init, 100);
      return;
    }
    
    // Reset buttonManager if it was set to something else
    if (buttonManager !== null && !(buttonManager instanceof window.ButtonManager)) {
      if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: buttonManager was corrupted, resetting...');
      buttonManager = null;
    }
    
    if (!isMinimal()) {
      if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: Creating ButtonManager instance...');
      // Initialize managers
      buttonManager = new window.ButtonManager();
      if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: ButtonManager created successfully, storing in window for debugging');
      window.bobbyButtonManager = buttonManager; // Store for debugging
    }
    
    // Initialize V2 modules if enabled
    if (window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_PARTICLE_EFFECTS && window.ParticleEffects) {
      particleEffects = new window.ParticleEffects();
      if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: ParticleEffects initialized');
    }
    
    if (window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_CONTEXT_AWARE && window.ContentAnalyzer) {
      contentAnalyzer = new window.ContentAnalyzer();
      if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: ContentAnalyzer initialized');
    }
    
    if (window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_SPRING_ANIMATIONS && window.InteractionEffects) {
      interactionEffects = new window.InteractionEffects();
      if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: InteractionEffects initialized');
    }
    
    if (window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_ADAPTIVE_THEME && window.ThemeManager) {
      themeManager = new window.ThemeManager();
      if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: ThemeManager initialized');
    }
    
    // Listen for text selection
    // Passive listeners reduce main-thread contention during user interactions
    document.addEventListener('mouseup', handleTextSelection, { passive: true });
    document.addEventListener('selectionchange', handleSelectionChange, { passive: true });
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleMessage);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
    
    // Clean up on page navigation
    window.addEventListener('beforeunload', cleanup);
    
    // Mark as initialized
    window.bobbyInitialized = true;
    
    if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby Extension initialized successfully');
  } catch (error) {
    if (window.BOBBY_CONFIG?.DEBUG_MODE) {
      console.error('Bobby: Error during initialization:', error);
      console.error('Bobby: Stack trace:', error.stack);
    }
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
  
  // Command Palette: Cmd/Ctrl + K
  if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k')) {
    e.preventDefault();
    openCommandPalette();
  }

  // Focus Mode: Cmd/Ctrl + Enter
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    openFocusMode();
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
    if (window.BOBBY_CONFIG?.DEBUG_MODE) console.log('Bobby: Initializing ButtonManager in showFAB...');
    buttonManager = new window.ButtonManager();
    window.bobbyButtonManager = buttonManager;
  }
  
  if (!fabButton) {
    createFAB();
  }
  
  // Position FAB near selection or fallback to pointer coordinates (avoids forced layout)
  if (typeof x === 'number' && typeof y === 'number') {
    fabButton.style.left = `${x + 10}px`;
    fabButton.style.top = `${Math.max(y - 10, 10)}px`;
  } else {
    // Fallback only if coordinates not provided
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      fabButton.style.left = `${rect.right + 10}px`;
      fabButton.style.top = `${rect.top - 10}px`;
    }
  }
  fabButton.style.display = 'block';

  // Update FAB badge with approx word count
  try {
    const words = (selectedText || '').trim().split(/\s+/).filter(Boolean).length;
    const badge = fabButton.querySelector('.bobby-fab-badge');
    if (badge) {
      if (words > 0) { badge.textContent = words > 999 ? '1k+' : String(words); badge.style.display = 'inline-flex'; }
      else { badge.style.display = 'none'; }
    }
  } catch (_) {}
  
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
  const useRauno = window.BOBBY_CONFIG?.FEATURE_FLAGS?.RAUNO_MODE;
  fabButton.className = useRauno ? 'bobby-fab-rauno' : (useV2 ? 'bobby-fab-v2' : 'bobby-fab');
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
  
  if (document.body) {
    document.body.appendChild(fabButton);
    // Badge for word count
    const badge = document.createElement('span');
    badge.className = 'bobby-fab-badge';
    badge.style.display = 'none';
    fabButton.appendChild(badge);
  }
  
  // Apply adaptive theme if enabled
  if (themeManager && window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_ADAPTIVE_THEME) {
    themeManager.applyTheme(fabButton);
  }
}

// Command palette overlay
function openCommandPalette() {
  if (document.querySelector('.bobby-cmdk-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'bobby-cmdk-overlay';
  const card = document.createElement('div');
  card.className = 'bobby-cmdk-card';
  card.innerHTML = `
    <input class="bobby-cmdk-input" placeholder="Type a command… (e.g., explain, summarize, key points, simplify, fact check, focus)" />
    <div class="bobby-cmdk-list"></div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const input = card.querySelector('.bobby-cmdk-input');
  const list = card.querySelector('.bobby-cmdk-list');
  const commands = [
    { id: 'explain', label: 'Explain' },
    { id: 'summarize', label: 'Summarize' },
    { id: 'keyPoints', label: 'Key Points' },
    { id: 'eli5', label: 'Simplify' },
    { id: 'factcheck', label: 'Fact Check' },
    { id: 'focus', label: 'Focus Mode' }
  ];
  const render = (q = '') => {
    const term = q.trim().toLowerCase();
    const items = commands.filter(c => c.label.toLowerCase().includes(term) || c.id.includes(term));
    list.innerHTML = items.map((c, i) => `<button class="bobby-cmdk-item" data-id="${c.id}" ${i===0?'data-active="true"':''}>${c.label}</button>`).join('');
  };
  render('');
  input.focus();

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.addEventListener('keydown', (e) => {
    const items = Array.from(list.querySelectorAll('.bobby-cmdk-item'));
    let idx = items.findIndex(el => el.hasAttribute('data-active'));
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); if (idx < items.length - 1) { items[idx]?.removeAttribute('data-active'); items[++idx].setAttribute('data-active','true'); } return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (idx > 0) { items[idx]?.removeAttribute('data-active'); items[--idx].setAttribute('data-active','true'); } return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const active = items.find(el => el.hasAttribute('data-active')) || items[0];
      if (active) executeCommand(active.getAttribute('data-id'));
      close();
    }
  });
  input.addEventListener('input', (e) => render(e.target.value));
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.bobby-cmdk-item');
    if (!btn) return;
    executeCommand(btn.getAttribute('data-id'));
    close();
  });
}

function executeCommand(id) {
  if (id === 'focus') { openFocusMode(); return; }
  switchMode(id);
}

// Focus Mode overlay
function openFocusMode() {
  if (!popupWindow) return;
  const existing = document.querySelector('.bobby-focus-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'bobby-focus-overlay';
  const card = document.createElement('div');
  card.className = 'bobby-focus-card';
  const useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM;
  const resultDiv = popupWindow.querySelector(useV2 ? '.bobby-result-v2' : '.bobby-result');
  card.innerHTML = resultDiv ? resultDiv.innerHTML : '<div style="padding:20px">No content yet</div>';
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function onEsc(ev){ if (ev.key==='Escape'){ close(); document.removeEventListener('keydown', onEsc); }}, { once: true });
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
  
  // Initialize conversation thread for new selection
  conversationThread = {
    originalText: selectedText,
    originalUrl: window.location.href,
    conversations: [],
    startTime: Date.now(),
    lastActivity: Date.now()
  };
  
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
  const useRauno = window.BOBBY_CONFIG?.FEATURE_FLAGS?.RAUNO_MODE;
  popupWindow.className = useRauno ? 'bobby-popup-rauno' : (useV2 ? 'bobby-popup-v2' : 'bobby-popup');
  
  // Set origin point for animations if Rauno mode
  if (useRauno && window.RaunoEffects) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top + rect.height / 2;
      
      // Store origin in popup for animation
      popupWindow.style.setProperty('--origin-x', `${originX}px`);
      popupWindow.style.setProperty('--origin-y', `${originY}px`);
      
      // Initialize Rauno effects if not already done
      if (!window.raunoEffects) {
        window.raunoEffects = new window.RaunoEffects();
      }
      window.raunoEffects.setOrigin(originX, originY);
    }
  }
  
  // Create collapsed text preview
  const textPreview = selectedText.length > 50 
    ? `${selectedText.substring(0, 50)}...` 
    : selectedText;
  
  // Use Rauno structure if enabled
  if (useRauno) {
    popupWindow.innerHTML = `
      <div class="bobby-header-rauno">
        <div class="bobby-logo">
          <img src="${chrome.runtime.getURL('assets/icons/bobby-typeface-logo.png')}" alt="Bobby" width="24" height="24">
          <span>Bobby</span>
        </div>
        <div class="bobby-header-actions"></div>
      </div>
      
      <div class="bobby-selected-context">
        <div class="bobby-context-header">
          <span class="bobby-context-label">Selected:</span>
          <span class="bobby-context-preview">"${escapeHtml(textPreview)}"</span>
        </div>
      </div>
      
      <div class="bobby-modes-rauno-container"></div>
      
      <div class="bobby-content-rauno">
        <div class="bobby-analysis-rauno">
          <div class="bobby-skeleton-rauno"></div>
          <div class="bobby-skeleton-rauno" style="width: 80%;"></div>
          <div class="bobby-skeleton-rauno" style="width: 60%;"></div>
        </div>
      </div>
      
      <div class="bobby-footer-rauno">
        <!-- Follow-up moved to content area -->
      </div>
    `;
  } else {
    // Original structure for non-Rauno mode
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
        <!-- Follow-up moved to content area -->
      </div>
      
      <div class="bobby-resize-handle"></div>
    `;
  }
  
  // Add to page
  document.body.appendChild(popupWindow);
  try {
    const pm = new window.PromptManager();
    const ctx = pm.analyzeContent(selectedText);
    if (ctx && (ctx.contentType || ctx.primary?.type)) {
      const type = ctx.contentType || ctx.primary.type;
      popupWindow.setAttribute('data-context-type', type);
    }
  } catch (_) {}
  
  // Apply adaptive theme if enabled (but not in Rauno mode)
  if (themeManager && window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_ADAPTIVE_THEME && !useRauno) {
    themeManager.applyTheme(popupWindow);
  }
  
  // Add action buttons to header
  const headerActions = popupWindow.querySelector('.bobby-header-actions');
  if (headerActions) {
    if (useRauno) {
      // Create Swiss minimalist close button
      const closeBtn = buttonManager.createRaunoCloseButton();
      headerActions.appendChild(closeBtn);
    } else {
      const actionButtons = buttonManager.createActionButtons();
      headerActions.appendChild(actionButtons.copy);
      headerActions.appendChild(actionButtons.close);
    }
  }
  
  // Add Rauno mode selector if in Rauno mode
  if (useRauno) {
    const modesContainer = popupWindow.querySelector('.bobby-modes-rauno-container');
    if (modesContainer) {
      const modes = [
        { id: 'explain', label: 'Explain', onClick: (mode) => analyzeText(mode) },
        { id: 'summarize', label: 'Summarize', onClick: (mode) => analyzeText(mode) },
        { id: 'keyPoints', label: 'Key Points', onClick: (mode) => analyzeText(mode) },
        { id: 'simplify', label: 'Simplify', onClick: (mode) => analyzeText(mode) },
        { id: 'factcheck', label: 'Fact Check', onClick: (mode) => analyzeText(mode) }
      ];
      const modeSelector = buttonManager.createRaunoModeSelector(modes, 'explain');
      modesContainer.appendChild(modeSelector);
    }
  }
  
  // Setup drag manager first (use header as handle in RAUNO mode)
  dragManager = new window.DragManager(popupWindow, {
    handle: useRauno ? '.bobby-header-rauno' : '.bobby-drag-handle',
    snapToEdge: true,
    momentum: isMinimal() ? false : true,
    onDragEnd: () => dragManager.savePosition()
  });
  
  // Calculate and set initial position
  const initialPosition = calculateInitialPosition();
  dragManager.moveTo(initialPosition.x, initialPosition.y, false);
  
  // Setup event handlers
  setupPopupEvents();
  
  // Animate in with spring physics if enabled
  requestAnimationFrame(() => {
    const useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM;
    const useRauno = window.BOBBY_CONFIG?.FEATURE_FLAGS?.RAUNO_MODE;
    const showClass = useRauno ? 'bobby-show-rauno' : (useV2 ? 'bobby-show' : 'bobby-popup-show');
    
    if (!isMinimal() && useRauno && window.raunoEffects) {
      // Choreographed reveal sequence
      window.raunoEffects.revealPopup(popupWindow);
    } else if (!isMinimal() && window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_SPRING_ANIMATIONS) {
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
  if (!isMinimal() && interactionEffects && window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_SPRING_ANIMATIONS) {
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
  if (window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_CONTEXT_AWARE && !isMinimal()) {
    const contextData = promptManager.createContentButtons(selectedText);
    if (contextData && Array.isArray(contextData.buttons)) {
      if (popupWindow && contextData.contentType) {
        popupWindow.classList.add(`bobby-context-${contextData.contentType}`);
      }
      allButtons = contextData.buttons;
    } else {
      allButtons = promptManager.createAllButtons();
    }
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
function calculateInitialPosition() {
  const selection = window.getSelection();
  const popupWidth = 380; // More compact width
  const popupHeight = 400;
  const MARGIN = 20;
  
  // Default to center if no selection
  if (!selection || selection.rangeCount === 0) {
    return {
      x: (window.innerWidth - popupWidth) / 2,
      y: (window.innerHeight - popupHeight) / 2
    };
  }
  
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  
  // Calculate initial position (adjacent to selection)
  let position = {
    x: rect.right + 10, // Position to the right of selection
    y: rect.top - 10    // Align with top of selection
  };
  
  // If popup would go off right edge, position to left of selection
  if (position.x + popupWidth > window.innerWidth - MARGIN) {
    position.x = rect.left - popupWidth - 10;
  }
  
  // If still off screen, center horizontally
  if (position.x < MARGIN) {
    position.x = Math.max(MARGIN, (window.innerWidth - popupWidth) / 2);
  }
  
  // Check if popup would go below viewport
  if (position.y + popupHeight > window.innerHeight - MARGIN) {
    // Try positioning above the selection
    position.y = rect.top - popupHeight - 20;
    
    // If still doesn't fit, center in viewport
    if (position.y < MARGIN) {
      position.x = (window.innerWidth - popupWidth) / 2;
      position.y = (window.innerHeight - popupHeight) / 2;
    }
  }
  
  // Ensure minimum margin from edges
  position.x = Math.max(MARGIN, Math.min(position.x, window.innerWidth - popupWidth - MARGIN));
  position.y = Math.max(MARGIN, Math.min(position.y, window.innerHeight - popupHeight - MARGIN));
  
  return position;
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
      let allActionButtons = [];
      if (popupWindow) {
        allActionButtons = popupWindow.querySelectorAll(`
          .bobby-primary-actions ${buttonSelector},
          .bobby-secondary-actions ${buttonSelector},
          .bobby-prompt-bar > ${buttonSelector},
          .bobby-modes-rauno .bobby-btn-rauno
        `);
        allActionButtons.forEach(b => {
          b.classList.remove('active');
          b.disabled = true;
        });
      }
      
      // Mark clicked button as active and loading
      const clickedButton = e.currentTarget;
      clickedButton.classList.add('active', 'loading');
      
      // Handle fact-check directly (prefer mode, then prompt)
      if (mode === 'factcheck' || prompt === 'factcheck') {
        showFactCheckView().finally(() => {
          // Re-enable buttons after processing
          if (allActionButtons && allActionButtons.length > 0) {
            allActionButtons.forEach(b => b.disabled = false);
          }
          clickedButton.classList.remove('loading');
        });
      } else {
        analyzeText(mode, prompt).finally(() => {
          // Re-enable buttons after processing
          if (allActionButtons && allActionButtons.length > 0) {
            allActionButtons.forEach(b => b.disabled = false);
          }
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
      const header = popupWindow.querySelector('.bobby-context-header');
      const preview = popupWindow.querySelector('.bobby-context-preview');
      const wasVisible = fullContext.style.display !== 'none';
      const nowVisible = !wasVisible;
      fullContext.style.display = nowVisible ? 'block' : 'none';
      contextToggle.textContent = nowVisible ? '▲' : '▼';
      if (nowVisible) {
        // Hide preview while expanded to avoid duplicate content
        if (preview) preview.textContent = '';
        if (header) header.classList.add('expanded');
      } else {
        // Restore truncated preview
        const truncated = selectedText.length > 50 ? `${selectedText.substring(0, 50)}…` : selectedText;
        if (preview) preview.textContent = `"${escapeHtml(truncated)}"`;
        if (header) header.classList.remove('expanded');
      }
    });
  }
  
  // Follow-up button
  const followupBtn = popupWindow.querySelector('.bobby-followup-btn');
  if (followupBtn) {
    followupBtn.addEventListener('click', () => {
      showFollowUpInput();
    });
  }
  
  // Make resizable (only if handle exists in this mode)
  const resizeHandle = popupWindow.querySelector('.bobby-resize-handle');
  if (resizeHandle) {
    resizeHandle.addEventListener('mousedown', startResizing);
  }
  
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
  const useRauno = window.BOBBY_CONFIG?.FEATURE_FLAGS?.RAUNO_MODE;
  
  // Find the appropriate result container
  let resultDiv;
  if (useRauno) {
    resultDiv = popupWindow.querySelector('.bobby-content-rauno');
  } else {
    resultDiv = popupWindow.querySelector(useV2 ? '.bobby-result-v2' : '.bobby-result');
  }
  
  if (!resultDiv) {
    console.error('Bobby: Result container not found');
    return;
  }
  
  const ui = new window.UIComponents();
  
  
  // Show loading state
  if (useRauno) {
    resultDiv.innerHTML = `
      <div class="bobby-analysis-rauno">
        <div class="bobby-skeleton-rauno"></div>
        <div class="bobby-skeleton-rauno" style="width: 80%;"></div>
        <div class="bobby-skeleton-rauno" style="width: 60%;"></div>
      </div>
    `;
  } else {
    resultDiv.innerHTML = ui.createLoader('Analyzing text...');
  }
  
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
      
      // Store in conversation thread
      conversationThread.conversations.push({
        question: null,  // First analysis has no question
        answer: response.result,
        mode: mode,
        timestamp: Date.now()
      });
      conversationThread.lastActivity = Date.now();
      
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
  
  // Show simplified loading state
  resultDiv.innerHTML = `
    <div class="bobby-fc-loading">
      <div class="bobby-fc-loading-icon">🔍</div>
      <div class="bobby-fc-loading-text">Checking facts...</div>
      <div class="bobby-fc-loading-bar">
        <div class="bobby-fc-loading-progress"></div>
      </div>
    </div>
  `;
  
  try {
    const detector = new window.HallucinationDetector();
    
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
    
    // Update UI to show clean progress
    resultDiv.innerHTML = `
      <div class="bobby-fc-loading">
        <div class="bobby-fc-loading-icon">🔍</div>
        <div class="bobby-fc-loading-text">Verifying ${claims.length} claim${claims.length > 1 ? 's' : ''}...</div>
        <div class="bobby-fc-loading-bar">
          <div class="bobby-fc-loading-progress" style="width: 0%"></div>
        </div>
        <div class="bobby-fc-loading-counter">0 / ${claims.length}</div>
      </div>
    `;
    
    // Verify each claim with rate limiting
    const verifications = [];
    for (let i = 0; i < claims.length; i++) {
      const claim = claims[i];
      const progress = Math.round(((i + 1) / claims.length) * 100);
      
      // Update clean progress
      const progressBar = resultDiv.querySelector('.bobby-fc-loading-progress');
      const progressCounter = resultDiv.querySelector('.bobby-fc-loading-counter');
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }
      if (progressCounter) {
        progressCounter.textContent = `${i + 1} / ${claims.length}`;
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
    } else if (error.message.includes('402')) {
      displayError('Exa returned a 402 (payment/plan). We retried with compatible parameters; if this persists, please confirm your plan supports /search.');
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
  
  // Determine verdict based on results
  const hasIssues = results.summary.false > 0 || results.summary.misleading > 0;
  const hasUncertain = results.summary.unverifiable > 0;
  
  const verdictIcon = hasIssues ? '❌' : hasUncertain ? '⚠️' : '✅';
  const verdictText = hasIssues ? 'Issues Found' : hasUncertain ? 'Uncertain' : 'Verified';
  const verdictClass = hasIssues ? 'error' : hasUncertain ? 'warning' : 'success';
  
  const summaryHtml = `
    <div class="bobby-fc-container">
      <!-- Hero Section -->
      <div class="bobby-fc-hero">
        <div class="bobby-fc-reliability">
          <div class="bobby-fc-ring">
            <svg class="bobby-fc-ring-svg" viewBox="0 0 120 120" aria-hidden="true">
              <defs>
                <linearGradient id="bobby-fc-ring-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="var(--bobby-accent)" />
                  <stop offset="100%" stop-color="#ffa97a" />
                </linearGradient>
              </defs>
              <circle class="bobby-fc-ring-bg" cx="60" cy="60" r="54"></circle>
              <circle class="bobby-fc-ring-progress" cx="60" cy="60" r="54" stroke="url(#bobby-fc-ring-grad)"></circle>
            </svg>
            <div class="bobby-fc-knob"></div>
            <div class="bobby-fc-ring-content">
              <span class="bobby-fc-score">${results.overallScore}%</span>
              <span class="bobby-fc-label">Reliability</span>
            </div>
          </div>
        </div>
        <div class="bobby-fc-verdict bobby-fc-verdict-${verdictClass}">
          <span class="bobby-fc-verdict-icon">${verdictIcon}</span>
          <span class="bobby-fc-verdict-text">${verdictText}</span>
        </div>
        <div class="bobby-fc-confidence">${results.overallScore}% confidence</div>
      </div>
      
      <!-- Claims List -->
      <div class="bobby-fc-claims">
        ${results.verifications.map((v) => {
          const statusIcon = getStatusIcon(v.assessment);
          const statusLabel = getStatusLabel(v.assessment);
          const statusClass = v.assessment === 'true' ? 'success' :
                              v.assessment === 'false' || v.assessment === 'misleading' ? 'error' :
                              'warning';

          // Clean, short summary
          let cleanSummary = v.summary || '';
          if (cleanSummary && (cleanSummary.includes('JSON') || cleanSummary.includes('extracted claims'))) {
            const reasonMatch = cleanSummary.match(/The claim is (.*?)(?:\.|$)/i);
            cleanSummary = reasonMatch ? reasonMatch[0] : '';
          }

          // Source chips (max 4)
          let sourcesHtml = '';
          if (v.sources && v.sources.length > 0) {
            const chips = v.sources.slice(0, 4).map((s) => {
              let domain = '';
              try { domain = new URL(s.url).hostname.replace('www.', ''); } catch (e) { domain = 'source'; }
              return `
                <a href="${s.url}" target="_blank" rel="noopener" class="bobby-fc-source-chip" title="${escapeHtml(s.title || domain)}">
                  <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=16" alt="${domain}" onerror="this.style.display='none'" />
                  <span>${domain}</span>
                </a>
              `;
            }).join('');
            const more = v.sources.length > 4 ? `<span class="bobby-source-more-v3">+${v.sources.length - 4}</span>` : '';
            sourcesHtml = `<div class="bobby-fc-sources">${chips}${more}</div>`;
          }

          return `
            <div class="bobby-fc-claim bobby-fc-claim-${statusClass}">
              <div class="bobby-fc-claim-row">
                <span class="bobby-fc-claim-icon">${statusIcon}</span>
                <span class="bobby-fc-claim-status">${statusLabel.toUpperCase()}</span>
                <span class="bobby-fc-claim-confidence">${v.confidence}%</span>
              </div>
              <p class="bobby-fc-claim-text">${escapeHtml(v.claim)}</p>
              ${cleanSummary ? `<p class="bobby-fc-claim-summary">${escapeHtml(cleanSummary)}</p>` : ''}
              ${sourcesHtml}
            </div>
          `;
        }).join('')}
      </div>
      
      <!-- Disclaimer -->
      <div class="bobby-fc-note">
        <span class="bobby-fc-note-icon">ℹ️</span>
        <span class="bobby-fc-note-text">This automated check compares claims against web sources. Always verify critical information independently.</span>
      </div>
      
      <div class="bobby-fc-meta">
        Based on ${results.verifications.reduce((acc, v) => acc + (v.sources?.length || 0), 0)} web sources
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
      <div class="bobby-fc-claim bobby-fc-claim-${v.assessment}">
        <div class="bobby-fc-claim-strip"></div>
        <div class="bobby-fc-claim-content">
          <div class="bobby-fc-claim-header">
            <span class="bobby-fc-claim-icon">${statusIcon}</span>
            <span class="bobby-fc-claim-status">${statusLabel.toUpperCase()}</span>
            <span class="bobby-fc-claim-confidence">${v.confidence}%</span>
          </div>
          <p class="bobby-fc-claim-text">${escapeHtml(v.claim)}</p>
          <p class="bobby-fc-claim-summary">${escapeHtml(cleanSummary || '')}</p>
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
  
  // Display simplified fact-check results
  resultDiv.innerHTML = summaryHtml;
  // Animate reliability ring
  try {
    const progress = resultDiv.querySelector('.bobby-fc-ring-progress');
    const ringEl = resultDiv.querySelector('.bobby-fc-ring');
    const r = 54;
    const C = 2 * Math.PI * r;
    if (progress) {
      // Kick off animation in next frame
      requestAnimationFrame(() => {
        const pct = Math.max(0, Math.min(100, results.overallScore)) / 100;
        progress.style.strokeDasharray = `${pct * C} ${C}`;
        if (ringEl) {
          const angle = -90 + pct * 360; // start at top
          ringEl.style.setProperty('--bobby-ring-angle', angle + 'deg');
        }
      });
    }
  } catch (_) { /* noop */ }
  
  // Save fact check results to history
  window.HistoryManager.addToHistory(
    selectedText,
    JSON.stringify(results),
    'factcheck',
    { factCheckData: results }
  ).then(entry => {
    window.currentHistoryId = entry.id;
  });
}

// Get status icon for assessment - using simpler icons
function getStatusIcon(assessment) {
  const icons = {
    'true': '✓',
    'false': '✗',
    'partially_true': '≈',
    'unverifiable': '?',
    'needs_context': '!',
    'error': '⚡'
  };
  return icons[assessment] || '?';
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
  if (!popupWindow) {
    console.error('Bobby: Cannot show follow-up input - popup window not found');
    return;
  }
  
  // Check if follow-up input already exists
  const existingInput = popupWindow.querySelector('.bobby-followup-input-container');
  if (existingInput) {
    existingInput.remove();
    return;
  }
  
  // Find the follow-up button that was clicked
  const followupBtn = popupWindow.querySelector('.bobby-followup-inline-btn');
  if (!followupBtn) {
    console.error('Bobby: Follow-up button not found');
    return;
  }
  
  // Create follow-up input container with integrated design
  const followUpContainer = document.createElement('div');
  followUpContainer.className = 'bobby-followup-input-container bobby-followup-integrated';
  followUpContainer.innerHTML = `
    <form class="bobby-followup-form">
      <div class="bobby-followup-input-group">
        <input type="text" 
          class="bobby-followup-input-field" 
          placeholder="Ask a follow-up question..." 
          spellcheck="false"
          autocomplete="off"
          aria-label="Follow-up question">
        <div class="bobby-followup-actions">
          <button class="bobby-followup-submit-btn" type="submit" title="Send (Enter)" aria-label="Send">
            <span class="bobby-followup-submit-icon">↑</span>
          </button>
          <button class="bobby-followup-cancel-btn" type="button" title="Cancel (Esc)" aria-label="Cancel">
            <span class="bobby-followup-cancel-icon">×</span>
          </button>
        </div>
      </div>
    </form>
  `;
  
  // Replace the follow-up button with the input
  const followupSection = followupBtn.parentElement;
  followupSection.innerHTML = '';
  followupSection.appendChild(followUpContainer);
  
  // Focus on input field with slight delay for animation
  setTimeout(() => {
    const inputField = followUpContainer.querySelector('.bobby-followup-input-field');
    if (inputField) {
      inputField.focus();
    }
  }, 50);
  
  // Handle cancel
  const cancelBtn = followUpContainer.querySelector('.bobby-followup-cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      // Restore the follow-up button
      const followupSection = followUpContainer.parentElement;
      followupSection.innerHTML = `
        <button class="bobby-followup-inline-btn" aria-label="Ask follow-up question">
          <span class="bobby-followup-icon">→</span>
          <span class="bobby-followup-text">Ask follow-up</span>
        </button>
      `;
      
      // Re-attach event listener
      const newFollowupBtn = followupSection.querySelector('.bobby-followup-inline-btn');
      if (newFollowupBtn) {
        newFollowupBtn.addEventListener('click', () => {
          showFollowUpInput();
        });
      }
    });
  }
  
  // Handle form submit
  const form = followUpContainer.querySelector('.bobby-followup-form');
  const inputField = followUpContainer.querySelector('.bobby-followup-input-field');
  
  const submitQuestion = async (e) => {
    if (e) e.preventDefault();
    const question = inputField.value.trim();
    if (question) {
      try {
        await handleFollowUp(question);
        // After successful submission, restore the follow-up button
        const followupSection = followUpContainer.parentElement;
        followupSection.innerHTML = `
          <button class="bobby-followup-inline-btn" aria-label="Ask follow-up question">
            <span class="bobby-followup-icon">→</span>
            <span class="bobby-followup-text">Ask follow-up</span>
          </button>
        `;
        
        // Re-attach event listener
        const newFollowupBtn = followupSection.querySelector('.bobby-followup-inline-btn');
        if (newFollowupBtn) {
          newFollowupBtn.addEventListener('click', () => {
            showFollowUpInput();
          });
        }
      } catch (error) {
        console.error('Bobby: Error handling follow-up:', error);
        displayError('Failed to process follow-up question. Please try again.');
      }
    }
  };
  
  form.addEventListener('submit', submitQuestion);
  
  // Keyboard shortcuts
  inputField.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelBtn.click();
    } else if (e.key === 'Enter' && !e.shiftKey) {
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
  
  // Ensure conversationThread is initialized
  if (!conversationThread || !conversationThread.originalText) {
    // Try to recover from the last analysis if possible
    conversationThread = {
      originalText: selectedText || 'Previous text',
      originalUrl: window.location.href,
      conversations: [],
      startTime: Date.now(),
      lastActivity: Date.now()
    };
  }
  
  try {
    // Fallback-friendly context string (kept for future engines that accept context)
    const contextPrompt = `Original Text: "${conversationThread.originalText}"\nSource: ${conversationThread.originalUrl}`;

    // Use grounded follow-up via Exa Answer for high-quality citations
    let response;
    try {
      response = await chrome.runtime.sendMessage({
        action: 'exaAnswer',
        question: question,
        context: contextPrompt
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
      // Store in conversation thread
      conversationThread.conversations.push({
        question: question,
        answer: response.answer || response.result,
        mode: 'followup',
        timestamp: Date.now()
      });
      conversationThread.lastActivity = Date.now();
      
      // Display the answer with conversation context
      displayFollowUpAnswer(question, response.answer || response.result, response.sources || []);
      
      // Save to history as follow-up
      if (window.currentHistoryId) {
        try {
          await window.HistoryManager.addFollowUp(
            window.currentHistoryId,
            question,
            response.answer || response.result
          );
        } catch (historyError) {
          console.warn('Bobby: Could not save follow-up to history:', historyError);
        }
      }
    } else {
      displayError(response?.error || 'Unknown error occurred');
    }
  } catch (error) {
    displayError(error.message);
  }
}

// Display follow-up answer
function displayFollowUpAnswer(question, answer, sources = []) {
  const useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM;
  const resultDiv = popupWindow.querySelector(useV2 ? '.bobby-result-v2' : '.bobby-result');
  const ui = new window.UIComponents();
  
  // Handle answer as either string or object with content property
  let answerContent = typeof answer === 'string' ? answer : (answer?.content || answer);
  let formattedAnswer = ui.markdownToHtml(answerContent || 'No answer provided');

  // Replace [n] markers with inline citation links when sources provided
  if (Array.isArray(sources) && sources.length > 0) {
    for (let i = 0; i < sources.length; i++) {
      const n = i + 1;
      const s = sources[i];
      const pattern = new RegExp(`\\[${n}\\]`, 'g');
      const safeHref = s.url && s.url.startsWith('http') ? s.url : '#';
      const title = (s.title || s.url || `Source ${n}`).replace(/"/g, '&quot;');
      const link = `[<a href="${safeHref}" target="_blank" rel="noopener" class="bobby-inline-citation" data-citation="${n}" title="${title}">${n}</a>]`;
      formattedAnswer = formattedAnswer.replace(pattern, link);
    }
  }
  
  // Display in a clean, styled format similar to regular analysis
  const analysisClass = useV2 ? 'bobby-analysis-v2' : 'bobby-analysis';
  const markdownClass = useV2 ? 'bobby-markdown-v2' : 'bobby-markdown';
  
  // Show conversation thread indicator if multiple exchanges
  const threadCount = conversationThread?.conversations?.length || 0;
  const threadIndicator = threadCount > 1 ? `
    <div class="bobby-thread-indicator">
      <span class="bobby-thread-count">💬 Conversation (${threadCount} messages)</span>
    </div>
  ` : '';
  
  // Build sources rail HTML
  const sourcesRail = (Array.isArray(sources) && sources.length)
    ? `
      <div class="bobby-sources-rail">
        <div class="bobby-sources-title">Sources
          <button class="bobby-sources-menu-btn" title="More"></button>
        </div>
        <div class="bobby-sources-chips">
          ${sources.slice(0, 5).map((s, idx) => {
            let domain = '';
            try { domain = new URL(s.url).hostname.replace('www.', ''); } catch (_) { domain = 'source'; }
            const title = s.title || domain || `Source ${idx + 1}`;
            const truncated = title.length > 60 ? title.substring(0, 57) + '…' : title;
            const pct = (typeof s.score === 'number') ? Math.round((s.score <= 1 ? s.score * 100 : s.score)) : null;
            const date = (s.publishedDate ? new Date(s.publishedDate) : null);
            const dateBadge = date ? `${date.toLocaleString(undefined,{month:'short'})} ${date.getFullYear()}` : '';
            const confBadge = (pct !== null && !Number.isNaN(pct)) ? `${pct}%` : '';
            return `
              <a href="${s.url}" target="_blank" rel="noopener" 
                 class="bobby-source-chip-v2" data-index="${idx}" title="${ui.escapeHtml(title)}">
                <span class="bobby-source-favicon">
                  <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=16" alt="" onerror="this.style.display='none'" />
                </span>
                <span class="bobby-source-title">${ui.escapeHtml(truncated)}</span>
                ${dateBadge || confBadge ? `<span class="bobby-source-badges">${dateBadge ? `<span class="bobby-badge bobby-badge-date">${dateBadge}</span>` : ''}${confBadge ? `<span class="bobby-badge bobby-badge-conf">${confBadge}</span>` : ''}</span>` : ''}
              </a>`;
          }).join('')}
          ${sources.length > 5 ? `<span class="bobby-source-more">+${sources.length - 5}</span>` : ''}
        </div>
      </div>
    ` : '';

  // Answer meta (grounding badge)
  const metaHtml = `
    <div class="bobby-answer-meta">
      <span class="bobby-grounded-badge" title="Answer grounded by web sources via Exa">Grounded</span>
    </div>
  `;

  resultDiv.innerHTML = `
    <div class="${analysisClass}">
      ${threadIndicator}
      ${metaHtml}
      <div class="bobby-followup-question">
        <strong>Q${threadCount + 1}:</strong> ${escapeHtml(question)}
      </div>
      <div class="${markdownClass}">
        <strong>A${threadCount + 1}:</strong> ${formattedAnswer}
      </div>
    </div>
    ${sourcesRail}
    <div class="bobby-followup-section">
      <button class="bobby-followup-inline-btn" aria-label="Ask follow-up question">
        <span class="bobby-followup-icon">→</span>
        <span class="bobby-followup-text">Ask follow-up</span>
      </button>
    </div>
  `;
  
  // Add event listener for the new follow-up button
  const followupBtn = resultDiv.querySelector('.bobby-followup-inline-btn');
  if (followupBtn) {
    followupBtn.addEventListener('click', () => {
      showFollowUpInput();
    });
  }

  // Attach hover previews for source chips
  attachSourceTooltips(resultDiv, sources);

  // Sources “more” menu: Open all / Copy links
  const sourcesMenuBtn = resultDiv.querySelector('.bobby-sources-menu-btn');
  if (sourcesMenuBtn && Array.isArray(sources) && sources.length) {
    sourcesMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = document.createElement('div');
      menu.className = 'bobby-sources-menu';
      menu.innerHTML = `
        <button data-action="open">Open all (${sources.length})</button>
        <button data-action="copy">Copy all links</button>
      `;
      resultDiv.appendChild(menu);
      // Position near button
      const btnRect = sourcesMenuBtn.getBoundingClientRect();
      const hostRect = resultDiv.getBoundingClientRect();
      menu.style.left = (btnRect.left - hostRect.left - 8) + 'px';
      menu.style.top = (btnRect.bottom - hostRect.top + 6) + 'px';

      const close = () => { menu.remove(); document.removeEventListener('click', close, true); };
      setTimeout(() => document.addEventListener('click', close, true), 0);
      menu.addEventListener('click', async (ev) => {
        const action = ev.target.getAttribute('data-action');
        if (action === 'open') {
          sources.forEach(s => { if (s.url) window.open(s.url, '_blank', 'noopener'); });
        } else if (action === 'copy') {
          const list = sources.map(s => `${s.title || s.url} — ${s.url}`).join('\n');
          try { await navigator.clipboard.writeText(list); } catch (_) {}
        }
        close();
      });
    });
  }
}

// Tooltip previews for source chips
function attachSourceTooltips(container, sources = []) {
  const chips = container.querySelectorAll('.bobby-source-chip-v2');
  const tooltip = document.createElement('div');
  tooltip.className = 'bobby-chip-tooltip';
  tooltip.style.display = 'none';
  container.appendChild(tooltip);

  const show = (chip) => {
    const idx = parseInt(chip.getAttribute('data-index'), 10);
    const s = sources[idx];
    if (!s) return;
    const text = (s.snippet || '').trim().replace(/\s+/g, ' ');
    if (!text) return;
    const preview = text.length > 140 ? text.substring(0, 137) + '…' : text;
    tooltip.innerText = preview;
    tooltip.style.display = 'block';
    const chipRect = chip.getBoundingClientRect();
    const hostRect = container.getBoundingClientRect();
    const left = Math.max(8, chipRect.left - hostRect.left - 4);
    const top = chipRect.top - hostRect.top - tooltip.offsetHeight - 8;
    tooltip.style.left = left + 'px';
    tooltip.style.top = Math.max(0, top) + 'px';
  };
  const hide = () => { tooltip.style.display = 'none'; };

  chips.forEach(chip => {
    chip.addEventListener('mouseenter', () => show(chip));
    chip.addEventListener('mouseleave', hide);
  });
}


// Display analysis result
function displayResult(result, fromCache = false) {
  const useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM;
  const useRauno = window.BOBBY_CONFIG?.FEATURE_FLAGS?.RAUNO_MODE;
  
  let resultDiv;
  if (useRauno) {
    resultDiv = popupWindow.querySelector('.bobby-content-rauno');
  } else {
    resultDiv = popupWindow.querySelector(useV2 ? '.bobby-result-v2' : '.bobby-result');
  }
  
  if (!resultDiv) {
    console.error('Bobby: Result container not found for display');
    return;
  }
  
  const ui = new window.UIComponents();

  // Normalize common stylistic tics without imposing rigid limits
  function normalizeEnding(text) {
    try {
      if (!text || typeof text !== 'string') return text;
      // Replace trailing ellipses with a clean period
      const trimmed = text.replace(/(…|\.\.\.)\s*$/u, '.');
      return trimmed;
    } catch (_) {
      return text;
    }
  }
  const cleanResult = normalizeEnding(result);
  
  if (useRauno) {
    resultDiv.innerHTML = `
      <div class="bobby-analysis-rauno">
        ${fromCache ? '<p class="bobby-cache-notice">📦 From cache</p>' : ''}
        <div class="bobby-markdown-rauno">${ui.markdownToHtml(cleanResult)}</div>
      </div>
      <div class="bobby-followup-section">
        <button class="bobby-followup-inline-btn" aria-label="Ask follow-up question">
          <span class="bobby-followup-icon">→</span>
          <span class="bobby-followup-text">Ask follow-up</span>
        </button>
      </div>
    `;
  } else {
    const analysisClass = useV2 ? 'bobby-analysis-v2' : 'bobby-analysis';
    const markdownClass = useV2 ? 'bobby-markdown-v2' : 'bobby-markdown';
    
    resultDiv.innerHTML = `
      <div class="${analysisClass}">
        ${fromCache ? '<p class="bobby-cache-notice">📦 From cache</p>' : ''}
        <div class="${markdownClass}">${ui.markdownToHtml(cleanResult)}</div>
      </div>
      <div class="bobby-followup-section">
        <button class="bobby-followup-inline-btn" aria-label="Ask follow-up question">
          <span class="bobby-followup-icon">→</span>
          <span class="bobby-followup-text">Ask follow-up</span>
        </button>
      </div>
    `;
  }
  
  // Add event listener for the new follow-up button
  const followupBtn = resultDiv.querySelector('.bobby-followup-inline-btn');
  if (followupBtn) {
    followupBtn.addEventListener('click', () => {
      showFollowUpInput();
    });
  }
}

// Display error message
function displayError(error) {
  const useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM;
  const useRauno = window.BOBBY_CONFIG?.FEATURE_FLAGS?.RAUNO_MODE;
  
  let resultDiv;
  if (useRauno) {
    resultDiv = popupWindow.querySelector('.bobby-content-rauno');
  } else {
    resultDiv = popupWindow.querySelector(useV2 ? '.bobby-result-v2' : '.bobby-result');
  }
  
  if (!resultDiv) {
    console.error('Bobby: Result container not found for error display');
    return;
  }
  
  const ui = new window.UIComponents();
  
  // Add reload hint for certain errors
  let details = 'Please check your API configuration in the extension options.';
  if (error.includes('Rate limit') || error.includes('API')) {
    details += ' If you recently updated config.js, reload the extension in chrome://extensions/';
  }
  
  if (useRauno) {
    resultDiv.innerHTML = `
      <div class="bobby-error-rauno">
        <h4>Error</h4>
        <p>${error}</p>
        <p class="bobby-error-details">${details}</p>
      </div>
    `;
  } else {
    resultDiv.innerHTML = ui.createError(error, details);
  }
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
  popupWindow.classList.add('bobby-resizing');
  
  const startX = e.clientX;
  const startY = e.clientY;
  const startWidth = popupWindow.offsetWidth;
  const startHeight = popupWindow.offsetHeight;
  
  function handleMouseMove(e) {
    if (!isResizing) return;
    
    // Calculate new dimensions with constraints
    const newWidth = Math.max(320, Math.min(600, startWidth + (e.clientX - startX)));
    const newHeight = Math.max(300, Math.min(800, startHeight + (e.clientY - startY)));
    
    // Apply new dimensions
    popupWindow.style.width = `${newWidth}px`;
    popupWindow.style.height = `${newHeight}px`;
    
    // Adjust content area height if needed
    const resultDiv = popupWindow.querySelector('.bobby-result-v2, .bobby-result');
    if (resultDiv) {
      resultDiv.style.maxHeight = `${newHeight - 200}px`; // Account for header/footer
    }
  }
  
  function handleMouseUp() {
    isResizing = false;
    popupWindow.classList.remove('bobby-resizing');
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Save preferred size
    const size = {
      width: popupWindow.offsetWidth,
      height: popupWindow.offsetHeight
    };
    chrome.storage.local.set({ bobbyPopupSize: size });
  }
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  e.preventDefault();
}

// Removed duplicate onMessage listener (handled earlier via handleMessage)

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
