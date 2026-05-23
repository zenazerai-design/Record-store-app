#!/bin/bash
cd "$(dirname "$0")"
PORT=8000
if lsof -i ":$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  open "http://localhost:$PORT/home.html"
  exit 0
fi
python3 -m http.server "$PORT" >/dev/null 2>&1 &
sleep 0.5
open "http://localhost:$PORT/home.html"
