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
4. Click **Load unpacked** → select the unzipped folder

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

## Keyboard Shortcuts (on Netflix watch page)

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+Alt+D` | Debug Info |
| `Ctrl+Shift+Alt+B` | Bitrate Override Menu |

## How It Works

1. **Player core redirect** — uses `declarativeNetRequest` to redirect Netflix's `cadmium-playercore` script to a patched version that unlocks higher quality profiles
2. **Bitrate forcing** — injects a script that simulates the hidden `Ctrl+Alt+Shift+B` menu interaction to select the maximum bitrate automatically
3. **Platform detection** — detects browser/OS combination to report actual achievable quality

## Improvements over New Netflix 1080p (1.33.0_0)

- ✅ Multi-language support (XPath labels in 8 languages)
- ✅ Modern keyboard event API (`code`/`key` + `keyCode` fallback)
- ✅ `MutationObserver` instead of polling interval (better performance)
- ✅ Race condition protection (`isProcessing` lock)
- ✅ React-compatible `change` event dispatch
- ✅ Null-safe cleanup (no crash if style node missing)
- ✅ 4K detection and platform-aware status popup

## Credits

Based on the original work by [truedread](https://github.com/truedread/netflix-1080p) and [jangxx](https://github.com/jangxx/netflix-1080p).
