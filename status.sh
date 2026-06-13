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
BACKEND_PORT="${BACKEND_PORT:-8040}"

echo "CENS Assets Tracker"
echo "Frontend: $FRONTEND_HOST:$FRONTEND_PORT"
echo "Backend reserved: $BACKEND_PORT"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Status: running, PID $(cat "$PID_FILE")"
elif command -v curl >/dev/null 2>&1 && curl -k -fsI "https://$FRONTEND_HOST:$FRONTEND_PORT" >/dev/null 2>&1; then
  echo "Status: responding on https://$FRONTEND_HOST:$FRONTEND_PORT"
elif command -v curl >/dev/null 2>&1 && curl -fsI "http://$FRONTEND_HOST:$FRONTEND_PORT" >/dev/null 2>&1; then
  echo "Status: responding on http://$FRONTEND_HOST:$FRONTEND_PORT"
else
  echo "Status: stopped"
fi
