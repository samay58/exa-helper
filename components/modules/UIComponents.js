// Bobby Chrome Extension - UI Components Module
// Reusable UI components and utilities

class UIComponents {
  constructor() {
    this.theme = this.detectTheme();
    this.useV2 = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_GLASSMORPHISM || false;
  }
  
  /**
   * Detect current theme preference
   */
  detectTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
  
  /**
   * Create a loader component
   */
  createLoader(text = 'Loading...') {
    if (this.useV2) {
      return this.createGlassmorphismLoader(text);
    }
    return `
      <div class="bobby-loader">
        <div class="bobby-spinner"></div>
        <p>${this.escapeHtml(text)}</p>
      </div>
    `;
  }
  
  /**
   * Create glassmorphism loader (V2)
   */
  createGlassmorphismLoader(text = 'Loading...') {
    return `
      <div class="bobby-loader-v2">
        <div class="bobby-loader-v2-container">
          <div class="bobby-loader-v2-spinner"></div>
          <p class="bobby-loader-v2-text">${this.escapeHtml(text)}</p>
          <div class="bobby-loader-dots">
            <div class="bobby-loader-dot"></div>
            <div class="bobby-loader-dot"></div>
            <div class="bobby-loader-dot"></div>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Create an error message component
   */
  createError(message, details = null) {
    // Special handling for rate limit errors
    let icon = '❌';
    let primaryMessage = message;
    let detailsMessage = details;
    
    if (message.includes('Rate limit')) {
      icon = '⏱️';
      primaryMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      if (!details) {
        detailsMessage = 'Consider upgrading your API plan for higher limits.';
      }
    } else if (message.includes('API key')) {
      icon = '🔑';
      if (!details) {
        detailsMessage = 'Please check your API configuration in the extension options.';
      }
    }
    
    return `
      <div class="bobby-error">
        <div class="bobby-error-icon">${icon}</div>
        <p class="bobby-error-message">${this.escapeHtml(primaryMessage)}</p>
        ${detailsMessage ? `<p class="bobby-error-details">${this.escapeHtml(detailsMessage)}</p>` : ''}
        <button class="bobby-retry-btn" onclick="window.bobbyRetry && window.bobbyRetry()">
          Try Again
        </button>
      </div>
    `;
  }
  
  /**
   * Create a success message component
   */
  createSuccess(message) {
    return `
      <div class="bobby-success">
        <div class="bobby-success-icon">✅</div>
        <p>${this.escapeHtml(message)}</p>
      </div>
    `;
  }
  
  /**
   * Create a collapsible section
   */
  createCollapsible(title, content, isOpen = false) {
    const id = `bobby-collapse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return `
      <div class="bobby-collapsible ${isOpen ? 'open' : ''}">
        <button class="bobby-collapsible-header" onclick="this.parentElement.classList.toggle('open')" aria-expanded="${isOpen}">
          <span class="bobby-collapsible-icon">${isOpen ? '▼' : '▶'}</span>
          <span class="bobby-collapsible-title">${this.escapeHtml(title)}</span>
        </button>
        <div class="bobby-collapsible-content" id="${id}">
          ${content}
        </div>
      </div>
    `;
  }
  
  /**
   * Create a tabbed interface
   */
  createTabs(tabs, activeIndex = 0) {
    const id = `bobby-tabs-${Date.now()}`;
    const tabHeaders = tabs.map((tab, index) => `
      <button class="bobby-tab-btn ${index === activeIndex ? 'active' : ''}" 
              data-tab-index="${index}"
              onclick="window.bobbySwitchTab && window.bobbySwitchTab('${id}', ${index})">
        ${tab.icon ? `<span class="bobby-tab-icon">${tab.icon}</span>` : ''}
        <span>${this.escapeHtml(tab.title)}</span>
      </button>
    `).join('');
    
    const tabContents = tabs.map((tab, index) => `
      <div class="bobby-tab-content ${index === activeIndex ? 'active' : ''}" 
           data-tab-index="${index}">
        ${tab.content}
      </div>
    `).join('');
    
    return `
      <div class="bobby-tabs" id="${id}">
        <div class="bobby-tab-headers">
          ${tabHeaders}
        </div>
        <div class="bobby-tab-contents">
          ${tabContents}
        </div>
      </div>
    `;
  }
  
