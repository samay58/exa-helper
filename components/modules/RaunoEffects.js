// Bobby Chrome Extension - Rauno Effects Module
// Choreographed animations, physics-aware interactions, and spatial consistency

class RaunoEffects {
  constructor() {
    this.magneticElements = new Set();
    this.animationQueue = [];
    this.isAnimating = false;
    this.particleContainer = null;
    this.origin = { x: 0, y: 0 };
    
    // Physics constants
    this.SPRING_DAMPING = 0.7;
    this.SPRING_STIFFNESS = 100;
    this.MOMENTUM_DECAY = 0.95;
    
    // Animation durations (ms)
    this.DURATION_INSTANT = 50;
    this.DURATION_FAST = 150;
    this.DURATION_NORMAL = 200;
    this.DURATION_SLOW = 300;
    
    // Stagger delays
    this.STAGGER_DELAY = 20;
    
    this.init();
  }
  
  init() {
    // Create particle container
    this.createParticleContainer();
    
    // Set up magnetic hover tracking
    this.setupMagneticTracking();
    
    // Initialize intersection observer for scroll-triggered animations
    this.setupIntersectionObserver();
  }
  
  /**
   * Create container for particle effects
   */
  createParticleContainer() {
    if (!this.particleContainer) {
      this.particleContainer = document.createElement('div');
      this.particleContainer.className = 'bobby-particles';
      document.body.appendChild(this.particleContainer);
    }
  }
  
  /**
   * Set origin point for animations (text selection position)
   */
  setOrigin(x, y) {
    this.origin = { x, y };
    
    // Set CSS custom properties for origin-based animations
    const popup = document.querySelector('.bobby-popup-rauno');
    if (popup) {
      // Calculate relative position for transform-origin
      const rect = popup.getBoundingClientRect();
      const relativeX = ((x - rect.left) / rect.width) * 100;
      const relativeY = ((y - rect.top) / rect.height) * 100;
      
      popup.style.setProperty('--origin-x', `${relativeX}%`);
      popup.style.setProperty('--origin-y', `${relativeY}%`);
    }
  }
  
  /**
   * Choreographed popup reveal sequence
   */
  async revealPopup(popup) {
    if (!popup) return;
    
    // Phase 1: Blur background (if enabled)
    await this.blurBackground();
    
    // Phase 2: Scale in from origin
    popup.style.opacity = '0';
    popup.style.transform = 'scale(0.9) translateY(10px)';
    
    await this.animate(popup, {
      opacity: '1',
      transform: 'scale(1) translateY(0)'
    }, this.DURATION_NORMAL);
    
    // Phase 3: Stagger reveal children
    this.staggerRevealChildren(popup);
  }
  
