#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
PORT="${PORT:-3001}"
mkdir -p "$LOG_DIR"

cd "$PROJECT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js non esta instalado ou non esta no PATH."
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Instalando dependencias..."
  npm install
fi

if [[ -f "$LOG_DIR/node.pid" ]]; then
  OLD_PID="$(cat "$LOG_DIR/node.pid" 2>/dev/null || true)"
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Cadros2 xa parece estar activo no PID $OLD_PID."
    exit 0
  fi
fi

LOCAL_IP="$(ipconfig getifaddr en0 2>/dev/null || true)"
if [[ -z "$LOCAL_IP" ]]; then
  LOCAL_IP="$(ipconfig getifaddr en1 2>/dev/null || true)"
fi
if [[ -z "$LOCAL_IP" ]]; then
  LOCAL_IP="localhost"
fi

PORT="$PORT" node server.js >> "$LOG_DIR/node.log" 2>&1 &
PID=$!
echo "$PID" > "$LOG_DIR/node.pid"

echo ""
echo "CADROS2 activo"
echo ""
echo "Control : http://$LOCAL_IP:$PORT/control"
echo "Piano   : http://$LOCAL_IP:$PORT/performer/piano"
echo "Frauta  : http://$LOCAL_IP:$PORT/performer/flute"
echo "Viola   : http://$LOCAL_IP:$PORT/performer/viola"
echo "Todas   : http://$LOCAL_IP:$PORT/performer/all"
echo "Stage   : http://$LOCAL_IP:$PORT/stage"
echo "Admin   : http://$LOCAL_IP:$PORT/admin"
echo ""
echo "Log     : $LOG_DIR/node.log"
echo "Parar   : ./parar.sh"
echo ""
