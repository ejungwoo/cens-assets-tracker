#!/usr/bin/env sh
# Portal entry point for the asset_manager managed service.
#
# Rebuilds the Vite app (src-lilak/ -> dist/) on every start, then serves dist/,
# so a portal "stop & start" picks up source changes without a manual build.
# The rebuild is NON-FATAL: if npm is missing or the build fails, we fall back to
# serving whatever is already in dist/ — a stale UI beats a dead service.
#
# Invoked by data/asset_manager/service.json as: sh portal-serve.sh {port}
set -u

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PORT="${1:-${PORT:-8040}}"

if command -v npm >/dev/null 2>&1; then
  LILAK_UI_PATH="${LILAK_UI_PATH:-$ROOT_DIR/../lilak_ui}" \
    npm --prefix "$ROOT_DIR" run build \
    || echo "[portal-serve] build failed; serving existing dist/" >&2
else
  echo "[portal-serve] npm not on PATH; serving existing dist/" >&2
fi

exec python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$ROOT_DIR/dist"
