// ConfigService - unified content-side access to window.BOBBY_CONFIG
// Avoids direct scattered reads and provides safe defaults

(function() {
  'use strict';

  class ConfigService {
    static get raw() { return window.BOBBY_CONFIG || {}; }

    static get flags() { return (this.raw.FEATURE_FLAGS || {}); }

    static isMinimal() {
      const flags = this.flags;
      if (flags.MINIMAL_MODE === undefined) return true;
      return !!flags.MINIMAL_MODE;
    }

    static get cacheDuration() { return this.raw.CACHE_DURATION || 3600000; }
    static get maxTextLength() { return this.raw.MAX_TEXT_LENGTH || 5000; }
  }

  window.ConfigService = ConfigService;
})();

