// popup.js - Netflix Optimizer Popup Script

// Single on/off switch. content_loader.js derives all feature flags from it.
const enabledCheckbox = document.getElementById('enabled-popup');

// Restore the switch position
function restoreSettings() {
  chrome.storage.sync.get({
    enabled: true,
  }, function(items) {
    enabledCheckbox.checked = items.enabled;
  });
}

// Save immediately on toggle; content_loader picks the change up via
// chrome.storage.onChanged and re-derives the injected page settings.
function saveSettings() {
  chrome.storage.sync.set({
    enabled: enabledCheckbox.checked,
  });
}

enabledCheckbox.addEventListener('change', saveSettings);

// Get platform info and update status UI
document.addEventListener('DOMContentLoaded', function() {
  restoreSettings();

  chrome.runtime.sendMessage({ type: 'getPlatformInfo' }, function(response) {
    if (chrome.runtime.lastError) {
      showError('Service worker unavailable: ' + chrome.runtime.lastError.message);
      return;
    }
    if (response) {
      updateUI(response);
    } else {
      showError('Failed to get platform info');
    }
  });
});

function updateUI(info) {
  document.getElementById('version').textContent = 'v' + (info.version || '26.7.26');

  const statusIcon = document.getElementById('statusIcon');
  const statusTitle = document.getElementById('statusTitle');
  const statusDesc = document.getElementById('statusDesc');

  if (info.can4K) {
    statusIcon.textContent = '🎬';
    statusTitle.textContent = '4K HDR Ready';
    statusDesc.textContent = 'Your browser can stream 4K';
  } else {
    statusIcon.textContent = '✓';
    statusTitle.textContent = '1080p Ready';
    statusDesc.textContent = 'Your browser can stream HD';
  }

  document.getElementById('platform').textContent = info.description || info.platform;
  document.getElementById('maxRes').textContent = info.maxRes || '1080p';
  document.getElementById('audio').textContent = info.audio || '5.1';
}

function showError(message) {
  document.getElementById('statusIcon').textContent = '⚠️';
  document.getElementById('statusTitle').textContent = 'Error';
  document.getElementById('statusDesc').textContent = message;
}
