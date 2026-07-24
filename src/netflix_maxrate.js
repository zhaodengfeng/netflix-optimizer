// netflix_maxrate.js - Force highest bitrate on Netflix
// Fixed version: i18n support, modern keyboard events, MutationObserver

/**
 * Configuration constants
 */
const CONFIG = {
    WATCH_PATTERN: /netflix\.com\/(watch|browse|title|latest).*/,
    MAX_RETRIES: 20,
    RETRY_DELAY: 100,
    HIDE_ATTEMPTS: 10,
    // How long to wait for the player to actually start playing before
    // falling back to the old blind attempt (60 x 500ms = 30s max).
    PLAYER_WAIT_ATTEMPTS: 60,
    PLAYER_WAIT_INTERVAL: 500
};
const DEBUG = false;

function debugLog(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

function debugWarn(...args) {
    if (DEBUG) {
        console.warn(...args);
    }
}

function debugError(...args) {
    if (DEBUG) {
        console.error(...args);
    }
}

/**
 * Multi-language labels for Netflix bitrate menu
 * Covers major languages to handle internationalization
 */
const LABELS = {
    video: [
        'Video Bitrate / VMAF',
        '视频比特率 / VMAF',
        '視訊位元率 / VMAF',
        'ビデオビットレート / VMAF',
        '비디오 비트레이트 / VMAF',
        'Taux de bits vidéo / VMAF',
        'Videobitrate / VMAF',
        'Tasa de bits de video / VMAF'
    ],
    audio: [
        'Audio Bitrate',
        '音频比特率',
        '音訊位元率',
        'オーディオビットレート',
        '오디오 비트레이트',
        'Taux de bits audio',
        'Audiobitrate',
        'Tasa de bits de audio'
    ],
    override: [
        'Override',
        '覆盖',
        '覆蓋',
        'オーバーライド',
        '재정의',
        'Remplacer',
        'Überschreiben',
        'Sobrescribir'
    ]
};

/**
 * Find element by trying multiple text labels
 * @param {string[]} labels - Array of possible text labels
 * @returns {HTMLElement|null} Found element or null
 */
function findElementByLabels(labels) {
    for (const label of labels) {
        const element = document.evaluate(
            `//div[text()="${label}"]`,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;
        if (element) return element;
    }
    return null;
}

/**
 * Find button by trying multiple text labels
 * @param {string[]} labels - Array of possible text labels
 * @returns {HTMLElement|null} Found button or null
 */
function findButtonByLabels(labels) {
    for (const label of labels) {
        const button = document.evaluate(
            `//button[text()="${label}"]`,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;
        if (button) return button;
    }
    return null;
}

/**
 * Trigger Netflix's hidden bitrate override menu
 * Uses modern KeyboardEvent with code/key instead of deprecated keyCode
 */
function triggerBitrateMenu() {
    const event = new KeyboardEvent('keydown', {
        code: 'KeyB',
        key: 'b',
        keyCode: 66, // Fallback for older browsers
        ctrlKey: true,
        altKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true
    });
    window.dispatchEvent(event);
}

/**
 * Parse bitrate from a Netflix bitrate menu option.
 * Netflix uses the bitrate as the option value, but keep text/title fallbacks
 * for player UI changes and localized menu variants.
 * @param {HTMLOptionElement} option - Bitrate option element
 * @returns {number} Parsed bitrate, or NaN when unavailable
 */
function parseBitrateOption(option) {
    const candidates = [
        option.value,
        option.getAttribute('value'),
        option.textContent,
        option.getAttribute('title')
    ];

    for (const candidate of candidates) {
        if (!candidate) continue;

        const match = String(candidate).replace(/,/g, '').match(/\d+(?:\.\d+)?/);
        if (!match) continue;

        const bitrate = Number(match[0]);
        if (Number.isFinite(bitrate)) {
            return bitrate;
        }
    }

    return NaN;
}

/**
 * Select the option with the highest numeric bitrate.
 * @param {NodeListOf<HTMLOptionElement>} options - Available bitrate options
 * @returns {HTMLOptionElement|null} Highest-bitrate option, or null
 */
function findHighestBitrateOption(options) {
    let highestOption = null;
    let highestBitrate = -Infinity;
    let highestIndex = -1;

    options.forEach((option, index) => {
        const bitrate = parseBitrateOption(option);
        if (!Number.isFinite(bitrate)) {
            return;
        }

        if (bitrate > highestBitrate || (bitrate === highestBitrate && index > highestIndex)) {
            highestOption = option;
            highestBitrate = bitrate;
            highestIndex = index;
        }
    });

    return highestOption || options[options.length - 1] || null;
}

/**
 * Set bitrate to maximum value
 * @returns {boolean} Success status
 */
function maxbitrate_set() {
    // Trigger the hidden menu
    triggerBitrateMenu();

    // Find elements using multi-language labels
    const videoSelect = findElementByLabels(LABELS.video);
    const audioSelect = findElementByLabels(LABELS.audio);
    const overrideButton = findButtonByLabels(LABELS.override);

    // Validate all required elements are found
    if (!videoSelect || !audioSelect || !overrideButton) {
        return false;
    }

    let successCount = 0;

    // Set both video and audio to highest quality
    [videoSelect, audioSelect].forEach(selectEl => {
        const parent = selectEl.parentElement;
        if (!parent) return;

        const options = parent.querySelectorAll('select > option');
        if (options.length === 0) return;

        // Deselect all options
        options.forEach(opt => {
            opt.selected = false;
            opt.removeAttribute('selected');
        });

        // Select the actual highest bitrate. Netflix option order can vary by codec/profile.
        const highestOption = findHighestBitrateOption(options);
        if (!highestOption) return;

        highestOption.selected = true;
        highestOption.setAttribute('selected', 'selected');
        
        // Also set the select element's value
        const selectElement = parent.querySelector('select');
        if (selectElement) {
            selectElement.value = highestOption.value;
            // Trigger input/change events for React compatibility
            selectElement.dispatchEvent(new Event('input', { bubbles: true }));
            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        }

        successCount++;
    });

    // Verify both were set successfully
    if (successCount !== 2) {
        return false;
    }

    // Click override button to confirm
    overrideButton.click();
    maxbitrate_finish();
    return true;
}

/**
 * Hide the bitrate menu after setting
 * @param {number} attempts - Remaining retry attempts
 */
function maxbitrate_hide(attempts = CONFIG.HIDE_ATTEMPTS) {
    const overrideButton = findButtonByLabels(LABELS.override);

    if (overrideButton) {
        overrideButton.click();
        maxbitrate_finish();
    } else if (attempts > 0) {
        setTimeout(() => maxbitrate_hide(attempts - 1), 200);
    }
}

/**
 * Run the bitrate setting process with retries
 * @param {number} retryCount - Current retry count
 */
function maxbitrate_run(retryCount = 0) {
    if (retryCount >= CONFIG.MAX_RETRIES) {
        debugWarn('[Netflix Optimizer] Max bitrate set failed after max retries');
        maxbitrate_finish();
        return;
    }

    if (!maxbitrate_set()) {
        setTimeout(() => maxbitrate_run(retryCount + 1), CONFIG.RETRY_DELAY);
    } else {
        maxbitrate_hide();
    }
}

/**
 * Start the bitrate optimization process
 */
function maxbitrate_start() {
    // Hide the bitrate selection menu during automation
    const styleNode = document.createElement('style');
    styleNode.textContent = `
        .player-streams {
            display: none !important;
        }
    `;
    styleNode.id = 'maxbitrate-hide-menu-style';
    
    // Remove any existing style node first
    const existing = document.querySelector('#maxbitrate-hide-menu-style');
    if (existing) {
        existing.parentNode.removeChild(existing);
    }
    
    document.head.appendChild(styleNode);
    maxbitrate_run();
}

/**
 * Cleanup: remove the hide-menu style
 */
function maxbitrate_finish() {
    const styleNode = document.querySelector('#maxbitrate-hide-menu-style');
    if (styleNode && styleNode.parentNode) {
        styleNode.parentNode.removeChild(styleNode);
    }
}

/**
 * Read settings from the injected JSON element.
 * @returns {object|null} Parsed settings, or null when unavailable
 */
function readSettingsFromDom() {
    try {
        const settingsEl = document.getElementById('netflix-optimizer-settings') ||
                           document.getElementById('netflix-1080p-settings');
        if (settingsEl && settingsEl.innerText) {
            return JSON.parse(settingsEl.innerText);
        }
    } catch (e) {
        debugError('[Netflix Optimizer] Could not parse settings:', e);
    }
    return null;
}

/**
 * Initialize settings from injected script
 */
function loadSettings() {
    if (window.globalOptions !== undefined) {
        return;
    }

    const settings = readSettingsFromDom();
    if (settings) {
        window.globalOptions = settings;
        debugLog('[Netflix Optimizer] Settings loaded:', window.globalOptions);
    } else {
        window.globalOptions = null;
    }
}

/**
 * Re-read the settings element so values saved in popup/options apply
 * without a page reload (content_loader updates the element and pings us).
 * The DOM element always wins over window.globalOptions, which the patched
 * playercore may have pre-filled with defaults.
 */
function refreshSettings() {
    const settings = readSettingsFromDom();
    if (settings) {
        window.globalOptions = Object.assign({}, window.globalOptions || {}, settings);
    }
}

/**
 * Get the Netflix player instance via the internal app API.
 * @returns {object|null} Player instance, or null when unavailable
 */
function getNetflixPlayer() {
    try {
        const playerApp = window.netflix &&
                          window.netflix.appContext &&
                          window.netflix.appContext.state &&
                          window.netflix.appContext.state.playerApp;
        const videoPlayer = playerApp && playerApp.getAPI && playerApp.getAPI().videoPlayer;
        if (!videoPlayer) return null;

        const sessionIds = videoPlayer.getAllPlayerSessionIds ? videoPlayer.getAllPlayerSessionIds() : [];
        if (!sessionIds || !sessionIds.length) return null;

        return videoPlayer.getVideoPlayerBySessionId(sessionIds[0]) || null;
    } catch (e) {
        return null;
    }
}

/**
 * Wait until playback has actually started before running the bitrate
 * automation (inspired by lkmvip/netflix-4K-DDplus). If the player API is
 * unavailable or playback never starts within the wait window, falls back
 * to running anyway so a Netflix API change cannot kill the feature.
 * @param {Function} onReady - Called once playback started (or on timeout)
 * @param {number} attempts - Remaining poll attempts
 */
function waitForPlayback(onReady, attempts = CONFIG.PLAYER_WAIT_ATTEMPTS) {
    const player = getNetflixPlayer();

    let playing = false;
    if (player && typeof player.isPlaying === 'function') {
        try {
            playing = !!player.isPlaying();
        } catch (e) {
            playing = false;
        }
    }

    if (playing) {
        onReady();
        return;
    }

    if (attempts <= 0) {
        debugWarn('[Netflix Optimizer] Timed out waiting for playback, trying anyway');
        onReady();
        return;
    }

    setTimeout(() => waitForPlayback(onReady, attempts - 1), CONFIG.PLAYER_WAIT_INTERVAL);
}

/**
 * Check if current URL matches watch pattern
 * @param {string} url - Current URL
 * @returns {boolean} Is a watch page
 */
function isWatchPage(url) {
    return CONFIG.WATCH_PATTERN.test(url);
}

// Main initialization
(function init() {
    loadSettings();

    // Safety check for settings
    if (!window.globalOptions) {
        debugWarn('[Netflix Optimizer] No settings available, waiting...');
        setTimeout(init, 500);
        return;
    }

    if (!document.body) {
        debugLog('[Netflix Optimizer] Waiting for document body...');
        setTimeout(init, 100);
        return;
    }

    // Live-refresh settings when popup/options saves new values
    document.documentElement.addEventListener('nfopt-settings-changed', () => {
        refreshSettings();
        debugLog('[Netflix Optimizer] Settings refreshed:', window.globalOptions);
    });

    let currentUrl = window.location.toString();
    let isProcessing = false;

    function startOptimization() {
        if (isProcessing) return;

        // Re-read settings at trigger time; the enabled/disabled state is
        // gated here so toggling it no longer requires a page reload.
        refreshSettings();
        if (!window.globalOptions || !window.globalOptions.setMaxBitrate) {
            debugLog('[Netflix Optimizer] Max bitrate forcing disabled in settings');
            return;
        }

        isProcessing = true;
        debugLog('[Netflix Optimizer] Watch page detected, waiting for playback...');

        waitForPlayback(() => {
            try {
                maxbitrate_start();
            } catch (e) {
                debugError('[Netflix Optimizer] maxbitrate_start failed:', e);
            } finally {
                isProcessing = false;
            }
        });
    }

    // Use MutationObserver for efficient URL change detection
    const observer = new MutationObserver(() => {
        const newUrl = window.location.toString();

        if (newUrl !== currentUrl) {
            currentUrl = newUrl;

            if (isWatchPage(newUrl)) {
                startOptimization();
            }
        }
    });

    // Start observing the document for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial check in case we're already on a watch page
    if (isWatchPage(currentUrl)) {
        startOptimization();
    }

    debugLog('[Netflix Optimizer] Initialized with MutationObserver');
})();
