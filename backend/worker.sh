#!/bin/bash
set -e
exec celery -A config worker \
  --loglevel=info \
  --concurrency=2 \
  --without-heartbeat \
  --without-gossip
