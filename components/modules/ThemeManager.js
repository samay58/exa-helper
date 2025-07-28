// Bobby Chrome Extension - Theme Manager Module
// Handles adaptive theming based on page colors and user preferences

class ThemeManager {
  constructor() {
    this.enabled = window.BOBBY_CONFIG?.FEATURE_FLAGS?.USE_ADAPTIVE_THEME || false;
    this.currentTheme = 'light';
    this.pageColors = null;
    this.customColors = null;
    
    // Color extraction settings
    this.colorSettings = {
      sampleSize: 10,
      minSaturation: 0.2,
      minBrightness: 0.3,
      maxBrightness: 0.8
    };
    
    // Theme presets
    this.themes = {
      light: {
        '--bobby-bg': '#ffffff',
        '--bobby-text': '#1a1a1a',
        '--bobby-border': '#e5e5e5',
        '--bobby-accent': '#FF9472',
        '--bobby-accent-hover': '#F2709C',
        '--bobby-glass-bg': 'rgba(255, 255, 255, 0.85)',
        '--bobby-glass-border': 'rgba(255, 255, 255, 0.5)',
        '--bobby-shadow': '0 8px 32px rgba(0, 0, 0, 0.12)',
        '--bobby-particle-1': '#FF9472',
        '--bobby-particle-2': '#F2709C',
        '--bobby-particle-3': '#667eea',
        '--bobby-particle-4': '#764ba2'
      },
      dark: {
        '--bobby-bg': '#1a1a1a',
        '--bobby-text': '#ffffff',
        '--bobby-border': '#333333',
        '--bobby-accent': '#7C3AED',
        '--bobby-accent-hover': '#A855F7',
        '--bobby-glass-bg': 'rgba(26, 26, 26, 0.85)',
        '--bobby-glass-border': 'rgba(255, 255, 255, 0.1)',
        '--bobby-shadow': '0 8px 32px rgba(0, 0, 0, 0.4)',
        '--bobby-particle-1': '#7C3AED',
        '--bobby-particle-2': '#A855F7',
        '--bobby-particle-3': '#f093fb',
        '--bobby-particle-4': '#f5576c'
      }
    };
    
    // Initialize if enabled
    if (this.enabled) {
      this.init();
    }
  }

