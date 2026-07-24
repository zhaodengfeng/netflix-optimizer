#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$ROOT_DIR/src"
DIST_DIR="$ROOT_DIR/dist"
VERSION="$(python3 - "$SRC_DIR/manifest.json" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as manifest_file:
    print(json.load(manifest_file)["version"])
PY
)"
PACKAGE="${1:-$DIST_DIR/netflix-optimizer-$VERSION.zip}"
STAGING="$(mktemp -d)"

cleanup() {
    rm -rf "$STAGING"
}
trap cleanup EXIT

mkdir -p "$DIST_DIR"
mkdir -p "$STAGING/img" "$STAGING/pages"

cp "$SRC_DIR/manifest.json" "$STAGING/"
cp "$SRC_DIR/background.js" "$STAGING/"
cp "$SRC_DIR/content_loader.js" "$STAGING/"
cp "$SRC_DIR/netflix_maxrate.js" "$STAGING/"
cp "$SRC_DIR/popup.css" "$STAGING/"
cp "$SRC_DIR/popup.html" "$STAGING/"
cp "$SRC_DIR/popup.js" "$STAGING/"
cp "$SRC_DIR/redirect_rules.json" "$STAGING/"
cp "$SRC_DIR/style_fix.css" "$STAGING/"
cp "$SRC_DIR/playercore-shim.js" "$STAGING/"
cp "$SRC_DIR/img/icon16.png" "$SRC_DIR/img/icon32.png" "$SRC_DIR/img/icon48.png" "$SRC_DIR/img/icon128.png" "$STAGING/img/"
cp "$SRC_DIR/pages/options.html" "$SRC_DIR/pages/options.js" "$STAGING/pages/"

rm -f "$PACKAGE"
(
    cd "$STAGING"
    COPYFILE_DISABLE=1 zip -X -r "$PACKAGE" . >/dev/null
)

unzip -t "$PACKAGE" >/dev/null
echo "$PACKAGE"
