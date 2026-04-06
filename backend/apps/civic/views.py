"""
Civic body views.

GET /v1/civic/bodies/     — List active civic bodies (authenticated).
GET /v1/civic/export/     — Staff-only CSV export of verified reports.
"""
import csv
import logging
from datetime import datetime

from django.http import StreamingHttpResponse
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.serializers import ModelSerializer
from rest_framework.views import APIView

from apps.civic.models import CivicBody
from apps.reports.models import Report, STATUS_CHOICES

logger = logging.getLogger(__name__)

GOOGLE_MAPS_BASE = 'https://www.google.com/maps?q='


class CivicBodySerializer(ModelSerializer):
    class Meta:
        model = CivicBody
        fields = ['id', 'name', 'contact_email', 'webhook_url', 'is_active']


class CivicBodyListView(generics.ListAPIView):
    """GET /v1/civic/bodies/ — List active civic bodies."""
    serializer_class = CivicBodySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CivicBody.objects.filter(is_active=True).order_by('name')


class _EchoWriter:
    """Minimal pseudo-buffer that returns what is written for StreamingHttpResponse."""
    def write(self, value):
        return value


def _report_rows(queryset):
    """Generator yielding CSV rows for a queryset of verified reports."""
    writer = csv.writer(_EchoWriter())
    yield writer.writerow([
        'report_id', 'severity', 'confidence', 'latitude', 'longitude',
        'maps_url', 'reported_at', 'status',
    ])
    for report in queryset.iterator():
        lat = report.location.y
        lng = report.location.x
        yield writer.writerow([
            report.id,
            report.severity,
            round(report.confidence, 4),
            lat,
            lng,
            f'{GOOGLE_MAPS_BASE}{lat},{lng}',
            report.created_at.isoformat(),
            report.status,
        ])


class CivicExportView(APIView):
    """
    GET /v1/civic/export/ — Staff-only CSV export of verified reports.
    Optional filters: ?since=<ISO-date>  ?civic_body_id=<id>
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        queryset = Report.objects.filter(status=STATUS_CHOICES.VERIFIED).order_by('created_at')

        since_param = request.query_params.get('since')
        if since_param:
            try:
                since_dt = datetime.fromisoformat(since_param)
                queryset = queryset.filter(created_at__gte=since_dt)
            except ValueError:
                pass

        civic_body_id = request.query_params.get('civic_body_id')
        if civic_body_id:
            try:
                civic_body = CivicBody.objects.get(pk=civic_body_id, is_active=True)
                if civic_body.region_boundary:
                    queryset = queryset.filter(location__within=civic_body.region_boundary)
            except CivicBody.DoesNotExist:
                pass

        response = StreamingHttpResponse(
            _report_rows(queryset),
            content_type='text/csv',
        )
        response['Content-Disposition'] = 'attachment; filename="pothole_reports.csv"'
        return response
