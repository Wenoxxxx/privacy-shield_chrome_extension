document.addEventListener('DOMContentLoaded', function () {
  // 1. Initialize Toggles from Storage
  const toggles = {
    'trackers': document.getElementById('toggle-trackers'),
    'https': document.getElementById('toggle-https'),
    'fingerprint': document.getElementById('toggle-fingerprint')
  };

  // Load saved preferences
  chrome.storage.sync.get(['trackers', 'https', 'fingerprint'], function (result) {
    // Default to true if not set
    for (const key in toggles) {
      if (toggles[key]) {
        toggles[key].checked = result[key] !== false;
      }
    }
    updateUI();
  });

  // 2. Add Event Listeners for Toggles
  for (const key in toggles) {
    if (toggles[key]) {
      toggles[key].addEventListener('change', function () {
        const settings = {};
        settings[key] = this.checked;
        chrome.storage.sync.set(settings);
        updateUI();
      });
    }
  }

  // 3. Reset Button Logic
  // Get the reset button element.
  const resetBtn = document.getElementById('reset-settings');
  // If the reset button exists, attach a click event listener.
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      // Define the default settings for all toggles.
      const defaultSettings = { trackers: true, https: true, fingerprint: true };
      // Save the default settings to Chrome's sync storage.
      chrome.storage.sync.set(defaultSettings, function () {
        // After settings are saved, update the UI toggles to reflect the default state.
        for (const key in toggles) {
          if (toggles[key]) toggles[key].checked = true;
        }
        // Finally, update the overall UI (e.g., privacy score).
        updateUI();
      });
    });
  }

  // 4. View Logs Button Logic
  // Get the "VIEW LOGS" button element. Assuming it has classes 'button' and 'primary'.
  const viewLogsBtn = document.querySelector('.button.primary');
  // If the button exists, attach a click event listener.
  if (viewLogsBtn) {
    viewLogsBtn.addEventListener('click', function () {
      // When clicked, open 'logs.html' in a new tab.
      chrome.tabs.create({ url: 'logs.html' });
    });
  }

  // Function to update the UI, primarily the privacy score.
  function updateUI() {
    // Query for the active tab in the current window.
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      // If an active tab is found.
      if (tabs[0]) {
        // Calculate the privacy score for the current tab's URL.
        calculatePrivacyScore(tabs[0].url).then(score => {
          // Once the score is calculated, display it in the UI.
          setPrivacyScore(score);
        });
      }
    });
  }
});

function setPrivacyScore(score) {
  // Set the score text
  const scoreElem = document.getElementById('privacy-score');
  if (scoreElem) scoreElem.textContent = score;

  // Animate the circle progress
  const circle = document.querySelector('.circle-bar');
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - percent / 100);

  if (circle) {
    circle.style.strokeDasharray = `${circumference}`;
    circle.style.strokeDashoffset = offset;

    // Change color based on score
    if (score > 80) circle.style.stroke = "#28a745"; // Green
    else if (score > 50) circle.style.stroke = "#ffc107"; // Yellow
    else circle.style.stroke = "#dc3545"; // Red
  }
}

async function calculatePrivacyScore(url) {
  let score = 100;

  // Get current toggle states from storage
  const settings = await new Promise(resolve => {
    chrome.storage.sync.get(['trackers', 'https', 'fingerprint'], resolve);
  });

  // Deduct points if features are disabled
  if (settings.trackers === false) score -= 30;
  if (settings.https === false) score -= 30;
  if (settings.fingerprint === false) score -= 20;

  // Deduct points based on URL (e.g., insecure HTTP)
  if (url.startsWith('http://') && settings.https !== false) {
    // If HTTPS upgrade is ON but site is still HTTP, it's a risk or not upgraded yet
    score -= 10;
  } else if (url.startsWith('http://')) {
    score -= 20;
  }

  return score;
}
