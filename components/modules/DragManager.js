// Bobby Chrome Extension - Drag Manager Module
// Enhanced dragging functionality with PDF context support

class DragManager {
  constructor(element, options = {}) {
    this.element = element;
    this.dragHandle = null;
    this.isDragging = false;
    this.currentX = 0;
    this.currentY = 0;
    this.initialX = 0;
    this.initialY = 0;
    this.xOffset = 0;
    this.yOffset = 0;

    // Options
    this.options = {
      handle: '.bobby-drag-handle',
      containment: 'window',
      snapToEdge: true,
      snapDistance: 20,
      onDragStart: null,
      onDrag: null,
      onDragEnd: null,
      pdfMode: false,
      ...options
    };

    // PDF detection
    this.detectPDFContext();

    // Initialize
    this.init();
  }

  /**
   * Initialize drag functionality
   */
  init() {
    // Find or create drag handle
    this.dragHandle = this.element.querySelector(this.options.handle);
    
    if (!this.dragHandle) {
      this.createDragHandle();
    }

    // Add event listeners
    this.dragHandle.addEventListener('mousedown', this.dragStart.bind(this));
    document.addEventListener('mousemove', this.drag.bind(this));
    document.addEventListener('mouseup', this.dragEnd.bind(this));

    // Touch support
    this.dragHandle.addEventListener('touchstart', this.dragStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.drag.bind(this), { passive: false });
    document.addEventListener('touchend', this.dragEnd.bind(this));

    // Prevent text selection while dragging
    this.dragHandle.style.userSelect = 'none';
    this.dragHandle.style.webkitUserSelect = 'none';

    // Add drag cursor
    this.dragHandle.style.cursor = 'move';

    // Ensure element uses absolute/fixed positioning
    const position = window.getComputedStyle(this.element).position;
    if (position !== 'absolute' && position !== 'fixed') {
      this.element.style.position = 'fixed';
    }
    
    // Set initial position if not set
    if (!this.element.style.left && !this.element.style.top) {
      this.centerElement();
    }
  }

  /**
   * Create drag handle if not exists
   */
  createDragHandle() {
    this.dragHandle = document.createElement('div');
    this.dragHandle.className = 'bobby-drag-handle';
    this.dragHandle.innerHTML = '⋮⋮';
    this.dragHandle.setAttribute('aria-label', 'Drag to move');
    this.element.prepend(this.dragHandle);
  }

  /**
   * Detect if running in PDF context
   */
  detectPDFContext() {
    const isPDF = 
      window.location.href.includes('.pdf') ||
      document.querySelector('embed[type="application/pdf"]') ||
      document.querySelector('object[type="application/pdf"]') ||
      document.querySelector('#viewer') || // PDF.js
      window.location.href.startsWith('chrome-extension://') && window.location.href.includes('pdf'); // Chrome PDF viewer

    if (isPDF) {
      this.options.pdfMode = true;
      this.adjustForPDF();
    }
  }

  /**
   * Adjust behavior for PDF context
   */
  adjustForPDF() {
    // In PDF mode, we need to be more careful about z-index and positioning
    this.element.style.zIndex = '2147483647'; // Maximum z-index
    this.element.style.position = 'fixed'; // Use fixed positioning in PDFs
    
    // Add PDF-specific class
    this.element.classList.add('bobby-pdf-mode');
  }

  /**
   * Start dragging
   */
  dragStart(e) {
    if (e.type === 'touchstart') {
      this.initialX = e.touches[0].clientX - this.xOffset;
      this.initialY = e.touches[0].clientY - this.yOffset;
    } else {
      this.initialX = e.clientX - this.xOffset;
      this.initialY = e.clientY - this.yOffset;
    }

    if (e.target === this.dragHandle) {
      this.isDragging = true;
      this.element.classList.add('bobby-dragging');
      
      // Bring to front
      this.element.style.zIndex = '2147483647';

      // Call callback
      if (this.options.onDragStart) {
        this.options.onDragStart(e, this.element);
      }

      e.preventDefault();
    }
  }

  /**
   * Handle dragging
   */
  drag(e) {
    if (!this.isDragging) return;

    e.preventDefault();

    if (e.type === 'touchmove') {
      this.currentX = e.touches[0].clientX - this.initialX;
      this.currentY = e.touches[0].clientY - this.initialY;
    } else {
      this.currentX = e.clientX - this.initialX;
      this.currentY = e.clientY - this.initialY;
    }

    // Apply containment
    if (this.options.containment === 'window') {
      const bounds = this.getContainmentBounds();
      this.currentX = Math.max(bounds.minX, Math.min(this.currentX, bounds.maxX));
      this.currentY = Math.max(bounds.minY, Math.min(this.currentY, bounds.maxY));
    }

    this.xOffset = this.currentX;
    this.yOffset = this.currentY;

    this.setTranslate(this.currentX, this.currentY);

    // Call callback
    if (this.options.onDrag) {
      this.options.onDrag(e, this.element, this.currentX, this.currentY);
    }
  }

  /**
   * End dragging
   */
  dragEnd(e) {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.element.classList.remove('bobby-dragging');

    // Apply snap to edge if enabled
    if (this.options.snapToEdge) {
      this.snapToEdge();
    }

    // Call callback
    if (this.options.onDragEnd) {
      this.options.onDragEnd(e, this.element, this.currentX, this.currentY);
    }
  }

