// playercore-shim.js - Netflix Optimizer
// Runs in the page context AS the cadmium-playercore script (the request is
// redirected here by declarativeNetRequest). It fetches the original
// playercore from Netflix's CDN, applies regex patches at runtime, and
// executes the patched source. Inspired by DavidBuchanan314/Turbo-Recadmiumator.
//
// Advantages over shipping a pre-patched playercore:
// - No Netflix proprietary code bundled with the extension.
// - Survives most playercore version bumps (patches are structural regexes).
// - Any failure degrades to the UNPATCHED original, so playback never breaks
//   because of the extension (worst case: stock 720p/1080p behavior).

(function () {
    var TAG = '[Netflix Optimizer]';
    var BYPASS_PARAM = 'nfopt_orig=1';

    var DEFAULT_SETTINGS = {
        use6Channels: true,
        setMaxBitrate: true,
        disableVP9: false,
        disableAVChigh: false,
        disableAV1: false,
        showAllSubs: false,
        useHEVC: false,
        useDDPlus: false
    };

    /**
     * Read settings lazily from the element injected by content_loader.js.
     * Called at manifest-request time (not at script load), which removes the
     * settings-injection race entirely: by the time Netflix builds a manifest
     * request, the settings element has long been injected.
     */
    function readSettings() {
        var settings = {};
        try {
            var el = document.getElementById('netflix-optimizer-settings') ||
                     document.getElementById('netflix-1080p-settings');
            if (el && el.textContent) {
                settings = JSON.parse(el.textContent);
            }
        } catch (e) { /* fall through to defaults */ }
        var merged = {};
        for (var key in DEFAULT_SETTINGS) {
            merged[key] = settings.hasOwnProperty(key) ? settings[key] : DEFAULT_SETTINGS[key];
        }
        return merged;
    }

    /**
     * Build the playback profile list for manifest requests.
     * Mirrors the previously bundled patched playercore, plus optional
     * HEVC (4K/HDR) and Dolby Digital Plus / Atmos profiles.
     */
    function buildProfiles() {
        var s = readSettings();
        var profiles = [
            'playready-h264mpl30-dash',
            'playready-h264mpl31-dash',
            'playready-h264mpl40-dash',
            'heaac-2-dash',
            'heaac-2hq-dash',
            'dfxp-ls-sdh',
            'simplesdh',
            'nflx-cmisc',
            'imsc1.1',
            'BIF240',
            'BIF320'
        ];

        if (!s.disableVP9) {
            profiles.push(
                'vp9-profile0-L21-dash-cenc',
                'vp9-profile0-L30-dash-cenc',
                'vp9-profile0-L31-dash-cenc',
                'vp9-profile0-L40-dash-cenc'
            );
        }

        if (s.use6Channels) {
            profiles.push('heaac-5.1-dash');
        }

        if (!s.disableAVChigh) {
            profiles.push(
                'playready-h264hpl30-dash',
                'playready-h264hpl31-dash',
                'playready-h264hpl40-dash',
                'h264hpl30-dash-playready-live',
                'h264hpl31-dash-playready-live',
                'h264hpl40-dash-playready-live',
                'h264mpl30-dash-playready-prk-qc',
                'h264mpl31-dash-playready-prk-qc',
                'h264mpl40-dash-playready-prk-qc'
            );
        }

        if (!s.disableAV1) {
            profiles.push(
                'av1-main-L20-dash-cbcs-prk',
                'av1-main-L21-dash-cbcs-prk',
                'av1-main-L30-dash-cbcs-prk',
                'av1-main-L31-dash-cbcs-prk',
                'av1-main-L40-dash-cbcs-prk',
                'av1-main-L41-dash-cbcs-prk',
                'av1-main-L50-dash-cbcs-prk',
                'av1-main-L51-dash-cbcs-prk'
            );
        }

        // Experimental: HEVC up to 4K, HDR10 via PlayReady (Win11 + Edge).
        // Whether 4K/HDR is actually served is decided server-side by DRM
        // level (PlayReady SL3000), plan and title availability.
        if (s.useHEVC) {
            profiles.push(
                'hevc-main10-L40-dash-cenc',
                'hevc-main10-L41-dash-cenc',
                'hevc-main10-L50-dash-cenc',
                'hevc-main10-L51-dash-cenc',
                'hevc-hdr-main10-L50-dash-cenc-prk',
                'hevc-hdr-main10-L51-dash-cenc-prk',
                'hevc-hdr-main10-L50-dash-cenc-prk-do',
                'hevc-hdr-main10-L51-dash-cenc-prk-do'
            );
        }

        // Experimental: Dolby Digital Plus 5.1 / Atmos (Win11 + Edge).
        if (s.useDDPlus) {
            profiles.push(
                'ddplus-5.1-dash',
                'ddplus-5.1hq-dash',
                'ddplus-atmos-dash'
            );
        }

        return profiles;
    }

    // Invoked by the patched playercore at manifest-request time.
    window.__nfoptProfiles = buildProfiles;
    window.__nfoptShowAllSubs = function () {
        return !!readSettings().showAllSubs;
    };

    // Named regex patches. Needles are structural (single-char variable
    // wildcards) and whitespace-tolerant so they survive playercore rebuilds
    // that rename locals or change spacing.
    var PATCHES = [
        {
            name: 'standard manifest profiles',
            // e.g. "viewableId:C,profiles:G," -> "viewableId:C,profiles:window.__nfoptProfiles(),"
            needle: /(viewableId\s*:\s*.\s*,\s*profiles\s*:\s*).,/,
            replacement: '$1window.__nfoptProfiles(),'
        },
        {
            name: 'default profile group',
            // e.g. 'name:"default",profiles:G}' -> 'name:"default",profiles:window.__nfoptProfiles()}'
            needle: /(name\s*:\s*"default"\s*,\s*profiles\s*:\s*)[A-Za-z_$][\w$]*(\s*\})/,
            replacement: '$1window.__nfoptProfiles()$2'
        },
        {
            name: 'show all sub/dub tracks',
            // e.g. "!!A.showAllSubDubTracks" -> "!!A.showAllSubDubTracks||window.__nfoptShowAllSubs()"
            needle: /(!!.\.showAllSubDubTracks)(?!\s*\|\|)/,
            replacement: '$1||window.__nfoptShowAllSubs()'
        },
        {
            name: 'diagnostics menu (config default)',
            // e.g. 'Hja:F(L,H("renderDomDiagnostics"),!1)' -> default !0.
            // The hidden bitrate/CDN menu (Ctrl+Shift+Alt+B) is only built
            // when the renderDomDiagnostics config flag is on; the bundled
            // patched playercore used to force it on. Restore that, because
            // the auto max-bitrate feature drives this menu — without it both
            // the shortcut and the automation silently die.
            needle: /([A-Za-z_$][\w$]*\(\s*"renderDomDiagnostics"\s*\)\s*,\s*)![01]/,
            replacement: '$1!0'
        },
        {
            name: 'diagnostics menu (config getter)',
            // e.g. t.__decorate([c.config(c.Bd,"renderDomDiagnostics")],g.prototype,"Hja",null)
            // -> append the same always-true getter override the bundled
            // patched playercore shipped.
            needle: /(?:[A-Za-z_$][\w$]*\.)?__decorate\(\s*\[[A-Za-z_$][\w$]*\.config\([A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*\s*,\s*"renderDomDiagnostics"\s*\)\s*\]\s*,\s*([A-Za-z_$][\w$]*)\.prototype\s*,\s*"([A-Za-z_$][\w$]*)"\s*,\s*null\s*\)/,
            replacement: '$&;Object.defineProperty($1.prototype,"$2",{configurable:!0,enumerable:!0,get:function(){return!0}});'
        },
        {
            name: 'bitrate menu for all accounts',
            // e.g. "keyCode == g.IZ.Lma && this.Jfa.Z2a && this.toggle()"
            // -> "keyCode == g.IZ.Lma && this.toggle()".
            // Newer playercores only toggle the bitrate menu when the
            // isTestAccount config flag is set (Netflix-internal accounts).
            // Drop that condition; do NOT force isTestAccount itself, which
            // would tag the account as a tester in Netflix telemetry.
            needle: /(keyCode\s*==\s*[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*)\s*&&\s*this\.[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*(\s*&&\s*this\.toggle\(\))/,
            replacement: '$1$2'
        }
    ];

    function applyPatches(source) {
        var patched = source;
        var applied = 0;
        for (var i = 0; i < PATCHES.length; i++) {
            var p = PATCHES[i];
            if (p.needle.test(patched)) {
                patched = patched.replace(p.needle, p.replacement);
                applied++;
                console.log(TAG + ' Patch applied: ' + p.name);
            } else {
                // Loud by design: a missed patch means Netflix changed the
                // playercore structure; the feature degrades but playback
                // must keep working.
                console.warn(TAG + ' Patch NOT found (feature degraded): ' + p.name);
            }
        }
        return { source: patched, applied: applied, total: PATCHES.length };
    }

    function executeSource(source) {
        // Indirect eval executes in global scope, like a classic script.
        (0, eval)(source);
    }

    function withBypassParam(url) {
        return url + (url.indexOf('?') === -1 ? '?' : '&') + BYPASS_PARAM;
    }

    /**
     * Load the original playercore source synchronously. Synchronous because
     * the page expects this script to finish initializing the player core
     * before subsequent scripts run (same contract as the original script).
     */
    function fetchOriginalSync(url) {
        var request = new XMLHttpRequest();
        request.open('GET', withBypassParam(url), false); // synchronous
        request.send(null);
        if (request.status >= 200 && request.status < 300 && request.responseText) {
            return request.responseText;
        }
        throw new Error('HTTP ' + request.status);
    }

    /**
     * Last-resort fallback: inject the untouched original as a plain script
     * tag so Netflix works exactly as if the extension were not installed.
     */
    function injectOriginalScript(url) {
        var el = document.createElement('script');
        el.src = withBypassParam(url);
        el.async = false;
        document.documentElement.appendChild(el);
        console.warn(TAG + ' Falling back to unpatched playercore');
    }

    function findOriginalUrl() {
        // The DNR redirect rewrites the network request, not the DOM, so our
        // own script element still carries the original playercore URL.
        if (document.currentScript && document.currentScript.src &&
            /cadmium-playercore/.test(document.currentScript.src)) {
            return document.currentScript.src;
        }
        var scripts = document.getElementsByTagName('script');
        for (var i = scripts.length - 1; i >= 0; i--) {
            if (scripts[i].src && /cadmium-playercore/.test(scripts[i].src)) {
                return scripts[i].src;
            }
        }
        return null;
    }

    function main() {
        var originalUrl = findOriginalUrl();
        if (!originalUrl) {
            console.warn(TAG + ' Could not locate original playercore URL, doing nothing');
            return;
        }

        var originalSource;
        try {
            originalSource = fetchOriginalSync(originalUrl);
        } catch (e) {
            console.error(TAG + ' Failed to fetch original playercore:', e);
            injectOriginalScript(originalUrl);
            return;
        }

        var result;
        try {
            result = applyPatches(originalSource);
        } catch (e) {
            console.error(TAG + ' Patching failed:', e);
            result = { source: originalSource, applied: 0, total: PATCHES.length };
        }

        try {
            executeSource(result.source);
            console.log(TAG + ' Playercore loaded (' + result.applied + '/' + result.total + ' patches applied)');
        } catch (e) {
            console.error(TAG + ' Patched playercore failed to execute:', e);
            // Do NOT try the original again here: the eval may have partially
            // run, and re-executing the full source could be worse. The user
            // can still reload.
        }
    }

    main();
})();
