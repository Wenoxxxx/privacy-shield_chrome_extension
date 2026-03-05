// Define the privacy rules for declarativeNetRequest
const rules = [
  // 1. Block common known tracker patterns
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "tracker",
      "resourceTypes": ["script", "image", "xmlhttprequest"]
    }
  },
  // 2. Block DoubleClick (Advertising)
  {
    "id": 2,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "doubleclick.net",
      "resourceTypes": ["script", "image", "xmlhttprequest"]
    }
  },
  // 3. Block Google Analytics
  {
    "id": 3,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "google-analytics.com",
      "resourceTypes": ["script", "xmlhttprequest"]
    }
  },
  // 4. Upgrade HTTP to HTTPS (Privacy & Security)
  {
    "id": 4,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": { "transform": { "scheme": "https" } }
    },
    "condition": {
      "urlFilter": "http://*",
      "resourceTypes": ["main_frame"]
    }
  },
  // 5. Header Spoofing (Prevent detection of anti-fingerprinting)
  {
    "id": 5,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "requestHeaders": [
        { "header": "user-agent", "operation": "set", "value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" },
        { "header": "sec-ch-ua", "operation": "set", "value": "\" Not;A Brand\";v=\"99\", \"Google Chrome\";v=\"91\", \"Chromium\";v=\"91\"" },
        { "header": "sec-ch-ua-mobile", "operation": "set", "value": "?0" },
        { "header": "sec-ch-ua-platform", "operation": "set", "value": "\"Windows\"" }
      ]
    },
    "condition": {
      "urlFilter": "*",
      "resourceTypes": ["main_frame", "sub_frame", "script", "xmlhttprequest", "websocket"]
    }
  }
];

// Apply the rules to the browser
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: rules,
  removeRuleIds: rules.map(rule => rule.id)
});

// --- Logging Functionality ---

// Central function to add a log entry
function addLogEntry(type, description, url) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: type, // 'Tracker', 'Fingerprint', 'HTTPS'
    description: description,
    url: url
  };

  chrome.storage.local.get(['privacyLogs'], function (result) {
    const logs = result.privacyLogs || [];
    logs.unshift(logEntry); // Add to the beginning
    // Keep only the last 100 logs to prevent storage bloat
    const limitedLogs = logs.slice(0, 100);
    chrome.storage.local.set({ privacyLogs: limitedLogs });
  });
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'logActivity') {
    addLogEntry(message.type, message.description, message.url || sender.tab?.url);
  }
});

// Note: In a production environment with DNR, we can't easily log blocked requests
// via a callback. We can however "guess" based on the matched rules if we had
// access to onRuleMatchedDebug (development only). For this implementation,
// we will focus on logging fingerprinting attempts (from content.js)
// and potentially HTTPS upgrades if we use a different mechanism or
// just log the intent.
