// Bobby Chrome Extension - Button Manager Module
// Creates and manages icon-only buttons with tooltips

class ButtonManager {
  constructor() {
    this.buttons = new Map();
    this.tooltipTimeout = null;
    this.useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM || false;
    this.useContextAware = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_CONTEXT_AWARE || false;
    this.interactionEffects = null;
    this.particleEffects = null;
    
    // Initialize effects if enabled
    if (window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_SPRING_ANIMATIONS && window.InteractionEffects) {
      this.interactionEffects = new window.InteractionEffects();
    }
    if (window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_PARTICLE_EFFECTS && window.ParticleEffects) {
      this.particleEffects = new window.ParticleEffects();
    }
  }

  /**
   * Create an icon button with tooltip
   */
  createButton(options) {
    const {
      id,
      icon,
      tooltip,
      onClick,
      className = '',
      ariaLabel
    } = options;

    const button = document.createElement('button');
    button.id = id || `bobby-btn-${Date.now()}`;
    button.className = `bobby-icon-btn ${className}`;
    button.innerHTML = icon;
    button.title = tooltip || '';
    button.setAttribute('aria-label', ariaLabel || tooltip || 'Button');
    
    // Add click handler
    if (onClick) {
      button.addEventListener('click', onClick);
    }

    // Store button reference
    this.buttons.set(button.id, {
      element: button,
      options
    });

    // Add enhanced tooltip if needed
    if (tooltip) {
      this.addEnhancedTooltip(button, tooltip);
    }

    return button;
  }

  /**
   * Create action buttons for popup
   */
  createActionButtons() {
    const buttons = {
      close: this.createButton({
        id: 'bobby-close-btn',
        icon: '×',
        tooltip: 'Close (Esc)',
        className: 'bobby-close',
        onClick: () => window.bobbyClose && window.bobbyClose()
      }),

      copy: this.createButton({
        id: 'bobby-copy-btn',
        icon: '📋',
        tooltip: 'Copy to clipboard',
        className: 'bobby-action',
        onClick: () => this.copyToClipboard()
      }),

      favorite: this.createButton({
        id: 'bobby-favorite-btn',
        icon: '⭐',
        tooltip: 'Add to favorites',
        className: 'bobby-action',
        onClick: () => this.toggleFavorite()
      }),

      share: this.createButton({
        id: 'bobby-share-btn',
        icon: '🔗',
        tooltip: 'Share',
        className: 'bobby-action',
        onClick: () => this.shareContent()
      }),

      fullscreen: this.createButton({
        id: 'bobby-fullscreen-btn',
        icon: '⛶',
        tooltip: 'Fullscreen',
        className: 'bobby-action',
        onClick: () => this.toggleFullscreen()
      })
    };

    return buttons;
  }

  /**
   * Create context buttons (follow-up, fact-check)
   */
  createContextButtons() {
    return {
      followUp: this.createButton({
        id: 'bobby-followup-btn',
        icon: '🔄',
        tooltip: 'Ask follow-up question',
        className: 'bobby-context-btn',
        onClick: () => window.bobbyFollowUp && window.bobbyFollowUp()
      }),

      factCheck: this.createButton({
        id: 'bobby-factcheck-btn',
        icon: '✓',
        tooltip: 'Verify with sources',
        className: 'bobby-context-btn',
        onClick: () => window.bobbyFactCheck && window.bobbyFactCheck()
      }),

      explain: this.createButton({
        id: 'bobby-explain-btn',
        icon: '💡',
        tooltip: 'Explain this further',
        className: 'bobby-context-btn',
        onClick: () => window.bobbyExplainMore && window.bobbyExplainMore()
      }),

      translate: this.createButton({
        id: 'bobby-translate-btn',
        icon: '🌐',
        tooltip: 'Translate',
        className: 'bobby-context-btn',
        onClick: () => window.bobbyTranslate && window.bobbyTranslate()
      })
    };
  }

  /**
   * Convert prompt buttons to icon mode
   */
  convertToIconMode(promptButtons) {
    promptButtons.forEach(btn => {
      const mode = btn.dataset.mode;
      const promptData = this.getPromptIcon(mode);
      
      if (promptData) {
        // Store original content
        btn.dataset.originalContent = btn.innerHTML;
        
        // Convert to icon only
        btn.innerHTML = `<span class="bobby-prompt-icon">${promptData.icon}</span>`;
        btn.classList.add('bobby-icon-mode');
        
        // Add enhanced tooltip
        this.addEnhancedTooltip(btn, promptData.name);
      }
    });
  }

