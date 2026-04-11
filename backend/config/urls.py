"""
Root URL configuration for the Pothole Patrol project.
Includes all app-specific URLs under the /v1/ API prefix.
Also provides OpenAPI schema documentation via drf-spectacular.
"""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from apps.reports.views import StatsView


def health_check(_request):
    return JsonResponse({'status': 'ok', 'service': 'pothole-patrol-api'})


urlpatterns = [
    path('health/', health_check, name='health-check'),
    path('admin/', admin.site.urls),

    # API v1 Versioning
    path('v1/stats/', StatsView.as_view(), name='stats'),
    path('v1/accounts/', include('apps.accounts.urls')),
    path('v1/reports/', include('apps.reports.urls')),
    path('v1/heatmap/', include('apps.heatmap.urls')),
    path('v1/gamification/', include('apps.gamification.urls')),
    path('v1/notifications/', include('apps.notifications.urls')),
    path('v1/civic/', include('apps.civic.urls')),

    # OpenAPI Schema / Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
