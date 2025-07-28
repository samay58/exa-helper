// Bobby Chrome Extension - Content Script
// Handles text selection, UI injection, and user interactions

// State management
let selectedText = '';
let fabButton = null;
let popupWindow = null;
let isDragging = false;
let isResizing = false;
let currentMode = 'explain';

// Initialize content script
function init() {
  // Listen for text selection
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('selectionchange', handleSelectionChange);
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Clean up on page navigation
  window.addEventListener('beforeunload', cleanup);
  
  console.log('Bobby Extension initialized');
}

// Handle text selection
function handleTextSelection(event) {
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
  fabButton.title = 'Analyze with Bobby';
  
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
  if (popupWindow) {
    closePopup();
  }
  
  // Create popup container
  popupWindow = document.createElement('div');
  popupWindow.className = 'bobby-popup';
  popupWindow.innerHTML = `
    <div class="bobby-header">
      <div class="bobby-drag-handle">⋮⋮</div>
      <h3>Bobby AI Assistant</h3>
      <button class="bobby-close" aria-label="Close">×</button>
    </div>
    
    <div class="bobby-prompt-bar">
      <button class="bobby-prompt-btn active" data-mode="explain">
        <span class="bobby-prompt-icon">💡</span>
        <span>Explain</span>
      </button>
      <button class="bobby-prompt-btn" data-mode="summarize">
        <span class="bobby-prompt-icon">📝</span>
        <span>Summarize</span>
      </button>
      <button class="bobby-prompt-btn" data-mode="keyPoints">
        <span class="bobby-prompt-icon">🔑</span>
        <span>Key Points</span>
      </button>
      <button class="bobby-prompt-btn" data-mode="eli5">
        <span class="bobby-prompt-icon">👶</span>
        <span>ELI5</span>
      </button>
      <button class="bobby-prompt-btn" data-mode="technical">
        <span class="bobby-prompt-icon">🔧</span>
        <span>Technical</span>
      </button>
      <button class="bobby-prompt-btn" data-mode="examples">
        <span class="bobby-prompt-icon">📚</span>
        <span>Examples</span>
      </button>
      <button class="bobby-prompt-btn" data-mode="proscons">
        <span class="bobby-prompt-icon">⚖️</span>
        <span>Pros & Cons</span>
      </button>
      <button class="bobby-prompt-btn" data-mode="factcheck">
        <span class="bobby-prompt-icon">✓</span>
        <span>Fact Check</span>
      </button>
    </div>
    
    <div class="bobby-content">
      <div class="bobby-selected-text">
        <p>${escapeHtml(selectedText.substring(0, 200))}${selectedText.length > 200 ? '...' : ''}</p>
      </div>
      <div class="bobby-result">
        <div class="bobby-loader">
          <div class="bobby-spinner"></div>
          <p>Analyzing text...</p>
        </div>
      </div>
    </div>
    
    <div class="bobby-footer">
      <button class="bobby-action-btn bobby-follow-up" style="display: none;">
        <span>🔄</span> Follow Up
      </button>
      <button class="bobby-action-btn bobby-fact-check" style="display: none;">
        <span>✓</span> Verify Sources
      </button>
    </div>
    
    <div class="bobby-resize-handle"></div>
  `;
  
  // Add to page
  document.body.appendChild(popupWindow);
  
  // Set initial position
  positionPopup();
  
  // Setup event handlers
  setupPopupEvents();
  
  // Animate in
  requestAnimationFrame(() => {
    popupWindow.classList.add('bobby-popup-show');
  });
  
  // Analyze with default mode
  analyzeText(currentMode);
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
  // Close button
  popupWindow.querySelector('.bobby-close').addEventListener('click', closePopup);
  
  // Prompt buttons
  popupWindow.querySelectorAll('.bobby-prompt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = e.currentTarget.dataset.mode;
      switchMode(mode);
    });
  });
  
  // Make draggable
  const dragHandle = popupWindow.querySelector('.bobby-drag-handle');
  dragHandle.addEventListener('mousedown', startDragging);
  
  // Make resizable
  const resizeHandle = popupWindow.querySelector('.bobby-resize-handle');
  resizeHandle.addEventListener('mousedown', startResizing);
}