  /**
   * Initialize theme manager
   */
  init() {
    // Check system preference
    this.detectSystemTheme();
    
    // Watch for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        this.setTheme(e.matches ? 'dark' : 'light');
      });
    }
    
    // Extract page colors for adaptive theming
    if (this.enabled) {
      this.extractPageColors();
    }
  }

  /**
   * Detect system theme preference
   */
  detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.currentTheme = 'dark';
    } else {
      this.currentTheme = 'light';
    }
  }

  /**
   * Extract dominant colors from the page
   */
  async extractPageColors() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Capture visible viewport
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      canvas.width = width / this.colorSettings.sampleSize;
      canvas.height = height / this.colorSettings.sampleSize;
      
      // Use html2canvas if available, otherwise sample CSS colors
      const colors = await this.samplePageColors();
      
      if (colors && colors.length > 0) {
        this.pageColors = this.analyzeColors(colors);
        this.generateAdaptiveTheme();
      }
    } catch (error) {
      console.error('Bobby: Error extracting page colors:', error);
    }
  }

  /**
   * Sample colors from page elements
   */
  async samplePageColors() {
    const colors = [];
    const elements = document.querySelectorAll('body, header, nav, main, aside, section, article');
    
    elements.forEach(element => {
      const style = window.getComputedStyle(element);
      
      // Get background color
      const bgColor = style.backgroundColor;
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        colors.push(this.parseColor(bgColor));
      }
      
      // Get text color
      const textColor = style.color;
      if (textColor) {
        colors.push(this.parseColor(textColor));
      }
      
      // Get border color
      const borderColor = style.borderColor;
      if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)') {
        colors.push(this.parseColor(borderColor));
      }
    });
    
    // Sample from CSS custom properties
    const rootStyle = getComputedStyle(document.documentElement);
    const cssVars = Array.from(document.styleSheets)
      .flatMap(sheet => {
        try {
          return Array.from(sheet.cssRules || []);
        } catch (e) {
          return []; // Cross-origin stylesheets
        }
      })
      .filter(rule => rule.style && rule.selectorText === ':root')
      .flatMap(rule => Array.from(rule.style))
      .filter(prop => prop.startsWith('--') && prop.includes('color'));
    
    cssVars.forEach(varName => {
      const value = rootStyle.getPropertyValue(varName);
      if (value) {
        colors.push(this.parseColor(value));
      }
    });
    
    return colors.filter(Boolean);
  }

  /**
   * Parse color string to RGB
   */
  parseColor(colorStr) {
    if (!colorStr) return null;
    
    // Handle hex colors
    if (colorStr.startsWith('#')) {
      const hex = colorStr.slice(1);
      if (hex.length === 3) {
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16)
        };
      } else if (hex.length === 6) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16)
        };
      }
    }
    
    // Handle rgb/rgba colors
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    
    return null;
  }

  /**
   * Analyze colors to find dominant palette
   */
  analyzeColors(colors) {
    if (!colors || colors.length === 0) return null;
    
    // Calculate average brightness
    const avgBrightness = colors.reduce((sum, color) => {
      return sum + this.getBrightness(color);
    }, 0) / colors.length;
    
    // Find most saturated color for accent
    const accentColor = colors
      .filter(color => {
        const sat = this.getSaturation(color);
        const bright = this.getBrightness(color);
        return sat > this.colorSettings.minSaturation && 
               bright > this.colorSettings.minBrightness &&
               bright < this.colorSettings.maxBrightness;
      })
      .sort((a, b) => this.getSaturation(b) - this.getSaturation(a))[0];
    
    return {
      isDark: avgBrightness < 0.5,
      accent: accentColor || colors[0],
      background: this.findBackgroundColor(colors),
      text: this.findTextColor(colors)
    };
  }

  /**
   * Get brightness of color (0-1)
   */
  getBrightness(color) {
    return (color.r * 0.299 + color.g * 0.587 + color.b * 0.114) / 255;
  }

  /**
   * Get saturation of color (0-1)
   */
  getSaturation(color) {
    const max = Math.max(color.r, color.g, color.b) / 255;
    const min = Math.min(color.r, color.g, color.b) / 255;
    const delta = max - min;
    
    if (max === 0) return 0;
    return delta / max;
  }

  /**
   * Find likely background color
   */
  findBackgroundColor(colors) {
    // Look for colors with low saturation and extreme brightness
    return colors
      .filter(color => this.getSaturation(color) < 0.2)
      .sort((a, b) => {
        const aBright = this.getBrightness(a);
        const bBright = this.getBrightness(b);
        // Prefer very light or very dark colors
        const aDist = Math.min(aBright, 1 - aBright);
        const bDist = Math.min(bBright, 1 - bBright);
        return aDist - bDist;
      })[0] || colors[0];
  }

  /**
   * Find likely text color
   */
  findTextColor(colors) {
    const bgBrightness = this.pageColors?.background ? 
      this.getBrightness(this.pageColors.background) : 0.5;
    
    // Find color with good contrast against background
    return colors
      .sort((a, b) => {
        const aContrast = Math.abs(this.getBrightness(a) - bgBrightness);
        const bContrast = Math.abs(this.getBrightness(b) - bgBrightness);
        return bContrast - aContrast;
      })[0] || colors[0];
  }

  /**
   * Generate adaptive theme based on page colors
   */
  generateAdaptiveTheme() {
    if (!this.pageColors) return;
    
    const base = this.pageColors.isDark ? this.themes.dark : this.themes.light;
    
    // Create custom theme
    this.customColors = {
      ...base,
      '--bobby-accent': this.colorToHex(this.pageColors.accent),
      '--bobby-accent-hover': this.adjustBrightness(this.pageColors.accent, 1.2),
      '--bobby-particle-1': this.colorToHex(this.pageColors.accent),
      '--bobby-particle-2': this.adjustBrightness(this.pageColors.accent, 1.1),
      '--bobby-particle-3': this.adjustBrightness(this.pageColors.accent, 0.9),
      '--bobby-particle-4': this.adjustBrightness(this.pageColors.accent, 0.8)
    };
  }

  /**
   * Convert color object to hex
   */
  colorToHex(color) {
    if (!color) return '#000000';
    const toHex = (n) => Math.round(n).toString(16).padStart(2, '0');
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  }

  /**
   * Adjust color brightness
   */
  adjustBrightness(color, factor) {
    if (!color) return '#000000';
    const adjust = (n) => Math.min(255, Math.max(0, Math.round(n * factor)));
    return `#${adjust(color.r).toString(16).padStart(2, '0')}${adjust(color.g).toString(16).padStart(2, '0')}${adjust(color.b).toString(16).padStart(2, '0')}`;
  }

  /**
   * Apply theme to element
   */
  applyTheme(element, themeName = null) {
    if (!element) return;
    
    const theme = themeName ? this.themes[themeName] : 
                  (this.customColors || this.themes[this.currentTheme]);
    
    // Apply CSS variables
    Object.entries(theme).forEach(([key, value]) => {
      element.style.setProperty(key, value);
    });
    
    // Add theme class
    element.classList.remove('bobby-theme-light', 'bobby-theme-dark', 'bobby-theme-adaptive');
    
    if (this.customColors && !themeName) {
      element.classList.add('bobby-theme-adaptive');
    } else {
      element.classList.add(`bobby-theme-${themeName || this.currentTheme}`);
    }
  }

  /**
   * Set theme
   */
  setTheme(themeName) {
    this.currentTheme = themeName;
    
    // Apply to all Bobby elements
    document.querySelectorAll('.bobby-popup, .bobby-popup-v2, .bobby-fab, .bobby-fab-v2').forEach(el => {
      this.applyTheme(el, themeName);
    });
  }

  /**
   * Toggle theme
   */
  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    return newTheme;
  }

  /**
   * Get current theme
   */
  getCurrentTheme() {
    return {
      name: this.currentTheme,
      colors: this.customColors || this.themes[this.currentTheme],
      isAdaptive: !!this.customColors
    };
  }

  /**
   * Reset to default theme
   */
  resetTheme() {
    this.customColors = null;
    this.setTheme(this.currentTheme);
  }

  /**
   * Enable/disable adaptive theming
   */
  toggle(enabled) {
    this.enabled = enabled;
    
    if (enabled) {
      this.extractPageColors();
    } else {
      this.resetTheme();
    }
  }

  /**
   * Update theme when page changes
   */
  refreshPageColors() {
    if (this.enabled) {
      this.extractPageColors();
    }
  }
}

// Export for use in extension
window.ThemeManager = ThemeManager;