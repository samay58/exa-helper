// Bobby Chrome Extension - Particle Effects Module
// Creates subtle particle animations for visual polish

class ParticleEffects {
  constructor() {
    this.enabled = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_PARTICLE_EFFECTS || false;
    this.particles = [];
    this.container = null;
    this.animationFrame = null;
    this.maxParticles = 20;
    
    // Performance optimization
    this.lastTime = 0;
    this.frameInterval = 1000 / 60; // 60 FPS
    
    // Particle physics settings
    this.physics = {
      gravity: 0.05,
      friction: 0.98,
      wind: 0.02,
      spread: 50,
      initialVelocity: 2,
      lifespan: 2000 // milliseconds
    };
    
    // Initialize if enabled
    if (this.enabled) {
      this.init();
    }
  }

  /**
   * Initialize particle container
   */
  init() {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.enabled = false;
      return;
    }
    
    // Create particle container
    this.container = document.createElement('div');
    this.container.className = 'bobby-particle-container';
    this.container.setAttribute('aria-hidden', 'true'); // Hide from screen readers
    document.body.appendChild(this.container);
    
    // Start animation loop
    this.startAnimation();
  }

  /**
   * Create particles on hover
   */
  createParticles(x, y, count = 5, color = null) {
    if (!this.enabled || !this.container) return;
    
    // Limit total particles for performance
    if (this.particles.length + count > this.maxParticles) {
      count = Math.max(0, this.maxParticles - this.particles.length);
    }
    
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.createParticle(x, y, color);
      }, i * 50); // Stagger creation
    }
  }

  /**
   * Create a single particle
   */
  createParticle(x, y, color) {
    const particle = {
      id: Date.now() + Math.random(),
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * this.physics.initialVelocity,
      vy: (Math.random() - 0.5) * this.physics.initialVelocity - 1,
      life: this.physics.lifespan,
      maxLife: this.physics.lifespan,
      size: Math.random() * 3 + 2,
      color: color || this.getRandomParticleColor(),
      element: null
    };
    
    // Create DOM element
    const el = document.createElement('div');
    el.className = 'bobby-particle';
    el.style.cssText = `
      left: ${particle.x}px;
      top: ${particle.y}px;
      width: ${particle.size}px;
      height: ${particle.size}px;
      background: ${particle.color};
      --x: ${particle.vx * this.physics.spread}px;
      --y: ${particle.vy * this.physics.spread}px;
    `;
    
    this.container.appendChild(el);
    particle.element = el;
    
    this.particles.push(particle);
  }

  /**
   * Get random particle color from theme
   */
  getRandomParticleColor() {
    const colors = [
      'var(--bobby-particle-1)',
      'var(--bobby-particle-2)',
      'var(--bobby-particle-3)',
      'var(--bobby-particle-4)'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Update particle physics
   */
  updateParticles(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update life
      particle.life -= deltaTime;
      
      // Remove dead particles
      if (particle.life <= 0) {
        if (particle.element) {
          particle.element.remove();
        }
        this.particles.splice(i, 1);
        continue;
      }
      
      // Update physics
      particle.vy += this.physics.gravity;
      particle.vx += (Math.random() - 0.5) * this.physics.wind;
      particle.vx *= this.physics.friction;
      particle.vy *= this.physics.friction;
      
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Update opacity based on life
      const lifeRatio = particle.life / particle.maxLife;
      const opacity = lifeRatio > 0.5 ? 1 : lifeRatio * 2;
      
      // Update DOM
      if (particle.element) {
        particle.element.style.transform = `translate(${particle.vx * 10}px, ${particle.vy * 10}px) scale(${lifeRatio})`;
        particle.element.style.opacity = opacity;
      }
    }
  }

  /**
   * Animation loop
   */
  animate(currentTime) {
    if (!this.enabled) return;
    
    // Calculate delta time
    const deltaTime = currentTime - this.lastTime;
    
    // Throttle to target FPS
    if (deltaTime > this.frameInterval) {
      this.updateParticles(deltaTime);
      this.lastTime = currentTime - (deltaTime % this.frameInterval);
    }
    
    this.animationFrame = requestAnimationFrame(this.animate.bind(this));
  }

  /**
   * Start animation
   */
  startAnimation() {
    if (this.animationFrame) return;
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  /**
   * Stop animation
   */
  stopAnimation() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Create burst effect
   */
  burst(x, y, count = 10, colors = null) {
    if (!this.enabled) return;
    
    const burstColors = colors || [
      '#667eea', '#764ba2', '#f093fb', '#f5576c'
    ];
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const velocity = this.physics.initialVelocity * 2;
      const color = burstColors[i % burstColors.length];
      
      setTimeout(() => {
        const particle = {
          id: Date.now() + Math.random(),
          x: x,
          y: y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: this.physics.lifespan * 0.7,
          maxLife: this.physics.lifespan * 0.7,
          size: Math.random() * 2 + 3,
          color: color,
          element: null
        };
        
        const el = document.createElement('div');
        el.className = 'bobby-particle';
        el.style.cssText = `
          left: ${particle.x}px;
          top: ${particle.y}px;
          width: ${particle.size}px;
          height: ${particle.size}px;
          background: ${particle.color};
          box-shadow: 0 0 ${particle.size}px ${particle.color};
        `;
        
        this.container.appendChild(el);
        particle.element = el;
        this.particles.push(particle);
      }, i * 20);
    }
  }

  /**
   * Trail effect for dragging
   */
  createTrail(x, y) {
    if (!this.enabled || Math.random() > 0.3) return; // Limit frequency
    
    const particle = {
      id: Date.now() + Math.random(),
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: 0,
      vy: -0.5,
      life: 500,
      maxLife: 500,
      size: Math.random() * 2 + 1,
      color: this.getRandomParticleColor(),
      element: null
    };
    
    const el = document.createElement('div');
    el.className = 'bobby-particle';
    el.style.cssText = `
      left: ${particle.x}px;
      top: ${particle.y}px;
      width: ${particle.size}px;
      height: ${particle.size}px;
      background: ${particle.color};
      opacity: 0.5;
    `;
    
    this.container.appendChild(el);
    particle.element = el;
    this.particles.push(particle);
  }

  /**
   * Clean up all particles
   */
  cleanup() {
    this.stopAnimation();
    
    // Remove all particles
    this.particles.forEach(particle => {
      if (particle.element) {
        particle.element.remove();
      }
    });
    this.particles = [];
    
    // Remove container
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  /**
   * Toggle particle effects
   */
  toggle(enabled) {
    this.enabled = enabled;
    
    if (enabled && !this.container) {
      this.init();
    } else if (!enabled) {
      this.cleanup();
    }
  }

  /**
   * Attach particle effects to element
   */
  attachToElement(element, options = {}) {
    if (!this.enabled || !element) return;
    
    const config = {
      event: options.event || 'mouseenter',
      count: options.count || 5,
      colors: options.colors || null,
      continuous: options.continuous || false
    };
    
    const handler = (e) => {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      
      if (config.event === 'click') {
        this.burst(e.clientX, e.clientY, config.count, config.colors);
      } else {
        this.createParticles(x, y, config.count, config.colors);
      }
    };
    
    element.addEventListener(config.event, handler);
    
    // Store handler for cleanup
    if (!element._particleHandlers) {
      element._particleHandlers = [];
    }
    element._particleHandlers.push({ event: config.event, handler });
    
    // Continuous effect for hover
    if (config.continuous && config.event === 'mouseenter') {
      let interval;
      
      const startContinuous = () => {
        interval = setInterval(() => {
          const rect = element.getBoundingClientRect();
          const x = rect.left + Math.random() * rect.width;
          const y = rect.top + Math.random() * rect.height;
          this.createParticles(x, y, 1, config.colors);
        }, 200);
      };
      
      const stopContinuous = () => {
        if (interval) {
          clearInterval(interval);
        }
      };
      
      element.addEventListener('mouseenter', startContinuous);
      element.addEventListener('mouseleave', stopContinuous);
      
      element._particleHandlers.push(
        { event: 'mouseenter', handler: startContinuous },
        { event: 'mouseleave', handler: stopContinuous }
      );
    }
  }

  /**
   * Remove particle effects from element
   */
  detachFromElement(element) {
    if (!element || !element._particleHandlers) return;
    
    element._particleHandlers.forEach(({ event, handler }) => {
      element.removeEventListener(event, handler);
    });
    
    delete element._particleHandlers;
  }
}

// Export for use in extension
window.ParticleEffects = ParticleEffects;