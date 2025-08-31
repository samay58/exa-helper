// Bobby Chrome Extension - Grid System Module  
// Swiss-inspired 12-column grid with visible structure

class GridSystem {
  constructor(options = {}) {
    this.columns = options.columns || 12;
    this.gap = options.gap || 16; // 16px default gap
    this.debug = options.debug || false;
    this.container = null;
    this.gridOverlay = null;
    
    // Breakpoints for responsive grid
    this.breakpoints = {
      xs: 0,
      sm: 480,
      md: 768,
      lg: 1024,
      xl: 1280
    };
    
    // Column spans at different breakpoints
    this.defaultSpans = {
      xs: 12,
      sm: 6,
      md: 4,
      lg: 3,
      xl: 2
    };
  }
  
  /**
   * Create a grid container
   */
  createContainer(className = '') {
    const container = document.createElement('div');
    container.className = `bobby-grid ${className}`;
    container.style.cssText = `
      display: grid;
      grid-template-columns: repeat(${this.columns}, 1fr);
      gap: ${this.gap}px;
      position: relative;
    `;
    
    if (this.debug) {
      container.setAttribute('data-debug', 'true');
      this.addDebugOverlay(container);
    }
    
    this.container = container;
    return container;
  }
  
  /**
   * Create a grid item with span options
   */
  createItem(content, options = {}) {
    const item = document.createElement('div');
    item.className = 'bobby-grid-item';
    
    // Set column span
    const span = options.span || this.getResponsiveSpan();
    item.style.gridColumn = `span ${span}`;
    
    // Set row span if specified
    if (options.rowSpan) {
      item.style.gridRow = `span ${options.rowSpan}`;
    }
    
    // Add alignment classes
    if (options.align) {
      item.style.alignSelf = options.align;
    }
    
    if (options.justify) {
      item.style.justifySelf = options.justify;
    }
    
    // Add content
    if (typeof content === 'string') {
      item.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      item.appendChild(content);
    }
    
    return item;
  }
  
  /**
   * Add debug overlay showing grid lines
   */
  addDebugOverlay(container) {
    const overlay = document.createElement('div');
    overlay.className = 'bobby-grid-overlay';
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 9999;
    `;
    
    // Create vertical grid lines
    const gridLines = [];
    for (let i = 0; i <= this.columns; i++) {
      const line = document.createElement('div');
      line.style.cssText = `
        position: absolute;
        top: 0;
        bottom: 0;
        left: ${(i / this.columns) * 100}%;
        width: 1px;
        background: rgba(255, 0, 0, 0.1);
      `;
      gridLines.push(line);
    }
    
    // Create horizontal lines for crosshairs
    const horizontalLine = document.createElement('div');
    horizontalLine.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      height: 1px;
      background: rgba(255, 0, 0, 0.1);
    `;
    
    gridLines.forEach(line => overlay.appendChild(line));
    overlay.appendChild(horizontalLine);
    
    container.appendChild(overlay);
    this.gridOverlay = overlay;
    
    // Add column numbers
    this.addColumnNumbers(overlay);
  }
  
  /**
   * Add column numbers to debug overlay
   */
  addColumnNumbers(overlay) {
    for (let i = 1; i <= this.columns; i++) {
      const number = document.createElement('div');
      number.textContent = i;
      number.style.cssText = `
        position: absolute;
        top: 4px;
        left: ${((i - 0.5) / this.columns) * 100}%;
        transform: translateX(-50%);
        font-size: 10px;
        color: rgba(255, 0, 0, 0.3);
        font-family: 'JetBrains Mono', monospace;
        pointer-events: none;
      `;
      overlay.appendChild(number);
    }
  }
  
  /**
   * Toggle debug mode
   */
  toggleDebug() {
    this.debug = !this.debug;
    
    if (this.container) {
      if (this.debug) {
        this.container.setAttribute('data-debug', 'true');
        if (!this.gridOverlay) {
          this.addDebugOverlay(this.container);
        }
      } else {
        this.container.removeAttribute('data-debug');
        if (this.gridOverlay) {
          this.gridOverlay.remove();
          this.gridOverlay = null;
        }
      }
    }
  }
  
  /**
   * Get responsive span based on viewport
   */
  getResponsiveSpan() {
    const width = window.innerWidth;
    
    if (width >= this.breakpoints.xl) return this.defaultSpans.xl;
    if (width >= this.breakpoints.lg) return this.defaultSpans.lg;
    if (width >= this.breakpoints.md) return this.defaultSpans.md;
    if (width >= this.breakpoints.sm) return this.defaultSpans.sm;
    return this.defaultSpans.xs;
  }
  