// Switch analysis mode
function switchMode(mode) {
  currentMode = mode;
  
  // Update active button
  popupWindow.querySelectorAll('.bobby-prompt-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  
  // Re-analyze with new mode
  analyzeText(mode);
}

// Analyze text with selected mode
async function analyzeText(mode) {
  const resultDiv = popupWindow.querySelector('.bobby-result');
  resultDiv.innerHTML = `
    <div class="bobby-loader">
      <div class="bobby-spinner"></div>
      <p>Analyzing text...</p>
    </div>
  `;
  
  try {
    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      action: 'analyzeText',
      text: selectedText,
      mode: mode
    });
    
    if (response.success) {
      displayResult(response.result, response.fromCache);
      
      // Show action buttons for certain modes
      if (mode === 'factcheck' || mode === 'explain') {
        popupWindow.querySelector('.bobby-fact-check').style.display = 'inline-flex';
      }
      popupWindow.querySelector('.bobby-follow-up').style.display = 'inline-flex';
    } else {
      displayError(response.error);
    }
  } catch (error) {
    displayError(error.message);
  }
}

// Display analysis result
function displayResult(result, fromCache = false) {
  const resultDiv = popupWindow.querySelector('.bobby-result');
  resultDiv.innerHTML = `
    <div class="bobby-analysis">
      ${fromCache ? '<p class="bobby-cache-notice">📦 From cache</p>' : ''}
      <div class="bobby-markdown">${markdownToHtml(result)}</div>
    </div>
  `;
}

// Display error message
function displayError(error) {
  const resultDiv = popupWindow.querySelector('.bobby-result');
  resultDiv.innerHTML = `
    <div class="bobby-error">
      <p>❌ Error: ${escapeHtml(error)}</p>
      <p>Please check your API configuration in the extension options.</p>
    </div>
  `;
}

// Close popup
function closePopup() {
  if (popupWindow) {
    popupWindow.classList.remove('bobby-popup-show');
    setTimeout(() => {
      if (popupWindow) {
        popupWindow.remove();
        popupWindow = null;
      }
    }, 200);
  }
}

// Dragging functionality
function startDragging(e) {
  isDragging = true;
  const startX = e.clientX - popupWindow.offsetLeft;
  const startY = e.clientY - popupWindow.offsetTop;
  
  function handleMouseMove(e) {
    if (!isDragging) return;
    
    let newX = e.clientX - startX;
    let newY = e.clientY - startY;
    
    // Keep within viewport
    newX = Math.max(0, Math.min(newX, window.innerWidth - popupWindow.offsetWidth));
    newY = Math.max(0, Math.min(newY, window.innerHeight - popupWindow.offsetHeight));
    
    popupWindow.style.left = `${newX}px`;
    popupWindow.style.top = `${newY}px`;
  }
  
  function handleMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

// Resizing functionality
function startResizing(e) {
  isResizing = true;
  const startX = e.clientX;
  const startWidth = popupWindow.offsetWidth;
  const startHeight = popupWindow.offsetHeight;
  
  function handleMouseMove(e) {
    if (!isResizing) return;
    
    const newWidth = Math.max(300, Math.min(800, startWidth + (e.clientX - startX)));
    const newHeight = Math.max(200, startHeight + (e.clientY - e.clientY));
    
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
function handleMessage(request, sender, sendResponse) {
  if (request.action === 'analyzeSelection' && request.text) {
    selectedText = request.text;
    showPopup();
  }
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function markdownToHtml(markdown) {
  // Simple markdown parser
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    .replace(/- (.+?)(?=\n|$)/g, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/<\/li><li>/g, '</li><li>');
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
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}