  /**
   * Restore prompt buttons from icon mode
   */
  restoreFromIconMode(promptButtons) {
    promptButtons.forEach(btn => {
      if (btn.dataset.originalContent) {
        btn.innerHTML = btn.dataset.originalContent;
        btn.classList.remove('bobby-icon-mode');
        this.removeEnhancedTooltip(btn);
      }
    });
  }

  /**
   * Add enhanced tooltip to element
   */
  addEnhancedTooltip(element, text) {
    element.addEventListener('mouseenter', (e) => {
      this.showTooltip(e.target, text);
    });

    element.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });

    element.addEventListener('focus', (e) => {
      this.showTooltip(e.target, text);
    });

    element.addEventListener('blur', () => {
      this.hideTooltip();
    });
  }

  /**
   * Show tooltip near element
   */
  showTooltip(element, text) {
    // Clear any existing timeout
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }

    // Remove existing tooltip
    this.hideTooltip();

    // Create tooltip after delay
    this.tooltipTimeout = setTimeout(() => {
      const tooltip = document.createElement('div');
      tooltip.className = 'bobby-tooltip-enhanced';
      tooltip.textContent = text;
      tooltip.id = 'bobby-tooltip';
      
      document.body.appendChild(tooltip);

      // Position tooltip
      const rect = element.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      let left = rect.left + (rect.width - tooltipRect.width) / 2;
      let top = rect.top - tooltipRect.height - 8;

      // Adjust if would go off screen
      if (left < 10) left = 10;
      if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
      }
      if (top < 10) {
        top = rect.bottom + 8; // Show below instead
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      
      // Animate in
      requestAnimationFrame(() => {
        tooltip.classList.add('show');
      });
    }, 500); // Show after 500ms hover
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }

    const tooltip = document.getElementById('bobby-tooltip');
    if (tooltip) {
      tooltip.classList.remove('show');
      setTimeout(() => tooltip.remove(), 200);
    }
  }

  /**
   * Remove enhanced tooltip from element
   */
  removeEnhancedTooltip(element) {
    // Clone element to remove all event listeners
    const newElement = element.cloneNode(true);
    element.parentNode.replaceChild(newElement, element);
  }

  /**
   * Get prompt icon data
   */
  getPromptIcon(mode) {
    const prompts = {
      explain: { icon: '💡', name: 'Explain' },
      summarize: { icon: '📝', name: 'Summarize' },
      keyPoints: { icon: '🔑', name: 'Key Points' },
      eli5: { icon: '👶', name: 'ELI5' },
      technical: { icon: '🔧', name: 'Technical' },
      examples: { icon: '📚', name: 'Examples' },
      proscons: { icon: '⚖️', name: 'Pros & Cons' },
      factcheck: { icon: '✓', name: 'Fact Check' }
    };

    return prompts[mode];
  }

  /**
   * Copy current content to clipboard
   */
  async copyToClipboard() {
    const useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM;
    const resultSelector = useV2 ? '.bobby-result-v2' : '.bobby-result';
    const content = document.querySelector(resultSelector)?.textContent || '';
    const copyBtn = this.buttons.get('bobby-copy-btn')?.element;
    
    if (!copyBtn) return;
    
    // Store original icon
    const originalIcon = copyBtn.innerHTML;
    
    try {
      await navigator.clipboard.writeText(content);
      
      // Show inline success feedback
      copyBtn.innerHTML = '✓';
      copyBtn.classList.add('bobby-state-success');
      
      // Revert after 2 seconds
      setTimeout(() => {
        copyBtn.innerHTML = originalIcon;
        copyBtn.classList.remove('bobby-state-success');
      }, 2000);
      
    } catch (error) {
      console.error('Failed to copy:', error);
      
      // Show inline error feedback
      copyBtn.innerHTML = '✗';
      copyBtn.classList.add('bobby-state-error');
      
      // Revert after 2 seconds
      setTimeout(() => {
        copyBtn.innerHTML = originalIcon;
        copyBtn.classList.remove('bobby-state-error');
      }, 2000);
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite() {
    const btn = this.buttons.get('bobby-favorite-btn');
    if (!btn) return;

    const isFavorite = btn.element.classList.contains('active');
    
    if (isFavorite) {
      btn.element.classList.remove('active');
      btn.element.innerHTML = '⭐';
      this.showNotification('Removed from favorites', 'info');
    } else {
      btn.element.classList.add('active');
      btn.element.innerHTML = '⭐';
      this.showNotification('Added to favorites', 'success');
    }

    // Notify history manager
    if (window.currentHistoryId && window.HistoryManager) {
      await window.HistoryManager.toggleFavorite(window.currentHistoryId);
    }
  }

  /**
   * Share content
   */
  async shareContent() {
    const text = document.querySelector('.bobby-selected-text')?.textContent || '';
    const response = document.querySelector('.bobby-result')?.textContent || '';
    
    const shareData = {
      title: 'Bobby AI Analysis',
      text: `Question: ${text}\n\nAnswer: ${response}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy share link
        const shareText = `${shareData.text}\n\nAnalyzed at: ${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        this.showNotification('Share link copied!', 'success');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen() {
    const popup = document.querySelector('.bobby-popup');
    if (!popup) return;

    popup.classList.toggle('bobby-fullscreen');
    
    const btn = this.buttons.get('bobby-fullscreen-btn');
    if (btn) {
      btn.element.innerHTML = popup.classList.contains('bobby-fullscreen') ? '⊡' : '⛶';
    }
  }

  /**
   * Show temporary notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `bobby-notification bobby-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    // Remove after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  /**
   * Create button group
   */
  createButtonGroup(buttons, className = '') {
    const group = document.createElement('div');
    group.className = `bobby-button-group ${className}`;
    
    Object.values(buttons).forEach(btn => {
      if (btn instanceof HTMLElement) {
        group.appendChild(btn);
      }
    });

    return group;
  }

  /**
   * Update button state
   */
  updateButtonState(buttonId, state) {
    const btn = this.buttons.get(buttonId);
    if (!btn) return;

    if (state.disabled !== undefined) {
      btn.element.disabled = state.disabled;
    }

    if (state.active !== undefined) {
      btn.element.classList.toggle('active', state.active);
    }

    if (state.icon !== undefined) {
      btn.element.innerHTML = state.icon;
    }

    if (state.tooltip !== undefined) {
      btn.element.title = state.tooltip;
      btn.element.setAttribute('aria-label', state.tooltip);
    }
  }

  /**
   * Destroy all buttons and cleanup
   */
  destroy() {
    this.hideTooltip();
    this.buttons.clear();
  }
  
  /**
   * Create V2 action buttons with context awareness
   */
  createV2ActionButtons(contentType = 'general') {
    const baseButtons = this.createActionButtons();
    
    if (!this.useV2) {
      return baseButtons;
    }
    
    // Enhance buttons with V2 features
    Object.values(baseButtons).forEach(button => {
      if (button instanceof HTMLElement) {
        button.classList.add('bobby-btn-v2');
        this.attachInteractionEffects(button);
      }
    });
    
    // Add context-specific buttons
    if (this.useContextAware) {
      const contextButtons = this.createContextualButtons(contentType);
      return { ...baseButtons, ...contextButtons };
    }
    
    return baseButtons;
  }
  
  /**
   * Create contextual buttons based on content type
   */
  createContextualButtons(contentType) {
    const buttons = {};
    
    switch (contentType) {
      case 'code':
        buttons.debug = this.createButton({
          id: 'bobby-debug-btn',
          icon: '🐛',
          tooltip: 'Debug this code',
          className: 'bobby-context-btn bobby-btn-v2',
          onClick: () => window.bobbyAnalyze && window.bobbyAnalyze('debug')
        });
        buttons.optimize = this.createButton({
          id: 'bobby-optimize-btn',
          icon: '⚡',
          tooltip: 'Optimize code',
          className: 'bobby-context-btn bobby-btn-v2',
          onClick: () => window.bobbyAnalyze && window.bobbyAnalyze('optimize')
        });
        break;
        
      case 'data':
        buttons.visualize = this.createButton({
          id: 'bobby-visualize-btn',
          icon: '📊',
          tooltip: 'Visualize data',
          className: 'bobby-context-btn bobby-btn-v2',
          onClick: () => window.bobbyAnalyze && window.bobbyAnalyze('visualize')
        });
        buttons.calculate = this.createButton({
          id: 'bobby-calculate-btn',
          icon: '🧮',
          tooltip: 'Calculate',
          className: 'bobby-context-btn bobby-btn-v2',
          onClick: () => window.bobbyAnalyze && window.bobbyAnalyze('calculate')
        });
        break;
        
      case 'foreign':
        buttons.translate = this.createButton({
          id: 'bobby-translate-btn',
          icon: '🌐',
          tooltip: 'Translate',
          className: 'bobby-context-btn bobby-btn-v2',
          onClick: () => window.bobbyAnalyze && window.bobbyAnalyze('translate')
        });
        buttons.pronounce = this.createButton({
          id: 'bobby-pronounce-btn',
          icon: '🔊',
          tooltip: 'Pronunciation guide',
          className: 'bobby-context-btn bobby-btn-v2',
          onClick: () => window.bobbyAnalyze && window.bobbyAnalyze('pronounce')
        });
        break;
    }
    
    // Attach effects to context buttons
    Object.values(buttons).forEach(button => {
      if (button instanceof HTMLElement) {
        this.attachInteractionEffects(button);
      }
    });
    
    return buttons;
  }
  
  /**
   * Attach interaction effects to button
   */
  attachInteractionEffects(button) {
    if (!button) return;
    
    // Add spring animation on click
    if (this.interactionEffects) {
      button.addEventListener('click', (e) => {
        this.interactionEffects.popButton(button);
      });
      
      // Add hover effects
      button.addEventListener('mouseenter', () => {
        this.interactionEffects.animateSpring(button, {
          scale: 1.05
        }, 300);
      });
      
      button.addEventListener('mouseleave', () => {
        this.interactionEffects.animateSpring(button, {
          scale: 1
        }, 300);
      });
    }
    
    // Add particle effects
    if (this.particleEffects) {
      button.addEventListener('click', (e) => {
        const rect = button.getBoundingClientRect();
        this.particleEffects.burst(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
          6
        );
      });
      
      button.addEventListener('mouseenter', () => {
        const rect = button.getBoundingClientRect();
        this.particleEffects.createParticles(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
          3
        );
      });
    }
  }
  
  /**
   * Create contextual tooltip with preview
   */
  createContextualTooltip(element, content, preview = null) {
    if (!this.useV2) {
      this.addEnhancedTooltip(element, content);
      return;
    }
    
    element.addEventListener('mouseenter', (e) => {
      this.showV2Tooltip(e.target, content, preview);
    });
    
    element.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });
    
    element.addEventListener('focus', (e) => {
      this.showV2Tooltip(e.target, content, preview);
    });
    
    element.addEventListener('blur', () => {
      this.hideTooltip();
    });
  }
  
  /**
   * Show V2 tooltip with glassmorphism
   */
  showV2Tooltip(element, content, preview = null) {
    // Clear any existing timeout
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }
    
    // Remove existing tooltip
    this.hideTooltip();
    
    // Create tooltip after delay
    this.tooltipTimeout = setTimeout(() => {
      const tooltip = document.createElement('div');
      tooltip.className = 'bobby-tooltip-v2';
      tooltip.id = 'bobby-tooltip';
      
      tooltip.innerHTML = `
        <div class="bobby-tooltip-v2-content">
          ${preview ? `
            <div class="bobby-tooltip-v2-preview">
              ${preview}
            </div>
          ` : ''}
          <div class="bobby-tooltip-v2-text">
            ${content}
          </div>
        </div>
        <div class="bobby-tooltip-v2-arrow"></div>
      `;
      
      document.body.appendChild(tooltip);
      
      // Position tooltip
      const rect = element.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      let left = rect.left + (rect.width - tooltipRect.width) / 2;
      let top = rect.top - tooltipRect.height - 12;
      
      // Adjust if would go off screen
      if (left < 10) left = 10;
      if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
      }
      if (top < 10) {
        top = rect.bottom + 12; // Show below instead
        tooltip.classList.add('bottom');
      }
      
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      
      // Animate in with spring
      if (this.interactionEffects) {
        this.interactionEffects.elasticScale(tooltip, 0.8, 1);
      } else {
        requestAnimationFrame(() => {
          tooltip.classList.add('show');
        });
      }
    }, 300); // Show after 300ms hover
  }
  
  /**
   * Update button set dynamically based on content
   */
  updateButtonsForContent(contentType) {
    if (!this.useContextAware) return;
    
    // Get the header actions container
    const headerActions = document.querySelector('.bobby-header-actions');
    if (!headerActions) return;
    
    // Clear existing buttons
    headerActions.innerHTML = '';
    
    // Create new button set
    const buttons = this.createV2ActionButtons(contentType);
    
    // Add buttons to header
    Object.values(buttons).forEach(button => {
      if (button instanceof HTMLElement) {
        headerActions.appendChild(button);
      }
    });
  }
  
  /**
   * Create floating action menu
   */
  createFloatingMenu(actions) {
    const menu = document.createElement('div');
    menu.className = 'bobby-floating-menu';
    
    actions.forEach((action, index) => {
      const button = this.createButton({
        ...action,
        className: `bobby-floating-menu-item bobby-btn-v2 ${action.className || ''}`
      });
      
      // Stagger animation
      button.style.animationDelay = `${index * 50}ms`;
      
      this.attachInteractionEffects(button);
      menu.appendChild(button);
    });
    
    return menu;
  }
}

// Export for use in extension
window.ButtonManager = ButtonManager;