  /**
   * Create a Swiss-style layout for popup
   */
  createSwissLayout() {
    const container = this.createContainer('bobby-swiss-grid');
    
    // Header row (full width)
    const header = this.createItem('', { span: 12 });
    header.className += ' bobby-grid-header';
    
    // Content area (main content + sidebar)
    const mainContent = this.createItem('', { span: 8 });
    mainContent.className += ' bobby-grid-main';
    
    const sidebar = this.createItem('', { span: 4 });
    sidebar.className += ' bobby-grid-sidebar';
    
    // Footer row (full width)
    const footer = this.createItem('', { span: 12 });
    footer.className += ' bobby-grid-footer';
    
    container.appendChild(header);
    container.appendChild(mainContent);
    container.appendChild(sidebar);
    container.appendChild(footer);
    
    return {
      container,
      header,
      mainContent,
      sidebar,
      footer
    };
  }
  
  /**
   * Create modular sections within grid
   */
  createModularSection(title, content, span = 4) {
    const section = this.createItem('', { span });
    section.className += ' bobby-modular-section';
    
    const sectionHTML = `
      <div class="bobby-section-header">
        <h3 class="bobby-section-title">${title}</h3>
      </div>
      <div class="bobby-section-content">
        ${content}
      </div>
    `;
    
    section.innerHTML = sectionHTML;
    return section;
  }
  
  /**
   * Apply golden ratio to grid
   */
  applyGoldenRatio() {
    const phi = 1.618;
    const totalWidth = this.columns;
    
    const majorColumns = Math.round(totalWidth / phi);
    const minorColumns = totalWidth - majorColumns;
    
    return {
      major: majorColumns,
      minor: minorColumns
    };
  }
  
  /**
   * Create asymmetric layout using golden ratio
   */
  createAsymmetricLayout() {
    const container = this.createContainer('bobby-asymmetric-grid');
    const { major, minor } = this.applyGoldenRatio();
    
    const primaryContent = this.createItem('', { span: major });
    primaryContent.className += ' bobby-primary-content';
    
    const secondaryContent = this.createItem('', { span: minor });
    secondaryContent.className += ' bobby-secondary-content';
    
    container.appendChild(primaryContent);
    container.appendChild(secondaryContent);
    
    return {
      container,
      primary: primaryContent,
      secondary: secondaryContent
    };
  }
  
  /**
   * Create masonry-style layout
   */
  createMasonryLayout(items) {
    const container = this.createContainer('bobby-masonry-grid');
    container.style.gridAutoRows = 'minmax(100px, auto)';
    container.style.gridAutoFlow = 'dense';
    
    items.forEach((item, index) => {
      const gridItem = this.createItem(item.content, {
        span: item.span || this.getRandomSpan(),
        rowSpan: item.rowSpan || this.getRandomRowSpan()
      });
      
      gridItem.style.animationDelay = `${index * 50}ms`;
      container.appendChild(gridItem);
    });
    
    return container;
  }
  
  /**
   * Get random span for masonry items
   */
  getRandomSpan() {
    const spans = [2, 3, 4, 6];
    return spans[Math.floor(Math.random() * spans.length)];
  }
  
  /**
   * Get random row span for masonry items
   */
  getRandomRowSpan() {
    const spans = [1, 1, 2, 2, 3];
    return spans[Math.floor(Math.random() * spans.length)];
  }
  
  /**
   * Create a card grid layout
   */
  createCardGrid(cards) {
    const container = this.createContainer('bobby-card-grid');
    
    cards.forEach((card, index) => {
      const cardElement = this.createItem('', { 
        span: card.span || this.getResponsiveSpan() 
      });
      
      cardElement.className += ' bobby-grid-card';
      cardElement.innerHTML = `
        <div class="bobby-card-header">
          ${card.icon ? `<span class="bobby-card-icon">${card.icon}</span>` : ''}
          <h4 class="bobby-card-title">${card.title}</h4>
        </div>
        <div class="bobby-card-content">
          ${card.content}
        </div>
        ${card.footer ? `
          <div class="bobby-card-footer">
            ${card.footer}
          </div>
        ` : ''}
      `;
      
      // Add stagger animation
      cardElement.style.animationDelay = `${index * 30}ms`;
      
      container.appendChild(cardElement);
    });
    
    return container;
  }
  
  /**
   * Update grid on window resize
   */
  initResponsive() {
    let resizeTimeout;
    
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.updateResponsiveLayout();
      }, 250);
    });
  }
  
  /**
   * Update layout based on viewport
   */
  updateResponsiveLayout() {
    if (!this.container) return;
    
    const items = this.container.querySelectorAll('.bobby-grid-item');
    const span = this.getResponsiveSpan();
    
    items.forEach(item => {
      if (!item.dataset.fixedSpan) {
        item.style.gridColumn = `span ${span}`;
      }
    });
  }
  
  /**
   * Destroy grid and cleanup
   */
  destroy() {
    if (this.gridOverlay) {
      this.gridOverlay.remove();
    }
    
    if (this.container) {
      this.container.remove();
    }
    
    this.container = null;
    this.gridOverlay = null;
  }
}

// Attach to window for global access
window.GridSystem = GridSystem;