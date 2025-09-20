// Bobby Chrome Extension - History Page Script
// Manages the display and interaction with analysis history

// State management
let historyData = [];
let filteredData = [];
let currentFilter = 'all';
let currentSort = 'date-desc';
let searchQuery = '';

// DOM elements
const historyList = document.getElementById('history-list');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const filterButtons = document.getElementById('filter-buttons');
const exportBtn = document.getElementById('export-btn');
const clearBtn = document.getElementById('clear-btn');
const detailModal = document.getElementById('detail-modal');
const modalContent = document.getElementById('modal-content');
const modalTitle = document.getElementById('modal-title');
const modalClose = document.getElementById('modal-close');

// Statistics elements
const totalAnalyses = document.getElementById('total-analyses');
const favoriteCount = document.getElementById('favorite-count');
const factChecks = document.getElementById('fact-checks');
const followupCount = document.getElementById('followup-count');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Load history data
  await loadHistory();
  
  // Setup event listeners
  searchInput.addEventListener('input', handleSearch);
  sortSelect.addEventListener('change', handleSort);
  exportBtn.addEventListener('click', handleExport);
  clearBtn.addEventListener('click', handleClearAll);
  modalClose.addEventListener('click', closeModal);
  
  // Filter buttons
  filterButtons.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', handleFilter);
  });
  
  // Close modal on overlay click
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) {
      closeModal();
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
}

