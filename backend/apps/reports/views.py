"""
Report views.

POST /v1/reports/          — Submit a new pothole report.
GET  /v1/reports/          — List authenticated user's own reports.
GET  /v1/reports/<id>/     — Retrieve a single report.
POST /v1/reports/<id>/upvote/ — Upvote an existing verified report.

Rate limiting (20 reports/user/day) is enforced via ReportRateLimit permission.
Deduplication: before creating, checks for existing verified reports within 50m.
"""
import logging

from django.conf import settings
from django.db.models import Sum
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.reports.models import Report, Upvote, STATUS_CHOICES
from apps.reports.serializers import ReportSerializer, ReportCreateSerializer
from apps.reports.permissions import AnonDailyRateLimit
from apps.reports.tasks import process_report_ml

logger = logging.getLogger(__name__)

DEDUP_RADIUS_METRES = 50


class ReportListCreateView(generics.ListCreateAPIView):
    """
    GET  /v1/reports/  — List of all verified reports (public).
    POST /v1/reports/  — Submit a new anonymous report. Triggers ML task after creation.
    """
    permission_classes = [AnonDailyRateLimit]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ReportCreateSerializer
        return ReportSerializer

    def get_queryset(self):
        return Report.objects.filter(status=STATUS_CHOICES.VERIFIED).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        # Upload image to Cloudinary first
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'detail': 'image file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            import cloudinary.uploader
            upload_result = cloudinary.uploader.upload(
                image_file,
                folder='pothole-patrol',
                resource_type='image',
            )
            image_url = upload_result['secure_url']
        except Exception as exc:
            logger.error('Cloudinary upload failed: %s', exc)
            return Response({'detail': 'Image upload failed. Try again.'}, status=status.HTTP_502_BAD_GATEWAY)

        data = request.data.dict() if hasattr(request.data, 'dict') else dict(request.data)
        data['image_url'] = image_url

        serializer = ReportCreateSerializer(data=data)
        serializer.is_valid(raise_exception=True)

        # --- Deduplication: check for verified reports within 50 metres ---
        from django.contrib.gis.geos import Point
        from django.contrib.gis.measure import Distance

        location = Point(
            serializer.validated_data['longitude'],
            serializer.validated_data['latitude'],
            srid=4326,
        )
        nearby = Report.objects.filter(
            status=STATUS_CHOICES.VERIFIED,
            location__dwithin=(location, Distance(m=DEDUP_RADIUS_METRES)),
        ).first()

        if nearby:
            nearby.upvotes += 1
            nearby.save(update_fields=['upvotes', 'updated_at'])
            return Response(
                {'detail': 'Nearby report upvoted.', 'report': ReportSerializer(nearby).data},
                status=status.HTTP_200_OK,
            )

        report = serializer.save(
            user=request.user if request.user.is_authenticated else None
        )

        # Trigger async ML confidence routing
        process_report_ml.delay(report.pk)

        data = ReportSerializer(report).data
        headers = self.get_success_headers(data)
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)


class ReportDetailView(generics.RetrieveAPIView):
    """GET /v1/reports/<id>/"""
    serializer_class = ReportSerializer
    permission_classes = [AllowAny]
    queryset = Report.objects.all()


class NearbyReportsView(generics.ListAPIView):
    """
    GET /v1/reports/nearby/?lat=<lat>&lng=<lng>&radius=<metres>
    Returns verified reports near a point. Used to render map markers.
    """
    serializer_class = ReportSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        from django.contrib.gis.geos import Point
        from django.contrib.gis.measure import Distance

        try:
            lat = float(self.request.query_params.get('lat', 0))
            lng = float(self.request.query_params.get('lng', 0))
            radius = float(self.request.query_params.get('radius', 5000))
        except (ValueError, TypeError):
            return Report.objects.none()

        center = Point(lng, lat, srid=4326)
        return (
            Report.objects
            .filter(status=STATUS_CHOICES.VERIFIED, location__dwithin=(center, Distance(m=radius)))
            .only('id', 'user', 'location', 'image_url', 'severity', 'status', 'confidence', 'upvotes', 'created_at', 'updated_at')
            .order_by('-upvotes')[:100]
        )


class ReportUpvoteView(APIView):
    """POST /v1/reports/<pk>/upvote/ — Upvote a report the user didn't author."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            report = Report.objects.get(pk=pk)
        except Report.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if report.user == request.user:
            return Response({'detail': 'You cannot upvote your own report.'}, status=status.HTTP_400_BAD_REQUEST)

        _, created = Upvote.objects.get_or_create(user=request.user, report=report)
        if created:
            report.upvotes += 1
            report.save(update_fields=['upvotes', 'updated_at'])

        return Response({'upvotes': report.upvotes}, status=status.HTTP_200_OK)


class FeedPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50


class FeedView(generics.ListAPIView):
    """
    GET /v1/reports/feed/

    Paginated feed of verified reports, newest first.
    Optional filters:
      ?city=Delhi
      ?severity=LOW,MEDIUM,HIGH,CRITICAL  (comma-separated)
    """
    serializer_class = ReportSerializer
    permission_classes = [AllowAny]
    pagination_class = FeedPagination

    def get_queryset(self):
        qs = Report.objects.filter(status=STATUS_CHOICES.VERIFIED)

        city = self.request.query_params.get('city')
        if city:
            qs = qs.filter(city__iexact=city)

        severity_param = self.request.query_params.get('severity')
        if severity_param:
            severities = [s.strip().upper() for s in severity_param.split(',') if s.strip()]
            if severities:
                qs = qs.filter(severity__in=severities)

        sort = self.request.query_params.get('sort', 'latest')
        if sort == 'popular':
            qs = qs.order_by('-upvotes', '-created_at')
        else:
            qs = qs.order_by('-created_at')

        return qs


@method_decorator(cache_page(300), name='dispatch')
class StatsView(APIView):
    """
    GET /v1/stats/

    Public endpoint returning platform-wide aggregate statistics.
    Response is cached for 5 minutes.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from apps.accounts.models import CustomUser

        total_users = CustomUser.objects.count()
        verified_reports = Report.objects.filter(status=STATUS_CHOICES.VERIFIED).count()
        total_reports = Report.objects.count()
        cities_covered = (
            Report.objects
            .filter(status=STATUS_CHOICES.VERIFIED)
            .exclude(city='')
            .values('city')
            .distinct()
            .count()
        )
        total_upvotes = Report.objects.aggregate(total=Sum('upvotes'))['total'] or 0

        return Response({
            'total_users': total_users,
            'verified_reports': verified_reports,
            'total_reports': total_reports,
            'cities_covered': cities_covered,
            'total_upvotes': total_upvotes,
        })
