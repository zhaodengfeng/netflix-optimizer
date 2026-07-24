# Netflix Optimizer — 4K/1080p + 5.1

A Chrome/Edge extension to unlock the best possible Netflix playback quality on your browser and platform.

## Features

- **4K HDR** on Windows + Edge
- **1080p** on Mac/Chrome, Linux/Chrome, Windows/Chrome
- **5.1 audio** on all supported platforms
- Auto-selects the highest available bitrate at playback start
- Platform capability detection with status popup
- Configurable options (VP9, AV1, AVChigh, subtitle tracks)

## Installation

1. Download the latest zip from [Releases](../../releases)
2. Unzip to a folder
3. Open Chrome → `chrome://extensions` → Enable **Developer mode**
4. Click **Load unpacked** → select the `src` folder

## Platform Support

| Platform | Max Resolution | Audio |
|----------|---------------|-------|
| Windows + Edge | **4K HDR** | 5.1 |
| Windows + Chrome | 1080p | 5.1 |
| Mac + Chrome | 1080p | 5.1 |
| Mac + Edge | 1080p | 5.1 |
| Linux + Chrome | 1080p | 5.1 |

## Options

Right-click the extension icon → **Options** to configure:

- ✅ Use 5.1 audio when available
- ✅ Automatically select best bitrate
- ☐ Disable VP9 codec
- ☐ Disable AVChigh codec
- ☐ Disable AV1 codec
- ☐ Show all subtitle tracks
- ☐ HEVC / 4K HDR (experimental, Windows 11 + Edge)
- ☐ Dolby Digital Plus / Atmos (experimental, Windows 11 + Edge)

> "Automatically select best bitrate" applies instantly. Codec / 5.1 / subtitle / experimental changes apply after reloading the Netflix tab.

## Keyboard Shortcuts (on Netflix watch page)

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+Alt+D` | Debug Info |
| `Ctrl+Shift+Alt+B` | Bitrate Override Menu |

## Packaging

Run `./scripts/package.sh` to create a clean release zip from the `src` folder.

## How It Works

1. **Runtime player patching** — `declarativeNetRequest` redirects Netflix's `cadmium-playercore` script request to a tiny bundled shim (`playercore-shim.js`). The shim fetches the *original* playercore from Netflix's CDN, applies structural regex patches at runtime (quality/audio profiles, subtitle tracks), and executes the patched source. No Netflix code is bundled with the extension, most playercore version bumps are absorbed automatically, and any failure degrades to the unpatched player instead of breaking playback
2. **Bitrate forcing** — injects a script that waits for actual playback start (via the player API), then simulates the hidden `Ctrl+Alt+Shift+B` menu interaction to select the maximum bitrate automatically
3. **Platform detection** — detects browser/OS combination to report actual achievable quality
