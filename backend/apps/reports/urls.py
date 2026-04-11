from django.urls import path
from apps.reports.views import (
    ReportListCreateView, ReportDetailView, ReportUpvoteView,
    NearbyReportsView, FeedView,
)

urlpatterns = [
    path('', ReportListCreateView.as_view(), name='reports-list-create'),
    path('feed/', FeedView.as_view(), name='reports-feed'),
    path('nearby/', NearbyReportsView.as_view(), name='reports-nearby'),
    path('<int:pk>/', ReportDetailView.as_view(), name='reports-detail'),
    path('<int:pk>/upvote/', ReportUpvoteView.as_view(), name='reports-upvote'),
]
