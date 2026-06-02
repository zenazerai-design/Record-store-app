#!/bin/bash
cd "$(dirname "$0")"
PORT=8000
URL="http://localhost:$PORT/home.html"

if lsof -i ":$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Server already running on port $PORT"
  open "$URL"
  exit 0
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 not found. Install Python 3 or run from Terminal:"
  echo '  cd "' "$(pwd)" '" && python3 -m http.server 8000'
  read -r -p "Press Enter to close…"
  exit 1
fi

echo "Starting local site at http://localhost:$PORT"
echo "Keep this window open while you browse. Press Ctrl+C to stop."
open "$URL"
exec python3 -m http.server "$PORT"