  /**
   * Create a tooltip
   */
  createTooltip(text, content) {
    return `
      <span class="bobby-tooltip-wrapper">
        ${content}
        <span class="bobby-tooltip">${this.escapeHtml(text)}</span>
      </span>
    `;
  }
  
  /**
   * Create a progress bar
   */
  createProgressBar(percentage, label = '') {
    return `
      <div class="bobby-progress">
        ${label ? `<div class="bobby-progress-label">${this.escapeHtml(label)}</div>` : ''}
        <div class="bobby-progress-bar">
          <div class="bobby-progress-fill" style="width: ${percentage}%"></div>
        </div>
        <div class="bobby-progress-text">${percentage}%</div>
      </div>
    `;
  }
  
  /**
   * Create a chip/tag component
   */
  createChip(text, color = 'default', removable = false) {
    return `
      <span class="bobby-chip bobby-chip-${color}">
        ${this.escapeHtml(text)}
        ${removable ? '<button class="bobby-chip-remove" onclick="this.parentElement.remove()">×</button>' : ''}
      </span>
    `;
  }
  
  /**
   * Create a card component
   */
  createCard(title, content, actions = []) {
    const actionButtons = actions.map(action => `
      <button class="bobby-card-action" onclick="${action.onclick}">
        ${action.icon ? `<span>${action.icon}</span>` : ''}
        <span>${this.escapeHtml(action.text)}</span>
      </button>
    `).join('');
    
    return `
      <div class="bobby-card">
        ${title ? `<div class="bobby-card-header"><h3>${this.escapeHtml(title)}</h3></div>` : ''}
        <div class="bobby-card-content">
          ${content}
        </div>
        ${actions.length > 0 ? `<div class="bobby-card-actions">${actionButtons}</div>` : ''}
      </div>
    `;
  }
  
  /**
   * Create a skeleton loader
   */
  createSkeleton(lines = 3) {
    const skeletonLines = Array(lines).fill(0).map((_, i) => 
      `<div class="bobby-skeleton-line" style="width: ${80 + Math.random() * 20}%"></div>`
    ).join('');
    
    return `
      <div class="bobby-skeleton">
        ${skeletonLines}
      </div>
    `;
  }
  
  /**
   * Create a toggle switch
   */
  createToggle(id, label, checked = false, onChange = '') {
    return `
      <div class="bobby-toggle-wrapper">
        <input type="checkbox" id="${id}" class="bobby-toggle-input" 
               ${checked ? 'checked' : ''} 
               onchange="${onChange}">
        <label for="${id}" class="bobby-toggle-label">
          <span class="bobby-toggle-switch"></span>
          <span class="bobby-toggle-text">${this.escapeHtml(label)}</span>
        </label>
      </div>
    `;
  }
  
  /**
   * Create a dropdown menu
   */
  createDropdown(options, selected = '', onChange = '') {
    const optionElements = options.map(opt => `
      <option value="${this.escapeHtml(opt.value)}" ${opt.value === selected ? 'selected' : ''}>
        ${this.escapeHtml(opt.label)}
      </option>
    `).join('');
    
    return `
      <select class="bobby-dropdown" onchange="${onChange}">
        ${optionElements}
      </select>
    `;
  }
  
  /**
   * Create an icon button
   */
  createIconButton(icon, onClick, tooltip = '') {
    return `
      <button class="bobby-icon-btn" onclick="${onClick}" 
              ${tooltip ? `title="${this.escapeHtml(tooltip)}"` : ''}>
        ${icon}
      </button>
    `;
  }
  
