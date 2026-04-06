"""
Gamification views — leaderboard and user score.
"""
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.gamification.models import UserScore
from apps.gamification.serializers import UserScoreSerializer


class MyScoreView(generics.RetrieveAPIView):
    """GET /v1/gamification/score/ — Authenticated user's score and badges."""
    serializer_class = UserScoreSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        score, _ = UserScore.objects.get_or_create(user=self.request.user)
        return score


class LeaderboardView(APIView):
    """GET /v1/gamification/leaderboard/ — Top 25 users by points."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        top_scores = (
            UserScore.objects
            .select_related('user')
            .order_by('-total_points')[:25]
        )
        data = [
            {
                'rank': idx + 1,
                'display_name': score.user.display_name or score.user.email or 'Anonymous',
                'avatar_url': score.user.avatar_url,
                'total_points': score.total_points,
            }
            for idx, score in enumerate(top_scores)
        ]
        return Response(data)
