"""
Geo utility helpers for ward/jurisdiction lookup.
"""
import logging
import urllib.parse
import urllib.request
import json

from django.conf import settings

logger = logging.getLogger(__name__)


def get_ward_for_location(lat: float, lng: float) -> str | None:
    """
    Look up the administrative ward name for a lat/lng coordinate using
    Google Maps Geocoding API (administrative_area_level_3).

    Returns the ward name string or None on failure / missing API key.
    """
    api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', '')
    if not api_key:
        logger.warning('GOOGLE_MAPS_API_KEY not set — skipping ward lookup')
        return None

    params = urllib.parse.urlencode({'latlng': f'{lat},{lng}', 'key': api_key})
    url = f'https://maps.googleapis.com/maps/api/geocode/json?{params}'

    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())

        if data.get('status') != 'OK':
            logger.debug('Geocode API returned status %s for (%s, %s)', data.get('status'), lat, lng)
            return None

        for result in data.get('results', []):
            for component in result.get('address_components', []):
                if 'administrative_area_level_3' in component.get('types', []):
                    return component.get('long_name')

    except Exception as exc:
        logger.warning('Ward lookup failed for (%s, %s): %s', lat, lng, exc)

    return None
