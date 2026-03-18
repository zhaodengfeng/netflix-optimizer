// content_loader.js - Netflix Optimizer v5.1.1
// Loads settings and injects the max bitrate forcing script
// Based on New Netflix 1080p (1.33.0_0) implementation

const INTERNAL_SCRIPTS = [
    'netflix_maxrate.js'
];

// promisify chrome storage API for easier chaining
function chromeStorageGet(opts) {
    return new Promise(resolve => {
        chrome.storage.sync.get(opts, resolve);
    });
}

function addSettingsToHtml(settings) {
    const mainScript = document.createElement('script');
    mainScript.type = 'application/json';
    mainScript.text = JSON.stringify(settings);
    mainScript.id = "netflix-optimizer-settings";
    document.documentElement.appendChild(mainScript);
    console.log("[Netflix Optimizer] Settings loaded", settings);
}

chromeStorageGet({
    use6Channels: true,
    setMaxBitrate: true,
    disableVP9: false,
    disableAVChigh: false,
    disableAV1: false,
    showAllSubs: false,
}).then(items => {
    addSettingsToHtml(items);
}).then(() => {
    for (let i = 0; i < INTERNAL_SCRIPTS.length; i++) {
        try {
            const mainScriptUrl = chrome.runtime.getURL(INTERNAL_SCRIPTS[i]);
            const mainScript = document.createElement('script');
            mainScript.type = 'application/javascript';
            mainScript.src = mainScriptUrl;
            mainScript.setAttribute('data-nfopt', INTERNAL_SCRIPTS[i]);
            document.documentElement.appendChild(mainScript);
            console.log("[Netflix Optimizer] Injected:", INTERNAL_SCRIPTS[i]);
        } catch (e) {
            console.error("[Netflix Optimizer] Failed to inject:", INTERNAL_SCRIPTS[i], e);
        }
    }
});
