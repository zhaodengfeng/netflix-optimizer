// content_loader.js - Netflix Optimizer v5.1.1
// Loads settings and injects the max bitrate forcing script
// Based on New Netflix 1080p (1.33.0_0) implementation

const INTERNAL_SCRIPTS = [
    'netflix_maxrate.js'
];
const SETTINGS_ELEMENT_ID = 'netflix-optimizer-settings';
const SETTINGS_CHANGED_EVENT = 'nfopt-settings-changed';
const DEFAULT_SETTINGS = {
    use6Channels: true,
    setMaxBitrate: true,
    disableVP9: false,
    disableAVChigh: false,
    disableAV1: false,
    showAllSubs: false,
    useHEVC: false,
    useDDPlus: false,
};
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
    return chromeStorageGet({ ...DEFAULT_SETTINGS })
        .then(items => {
            addSettingsToHtml(items);
        })
        .catch(error => {
            // Fall back to defaults so a storage failure degrades the
            // extension to default behavior instead of silently doing nothing.
            console.error("[Netflix Optimizer] Failed to load settings, using defaults:", error);
            addSettingsToHtml({ ...DEFAULT_SETTINGS });
        })
        .then(() => {
            injectInternalScripts();
        });
}

// Re-read settings whenever popup/options saves, and push them into the page.
function watchSettingsChanges() {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') return;
        if (!Object.keys(changes).some(key => key in DEFAULT_SETTINGS)) return;

        chromeStorageGet({ ...DEFAULT_SETTINGS })
            .then(items => {
                updateSettingsInHtml(items);
            })
            .catch(error => {
                console.error("[Netflix Optimizer] Failed to refresh settings:", error);
            });
    });
}

loadSettingsAndInject();
watchSettingsChanges();
