#!/bin/sh
set -eu
cd "$(dirname "$0")"
PORT="${1:-8000}"
exec python3 -m http.server "$PORT"
