// netflix_maxrate.js - Force highest bitrate on Netflix
// Fixed version: i18n support, modern keyboard events, MutationObserver

/**
 * Configuration constants
 */
const CONFIG = {
    WATCH_PATTERN: /netflix\.com\/(watch|browse|title|latest).*/,
    POLL_INTERVAL: 1000,
    MAX_RETRIES: 20,
    RETRY_DELAY: 100,
    HIDE_ATTEMPTS: 10
};

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
        options.forEach(opt => opt.removeAttribute('selected'));

        // Select the last (highest) option
        const highestOption = options[options.length - 1];
        highestOption.setAttribute('selected', 'selected');
        
        // Also set the select element's value
        const selectElement = parent.querySelector('select');
        if (selectElement) {
            selectElement.value = highestOption.value;
            // Trigger change event for React compatibility
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
        console.warn('[Netflix Optimizer] Max bitrate set failed after max retries');
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
 * Initialize settings from injected script
 */
function loadSettings() {
    if (window.globalOptions !== undefined) {
        return;
    }

    try {
        const settingsEl = document.getElementById('netflix-optimizer-settings') || 
                           document.getElementById('netflix-1080p-settings');
        if (settingsEl && settingsEl.innerText) {
            window.globalOptions = JSON.parse(settingsEl.innerText);
            console.log('[Netflix Optimizer] Settings loaded:', window.globalOptions);
        }
    } catch (e) {
        console.error('[Netflix Optimizer] Could not load settings:', e);
        window.globalOptions = null;
    }
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
        console.warn('[Netflix Optimizer] No settings available, waiting...');
        setTimeout(init, 500);
        return;
    }

    if (!window.globalOptions.setMaxBitrate) {
        console.log('[Netflix Optimizer] Max bitrate forcing disabled in settings');
        return;
    }

    console.log('[Netflix Optimizer] Max bitrate forcing enabled');

    let currentUrl = window.location.toString();
    let isProcessing = false;

    // Use MutationObserver for efficient URL change detection
    const observer = new MutationObserver(() => {
        const newUrl = window.location.toString();
        
        if (newUrl !== currentUrl && !isProcessing) {
            currentUrl = newUrl;
            
            if (isWatchPage(newUrl)) {
                isProcessing = true;
                console.log('[Netflix Optimizer] Watch page detected, starting optimization...');
                
                // Delay to allow player to fully initialize
                setTimeout(() => {
                    maxbitrate_start();
                    isProcessing = false;
                }, 2000);
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
        setTimeout(() => {
            maxbitrate_start();
        }, 2000);
    }

    console.log('[Netflix Optimizer] Initialized with MutationObserver');
})();
