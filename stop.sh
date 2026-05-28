#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PID_FILE="$ROOT_DIR/.dev-server.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "CENS Assets Tracker is not running from $PID_FILE."
  exit 0
fi

PID=$(cat "$PID_FILE")
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  echo "Stopped CENS Assets Tracker PID $PID."
else
  echo "No running process found for PID $PID."
fi

rm -f "$PID_FILE"
