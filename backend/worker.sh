#!/bin/bash
set -e

# Run migrations before starting worker so the schema is always current.
# Django's migration runner holds a DB-level lock, so running it here in
# addition to start.sh is safe even when both services start concurrently.
echo "Worker: running database migrations..."
python manage.py migrate --noinput

echo "Starting Celery worker..."
exec celery -A config worker \
  --loglevel=info \
  --concurrency=2 \
  --without-heartbeat \
  --without-gossip
