// Bobby Chrome Extension - Interaction Effects Module
// Provides spring animations and haptic feedback for enhanced interactions

class InteractionEffects {
  constructor() {
    this.enabled = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_SPRING_ANIMATIONS || false;
    this.hapticEnabled = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_HAPTIC_FEEDBACK || false;
    
    // Spring physics configuration
    this.springConfig = {
      stiffness: 200,
      damping: 20,
      mass: 1,
      restVelocity: 0.001
    };
    
    // Animation state tracking
    this.animations = new Map();
    this.animationId = 0;
    
    // Reduced motion check
    this.respectReducedMotion = true;
    this.checkReducedMotion();
  }

  /**
   * Check for reduced motion preference
   */
  checkReducedMotion() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches && this.respectReducedMotion) {
      this.enabled = false;
    }
  }

  /**
   * Calculate spring animation value
   */
  springPhysics(current, target, velocity, config = this.springConfig) {
    const { stiffness, damping, mass } = config;
    
    // Calculate spring force
    const springForce = -stiffness * (current - target);
    
    // Calculate damping force
    const dampingForce = -damping * velocity;
    
    // Calculate acceleration
    const acceleration = (springForce + dampingForce) / mass;
    
    // Update velocity and position
    const newVelocity = velocity + acceleration * 0.016; // 60fps timestep
    const newPosition = current + newVelocity * 0.016;
    
    return {
      position: newPosition,
      velocity: newVelocity,
      complete: Math.abs(newVelocity) < config.restVelocity && 
                Math.abs(newPosition - target) < 0.01
    };
  }

  /**
   * Animate element with spring physics
   */
  animateSpring(element, properties, duration = 200) {
    if (!this.enabled || !element) return Promise.resolve();
    
    return new Promise((resolve) => {
      const animId = this.animationId++;
      const startTime = performance.now();
      const initialState = {};
      const targetState = {};
      const velocityState = {};
      
      // Initialize states
      for (const [prop, target] of Object.entries(properties)) {
        const current = this.getCurrentValue(element, prop);
        initialState[prop] = current;
        targetState[prop] = target;
        velocityState[prop] = 0;
      }
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        let allComplete = true;
        
        for (const prop in targetState) {
          const current = parseFloat(element.style[prop]) || initialState[prop];
          const target = targetState[prop];
          const velocity = velocityState[prop];
          
          const result = this.springPhysics(current, target, velocity);
          
          velocityState[prop] = result.velocity;
          this.setPropertyValue(element, prop, result.position);
          
          if (!result.complete) {
            allComplete = false;
          }
        }
        
        if (!allComplete && elapsed < duration) {
          this.animations.set(animId, requestAnimationFrame(animate));
        } else {
          // Ensure final values are set
          for (const prop in targetState) {
            this.setPropertyValue(element, prop, targetState[prop]);
          }
          this.animations.delete(animId);
          resolve();
        }
      };
      
      this.animations.set(animId, requestAnimationFrame(animate));
    });
  }

  /**
   * Get current value of a CSS property
   */
  getCurrentValue(element, property) {
    const computed = window.getComputedStyle(element);
    const value = computed.getPropertyValue(property);
    
    // Handle transform properties
    if (property.includes('scale') || property.includes('rotate')) {
      const transform = computed.transform;
      if (transform && transform !== 'none') {
        // Extract scale/rotate from matrix
        return this.extractTransformValue(transform, property);
      }
      return property.includes('scale') ? 1 : 0;
    }
    
    return parseFloat(value) || 0;
  }

  /**
   * Extract transform value from matrix
   */
  extractTransformValue(matrix, property) {
    const values = matrix.match(/matrix\(([^)]+)\)/)?.[1]?.split(', ').map(parseFloat);
    if (!values) return property.includes('scale') ? 1 : 0;
    
    if (property.includes('scale')) {
      return Math.sqrt(values[0] * values[0] + values[1] * values[1]);
    } else if (property.includes('rotate')) {
      return Math.atan2(values[1], values[0]) * (180 / Math.PI);
    }
    
    return 0;
  }

  /**
   * Set CSS property value
   */
  setPropertyValue(element, property, value) {
    if (property.includes('scale') || property.includes('rotate') || property.includes('translate')) {
      // Handle transform properties
      const currentTransform = element.style.transform || '';
      const transformMap = this.parseTransform(currentTransform);
      
      if (property === 'scale') {
        transformMap.scale = `scale(${value})`;
      } else if (property === 'rotate') {
        transformMap.rotate = `rotate(${value}deg)`;
      } else if (property === 'translateX') {
        transformMap.translateX = `translateX(${value}px)`;
      } else if (property === 'translateY') {
        transformMap.translateY = `translateY(${value}px)`;
      }
      
      element.style.transform = Object.values(transformMap).join(' ');
    } else {
      // Handle regular properties
      const unit = this.getPropertyUnit(property);
      element.style[property] = value + unit;
    }
  }

  /**
   * Parse transform string into components
   */
  parseTransform(transform) {
    const map = {
      translateX: '',
      translateY: '',
      scale: '',
      rotate: ''
    };
    
    if (!transform) return map;
    
    const regex = /(translateX|translateY|scale|rotate)\([^)]+\)/g;
    let match;
    
    while ((match = regex.exec(transform)) !== null) {
      const [full, prop] = match;
      map[prop] = full;
    }
    
    return map;
  }

  /**
   * Get unit for CSS property
   */
  getPropertyUnit(property) {
    const unitlessProps = ['opacity', 'scale', 'scaleX', 'scaleY'];
    if (unitlessProps.includes(property)) return '';
    if (property.includes('rotate')) return 'deg';
    return 'px';
  }

  /**
   * Bounce effect
   */
  bounce(element, intensity = 1.2) {
    if (!this.enabled || !element) return;
    
    this.animateSpring(element, { scale: intensity }, 160)
      .then(() => this.animateSpring(element, { scale: 1 }, 160));
    
    // Haptic feedback
    this.haptic('light');
  }

  /**
   * Shake effect
   */
  shake(element, intensity = 5) {
    if (!this.enabled || !element) return;
    
    const sequence = [
      { translateX: intensity },
      { translateX: -intensity },
      { translateX: intensity / 2 },
      { translateX: -intensity / 2 },
      { translateX: 0 }
    ];
    
    let promise = Promise.resolve();
    sequence.forEach(props => { promise = promise.then(() => this.animateSpring(element, props, 40)); });
    
    // Haptic feedback
    this.haptic('medium');
    
    return promise;
  }

  /**
   * Elastic scale effect
   */
  elasticScale(element, from = 0, to = 1) {
    if (!this.enabled || !element) return;
    
    element.style.transform = `scale(${from})`;
    
    return this.animateSpring(element, { scale: to }, 180);
  }

  /**
   * Slide in effect
   */
  slideIn(element, direction = 'bottom', distance = 50) {
    if (!this.enabled || !element) return;
    
    const props = {
      bottom: { translateY: distance },
      top: { translateY: -distance },
      left: { translateX: -distance },
      right: { translateX: distance }
    };
    
    const initialProps = props[direction];
    
    // Set initial position
    for (const [prop, value] of Object.entries(initialProps)) {
      this.setPropertyValue(element, prop, value);
    }
    
    // Animate to final position
    const finalProps = {};
    for (const prop in initialProps) {
      finalProps[prop] = 0;
    }
    
    return this.animateSpring(element, finalProps, 180);
  }

  /**
   * Pop effect for buttons
   */
  popButton(button) {
    if (!this.enabled || !button) return;
    if (button.dataset.highfreq === 'true') return;
    
    // Quick scale down then spring back
    button.style.transform = 'scale(0.95)';
    
    setTimeout(() => { this.animateSpring(button, { scale: 1 }, 160); }, 40);
    
    // Haptic feedback
    this.haptic('light');
  }

  /**
   * Ripple effect
   */
  createRipple(element, x, y) {
    if (!this.enabled || !element) return;
    
    const ripple = document.createElement('span');
    ripple.className = 'bobby-ripple';
    
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const posX = x - rect.left - size / 2;
    const posY = y - rect.top - size / 2;
    
    ripple.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${posX}px;
      top: ${posY}px;
    `;
    
    element.appendChild(ripple);
    
    // Animate ripple
    this.animateSpring(ripple, { scale: 2, opacity: 0 }, 180).then(() => {
      ripple.remove();
    });
  }

  /**
   * Haptic feedback (mobile only)
   */
  haptic(style = 'light') {
    if (!this.hapticEnabled || !window.navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 30, 10],
      warning: [30, 10, 30],
      error: [50, 50, 50]
    };
    
    const pattern = patterns[style] || patterns.light;
    window.navigator.vibrate(pattern);
  }

  /**
   * Attach interaction effects to element
   */
  attachToElement(element, options = {}) {
    if (!this.enabled || !element) return;
    
    const {
      click = true,
      hover = false,
      ripple = false
    } = options;
    
    // Click effect
    if (click) {
      element.addEventListener('mousedown', () => {
        this.popButton(element);
      });
    }
    
    // Hover effect
    if (hover) {
      element.addEventListener('mouseenter', () => {
        this.animateSpring(element, {
          scale: 1.05
        }, 300);
      });
      
      element.addEventListener('mouseleave', () => {
        this.animateSpring(element, {
          scale: 1
        }, 300);
      });
    }
    
    // Ripple effect
    if (ripple) {
      element.style.position = 'relative';
      element.style.overflow = 'hidden';
      
      element.addEventListener('click', (e) => {
        this.createRipple(element, e.clientX, e.clientY);
      });
    }
  }

  /**
   * Stop all animations
   */
  stopAll() {
    for (const [id, animation] of this.animations) {
      cancelAnimationFrame(animation);
    }
    this.animations.clear();
  }

  /**
   * Toggle interaction effects
   */
  toggle(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }
}

// Export for use in extension
window.InteractionEffects = InteractionEffects;
