import { NETWORK_RULES } from './const/rules.js';
import { STORAGE_KEYS, MESSAGE_ACTIONS, LOG_TYPES, SPOOF_COORDS } from './const/defaults.js';
import { storage } from './storage.js';

// --- 1. Declarative Net Request Setup ---
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: NETWORK_RULES,
  removeRuleIds: NETWORK_RULES.map(rule => rule.id)
});

// --- 2. Activity Logging ---
async function addLogEntry(type, description, url) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: type,
    description: description,
    url: url
  };

  const result = await storage.getLocal(STORAGE_KEYS.PRIVACY_LOGS);
  const logs = result[STORAGE_KEYS.PRIVACY_LOGS] || [];
  logs.unshift(logEntry);

  // Keep only the last 100 logs
  await storage.setLocal({ [STORAGE_KEYS.PRIVACY_LOGS]: logs.slice(0, 100) });
}

// --- 3. Geolocation Spoofing (Debugger API) ---
function enableGeolocationOverride(tabId) {
  const target = { tabId: tabId };

  const sendCommandAndLog = () => {
    chrome.debugger.sendCommand(target, "Emulation.setGeolocationOverride", {
      latitude: SPOOF_COORDS.LATITUDE,
      longitude: SPOOF_COORDS.LONGITUDE,
      accuracy: SPOOF_COORDS.ACCURACY
    });

    // Log the activity
    chrome.tabs.get(tabId, (tab) => {
      if (!chrome.runtime.lastError && tab?.url) {
        addLogEntry(LOG_TYPES.GEOLOCATION, 'Spoofed geolocation to San Francisco', tab.url);
      }
    });
    console.log(`Privacy Shield: Geolocation override enabled for tab ${tabId}`);
  };

  chrome.debugger.getTargets((targets) => {
    const isAttached = targets.some(t => t.tabId === tabId && t.attached);
    if (!isAttached) {
      chrome.debugger.attach(target, "1.3", () => {
        if (chrome.runtime.lastError) {
          console.error('Privacy Shield: Debugger attach error:', chrome.runtime.lastError.message);
          return;
        }
        sendCommandAndLog();
      });
    } else {
      sendCommandAndLog();
    }
  });
}

function disableGeolocationOverride(tabId) {
  const target = { tabId: tabId };
  chrome.debugger.detach(target, () => {
    if (chrome.runtime.lastError) {
      console.warn('Privacy Shield: Debugger detach warning:', chrome.runtime.lastError.message);
    } else {
      console.log(`Privacy Shield: Geolocation override disabled for tab ${tabId}`);
    }
  });
}

// --- 4. Message Listeners ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case MESSAGE_ACTIONS.LOG_ACTIVITY:
      addLogEntry(message.type, message.description, message.url || sender.tab?.url);
      break;
    case MESSAGE_ACTIONS.ENABLE_GEOLOCATION:
      enableGeolocationOverride(message.tabId);
      break;
    case MESSAGE_ACTIONS.DISABLE_GEOLOCATION:
      disableGeolocationOverride(message.tabId);
      break;
  }
});

// Re-apply geolocation override on tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    const result = await storage.getSync(STORAGE_KEYS.GEOLOCATION);
    if (result[STORAGE_KEYS.GEOLOCATION] !== false) {
      enableGeolocationOverride(tabId);
    }
  }
});