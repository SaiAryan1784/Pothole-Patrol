#!/bin/bash
set -e

# Start a lightweight HTTP health check server in the background so Railway's
# health check at GET /health receives a 200 OK response.  The server listens
# on PORT (default 8000) and exits automatically when the Celery process ends.
python -c "
import os, signal, sys
from http.server import BaseHTTPRequestHandler, HTTPServer

class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'OK')
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # suppress access logs to keep worker output clean

port = int(os.environ.get('PORT', 8000))
server = HTTPServer(('0.0.0.0', port), HealthHandler)
server.serve_forever()
" &
HEALTH_SERVER_PID=$!

# Ensure the health check server is cleaned up when this script exits.
trap "kill \$HEALTH_SERVER_PID 2>/dev/null || true" EXIT

echo "Health check server started on port ${PORT:-8000} (pid $HEALTH_SERVER_PID)"

exec celery -A config worker \
  --loglevel=info \
  --concurrency=2 \
  --without-heartbeat \
  --without-gossip
