#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ENV_FILE="$ROOT_DIR/.env.local"
PID_FILE="$ROOT_DIR/.dev-server.pid"

if [ -f "$ENV_FILE" ]; then
  set -a
  . "$ENV_FILE"
  set +a
fi

FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-5040}"
USE_HTTPS="${USE_HTTPS:-1}"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "CENS Assets Tracker is already running with PID $(cat "$PID_FILE")."
  echo "URL: https://$FRONTEND_HOST:$FRONTEND_PORT"
  exit 0
fi

HTTPS_FLAG=""
SCHEME="http"
if [ "$USE_HTTPS" = "1" ] || [ "$USE_HTTPS" = "true" ]; then
  HTTPS_FLAG="--https"
  SCHEME="https"
fi

nohup python3 "$ROOT_DIR/dev-server.py" $HTTPS_FLAG --host "$FRONTEND_HOST" --port "$FRONTEND_PORT" > "$ROOT_DIR/dev-server.log" 2>&1 &
echo "$!" > "$PID_FILE"

sleep 1
if ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Failed to start CENS Assets Tracker on $SCHEME://$FRONTEND_HOST:$FRONTEND_PORT."
  echo "Recent log output:"
  tail -20 "$ROOT_DIR/dev-server.log" 2>/dev/null || true
  rm -f "$PID_FILE"
  exit 1
fi

echo "Started CENS Assets Tracker with PID $(cat "$PID_FILE")."
echo "URL: $SCHEME://$FRONTEND_HOST:$FRONTEND_PORT"
echo "For phone testing, set FRONTEND_HOST=0.0.0.0 in .env.local and open https://YOUR_LAN_IP:$FRONTEND_PORT."