  /**
   * Blur background for cinematic depth
   */
  async blurBackground() {
    // Create overlay if it doesn't exist
    let overlay = document.querySelector('.bobby-bg-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'bobby-bg-overlay';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(2px);
        opacity: 0;
        transition: opacity ${this.DURATION_FAST}ms ease-out;
        z-index: 2147483645;
      `;
      document.body.appendChild(overlay);
    }
    
    // Trigger blur animation
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });
    
    return new Promise(resolve => setTimeout(resolve, this.DURATION_FAST));
  }
  
  /**
   * Stagger reveal children elements
   */
  staggerRevealChildren(container) {
    const children = container.querySelectorAll('[data-stagger]');
    
    children.forEach((child, index) => {
      child.style.opacity = '0';
      child.style.transform = 'translateY(4px)';
      
      setTimeout(() => {
        this.animate(child, {
          opacity: '1',
          transform: 'translateY(0)'
        }, this.DURATION_FAST);
      }, index * this.STAGGER_DELAY);
    });
  }
  
  /**
   * Setup magnetic hover effect tracking
   */
  setupMagneticTracking() {
    document.addEventListener('mousemove', (e) => {
      this.magneticElements.forEach(element => {
        this.applyMagneticEffect(element, e.clientX, e.clientY);
      });
    });
  }
  
  /**
   * Add magnetic hover effect to element
   */
  addMagneticHover(element) {
    this.magneticElements.add(element);
    element.classList.add('bobby-magnetic');
    
    element.addEventListener('mouseleave', () => {
      element.style.setProperty('--magnetic-offset', 'translate(0, 0)');
    });
  }
  
  /**
   * Apply magnetic effect based on cursor position
   */
  applyMagneticEffect(element, cursorX, cursorY) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = cursorX - centerX;
    const deltaY = cursorY - centerY;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = 100;
    
    if (distance < maxDistance) {
      const strength = 1 - (distance / maxDistance);
      const moveX = deltaX * strength * 0.2;
      const moveY = deltaY * strength * 0.2;
      
      element.style.setProperty('--magnetic-offset', `translate(${moveX}px, ${moveY}px)`);
    }
  }
  
  /**
   * Create particle burst effect
   */
  createParticleBurst(x, y, count = 8) {
    if (!this.particleContainer) return;
    
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'bobby-particle';
      
      // Random direction and distance
      const angle = (Math.PI * 2 * i) / count;
      const distance = 50 + Math.random() * 50;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.setProperty('--dx', `${dx}px`);
      particle.style.setProperty('--dy', `${dy}px`);
      
      this.particleContainer.appendChild(particle);
      
      // Remove particle after animation
      setTimeout(() => particle.remove(), 1000);
    }
  }
  
  /**
   * Spring physics animation
   */
  springAnimate(element, property, target, options = {}) {
    const {
      damping = this.SPRING_DAMPING,
      stiffness = this.SPRING_STIFFNESS,
      precision = 0.01
    } = options;
    
    let velocity = 0;
    let current = parseFloat(getComputedStyle(element)[property]) || 0;
    
    const animate = () => {
      const distance = target - current;
      const spring = distance * stiffness / 100;
      const damper = velocity * damping;
      
      velocity += spring - damper;
      current += velocity / 100;
      
      element.style[property] = `${current}px`;
      
      if (Math.abs(distance) > precision || Math.abs(velocity) > precision) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  /**
   * Add momentum to draggable elements
   */
  addMomentum(element, velocityX, velocityY) {
    const animate = () => {
      if (Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1) {
        const currentTransform = element.style.transform;
        const matrix = new DOMMatrix(currentTransform);
        
        element.style.transform = `translate(${matrix.e + velocityX}px, ${matrix.f + velocityY}px)`;
        
        velocityX *= this.MOMENTUM_DECAY;
        velocityY *= this.MOMENTUM_DECAY;
        
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  /**
   * Setup intersection observer for scroll-triggered animations
   */
  setupIntersectionObserver() {
    const options = {
      threshold: 0.1,
      rootMargin: '0px 0px -10% 0px'
    };
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animateInView(entry.target);
        }
      });
    }, options);
  }
  
  /**
   * Observe element for scroll-triggered animation
   */
  observeElement(element) {
    if (this.observer) {
      this.observer.observe(element);
    }
  }
  
  /**
   * Animate element when it comes into view
   */
  animateInView(element) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    
    this.animate(element, {
      opacity: '1',
      transform: 'translateY(0)'
    }, this.DURATION_NORMAL);
    
    // Unobserve after animation
    if (this.observer) {
      this.observer.unobserve(element);
    }
  }
  
  /**
   * Directional slide animation
   */
  slideIn(element, direction = 'bottom') {
    const transforms = {
      top: 'translateY(-100%)',
      bottom: 'translateY(100%)',
      left: 'translateX(-100%)',
      right: 'translateX(100%)'
    };
    
    element.style.transform = transforms[direction];
    element.style.opacity = '0';
    
    return this.animate(element, {
      transform: 'translate(0, 0)',
      opacity: '1'
    }, this.DURATION_NORMAL);
  }
  
  /**
   * Shake animation for errors
   */
  shake(element) {
    const keyframes = [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(0)' }
    ];
    
    return element.animate(keyframes, {
      duration: 300,
      easing: 'ease-out'
    });
  }
  
  /**
   * Pulse animation for attention
   */
  pulse(element, scale = 1.05) {
    const keyframes = [
      { transform: 'scale(1)' },
      { transform: `scale(${scale})` },
      { transform: 'scale(1)' }
    ];
    
    return element.animate(keyframes, {
      duration: 300,
      easing: 'ease-in-out'
    });
  }
  
  /**
   * Generic animation helper
   */
  animate(element, properties, duration = this.DURATION_NORMAL) {
    return new Promise(resolve => {
      // Store original values
      const originalStyles = {};
      for (const prop in properties) {
        originalStyles[prop] = element.style[prop];
      }
      
      // Apply transition
      element.style.transition = `all ${duration}ms cubic-bezier(0.23, 1, 0.32, 1)`;
      
      // Apply new properties
      requestAnimationFrame(() => {
        for (const prop in properties) {
          element.style[prop] = properties[prop];
        }
      });
      
      // Cleanup after animation
      setTimeout(() => {
        element.style.transition = '';
        resolve();
      }, duration);
    });
  }
  
  /**
   * Queue animation for sequential execution
   */
  queueAnimation(fn) {
    this.animationQueue.push(fn);
    
    if (!this.isAnimating) {
      this.processQueue();
    }
  }
  
  /**
   * Process animation queue
   */
  async processQueue() {
    this.isAnimating = true;
    
    while (this.animationQueue.length > 0) {
      const animation = this.animationQueue.shift();
      await animation();
    }
    
    this.isAnimating = false;
  }
  
  /**
   * Clean up effects
   */
  destroy() {
    // Remove particle container
    if (this.particleContainer) {
      this.particleContainer.remove();
    }
    
    // Remove overlay
    const overlay = document.querySelector('.bobby-bg-overlay');
    if (overlay) {
      overlay.remove();
    }
    
    // Clear magnetic elements
    this.magneticElements.clear();
    
    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Attach to window for global access
window.RaunoEffects = RaunoEffects;