  /**
   * Get containment bounds
   */
  getContainmentBounds() {
    const rect = this.element.getBoundingClientRect();
    const container = this.options.containment === 'parent' 
      ? this.element.parentElement 
      : window;

    let containerWidth, containerHeight;
    let containerLeft = 0, containerTop = 0;
    
    if (container === window) {
      containerWidth = window.innerWidth;
      containerHeight = window.innerHeight;
    } else {
      const containerRect = container.getBoundingClientRect();
      containerWidth = containerRect.width;
      containerHeight = containerRect.height;
      containerLeft = containerRect.left;
      containerTop = containerRect.top;
    }

    // Add padding to keep the entire element visible
    const padding = 40; // Margin from edges
    
    return {
      minX: padding - containerLeft,
      minY: padding - containerTop,
      maxX: containerWidth - rect.width - padding - containerLeft,
      maxY: containerHeight - rect.height - padding - containerTop
    };
  }

  /**
   * Snap element to nearest edge
   */
  snapToEdge() {
    const rect = this.element.getBoundingClientRect();
    const snapDistance = this.options.snapDistance;
    const padding = 10; // Small padding from edge
    
    let newX = this.currentX;
    let newY = this.currentY;

    // Get current position in viewport coordinates
    const currentLeft = rect.left;
    const currentRight = window.innerWidth - rect.right;
    const currentTop = rect.top;
    const currentBottom = window.innerHeight - rect.bottom;

    // Check distance to edges
    const distances = {
      left: currentLeft,
      right: currentRight,
      top: currentTop,
      bottom: currentBottom
    };

    // Find the closest edge
    const minDistance = Math.min(...Object.values(distances));

    // Snap to the closest edge if within snap distance
    if (minDistance < snapDistance) {
      if (distances.left === minDistance) {
        newX = padding - currentLeft + this.currentX;
      } else if (distances.right === minDistance) {
        newX = this.currentX + currentRight - padding;
      }
      
      if (distances.top === minDistance) {
        newY = padding - currentTop + this.currentY;
      } else if (distances.bottom === minDistance) {
        newY = this.currentY + currentBottom - padding;
      }
    }

    // Apply snap with animation
    if (newX !== this.currentX || newY !== this.currentY) {
      this.currentX = newX;
      this.currentY = newY;
      this.xOffset = newX;
      this.yOffset = newY;
      this.animateToPosition(newX, newY);
    }
  }

  /**
   * Set element transform
   */
  setTranslate(xPos, yPos) {
    // Use both transform and position for better compatibility
    this.element.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    
    // Also update position for edge detection
    const rect = this.element.getBoundingClientRect();
    this.element.dataset.dragX = xPos;
    this.element.dataset.dragY = yPos;
  }

  /**
   * Animate to position
   */
  animateToPosition(x, y, duration = 200) {
    const startX = this.currentX;
    const startY = this.currentY;
    const distanceX = x - startX;
    const distanceY = y - startY;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      this.currentX = startX + (distanceX * easeProgress);
      this.currentY = startY + (distanceY * easeProgress);
      
      this.xOffset = this.currentX;
      this.yOffset = this.currentY;
      
      this.setTranslate(this.currentX, this.currentY);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Center element in viewport
   */
  centerElement() {
    const rect = this.element.getBoundingClientRect();
    const padding = 20; // Padding from edges
    
    // Calculate center position
    let x = (window.innerWidth - rect.width) / 2;
    let y = (window.innerHeight - rect.height) / 2;
    
    // Ensure element stays within viewport bounds
    x = Math.max(padding, Math.min(x, window.innerWidth - rect.width - padding));
    y = Math.max(padding, Math.min(y, window.innerHeight - rect.height - padding));
    
    this.currentX = x;
    this.currentY = y;
    this.xOffset = x;
    this.yOffset = y;
    
    this.setTranslate(x, y);
  }

  /**
   * Update position (for external use)
   */
  setPosition(x, y, animate = false) {
    if (animate) {
      this.animateToPosition(x, y);
    } else {
      this.currentX = x;
      this.currentY = y;
      this.xOffset = x;
      this.yOffset = y;
      this.setTranslate(x, y);
    }
  }

  /**
   * Get current position
   */
  getPosition() {
    return {
      x: this.currentX,
      y: this.currentY
    };
  }

  /**
   * Enable/disable dragging
   */
  setEnabled(enabled) {
    if (enabled) {
      this.dragHandle.style.pointerEvents = 'auto';
      this.dragHandle.style.opacity = '1';
    } else {
      this.dragHandle.style.pointerEvents = 'none';
      this.dragHandle.style.opacity = '0.5';
    }
  }

  /**
   * Destroy drag manager
   */
  destroy() {
    this.dragHandle.removeEventListener('mousedown', this.dragStart);
    document.removeEventListener('mousemove', this.drag);
    document.removeEventListener('mouseup', this.dragEnd);
    
    this.dragHandle.removeEventListener('touchstart', this.dragStart);
    document.removeEventListener('touchmove', this.drag);
    document.removeEventListener('touchend', this.dragEnd);
  }

  /**
   * Save position to storage
   */
  async savePosition() {
    const position = this.getPosition();
    await chrome.storage.local.set({
      bobbyPopupPosition: position
    });
  }

  /**
   * Restore position from storage
   */
  async restorePosition() {
    try {
      const stored = await chrome.storage.local.get('bobbyPopupPosition');
      if (stored.bobbyPopupPosition) {
        const { x, y } = stored.bobbyPopupPosition;
        
        // Validate position is within current viewport
        const rect = this.element.getBoundingClientRect();
        const padding = 50;
        
        // Ensure at least part of the element is visible
        const validX = Math.max(-rect.width + padding, Math.min(x, window.innerWidth - padding));
        const validY = Math.max(-rect.height + padding, Math.min(y, window.innerHeight - padding));
        
        this.setPosition(validX, validY);
      }
    } catch (error) {
      console.error('Error restoring position:', error);
    }
  }
}

// Export for use in extension
window.DragManager = DragManager;