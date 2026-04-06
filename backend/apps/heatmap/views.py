"""
Heatmap view — spatial aggregation of verified pothole locations.

GET /v1/heatmap/?lat=<lat>&lng=<lng>&radius=<metres>   (mobile default)
GET /v1/heatmap/?bbox=<min_lon,min_lat,max_lon,max_lat>  (web/legacy)
GET /v1/heatmap/?severity=LOW,HIGH                       (optional filter)

Returns a lightweight list of {latitude, longitude, weight} points
suitable for react-native-maps heatmap overlay.
Weight is derived from upvote count + 1 so all points have a minimum weight.
"""
import logging

from django.contrib.gis.geos import Point, Polygon
from django.contrib.gis.measure import Distance
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.reports.models import Report, STATUS_CHOICES
from apps.reports.serializers import HeatmapPointSerializer

logger = logging.getLogger(__name__)


class HeatmapView(APIView):
    """
    GET /v1/heatmap/
    Accepts either lat/lng/radius (mobile) or bbox (web) for spatial filtering.
    Optional: severity=LOW,MEDIUM,HIGH,CRITICAL (comma-separated)
    Returns up to 500 verified report points for the heatmap layer.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = Report.objects.filter(status=STATUS_CHOICES.VERIFIED)

        # lat/lng/radius path (used by mobile app)
        lat_param = request.query_params.get('lat')
        lng_param = request.query_params.get('lng')
        if lat_param and lng_param:
            try:
                lat = float(lat_param)
                lng = float(lng_param)
                radius = float(request.query_params.get('radius', 5000))
                center = Point(lng, lat, srid=4326)
                queryset = queryset.filter(location__dwithin=(center, Distance(m=radius)))
            except (ValueError, TypeError):
                return Response(
                    {'detail': 'Invalid lat/lng/radius parameters.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # bbox path (web/legacy)
        elif request.query_params.get('bbox'):
            try:
                min_lon, min_lat, max_lon, max_lat = map(float, request.query_params['bbox'].split(','))
                bbox = Polygon.from_bbox((min_lon, min_lat, max_lon, max_lat))
                bbox.srid = 4326
                queryset = queryset.filter(location__within=bbox)
            except (ValueError, TypeError):
                return Response(
                    {'detail': 'Invalid bbox. Expected: min_lon,min_lat,max_lon,max_lat'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # optional severity filter
        severity_param = request.query_params.get('severity')
        if severity_param:
            severities = [s.strip() for s in severity_param.split(',')]
            queryset = queryset.filter(severity__in=severities)

        queryset = queryset.only('location', 'upvotes')[:500]

        points = [
            {
                'latitude': report.location.y,
                'longitude': report.location.x,
                'weight': report.upvotes + 1,
            }
            for report in queryset
        ]

        serializer = HeatmapPointSerializer(points, many=True)
        return Response(serializer.data)
