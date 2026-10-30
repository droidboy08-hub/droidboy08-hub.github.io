#!/bin/bash
# Stamp the CSS and JS links with a hash of their contents, so a local preview
# never shows a cached copy of either. deploy.sh does the same before upload.
set -euo pipefail
cd "$(dirname "$0")/.."
CSS=$(md5 -q assets/site.css | cut -c1-8)
JS=$(md5 -q assets/site.js | cut -c1-8)
for f in index.html 404.html privacy/index.html support/index.html changelog/index.html terms/index.html; do
  sed -i '' -E "s|(/assets/site\.css)(\?v=[a-f0-9]+)?|\1?v=$CSS|g" "$f"
  sed -i '' -E "s|(/assets/site\.js)(\?v=[a-f0-9]+)?|\1?v=$JS|g" "$f"
done
echo "stamped css v=$CSS  js v=$JS"
