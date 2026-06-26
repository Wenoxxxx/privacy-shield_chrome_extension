/**
 * Privacy Shield Content Script
 * 
 * Implements client-side protection by injecting a shield into the Main World
 * and forwarding log events to the background script.
 */

// I'm using a self-invoking function to avoid polluting the global scope
// of the isolated world, though it's already isolated.
(function () {
  const LOG_ACTION = 'logActivity';

  /**
   * Forwards logs from the Main World to the background service worker.
   */
  function logToBackground(type, description) {
    chrome.runtime.sendMessage({
      action: LOG_ACTION,
      type: type,
      description: description,
      url: window.location.href
    });
  }

  /**
   * Main Protection Logic - Injected into the website's context.
   * This function is stringified and executed in the Main World.
   */
  function injectShield(settings) {
    const log = (type, desc) => {
      window.dispatchEvent(new CustomEvent('PrivacyShieldLog', {
        detail: { type, desc }
      }));
    };

    // --- 1. Stealth Helpers ---
    const makeNative = (fn, name) => {
      Object.defineProperty(fn, 'name', { value: name, configurable: true });
      return fn;
    };

    // Protect toString to hide geolocation/permission overrides
    const originalToString = Function.prototype.toString;
    Function.prototype.toString = makeNative(function toString() {
      if (typeof this === 'function' &&
        (this === navigator.geolocation.getCurrentPosition ||
          this === navigator.geolocation.watchPosition ||
          (navigator.permissions && this === navigator.permissions.query))) {
        return `function ${this.name}() { [native code] }`;
      }
      return originalToString.call(this);
    }, 'toString');

    // --- 2. Geolocation Protection ---
    if (settings.geolocation !== false) {
      const spoofedPos = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 12.5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };

      navigator.geolocation.getCurrentPosition = makeNative((success) => {
        log('Geolocation', 'Intercepted getCurrentPosition');
        if (typeof success === 'function') setTimeout(() => success(spoofedPos), 0);
      }, 'getCurrentPosition');

      navigator.geolocation.watchPosition = makeNative((success) => {
        log('Geolocation', 'Intercepted watchPosition');
        if (typeof success === 'function') setTimeout(() => success(spoofedPos), 0);
        return Math.floor(Math.random() * 1000) + 1;
      }, 'watchPosition');

      if (navigator.permissions?.query) {
        const originalQuery = navigator.permissions.query.bind(navigator.permissions);
        navigator.permissions.query = makeNative(function query(queryObject) {
          if (queryObject?.name === 'geolocation') {
            log('Geolocation', 'Intercepted permission query');
            return Promise.resolve({ state: 'granted', onchange: null });
          }
          return originalQuery(queryObject);
        }, 'query');
      }

      // --- 3a. Generic Sensor API Spoofing ---
      if (window.GeolocationSensor) {
        const originalStart = GeolocationSensor.prototype.start;
        GeolocationSensor.prototype.start = makeNative(function start() {
          log('Geolocation', 'Intercepted GeolocationSensor.start()');
          Object.defineProperties(this, {
            latitude: { get: () => spoofedPos.coords.latitude, configurable: true },
            longitude: { get: () => spoofedPos.coords.longitude, configurable: true },
            accuracy: { get: () => spoofedPos.coords.accuracy, configurable: true },
            timestamp: { get: () => Date.now(), configurable: true },
            hasReading: { get: () => true, configurable: true }
          });
          // Trigger a reading event shortly after starting
          setTimeout(() => this.dispatchEvent(new Event('reading')), 50);
        }, 'start');
      }
    }

    // --- Start Protection ---
    chrome.storage.sync.get(['geolocation'], (settings) => {
      const script = document.createElement('script');
      script.textContent = `(${injectShield.toString()})(${JSON.stringify(settings)});`;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    });

  // Listen for logs from the Main World
  window.addEventListener('PrivacyShieldLog', (event) => {
    logToBackground(event.detail.type, event.detail.desc);
  });
})();
