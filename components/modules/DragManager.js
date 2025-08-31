// Bobby Chrome Extension - Enhanced Drag Manager Module
// Modern dragging with pointer events and transform-only positioning

class DragManager {
  constructor(element, options = {}) {
    this.element = element;
    this.isDragging = false;
    this.currentPointer = null;
    
    // Position state - single source of truth
    this.position = {
      x: 0,
      y: 0
    };
    
    // Drag start position
    this.dragStart = {
      x: 0,
      y: 0,
      elementX: 0,
      elementY: 0
    };
    
    // Velocity tracking for momentum
    this.velocity = {
      x: 0,
      y: 0,
      time: 0
    };
    
    // Options with defaults
    this.options = {
      handle: '.bobby-drag-handle',
      containment: 'window',
      snapToEdge: true,
      snapDistance: 30,
      edgePadding: 20,
      momentum: true,
      momentumDamping: 0.92,
      onDragStart: null,
      onDrag: null,
      onDragEnd: null,
      ...options
    };
    
    // Initialize
    this.init();
  }
  
  init() {
    // Find or create drag handle
    this.handle = this.element.querySelector(this.options.handle);
    if (!this.handle) {
      this.createDragHandle();
    }
    
    // Ensure element is positioned correctly
    this.setupElementStyle();
    
    // Get initial position from transform if exists
    this.parseCurrentTransform();
    
    // Bind methods
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerCancel = this.handlePointerCancel.bind(this);
    
    // Add event listeners - using pointer events for unified touch/mouse handling
    this.handle.addEventListener('pointerdown', this.handlePointerDown);
    
    // Prevent text selection and context menu on handle
    this.handle.style.userSelect = 'none';
    this.handle.style.webkitUserSelect = 'none';
    this.handle.style.touchAction = 'none';
    this.handle.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  setupElementStyle() {
    // Ensure element uses fixed positioning with transform
    this.element.style.position = 'fixed';
    this.element.style.left = '0';
    this.element.style.top = '0';
    this.element.style.willChange = 'transform';
    
    // Add transition for smooth snapping
    this.element.style.transition = 'none';
    
    // Ensure proper z-index
    if (!this.element.style.zIndex) {
      this.element.style.zIndex = '2147483647';
    }
  }
  
  createDragHandle() {
    this.handle = document.createElement('div');
    this.handle.className = 'bobby-drag-handle';
    this.handle.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="5" cy="5" r="1.5" fill="currentColor" opacity="0.4"/>
        <circle cx="10" cy="5" r="1.5" fill="currentColor" opacity="0.4"/>
        <circle cx="15" cy="5" r="1.5" fill="currentColor" opacity="0.4"/>
        <circle cx="5" cy="10" r="1.5" fill="currentColor" opacity="0.4"/>
        <circle cx="10" cy="10" r="1.5" fill="currentColor" opacity="0.4"/>
        <circle cx="15" cy="10" r="1.5" fill="currentColor" opacity="0.4"/>
        <circle cx="5" cy="15" r="1.5" fill="currentColor" opacity="0.4"/>
        <circle cx="10" cy="15" r="1.5" fill="currentColor" opacity="0.4"/>
        <circle cx="15" cy="15" r="1.5" fill="currentColor" opacity="0.4"/>
      </svg>
    `;
    this.handle.setAttribute('aria-label', 'Drag to move');
    this.handle.style.cursor = 'move';
    this.element.prepend(this.handle);
  }
  
  parseCurrentTransform() {
    const transform = window.getComputedStyle(this.element).transform;
    if (transform && transform !== 'none') {
      // Parse matrix or matrix3d
      const values = transform.match(/matrix(?:3d)?\(([^)]+)\)/);
      if (values) {
        const numbers = values[1].split(',').map(n => parseFloat(n.trim()));
        // For 2D matrix: translateX is at index 4, translateY at index 5
        // For 3D matrix: translateX is at index 12, translateY at index 13
        if (transform.includes('matrix3d')) {
          this.position.x = numbers[12] || 0;
          this.position.y = numbers[13] || 0;
        } else {
          this.position.x = numbers[4] || 0;
          this.position.y = numbers[5] || 0;
        }
      }
    }
  }
  
  handlePointerDown(e) {
    // Only handle primary button (usually left click or touch)
    if (e.button !== 0) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    this.isDragging = true;
    this.currentPointer = e.pointerId;
    
    // Capture pointer for this element
    this.handle.setPointerCapture(e.pointerId);
    
    // Store drag start positions
    this.dragStart.x = e.clientX;
    this.dragStart.y = e.clientY;
    this.dragStart.elementX = this.position.x;
    this.dragStart.elementY = this.position.y;
    this.dragStart.time = Date.now();
    
    // Reset velocity
    this.velocity = { x: 0, y: 0, time: Date.now() };
    
    // Add class for styling
    this.element.classList.add('bobby-dragging');
    
    // Disable transitions during drag
    this.element.style.transition = 'none';
    
    // Add document-level listeners
    document.addEventListener('pointermove', this.handlePointerMove);
    document.addEventListener('pointerup', this.handlePointerUp);
    document.addEventListener('pointercancel', this.handlePointerCancel);
    
    // Callback
    if (this.options.onDragStart) {
      this.options.onDragStart(e, this.element);
    }
  }
  
  handlePointerMove(e) {
    if (!this.isDragging || e.pointerId !== this.currentPointer) return;
    
    e.preventDefault();
    
    // Calculate new position
    const deltaX = e.clientX - this.dragStart.x;
    const deltaY = e.clientY - this.dragStart.y;
    
    let newX = this.dragStart.elementX + deltaX;
    let newY = this.dragStart.elementY + deltaY;
    
    // Apply containment
    if (this.options.containment === 'window') {
      const bounds = this.getContainmentBounds();
      newX = Math.max(bounds.minX, Math.min(newX, bounds.maxX));
      newY = Math.max(bounds.minY, Math.min(newY, bounds.maxY));
    }
    
    // Track velocity for momentum
    if (this.options.momentum) {
      const now = Date.now();
      const dt = now - this.velocity.time;
      if (dt > 0) {
        this.velocity.x = (newX - this.position.x) / dt * 16; // Normalize to ~60fps
        this.velocity.y = (newY - this.position.y) / dt * 16;
        this.velocity.time = now;
      }
    }
    
    // Update position
    this.setPosition(newX, newY);
    
    // Callback
    if (this.options.onDrag) {
      this.options.onDrag(e, this.element, newX, newY);
    }
  }
  
  handlePointerUp(e) {
    if (!this.isDragging || e.pointerId !== this.currentPointer) return;
    
    this.endDrag(e);
  }
  
  handlePointerCancel(e) {
    if (!this.isDragging || e.pointerId !== this.currentPointer) return;
    
    this.endDrag(e);
  }
  
  endDrag(e) {
    this.isDragging = false;
    this.currentPointer = null;
    
    // Release pointer capture
    if (this.handle.hasPointerCapture(e.pointerId)) {
      this.handle.releasePointerCapture(e.pointerId);
    }
    
    // Remove document listeners
    document.removeEventListener('pointermove', this.handlePointerMove);
    document.removeEventListener('pointerup', this.handlePointerUp);
    document.removeEventListener('pointercancel', this.handlePointerCancel);
    
    // Remove dragging class
    this.element.classList.remove('bobby-dragging');
    
    // Apply momentum if enabled
    if (this.options.momentum && (Math.abs(this.velocity.x) > 0.5 || Math.abs(this.velocity.y) > 0.5)) {
      this.applyMomentum();
    } else if (this.options.snapToEdge) {
      // Otherwise snap to edge if enabled
      this.snapToNearestEdge();
    }
    
    // Save position
    this.savePosition();
    
    // Callback
    if (this.options.onDragEnd) {
      this.options.onDragEnd(e, this.element, this.position.x, this.position.y);
    }
  }
  
  applyMomentum() {
    const animate = () => {
      // Apply damping
      this.velocity.x *= this.options.momentumDamping;
      this.velocity.y *= this.options.momentumDamping;
      
      // Stop if velocity is too small
      if (Math.abs(this.velocity.x) < 0.5 && Math.abs(this.velocity.y) < 0.5) {
        if (this.options.snapToEdge) {
          this.snapToNearestEdge();
        }
        return;
      }
      
      // Calculate new position
      let newX = this.position.x + this.velocity.x;
      let newY = this.position.y + this.velocity.y;
      
      // Apply containment and bounce
      const bounds = this.getContainmentBounds();
      if (newX < bounds.minX || newX > bounds.maxX) {
        this.velocity.x *= -0.5; // Bounce with damping
        newX = Math.max(bounds.minX, Math.min(newX, bounds.maxX));
      }
      if (newY < bounds.minY || newY > bounds.maxY) {
        this.velocity.y *= -0.5; // Bounce with damping
        newY = Math.max(bounds.minY, Math.min(newY, bounds.maxY));
      }
      
      // Update position
      this.setPosition(newX, newY);
      
      // Continue animation
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  }
  
  getContainmentBounds() {
    const rect = this.element.getBoundingClientRect();
    const padding = this.options.edgePadding;
    
    return {
      minX: padding,
      minY: padding,
      maxX: window.innerWidth - rect.width - padding,
      maxY: window.innerHeight - rect.height - padding
    };
  }
  
  snapToNearestEdge() {
    const rect = this.element.getBoundingClientRect();
    const threshold = this.options.snapDistance;
    const padding = this.options.edgePadding;
    
    // Calculate distances to each edge
    const distances = {
      left: this.position.x,
      right: window.innerWidth - (this.position.x + rect.width),
      top: this.position.y,
      bottom: window.innerHeight - (this.position.y + rect.height)
    };
    
    // Find minimum distance
    const minDistance = Math.min(...Object.values(distances));
    
    // Snap if within threshold
    if (minDistance < threshold) {
      let targetX = this.position.x;
      let targetY = this.position.y;
      
      if (distances.left === minDistance) {
        targetX = padding;
      } else if (distances.right === minDistance) {
        targetX = window.innerWidth - rect.width - padding;
      }
      
      if (distances.top === minDistance) {
        targetY = padding;
      } else if (distances.bottom === minDistance) {
        targetY = window.innerHeight - rect.height - padding;
      }
      
      // Animate to target position
      this.animateToPosition(targetX, targetY);
    }
  }
  
  animateToPosition(targetX, targetY, duration = 200) {
    // Enable transition
    this.element.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    
    // Set position
    this.setPosition(targetX, targetY);
    
    // Disable transition after animation
    setTimeout(() => {
      this.element.style.transition = 'none';
    }, duration);
  }
  
  setPosition(x, y) {
    this.position.x = x;
    this.position.y = y;
    
    // Use transform3d for GPU acceleration
    this.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    
    // Store in dataset for debugging
    this.element.dataset.dragX = x;
    this.element.dataset.dragY = y;
  }
  
  getPosition() {
    return { ...this.position };
  }
  
  // Public method to set position programmatically
  moveTo(x, y, animate = false) {
    if (animate) {
      this.animateToPosition(x, y);
    } else {
      this.setPosition(x, y);
    }
  }
  
  // Center element in viewport
  center(animate = true) {
    const rect = this.element.getBoundingClientRect();
    const centerX = (window.innerWidth - rect.width) / 2;
    const centerY = (window.innerHeight - rect.height) / 2;
    
    this.moveTo(centerX, centerY, animate);
  }
  
  // Save position to localStorage
  async savePosition() {
    try {
      const key = `bobby-popup-position-${window.location.hostname}`;
      localStorage.setItem(key, JSON.stringify(this.position));
    } catch (error) {
      console.warn('Could not save position:', error);
    }
  }
  
  // Restore position from localStorage
  async restorePosition() {
    try {
      const key = `bobby-popup-position-${window.location.hostname}`;
      const saved = localStorage.getItem(key);
      
      if (saved) {
        const position = JSON.parse(saved);
        
        // Validate position is within current viewport
        const rect = this.element.getBoundingClientRect();
        const bounds = this.getContainmentBounds();
        
        position.x = Math.max(bounds.minX, Math.min(position.x, bounds.maxX));
        position.y = Math.max(bounds.minY, Math.min(position.y, bounds.maxY));
        
        this.setPosition(position.x, position.y);
        return true;
      }
    } catch (error) {
      console.warn('Could not restore position:', error);
    }
    return false;
  }
  
  // Enable/disable dragging
  setEnabled(enabled) {
    if (enabled) {
      this.handle.style.pointerEvents = 'auto';
      this.handle.style.opacity = '1';
      this.handle.style.cursor = 'move';
    } else {
      this.handle.style.pointerEvents = 'none';
      this.handle.style.opacity = '0.5';
      this.handle.style.cursor = 'not-allowed';
    }
  }
  
  // Clean up
  destroy() {
    this.handle.removeEventListener('pointerdown', this.handlePointerDown);
    document.removeEventListener('pointermove', this.handlePointerMove);
    document.removeEventListener('pointerup', this.handlePointerUp);
    document.removeEventListener('pointercancel', this.handlePointerCancel);
    
    // Reset element styles
    this.element.style.transition = '';
    this.element.style.willChange = '';
    this.element.classList.remove('bobby-dragging');
  }
}

// Export for use in extension
window.DragManager = DragManager;