// Load history from storage (migrate legacy key if needed)
async function loadHistory() {
  try {
    // Read both the current and legacy keys
    const storage = await chrome.storage.local.get(['bobby_history', 'bobbyHistory']);

    let items = storage.bobby_history || [];

    // Migrate from legacy key if present and current is empty
    if ((!items || items.length === 0) && Array.isArray(storage.bobbyHistory)) {
      const legacy = storage.bobbyHistory;
      items = legacy.map((it) => ({
        // Preserve existing fields and normalize
        id: it.id || `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        timestamp: it.timestamp || Date.now(),
        text: it.text || '',
        response: it.response || it.result || '',
        mode: it.mode || 'explain',
        metadata: it.metadata || {
          url: it.url || '',
          title: it.title || document.title || ''
        },
        followUps: it.followUps || []
      }));

      // Write migrated data to the new key and remove legacy key
      await chrome.storage.local.set({ bobby_history: items });
      await chrome.storage.local.remove('bobbyHistory');
    }

    historyData = items;

    // Sort by date initially
    historyData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Update stats
    updateStatistics();

    // Apply filters and render
    applyFiltersAndRender();
  } catch (error) {
    console.error('Error loading history:', error);
    showError('Failed to load history');
  }
}

// Update statistics
function updateStatistics() {
  totalAnalyses.textContent = historyData.length;
  favoriteCount.textContent = historyData.filter(item => item.favorite).length;
  factChecks.textContent = historyData.filter(item => item.mode === 'factcheck').length;
  
  // Count total follow-ups
  let followups = 0;
  historyData.forEach(item => {
    if (item.followUps && item.followUps.length > 0) {
      followups += item.followUps.length;
    }
  });
  followupCount.textContent = followups;
}

// Apply filters and render
function applyFiltersAndRender() {
  // Start with all data
  filteredData = [...historyData];
  
  // Apply mode filter
  if (currentFilter !== 'all') {
    filteredData = filteredData.filter(item => item.mode === currentFilter);
  }
  
  // Apply search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredData = filteredData.filter(item => 
      item.text.toLowerCase().includes(query) ||
      (item.response || '').toLowerCase().includes(query) ||
      (item.followUps && item.followUps.some(f => 
        f.question.toLowerCase().includes(query) ||
        f.answer.toLowerCase().includes(query)
      ))
    );
  }
  
  // Apply sort
  switch (currentSort) {
    case 'date-desc':
      filteredData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      break;
    case 'date-asc':
      filteredData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      break;
    case 'mode':
      filteredData.sort((a, b) => a.mode.localeCompare(b.mode));
      break;
  }
  
  // Render
  renderHistory();
}

// Render history items
function renderHistory() {
  if (filteredData.length === 0) {
    historyList.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  historyList.style.display = 'grid';
  emptyState.style.display = 'none';
  
  historyList.innerHTML = filteredData.map(item => createHistoryItem(item)).join('');
  
  // Add event listeners to items
  historyList.querySelectorAll('.history-item').forEach((element, index) => {
    const item = filteredData[index];
    
    // Click to view details
    element.addEventListener('click', (e) => {
      if (!e.target.closest('.action-btn')) {
        showDetails(item);
      }
    });
    
    // Action buttons
    element.querySelector('.copy-btn').addEventListener('click', () => copyToClipboard(item));
    element.querySelector('.favorite-btn').addEventListener('click', () => toggleFavorite(item));
    element.querySelector('.delete-btn').addEventListener('click', () => deleteItem(item));
  });
}

// Create history item HTML
function createHistoryItem(item) {
  const date = new Date(item.timestamp);
  const timeAgo = getTimeAgo(date);
  const dateStr = date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  const modeColors = {
    explain: '#6366f1',
    summarize: '#8b5cf6',
    keyPoints: '#ec4899',
    eli5: '#f59e0b',
    technical: '#10b981',
    examples: '#3b82f6',
    proscons: '#ef4444',
    factcheck: '#06b6d4'
  };
  
  const modeColor = modeColors[item.mode] || '#6366f1';
  
  return `
    <div class="history-item" data-id="${item.id}">
      <div class="history-item-header">
        <h3 class="history-item-title">${escapeHtml(item.text)}</h3>
        <span class="history-item-mode" style="background: ${modeColor}20; color: ${modeColor}">
          ${getModeLabel(item.mode)}
        </span>
      </div>
      
      <div class="history-item-preview">
        ${escapeHtml(getPreview(item.response || ''))}
      </div>
      
      <div class="history-item-meta">
        <span>📅 ${dateStr}</span>
        <span>⏱️ ${timeAgo}</span>
        ${item.followUps && item.followUps.length > 0 ? 
          `<span>💬 ${item.followUps.length} follow-up${item.followUps.length > 1 ? 's' : ''}</span>` : ''}
        ${item.favorite ? '<span>⭐ Favorite</span>' : ''}
      </div>
      
      <div class="history-item-actions">
        <button class="action-btn copy-btn">
          <span>📋</span> Copy
        </button>
        <button class="action-btn favorite-btn">
          <span>${item.favorite ? '⭐' : '☆'}</span> ${item.favorite ? 'Unfavorite' : 'Favorite'}
        </button>
        <button class="action-btn danger delete-btn">
          <span>🗑️</span> Delete
        </button>
      </div>
    </div>
  `;
}

// Show item details in modal
function showDetails(item) {
  modalTitle.textContent = getModeLabel(item.mode) + ' Analysis';
  
  let content = `
    <div class="modal-section">
      <div class="modal-section-title">Original Text</div>
      <div class="bobby-card">
        <p>${escapeHtml(item.text)}</p>
      </div>
    </div>
    
    <div class="modal-section">
      <div class="modal-section-title">Analysis Result</div>
      <div class="bobby-markdown">
        ${markdownToHtml(item.response || '')}
      </div>
    </div>
  `;
  
  // Add fact check data if available
  if (item.mode === 'factcheck' && item.metadata && (item.metadata.factCheckData || item.metadata.factCheckResults)) {
    const data = item.metadata.factCheckData || item.metadata.factCheckResults;
    content += `
      <div class="modal-section">
        <div class="modal-section-title">Fact Check Results</div>
        <div class="bobby-fact-check-summary">
          <div class="bobby-score-circle" data-score="${data.overallScore}">
            <span class="bobby-score-value">${data.overallScore}%</span>
            <span class="bobby-score-label">Reliability</span>
          </div>
          <div class="bobby-claim-stats">
            <div class="bobby-stat bobby-stat-true">
              <span class="bobby-stat-count">${data.summary.true}</span>
              <span class="bobby-stat-label">True</span>
            </div>
            <div class="bobby-stat bobby-stat-false">
              <span class="bobby-stat-count">${data.summary.false}</span>
              <span class="bobby-stat-label">False</span>
            </div>
            <div class="bobby-stat bobby-stat-partial">
              <span class="bobby-stat-count">${data.summary.partially_true}</span>
              <span class="bobby-stat-label">Partial</span>
            </div>
            <div class="bobby-stat bobby-stat-unverifiable">
              <span class="bobby-stat-count">${data.summary.unverifiable}</span>
              <span class="bobby-stat-label">Unverifiable</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // Add follow-ups if available
  if (item.followUps && item.followUps.length > 0) {
    content += `
      <div class="modal-section">
        <div class="modal-section-title">Follow-up Questions</div>
        ${item.followUps.map(f => `
          <div class="followup-item">
            <div class="followup-question">Q: ${escapeHtml(f.question)}</div>
            <div class="followup-answer">${markdownToHtml(f.answer)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  // Add metadata
  const date = new Date(item.timestamp);
  content += `
    <div class="modal-section">
      <div class="modal-section-title">Details</div>
      <div class="bobby-meta">
        <p><strong>Date:</strong> ${date.toLocaleString()}</p>
        <p><strong>Mode:</strong> ${getModeLabel(item.mode)}</p>
        <p><strong>URL:</strong> ${item.metadata && item.metadata.url ? item.metadata.url : 'Unknown'}</p>
        ${item.favorite ? '<p><strong>Status:</strong> ⭐ Favorited</p>' : ''}
      </div>
    </div>
  `;
  
  modalContent.innerHTML = content;
  detailModal.classList.add('show');
}

// Close modal
function closeModal() {
  detailModal.classList.remove('show');
}

// Event handlers
function handleSearch(e) {
  searchQuery = e.target.value;
  applyFiltersAndRender();
}

function handleSort(e) {
  currentSort = e.target.value;
  applyFiltersAndRender();
}

function handleFilter(e) {
  const filter = e.currentTarget.dataset.filter;
  currentFilter = filter;
  
  // Update active state
  filterButtons.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  
  applyFiltersAndRender();
}

// Copy to clipboard
async function copyToClipboard(item) {
  const text = `${item.text}\n\n---\n\n${item.response || ''}`;
  
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  } catch (error) {
    console.error('Failed to copy:', error);
    showToast('Failed to copy', 'error');
  }
}

// Toggle favorite
async function toggleFavorite(item) {
  item.favorite = !item.favorite;
  
  try {
    await chrome.storage.local.set({ bobby_history: historyData });
    updateStatistics();
    applyFiltersAndRender();
    showToast(item.favorite ? 'Added to favorites' : 'Removed from favorites');
  } catch (error) {
    console.error('Failed to update favorite:', error);
    showToast('Failed to update', 'error');
  }
}

// Delete item
async function deleteItem(item) {
  if (!confirm('Are you sure you want to delete this item?')) {
    return;
  }
  
  try {
    historyData = historyData.filter(h => h.id !== item.id);
    await chrome.storage.local.set({ bobby_history: historyData });
    updateStatistics();
    applyFiltersAndRender();
    showToast('Item deleted');
  } catch (error) {
    console.error('Failed to delete:', error);
    showToast('Failed to delete', 'error');
  }
}

// Export history
async function handleExport() {
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    items: historyData
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bobby-history-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast('History exported successfully!');
}

// Clear all history
async function handleClearAll() {
  if (!confirm('Are you sure you want to clear all history? This cannot be undone.')) {
    return;
  }
  
  try {
    await chrome.storage.local.set({ bobby_history: [] });
    historyData = [];
    updateStatistics();
    applyFiltersAndRender();
    showToast('History cleared');
  } catch (error) {
    console.error('Failed to clear history:', error);
    showToast('Failed to clear history', 'error');
  }
}

// Utility functions
function getModeLabel(mode) {
  const labels = {
    explain: 'Explain',
    summarize: 'Summarize',
    keyPoints: 'Key Points',
    eli5: 'ELI5',
    technical: 'Technical',
    examples: 'Examples',
    proscons: 'Pros & Cons',
    factcheck: 'Fact Check'
  };
  return labels[mode] || mode;
}

function getPreview(text, maxLength = 150) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
    }
  }
  
  return 'Just now';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function markdownToHtml(markdown) {
  // Basic markdown parsing
  return markdown
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `bobby-toast ${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1001;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showError(message) {
  historyList.innerHTML = `
    <div class="error-state">
      <p>⚠️ ${message}</p>
      <button class="bobby-btn bobby-btn-primary" onclick="location.reload()">
        Reload
      </button>
    </div>
  `;
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
