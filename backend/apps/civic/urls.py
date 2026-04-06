from django.urls import path
from apps.civic.views import CivicBodyListView, CivicExportView

urlpatterns = [
    path('bodies/', CivicBodyListView.as_view(), name='civic-bodies'),
    path('export/', CivicExportView.as_view(), name='civic-export'),
]
