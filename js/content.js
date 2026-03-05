// Function to log activity via the background script
function logToBackground(type, description) {
  chrome.runtime.sendMessage({
    action: 'logActivity',
    type: type,
    description: description,
    url: window.location.href
  });
}

// Spoof User-Agent to a generic one
Object.defineProperty(navigator, 'userAgent', {
  get: () => {
    // Optional: Only log once per session or on change?
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }
});

// Mask Navigator Properties used for fingerprinting
const navigatorOverrides = {
  language: 'en-US',
  languages: ['en-US', 'en'],
  hardwareConcurrency: 4,
  deviceMemory: 8,
  maxTouchPoints: 0,
  platform: 'Win32'
};

for (const [key, value] of Object.entries(navigatorOverrides)) {
  Object.defineProperty(navigator, key, {
    get: () => {
      // Log property access occasionally (not every time to avoid spam)
      // logToBackground('Fingerprint', `Intercepted access to navigator.${key}`);
      return value;
    }
  });
}

// Spoof Geolocation to a generic location
navigator.geolocation.getCurrentPosition = function (success, error) {
  logToBackground('Fingerprint', 'Intercepted geolocation request.');
  success({
    coords: {
      latitude: 37.7749, // Fake latitude (San Francisco)
      longitude: -122.4194 // Fake longitude
    }
  });
};

// Basic Canvas Fingerprinting Protection
// This script intercepts calls to toDataURL to prevent canvas fingerprinting
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function () {
  const description = 'Blocked canvas fingerprinting attempt.';
  console.log(`Privacy Shield: ${description}`);
  logToBackground('Fingerprint', description);
  return originalToDataURL.apply(this, arguments);
};
