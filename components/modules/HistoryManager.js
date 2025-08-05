// Bobby Chrome Extension - History Manager Module
// Manages storage and retrieval of past queries and analyses

class HistoryManager {
  constructor() {
    this.storageKey = 'bobby_history';
    this.maxItems = 100;
    this.initialized = false;
    this.history = [];
  }

  /**
   * Initialize history manager
   */
  async init() {
    if (this.initialized) return;
    
    try {
      const stored = await chrome.storage.local.get(this.storageKey);
      this.history = stored[this.storageKey] || [];
      this.initialized = true;
      
      // Proactive cleanup on init if history is large
      if (this.history.length > 70) {
        console.log('Bobby: Proactive history cleanup on init');
        await this.cleanupOldEntries();
        await this.save();
      }
    } catch (error) {
      console.error('Error initializing history:', error);
      this.history = [];
      this.initialized = true;
    }
  }

  /**
   * Add a new entry to history
   */
  async addToHistory(text, response, mode, metadata = {}) {
    await this.init();
    
    const entry = {
      id: this.generateId(),
      timestamp: Date.now(),
      text: text.substring(0, 500), // Limit stored text length
      response: response,
      mode: mode,
      metadata: {
        url: window.location.href,
        title: document.title,
        ...metadata
      }
    };

    // Add to beginning of array
    this.history.unshift(entry);

    // Limit history size
    if (this.history.length > this.maxItems) {
      this.history = this.history.slice(0, this.maxItems);
    }

    // Save to storage
    await this.save();
    
    // Update stats
    await this.updateStats();

    return entry;
  }

  /**
   * Add a follow-up question to existing entry
   */
  async addFollowUp(parentId, question, response) {
    await this.init();
    
    const parentEntry = this.history.find(h => h.id === parentId);
    if (!parentEntry) {
      throw new Error('Parent entry not found');
    }

    if (!parentEntry.followUps) {
      parentEntry.followUps = [];
    }

    const followUp = {
      id: this.generateId(),
      timestamp: Date.now(),
      question,
      response
    };

    parentEntry.followUps.push(followUp);
    await this.save();

    return followUp;
  }

