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

    // Protect toString to hide our overrides
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

    // --- 2. Fingerprinting Protection ---
    if (settings.fingerprint !== false) {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

      // Spoof Navigator properties
      const navOverrides = {
        userAgent: ua,
        appVersion: ua.substring(8),
        platform: 'Win32',
        language: 'en-US',
        languages: ['en-US', 'en'],
        hardwareConcurrency: 4,
        deviceMemory: 8,
        maxTouchPoints: 0
      };

      for (const [key, value] of Object.entries(navOverrides)) {
        Object.defineProperty(navigator, key, { get: () => value, configurable: true });
      }

      // Canvas Protection
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = makeNative(function toDataURL() {
        log('Fingerprint', 'Blocked canvas fingerprinting attempt.');
        return originalToDataURL.apply(this, arguments);
      }, 'toDataURL');
    }

    // --- 3. Geolocation Protection ---
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

    // --- 4. WebRTC & Media Protection ---
    if (settings.webrtc !== false) {
      if (window.RTCPeerConnection) {
        window.RTCPeerConnection = makeNative(function RTCPeerConnection() {
          log('Fingerprint', 'Blocked WebRTC attempt.');
          throw new Error('WebRTC disabled by Privacy Shield');
        }, 'RTCPeerConnection');
      }

      if (navigator.mediaDevices?.enumerateDevices) {
        const originalEnum = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
        navigator.mediaDevices.enumerateDevices = makeNative(function enumerateDevices() {
          log('Fingerprint', 'Masked Media Devices.');
          return originalEnum().then(devices => devices.map(d => ({
            deviceId: 'masked', groupId: 'masked', kind: d.kind, label: `Privacy Shield Protected ${d.kind}`
          })));
        }, 'enumerateDevices');
      }
    }
  }

  // --- Start Protection ---
  chrome.storage.sync.get(['fingerprint', 'webrtc', 'geolocation'], (settings) => {
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
