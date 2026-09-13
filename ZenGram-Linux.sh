#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

if [ -f "$DIR/desktop/node_modules/.bin/electron" ]; then
  "$DIR/desktop/node_modules/.bin/electron" "$DIR/desktop/main.js" --no-sandbox "$@"
elif command -v electron >/dev/null 2>&1; then
  electron "$DIR/desktop/main.js" --no-sandbox "$@"
else
  node "$DIR/bin/zengram.js" "$@"
fi
