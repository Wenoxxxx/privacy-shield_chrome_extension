import { STORAGE_KEYS, DEFAULT_SETTINGS, MESSAGE_ACTIONS } from './const/defaults.js';
import { storage } from './storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const UI = {
    toggles: {
      [STORAGE_KEYS.TRACKERS]: document.getElementById('toggle-trackers'),
      [STORAGE_KEYS.HTTPS]: document.getElementById('toggle-https'),
      [STORAGE_KEYS.FINGERPRINT]: document.getElementById('toggle-fingerprint'),
      [STORAGE_KEYS.WEBRTC]: document.getElementById('toggle-webrtc'),
      [STORAGE_KEYS.GEOLOCATION]: document.getElementById('toggle-geolocation')
    },
    resetBtn: document.getElementById('reset-settings'),
    viewLogsBtn: document.querySelector('.button.primary'),
    scoreElem: document.getElementById('privacy-score'),
    circleBar: document.querySelector('.circle-bar')
  };

  // --- 1. Initialization ---
  const settings = await storage.getSync(Object.values(STORAGE_KEYS));

  for (const [key, element] of Object.entries(UI.toggles)) {
    if (element) {
      element.checked = settings[key] !== false;

      // Add Change Listener
      element.addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        await storage.setSync({ [key]: isChecked });

        // Special handling for Geolocation Debugger
        if (key === STORAGE_KEYS.GEOLOCATION) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) {
            chrome.runtime.sendMessage({
              action: isChecked ? MESSAGE_ACTIONS.ENABLE_GEOLOCATION : MESSAGE_ACTIONS.DISABLE_GEOLOCATION,
              tabId: tab.id
            });
          }
        }
        updateUI();
      });
    }
  }

  // --- 2. Action Handlers ---
  if (UI.resetBtn) {
    UI.resetBtn.addEventListener('click', async () => {
      await storage.setSync(DEFAULT_SETTINGS);
      for (const key in UI.toggles) {
        if (UI.toggles[key]) UI.toggles[key].checked = true;
      }
      updateUI();
    });
  }

  if (UI.viewLogsBtn) {
    UI.viewLogsBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'logs.html' });
    });
  }

  // --- 3. UI Update Logic ---
  async function updateUI() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      const score = await calculatePrivacyScore(tab.url);
      setPrivacyScore(score);
    }
  }

  function setPrivacyScore(score) {
    if (UI.scoreElem) UI.scoreElem.textContent = score;

    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const percent = Math.max(0, Math.min(100, score));
    const offset = circumference * (1 - percent / 100);

    if (UI.circleBar) {
      UI.circleBar.style.strokeDasharray = `${circumference}`;
      UI.circleBar.style.strokeDashoffset = offset;

      // Color coding
      if (score > 80) UI.circleBar.style.stroke = "#28a745";
      else if (score > 50) UI.circleBar.style.stroke = "#ffc107";
      else UI.circleBar.style.stroke = "#dc3545";
    }
  }

  async function calculatePrivacyScore(url) {
    let score = 100;
    const s = await storage.getSync(Object.values(STORAGE_KEYS));

    if (s[STORAGE_KEYS.TRACKERS] === false) score -= 25;
    if (s[STORAGE_KEYS.HTTPS] === false) score -= 25;
    if (s[STORAGE_KEYS.FINGERPRINT] === false) score -= 15;
    if (s[STORAGE_KEYS.WEBRTC] === false) score -= 15;
    if (s[STORAGE_KEYS.GEOLOCATION] === false) score -= 10;

    if (url.startsWith('http://')) {
      score -= (s[STORAGE_KEYS.HTTPS] !== false) ? 5 : 10;
    }

    return score;
  }

  // Initial UI Render
  updateUI();
});
