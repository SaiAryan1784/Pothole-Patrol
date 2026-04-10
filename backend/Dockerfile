FROM python:3.11-slim

# Runtime-only GDAL/GEOS/PROJ — GeoDjango loads these via ctypes, no headers needed
# libgdal32, libgeos-c1v5, libproj25 are the Debian Bookworm runtime package names
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdal32 \
    libgeos-c1v5 \
    libproj25 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# collectstatic uses a dummy DB and secret — no real connections made at build time
RUN DJANGO_SETTINGS_MODULE=config.settings.production \
    SECRET_KEY=build-time-placeholder \
    DATABASE_URL=sqlite:////tmp/build.db \
    python manage.py collectstatic --noinput

RUN chmod +x /app/start.sh /app/worker.sh

EXPOSE 8000
CMD ["/app/start.sh"]
