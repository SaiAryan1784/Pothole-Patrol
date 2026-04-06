from django.urls import path
from apps.notifications.views import FCMDeviceCreateView

urlpatterns = [
    path('devices/', FCMDeviceCreateView.as_view(), name='notification-device-create'),
]
