// background.js - Netflix Optimizer Service Worker
const EXTENSION_VERSION = '26.3.18';

function detectPlatform() {
  const ua = navigator.userAgent;

  if (ua.includes('Edg/')) {
    if (ua.includes('Mac')) return {
      platform: 'mac-edge',
      description: 'Mac + Edge',
      can4K: false,
      maxRes: '1080p',
      audio: '5.1'
    };
    return {
      platform: 'windows-edge',
      description: 'Windows + Edge',
      can4K: true,
      maxRes: '4K HDR',
      audio: '5.1'
    };
  }

  if (ua.includes('Chrome/')) {
    if (ua.includes('Mac')) return {
      platform: 'mac-chrome',
      description: 'Mac + Chrome',
      can4K: false,
      maxRes: '1080p',
      audio: '5.1'
    };
    if (ua.includes('Linux')) return {
      platform: 'linux-chrome',
      description: 'Linux + Chrome',
      can4K: false,
      maxRes: '1080p',
      audio: '5.1'
    };
    return {
      platform: 'windows-chrome',
      description: 'Windows + Chrome',
      can4K: false,
      maxRes: '1080p',
      audio: '5.1'
    };
  }

  if (ua.includes('Firefox/')) return {
    platform: 'firefox',
    description: 'Firefox',
    can4K: false,
    maxRes: '1080p',
    audio: '5.1'
  };

  return {
    platform: 'unknown',
    description: 'Unknown Browser',
    can4K: false,
    maxRes: '1080p',
    audio: '5.1'
  };
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getPlatformInfo') {
    const platform = detectPlatform();
    sendResponse({
      ...platform,
      version: EXTENSION_VERSION,
      timestamp: Date.now()
    });
  }
});

console.log('[Netflix Optimizer v' + EXTENSION_VERSION + '] Service worker initialized');
