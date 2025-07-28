// Bobby Chrome Extension - Popup Script

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Load stats
  loadStats();
  
  // Setup event listeners
  document.getElementById('options-btn').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
  
  document.getElementById('history-btn').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('pages/history.html') });
  });
  
  document.getElementById('shortcuts-btn').addEventListener('click', (e) => {
    e.preventDefault();
    showShortcuts();
  });
});

// Load usage statistics
async function loadStats() {
  try {
    const stats = await chrome.storage.local.get(['totalAnalyses', 'totalTimeSaved']);
    
    // Update analyses count
    const analysesCount = stats.totalAnalyses || 0;
    document.getElementById('analyses-count').textContent = analysesCount;
    
    // Update time saved (estimate 2 minutes saved per analysis)
    const timeSaved = (stats.totalTimeSaved || analysesCount * 2);
    document.getElementById('saved-time').textContent = formatTime(timeSaved);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Format time in minutes to human readable
function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  } else {
    const days = Math.floor(minutes / 1440);
    return `${days}d`;
  }
}

// Show keyboard shortcuts
function showShortcuts() {
  const shortcuts = `
    <div style="padding: 16px;">
      <h3 style="margin-bottom: 12px; font-size: 16px;">Keyboard Shortcuts</h3>
      <div style="font-size: 13px; line-height: 1.6;">
        <p><strong>Alt + B</strong> - Analyze selected text</p>
        <p><strong>Esc</strong> - Close Bobby popup</p>
        <p><strong>Tab</strong> - Navigate between modes</p>
        <p><strong>Enter</strong> - Confirm selection</p>
      </div>
    </div>
  `;
  
  // Create a simple modal (in real implementation, this would be more sophisticated)
  alert('Keyboard Shortcuts:\n\nAlt + B - Analyze selected text\nEsc - Close popup\nTab - Navigate modes\nEnter - Confirm');
}