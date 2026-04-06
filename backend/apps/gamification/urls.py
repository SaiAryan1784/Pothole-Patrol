from django.urls import path
from apps.gamification.views import MyScoreView, LeaderboardView

urlpatterns = [
    path('score/', MyScoreView.as_view(), name='gamification-score'),
    path('leaderboard/', LeaderboardView.as_view(), name='gamification-leaderboard'),
]