  /**
   * Get all history entries
   */
  async getHistory(options = {}) {
    await this.init();
    
    let filtered = [...this.history];

    // Filter by mode
    if (options.mode) {
      filtered = filtered.filter(h => h.mode === options.mode);
    }

    // Filter by date range
    if (options.startDate) {
      const startTime = new Date(options.startDate).getTime();
      filtered = filtered.filter(h => h.timestamp >= startTime);
    }

    if (options.endDate) {
      const endTime = new Date(options.endDate).getTime();
      filtered = filtered.filter(h => h.timestamp <= endTime);
    }

    // Search in text
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter(h => 
        h.text.toLowerCase().includes(searchLower) ||
        h.response.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      items: filtered.slice(start, end),
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize)
    };
  }

  /**
   * Get a single history entry by ID
   */
  async getEntry(id) {
    await this.init();
    return this.history.find(h => h.id === id);
  }

  /**
   * Delete a history entry
   */
  async deleteEntry(id) {
    await this.init();
    
    const index = this.history.findIndex(h => h.id === id);
    if (index === -1) {
      throw new Error('Entry not found');
    }

    this.history.splice(index, 1);
    await this.save();
  }

  /**
   * Clear all history
   */
  async clearHistory() {
    this.history = [];
    await this.save();
    await this.updateStats();
  }

  /**
   * Export history as JSON
   */
  async exportHistory() {
    await this.init();
    
    return {
      version: '1.0',
      exported: new Date().toISOString(),
      entries: this.history
    };
  }

  /**
   * Import history from JSON
   */
  async importHistory(data) {
    if (!data.version || !data.entries) {
      throw new Error('Invalid import data format');
    }

    // Merge with existing history
    const importedIds = new Set(data.entries.map(e => e.id));
    const existingFiltered = this.history.filter(h => !importedIds.has(h.id));
    
    this.history = [...data.entries, ...existingFiltered];
    
    // Sort by timestamp
    this.history.sort((a, b) => b.timestamp - a.timestamp);
    
    // Limit size
    if (this.history.length > this.maxItems) {
      this.history = this.history.slice(0, this.maxItems);
    }

    await this.save();
  }

  /**
   * Get usage statistics
   */
  async getStats() {
    await this.init();
    
    const stats = {
      totalAnalyses: this.history.length,
      byMode: {},
      todayCount: 0,
      weekCount: 0,
      monthCount: 0
    };

    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);
    const week = now - (7 * 24 * 60 * 60 * 1000);
    const month = now - (30 * 24 * 60 * 60 * 1000);

    this.history.forEach(entry => {
      // Count by mode
      stats.byMode[entry.mode] = (stats.byMode[entry.mode] || 0) + 1;
      
      // Count by time period
      if (entry.timestamp >= today) stats.todayCount++;
      if (entry.timestamp >= week) stats.weekCount++;
      if (entry.timestamp >= month) stats.monthCount++;
    });

    return stats;
  }

  /**
   * Save history to storage with automatic cleanup
   */
  async save() {
    try {
      await chrome.storage.local.set({
        [this.storageKey]: this.history
      });
    } catch (error) {
      console.error('Error saving history:', error);
      
      // If quota exceeded, clean up old entries
      if (error.message && error.message.includes('quota')) {
        console.log('Bobby: Storage quota exceeded, cleaning up old entries...');
        await this.cleanupOldEntries();
        
        // Try saving again after cleanup
        try {
          await chrome.storage.local.set({
            [this.storageKey]: this.history
          });
          console.log('Bobby: Successfully saved after cleanup');
        } catch (retryError) {
          console.error('Bobby: Still failed after cleanup:', retryError);
          // Don't throw - allow operation to continue without history
        }
      } else {
        // Don't throw for storage errors - allow extension to continue working
        console.error('Bobby: Storage error (non-fatal):', error);
      }
    }
  }
  
  /**
   * Clean up old entries to free storage space
   */
  async cleanupOldEntries() {
    const maxEntries = 50; // Keep only last 50 entries
    const entriesToRemove = 20; // Remove 20 oldest entries at a time
    
    if (this.history.length > maxEntries) {
      // Sort by timestamp (oldest first)
      this.history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // Remove oldest entries
      const removed = this.history.splice(0, entriesToRemove);
      console.log(`Bobby: Removed ${removed.length} old history entries`);
      
      // Also clear other storage data if needed
      const storageData = await chrome.storage.local.get(null);
      const storageSize = JSON.stringify(storageData).length;
      
      if (storageSize > 5000000) { // If over 5MB
        // Clear cache entries
        const cacheKeys = Object.keys(storageData).filter(key => key.startsWith('cache_'));
        if (cacheKeys.length > 0) {
          await chrome.storage.local.remove(cacheKeys);
          console.log(`Bobby: Cleared ${cacheKeys.length} cache entries`);
        }
      }
    }
  }

  /**
   * Update usage statistics in storage
   */
  async updateStats() {
    const stats = await this.getStats();
    await chrome.storage.local.set({
      totalAnalyses: stats.totalAnalyses,
      totalTimeSaved: stats.totalAnalyses * 2 // Estimate 2 minutes saved per analysis
    });
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Search history with advanced options
   */
  async searchHistory(query, options = {}) {
    await this.init();
    
    const searchOptions = {
      search: query,
      ...options
    };

    return this.getHistory(searchOptions);
  }

  /**
   * Get recent entries
   */
  async getRecent(count = 5) {
    await this.init();
    return this.history.slice(0, count);
  }

  /**
   * Get entries by URL
   */
  async getByUrl(url) {
    await this.init();
    return this.history.filter(h => h.metadata.url === url);
  }

  /**
   * Get favorite entries
   */
  async getFavorites() {
    await this.init();
    return this.history.filter(h => h.metadata.favorite);
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id) {
    await this.init();
    
    const entry = this.history.find(h => h.id === id);
    if (!entry) {
      throw new Error('Entry not found');
    }

    if (!entry.metadata) {
      entry.metadata = {};
    }

    entry.metadata.favorite = !entry.metadata.favorite;
    await this.save();

    return entry;
  }
}

// Create singleton instance
const historyManager = new HistoryManager();

// Export for use in extension
window.HistoryManager = historyManager;