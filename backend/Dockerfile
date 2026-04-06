FROM python:3.11-slim

# GDAL, GEOS, PROJ — required for GeoDjango PostGIS spatial queries
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    binutils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Collect static files at build time using a dummy SECRET_KEY and sqlite DB
# (no real DB or Firebase needed for collectstatic)
RUN DJANGO_SETTINGS_MODULE=config.settings.production \
    SECRET_KEY=build-time-placeholder \
    DATABASE_URL=sqlite:////tmp/build.db \
    python manage.py collectstatic --noinput

RUN chmod +x /app/start.sh

EXPOSE 8000

CMD ["/app/start.sh"]