  /**
   * Convert markdown to HTML
   */
  markdownToHtml(markdown) {
    // Enhanced markdown parser
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      // Inline code
      .replace(/`(.+?)`/g, '<code>$1</code>')
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      // Lists
      .replace(/^\* (.+)$/gim, '<li>$1</li>')
      .replace(/^\d+\. (.+)$/gim, '<li>$1</li>')
      // Wrap lists
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      // Blockquotes
      .replace(/^> (.+)$/gim, '<blockquote>$1</blockquote>');
    
    // Wrap in paragraph tags if not already wrapped
    if (!html.startsWith('<')) {
      html = `<p>${html}</p>`;
    }

    // Basic sanitization: strip script/style tags and dangerous attributes
    try {
      const template = document.createElement('template');
      template.innerHTML = html;
      const disallowedTags = new Set(['script', 'style', 'iframe', 'object', 'embed']);
      const walk = (node) => {
        const children = Array.from(node.children || []);
        for (const el of children) {
          const tag = el.tagName ? el.tagName.toLowerCase() : '';
          if (disallowedTags.has(tag)) {
            el.remove();
            continue;
          }
          // Remove on* handlers and javascript: URLs
          for (const attr of Array.from(el.attributes)) {
            const name = attr.name.toLowerCase();
            const value = String(attr.value || '');
            if (name.startsWith('on')) el.removeAttribute(attr.name);
            if ((name === 'href' || name === 'src') && /^javascript:/i.test(value)) {
              el.removeAttribute(attr.name);
            }
          }
          walk(el);
        }
      };
      walk(template.content || template);
      return (template.content || template).firstElementChild ? template.innerHTML : template.innerHTML || html;
    } catch (_) {
      return html;
    }
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Format timestamp
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return date.toLocaleDateString();
  }
  
  /**
   * Animate element entrance
   */
  animateIn(element) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(10px)';
    
