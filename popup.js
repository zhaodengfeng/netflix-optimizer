// popup.js - Netflix Optimizer Popup Script

// Settings element refs
const checkboxes = {
  use51: document.getElementById('use-51-popup'),
  maxBitrate: document.getElementById('set-max-bitrate-popup'),
  disableVP9: document.getElementById('disable-vp9-popup'),
  disableAVChigh: document.getElementById('disable-avchigh-popup'),
  disableAV1: document.getElementById('disable-av1-popup'),
  showAllSubs: document.getElementById('show-all-subs-popup'),
};

const saveBtn = document.getElementById('save-btn');
const saveMsg = document.getElementById('save-msg');

// Restore settings into popup checkboxes
function restoreSettings() {
  chrome.storage.sync.get({
    use6Channels: true,
    setMaxBitrate: true,
    disableVP9: false,
    disableAVChigh: false,
    disableAV1: false,
    showAllSubs: false,
  }, function(items) {
    checkboxes.use51.checked = items.use6Channels;
    checkboxes.maxBitrate.checked = items.setMaxBitrate;
    checkboxes.disableVP9.checked = items.disableVP9;
    checkboxes.disableAVChigh.checked = items.disableAVChigh;
    checkboxes.disableAV1.checked = items.disableAV1;
    checkboxes.showAllSubs.checked = items.showAllSubs;
  });
}

// Save settings from popup checkboxes
function saveSettings() {
  chrome.storage.sync.set({
    use6Channels: checkboxes.use51.checked,
    setMaxBitrate: checkboxes.maxBitrate.checked,
    disableVP9: checkboxes.disableVP9.checked,
    disableAVChigh: checkboxes.disableAVChigh.checked,
    disableAV1: checkboxes.disableAV1.checked,
    showAllSubs: checkboxes.showAllSubs.checked,
  }, function() {
    saveMsg.classList.add('visible');
    setTimeout(() => saveMsg.classList.remove('visible'), 2000);
  });
}

saveBtn.addEventListener('click', saveSettings);

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
  document.getElementById('version').textContent = 'v' + (info.version || '26.3.18');

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
