// popup.js - Netflix Optimizer Popup Script

document.addEventListener('DOMContentLoaded', function() {
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

  const can4KEl = document.getElementById('can4K');
  if (info.can4K) {
    can4KEl.textContent = '✓ Yes';
    can4KEl.className = 'info-value';
  } else {
    can4KEl.textContent = '✗ No (Browser limit)';
    can4KEl.className = 'info-value warning';
  }
}

function showError(message) {
  document.getElementById('statusIcon').textContent = '⚠️';
  document.getElementById('statusTitle').textContent = 'Error';
  document.getElementById('statusDesc').textContent = message;
}