    requestAnimationFrame(() => {
      element.style.transition = 'all 0.3s ease-out';
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    });
  }
  
  /**
   * Show a toast notification
   */
  showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `bobby-toast bobby-toast-${type}`;
    toast.innerHTML = `
      <span class="bobby-toast-icon">${this.getToastIcon(type)}</span>
      <span class="bobby-toast-message">${this.escapeHtml(message)}</span>
    `;
    
    document.body.appendChild(toast);
    this.animateIn(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  
  /**
   * Get icon for toast type
   */
  getToastIcon(type) {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    return icons[type] || icons.info;
  }
  
  /**
   * Create V2 card with glassmorphism
   */
  createV2Card(title, content, options = {}) {
    const {
      actions = [],
      icon = null,
      badge = null,
      className = ''
    } = options;
    
    const actionButtons = actions.map(action => `
      <button class="bobby-card-v2-action" 
              onclick="${action.onclick}"
              data-action="${action.id || ''}">
        ${action.icon ? `<span class="bobby-action-icon">${action.icon}</span>` : ''}
        <span>${this.escapeHtml(action.text)}</span>
      </button>
    `).join('');
    
    return `
      <div class="bobby-card-v2 ${className}">
        <div class="bobby-card-v2-header">
          ${icon ? `<span class="bobby-card-v2-icon">${icon}</span>` : ''}
          ${title ? `<h3>${this.escapeHtml(title)}</h3>` : ''}
          ${badge ? `<span class="bobby-card-v2-badge">${this.escapeHtml(badge)}</span>` : ''}
        </div>
        <div class="bobby-card-v2-content">
          ${content}
        </div>
        ${actions.length > 0 ? `<div class="bobby-card-v2-actions">${actionButtons}</div>` : ''}
      </div>
    `;
  }
  
  /**
   * Create context badge showing content type
   */
  createContextBadge(type, confidence = 0) {
    const badges = {
      code: { icon: '💻', label: 'Code', color: 'blue' },
      data: { icon: '📊', label: 'Data', color: 'green' },
      foreign: { icon: '🌐', label: 'Foreign Text', color: 'purple' },
      technical: { icon: '🔧', label: 'Technical', color: 'orange' },
      claims: { icon: '📰', label: 'Claims', color: 'red' },
      creative: { icon: '✨', label: 'Creative', color: 'pink' }
    };
    
    const badge = badges[type] || { icon: '📄', label: 'Text', color: 'gray' };
    
    return `
      <div class="bobby-context-badge bobby-context-badge-${badge.color}" 
           title="${confidence}% confidence">
        <span class="bobby-context-badge-icon">${badge.icon}</span>
        <span class="bobby-context-badge-label">${badge.label}</span>
        ${confidence > 0 ? `<span class="bobby-context-badge-confidence">${confidence}%</span>` : ''}
      </div>
    `;
  }
  
  /**
   * Create animated button with spring physics
   */
  createAnimatedButton(text, options = {}) {
    const {
      icon = null,
      onClick = '',
      className = '',
      animation = 'spring',
      particles = false
    } = options;
    
    const dataAttrs = [
      animation ? `data-animation="${animation}"` : '',
      particles ? 'data-particles="true"' : ''
    ].filter(Boolean).join(' ');
    
    return `
      <button class="bobby-btn-animated ${className}" 
              onclick="${onClick}"
              ${dataAttrs}>
        ${icon ? `<span class="bobby-btn-icon">${icon}</span>` : ''}
        <span class="bobby-btn-text">${this.escapeHtml(text)}</span>
        <span class="bobby-btn-ripple"></span>
      </button>
    `;
  }
  
  /**
   * Create particle button
   */
  createParticleButton(text, options = {}) {
    return this.createAnimatedButton(text, {
      ...options,
      particles: true,
      className: `bobby-btn-particle ${options.className || ''}`
    });
  }
  
  /**
   * Create enhanced tooltip with preview
   */
  createEnhancedTooltip(content, preview = null) {
    return `
      <div class="bobby-tooltip-v2">
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
      </div>
    `;
  }
  
  /**
   * Create shimmer effect for loading
   */
  createShimmer(options = {}) {
    const {
      lines = 3,
      height = 20,
      spacing = 10,
      animated = true
    } = options;
    
    const shimmerLines = Array(lines).fill(0).map((_, i) => {
      const width = 60 + Math.random() * 30;
      return `
        <div class="bobby-shimmer-line" 
             style="width: ${width}%; height: ${height}px; margin-bottom: ${spacing}px">
        </div>
      `;
    }).join('');
    
    return `
      <div class="bobby-shimmer ${animated ? 'bobby-shimmer-animated' : ''}">
        ${shimmerLines}
      </div>
    `;
  }
  
  /**
   * Create floating label input
   */
  createFloatingInput(id, label, options = {}) {
    const {
      type = 'text',
      value = '',
      placeholder = '',
      onChange = '',
      className = ''
    } = options;
    
    return `
      <div class="bobby-floating-input ${className}">
        <input type="${type}" 
               id="${id}"
               class="bobby-floating-input-field"
               value="${this.escapeHtml(value)}"
               placeholder="${this.escapeHtml(placeholder)}"
               onchange="${onChange}"
               required>
        <label for="${id}" class="bobby-floating-input-label">
          ${this.escapeHtml(label)}
        </label>
        <div class="bobby-floating-input-line"></div>
      </div>
    `;
  }
  
  /**
   * Animate element with spring physics
   */
  animateSpring(element, properties, duration = 600) {
    if (!window.InteractionEffects || !window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_SPRING_ANIMATIONS) {
      // Fallback to CSS transitions
      Object.assign(element.style, properties);
      return;
    }
    
    // Use InteractionEffects if available
    const effects = new window.InteractionEffects();
    effects.animateSpring(element, properties, duration);
  }
  
  /**
   * Create particle burst at coordinates
   */
  createParticleBurst(x, y, count = 10) {
    if (!window.ParticleEffects || !window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_PARTICLE_EFFECTS) {
      return;
    }
    
    const particles = new window.ParticleEffects();
    particles.burst(x, y, count);
  }
  
  /**
   * Create fact check summary card with glassmorphism
   */
  createFactCheckSummary(score, stats) {
    const scoreStatus = score >= 80 ? 'high' : 
                        score >= 60 ? 'medium' : 
                        score >= 40 ? 'low' : 'critical';
    
    const statsHtml = Object.entries(stats)
      .filter(([key, value]) => value > 0)
      .map(([key, value]) => {
        const labels = {
          true: 'Verified',
          false: 'False',
          partially_true: 'Partial',
          unverifiable: 'Unverifiable',
          needs_context: 'Contextual'
        };
        return `
          <div class="bobby-stat-v2 bobby-stat-${key}">
            <span class="bobby-stat-value">${value}</span>
            <span class="bobby-stat-label">${labels[key] || key}</span>
          </div>
        `;
      }).join('');
    
    return `
      <div class="bobby-fact-check-summary-v2">
        <div class="bobby-reliability-badge bobby-reliability-${scoreStatus}">
          <span class="bobby-reliability-value">${score}%</span>
          <span class="bobby-reliability-label">Overall Reliability</span>
        </div>
        <div class="bobby-claim-stats-v2">
          ${statsHtml}
        </div>
      </div>
    `;
  }
  
  /**
   * Create fact check claim card
   */
  createFactCheckClaim(claim, options = {}) {
    const {
      assessment = 'unverifiable',
      confidence = 0,
      summary = '',
      sources = [],
      correctedText = null
    } = options;
    
    const statusLabels = {
      true: 'Verified True',
      false: 'False',
      partially_true: 'Partially True',
      unverifiable: 'Unverifiable',
      needs_context: 'Needs Context',
      error: 'Error'
    };
    
    const sourcesHtml = sources.length > 0 ? `
      <div class="bobby-claim-sources-v2">
        <div class="bobby-sources-list-v2">
          ${sources.slice(0, 3).map(source => this.createSourceChip(source)).join('')}
          ${sources.length > 3 ? `
            <span class="bobby-source-more">+${sources.length - 3} more</span>
          ` : ''}
        </div>
      </div>
    ` : '';
    
    const correctionHtml = correctedText && correctedText !== claim ? `
      <div class="bobby-corrected-text-v2">
        <span class="bobby-corrected-label">Suggested correction</span>
        <p class="bobby-corrected-content">${this.escapeHtml(correctedText)}</p>
      </div>
    ` : '';
    
    return `
      <div class="bobby-claim-card-v2 bobby-claim-${assessment}">
        <div class="bobby-claim-header-v2">
          <div class="bobby-claim-status-v2">
            <span class="bobby-status-label">${statusLabels[assessment] || assessment}</span>
          </div>
          <span class="bobby-confidence-badge-v2">
            ${confidence}% confidence
          </span>
        </div>
        <div class="bobby-claim-content-v2">
          <p class="bobby-claim-text-v2">${this.escapeHtml(claim)}</p>
          <p class="bobby-assessment-text-v2">${this.escapeHtml(summary)}</p>
          ${correctionHtml}
        </div>
        ${sourcesHtml}
      </div>
    `;
  }
  
  /**
   * Create source chip for fact check
   */
  createSourceChip(source) {
    let domain = '';
    try {
      domain = new URL(source.url).hostname;
    } catch (e) {
      domain = 'source';
    }
    
    const title = source.title || domain;
    const truncatedTitle = title.length > 30 ? title.substring(0, 30) + '...' : title;
    
    return `
      <a href="${source.url}" target="_blank" rel="noopener" 
         class="bobby-source-chip-v2" title="${this.escapeHtml(title)}">
        <span class="bobby-source-favicon">
          <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=16" 
               alt="" onerror="this.style.display='none'" />
        </span>
        <span class="bobby-source-title">${this.escapeHtml(truncatedTitle)}</span>
      </a>
    `;
  }
  
  /**
   * Create fact check progress indicator
   */
  createFactCheckProgress(current, total, message = '') {
    const percent = Math.round((current / total) * 100);
    
    return `
      <div class="bobby-fact-check-progress">
        <div class="bobby-progress-header">
          <h5 class="bobby-progress-title">Verifying Claims</h5>
          <span class="bobby-progress-count">${total} ${total === 1 ? 'claim' : 'claims'} found</span>
        </div>
        ${this.createProgressBar(percent, '')}
        ${message ? `<p class="bobby-progress-status">${this.escapeHtml(message)}</p>` : ''}
      </div>
    `;
  }
}

// Export for use in extension
window.UIComponents = UIComponents;
