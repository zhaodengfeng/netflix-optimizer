// content_loader.js - Netflix Optimizer
// Loads the single enabled switch, derives the per-feature flags from it,
// and injects them into the page for netflix_maxrate.js / playercore-shim.js.

const INTERNAL_SCRIPTS = [
    'netflix_maxrate.js'
];
const SETTINGS_ELEMENT_ID = 'netflix-optimizer-settings';
const SETTINGS_CHANGED_EVENT = 'nfopt-settings-changed';
const DEFAULT_SETTINGS = {
    enabled: true,
};
// Storage keys used by pre-single-toggle versions; removed on load.
const LEGACY_SETTINGS_KEYS = [
    'use6Channels', 'setMaxBitrate', 'disableVP9', 'disableAVChigh',
    'disableAV1', 'showAllSubs', 'useHEVC', 'useDDPlus'
];
const DEBUG = false;

function debugLog(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

// promisify chrome storage API for easier chaining.
// Rejects on chrome.runtime.lastError (e.g. invalidated extension context)
// so failures surface in the console instead of silently killing the chain.
function chromeStorageGet(opts) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.sync.get(opts, (items) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(items);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * HEVC/4K HDR and Dolby Digital Plus/Atmos only work on Windows 11 + Edge
 * (PlayReady SL3000). Detected via User-Agent Client Hints; any failure
 * resolves to false so the experimental profiles are never advertised where
 * they could break playback. Resolved once: the platform cannot change
 * during a page's lifetime.
 */
const experimentalSupportPromise = (function detectExperimentalSupport() {
    try {
        const uaData = navigator.userAgentData;
        if (!uaData || !uaData.brands || !uaData.getHighEntropyValues) {
            return Promise.resolve(false);
        }
        const isEdge = uaData.brands.some(b => b.brand === 'Microsoft Edge');
        if (!isEdge) {
            return Promise.resolve(false);
        }
        return uaData.getHighEntropyValues(['platform', 'platformVersion'])
            .then(info => {
                // Windows 11 reports platformVersion 13.0+; Windows 10 caps at 10.x.
                const major = parseInt(String(info.platformVersion || '0').split('.')[0], 10);
                return info.platform === 'Windows' && major >= 13;
            })
            .catch(() => false);
    } catch (e) {
        return Promise.resolve(false);
    }
})();

/**
 * Map the single enabled switch to the per-feature flags consumed by
 * netflix_maxrate.js and playercore-shim.js. Off means "touch nothing":
 * no codecs disabled, no extra profiles advertised, no bitrate forcing.
 */
function buildEffectiveSettings(enabled, experimentalSupported) {
    return {
        use6Channels: enabled,
        setMaxBitrate: enabled,
        disableVP9: false,
        disableAVChigh: false,
        disableAV1: false,
        showAllSubs: enabled,
        useHEVC: enabled && experimentalSupported,
        useDDPlus: enabled && experimentalSupported
    };
}

/**
 * Read the enabled switch and resolve it to effective page settings.
 * Also drops legacy per-feature keys left over from older versions.
 */
function loadEffectiveSettings() {
    return chromeStorageGet({ ...DEFAULT_SETTINGS })
        .then(items => {
            try {
                chrome.storage.sync.remove(LEGACY_SETTINGS_KEYS);
            } catch (e) { /* stale keys are harmless */ }
            return experimentalSupportPromise.then(supported =>
                buildEffectiveSettings(!!items.enabled, supported));
        });
}

function addSettingsToHtml(settings) {
    const mainScript = document.createElement('script');
    mainScript.type = 'application/json';
    mainScript.text = JSON.stringify(settings);
    mainScript.id = SETTINGS_ELEMENT_ID;
    document.documentElement.appendChild(mainScript);
    debugLog("[Netflix Optimizer] Settings loaded", settings);
}

// Update the settings element in place and ping main-world scripts
// (netflix_maxrate.js) so setting changes apply without a page reload.
function updateSettingsInHtml(settings) {
    const existing = document.getElementById(SETTINGS_ELEMENT_ID);
    if (!existing) {
        addSettingsToHtml(settings);
        return;
    }
    existing.text = JSON.stringify(settings);
    document.documentElement.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT));
    debugLog("[Netflix Optimizer] Settings updated", settings);
}

function injectInternalScripts() {
    for (let i = 0; i < INTERNAL_SCRIPTS.length; i++) {
        try {
            const mainScriptUrl = chrome.runtime.getURL(INTERNAL_SCRIPTS[i]);
            const mainScript = document.createElement('script');
            mainScript.type = 'application/javascript';
            mainScript.src = mainScriptUrl;
            mainScript.setAttribute('data-nfopt', INTERNAL_SCRIPTS[i]);
            document.documentElement.appendChild(mainScript);
            debugLog("[Netflix Optimizer] Injected:", INTERNAL_SCRIPTS[i]);
        } catch (e) {
            console.error("[Netflix Optimizer] Failed to inject:", INTERNAL_SCRIPTS[i], e);
        }
    }
}

function loadSettingsAndInject() {
    return loadEffectiveSettings()
        .catch(error => {
            // Fall back to defaults so a storage failure degrades the
            // extension to default behavior instead of silently doing nothing.
            console.error("[Netflix Optimizer] Failed to load settings, using defaults:", error);
            return experimentalSupportPromise.then(supported =>
                buildEffectiveSettings(DEFAULT_SETTINGS.enabled, supported));
        })
        .then(effective => {
            addSettingsToHtml(effective);
        })
        .then(() => {
            injectInternalScripts();
        });
}

// Re-derive settings whenever the popup toggles the switch, and push them
// into the page.
function watchSettingsChanges() {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') return;
        if (!Object.keys(changes).some(key => key in DEFAULT_SETTINGS)) return;

        loadEffectiveSettings()
            .then(effective => {
                updateSettingsInHtml(effective);
            })
            .catch(error => {
                console.error("[Netflix Optimizer] Failed to refresh settings:", error);
            });
    });
}

loadSettingsAndInject();
watchSettingsChanges();
