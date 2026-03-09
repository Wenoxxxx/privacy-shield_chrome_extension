// Function to log activity via the background script
function logToBackground(type, description) {
  chrome.runtime.sendMessage({
    action: 'logActivity',
    type: type,
    description: description,
    url: window.location.href
  });
}

// --- Main World Injection Script ---
// This function runs in the same context as the website (Main World)
// to reliably override APIs that are otherwise isolated from content scripts.
function injectShield(settings) {
  const log = (type, desc) => {
    window.dispatchEvent(new CustomEvent('PrivacyShieldLog', {
      detail: { type, desc }
    }));
  };

  // 1. Stealth Helper: Mimic Native Functions
  const makeNative = (fn, name) => {
    Object.defineProperty(fn, 'name', { value: name, configurable: true });
    return fn;
  };

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

  // 2. Fingerprinting Protection
  if (settings.fingerprint !== false) {
    // Spoof User-Agent & Platform
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    Object.defineProperty(navigator, 'userAgent', { get: () => ua, configurable: true });
    Object.defineProperty(navigator, 'appVersion', { get: () => ua.substring(8), configurable: true });
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32', configurable: true });

    // Mask Navigator Properties
    const overrides = { language: 'en-US', languages: ['en-US', 'en'], hardwareConcurrency: 4, deviceMemory: 8, maxTouchPoints: 0 };
    for (const [key, value] of Object.entries(overrides)) {
      Object.defineProperty(navigator, key, { get: () => value, configurable: true });
    }

    // Canvas Protection
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = makeNative(function toDataURL() {
      log('Fingerprint', 'Blocked canvas fingerprinting attempt.');
      return originalToDataURL.apply(this, arguments);
    }, 'toDataURL');
  }

  // 3. Geolocation Protection (Stealth)
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

    navigator.geolocation.getCurrentPosition = makeNative((success, error, options) => {
      log('Geolocation', 'Intercepted getCurrentPosition -> returning San Francisco');
      if (typeof success === 'function') {
        setTimeout(() => success(spoofedPos), 0);
      }
    }, 'getCurrentPosition');

    navigator.geolocation.watchPosition = makeNative((success, error, options) => {
      log('Geolocation', 'Intercepted watchPosition -> returning San Francisco');
      if (typeof success === 'function') {
        setTimeout(() => success(spoofedPos), 0);
      }
      return Math.floor(Math.random() * 1000) + 1;
    }, 'watchPosition');

    if (navigator.permissions && navigator.permissions.query) {
      const originalQuery = navigator.permissions.query.bind(navigator.permissions);
      navigator.permissions.query = makeNative(function query(queryObject) {
        if (queryObject && queryObject.name === 'geolocation') {
          log('Geolocation', 'Intercepted permission query -> granting access');
          return Promise.resolve({ state: 'granted', onchange: null });
        }
        return originalQuery(queryObject);
      }, 'query');
    }
  }

  // 4. WebRTC & Media Protection
  if (settings.webrtc !== false) {
    if (window.RTCPeerConnection) {
      window.RTCPeerConnection = makeNative(function RTCPeerConnection() {
        log('Fingerprint', 'Blocked WebRTC attempt.');
        throw new Error('WebRTC disabled by Privacy Shield');
      }, 'RTCPeerConnection');
    }

    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
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

// --- Isolated World Logic ---
// Fetch settings and inject the shield into the Main World
chrome.storage.sync.get(['fingerprint', 'webrtc', 'geolocation'], function (settings) {
  const script = document.createElement('script');
  script.textContent = `(${injectShield.toString()})(${JSON.stringify(settings)});`;
  // At document_start, document.head might be null, but document.documentElement is available
  (document.head || document.documentElement).appendChild(script);
  script.remove();
});

// Listen for log events from the Main World and forward them to the background
window.addEventListener('PrivacyShieldLog', (event) => {
  logToBackground(event.detail.type, event.detail.desc);
});
