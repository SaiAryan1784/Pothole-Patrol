from django.urls import path
from apps.reports.views import ReportListCreateView, ReportDetailView, ReportUpvoteView, NearbyReportsView

urlpatterns = [
    path('', ReportListCreateView.as_view(), name='reports-list-create'),
    path('nearby/', NearbyReportsView.as_view(), name='reports-nearby'),
    path('<int:pk>/', ReportDetailView.as_view(), name='reports-detail'),
    path('<int:pk>/upvote/', ReportUpvoteView.as_view(), name='reports-upvote'),
]
