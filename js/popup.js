
document.addEventListener('DOMContentLoaded', function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    let score = calculatePrivacyScore(tabs[0].url);
    setPrivacyScore(score);
  });

  // View switching logic
  const mainView = document.getElementById('main-view');
  const detailsView = document.getElementById('details-view');
  const settingsView = document.getElementById('settings-view');
  const detailsBtn = document.getElementById('view-details-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const backFromDetails = document.getElementById('back-from-details');
  const backFromSettings = document.getElementById('back-from-settings');

  function showView(hideView, showView) {
    if (hideView && showView) {
      hideView.classList.add('hidden');
      setTimeout(() => {
        showView.classList.remove('hidden');
      }, 200);
    }
  }
  function hideView(hideView, showView) {
    if (hideView && showView) {
      hideView.classList.add('hidden');
      setTimeout(() => {
        showView.classList.remove('hidden');
      }, 200);
    }
  }
  if (detailsBtn) {
    detailsBtn.addEventListener('click', function () {
      showView(mainView, detailsView);
    });
  }
  if (settingsBtn) {
    settingsBtn.addEventListener('click', function () {
      showView(mainView, settingsView);
    });
  }
  if (backFromDetails) {
    backFromDetails.addEventListener('click', function () {
      showView(detailsView, mainView);
    });
  }
  if (backFromSettings) {
    backFromSettings.addEventListener('click', function () {
      showView(settingsView, mainView);
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
  }
}
  
  function calculatePrivacyScore(url) {
    // Basic example of scoring logic
    let score = 100; // Start with a full score
    // Deduct points based on various factors
    if (url.includes('tracker')) {
      score -= 20;
    }
    // Implement more scoring rules here
    return score;
  }
  