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

// 1. WebRTC IP Handling Policy (Network-level protection)
function updateWebRTCPolicy() {
  chrome.storage.sync.get(['webrtc'], function (result) {
    const policy = result.webrtc !== false ? 'default_public_interface_only' : 'default';
    if (chrome.privacy && chrome.privacy.network && chrome.privacy.network.webRTCIPHandlingPolicy) {
      chrome.privacy.network.webRTCIPHandlingPolicy.set({ value: policy }, function () {
        if (chrome.runtime.lastError) {
          console.error('Privacy Shield: Error setting WebRTC policy:', chrome.runtime.lastError);
        } else {
          console.log(`Privacy Shield: WebRTC policy set to ${policy}`);
        }
      });
    }
  });
}

// Update policy on startup and when storage changes
updateWebRTCPolicy();
chrome.storage.onChanged.addListener((changes) => {
  if (changes.webrtc) {
    updateWebRTCPolicy();
  }
});

// 2. Central function to add a log entry
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
  } else if (message.action === 'enableGeolocation') {
    enableGeolocationOverride(message.tabId);
  } else if (message.action === 'disableGeolocation') {
    disableGeolocationOverride(message.tabId);
  }
});

function enableGeolocationOverride(tabId) {
  const target = { tabId: tabId };
  // Check if already attached to avoid errors
  chrome.debugger.getTargets((targets) => {
    const isAttached = targets.some(t => t.tabId === tabId && t.attached);
    if (!isAttached) {
      chrome.debugger.attach(target, "1.3", () => {
        if (chrome.runtime.lastError) {
          console.error('Privacy Shield: Debugger attach error:', chrome.runtime.lastError.message);
          return;
        }
        chrome.debugger.sendCommand(target, "Emulation.setGeolocationOverride", {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10
        });

        // Log the activity
        chrome.tabs.get(tabId, (tab) => {
          if (!chrome.runtime.lastError && tab && tab.url) {
            addLogEntry('Geolocation', 'Spoofed geolocation to San Francisco', tab.url);
          }
        });

        console.log(`Privacy Shield: Geolocation override enabled for tab ${tabId}`);
      });
    }
  });
}

function disableGeolocationOverride(tabId) {
  const target = { tabId: tabId };
  chrome.debugger.detach(target, () => {
    // Ignore error if already detached
    if (chrome.runtime.lastError) {
      console.warn('Privacy Shield: Debugger detach warning:', chrome.runtime.lastError.message);
    } else {
      console.log(`Privacy Shield: Geolocation override disabled for tab ${tabId}`);
    }
  });
}

// 3. Re-apply geolocation override on tab updates if enabled
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    chrome.storage.sync.get(['geolocation'], (result) => {
      if (result.geolocation !== false) {
        enableGeolocationOverride(tabId);
      }
    });
  }
});