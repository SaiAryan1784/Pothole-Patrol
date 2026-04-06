from django.urls import path
from apps.heatmap.views import HeatmapView

urlpatterns = [
    path('', HeatmapView.as_view(), name='heatmap'),
]
