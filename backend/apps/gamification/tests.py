"""Tests for the gamification app."""
import pytest

from apps.gamification.models import Badge, UserScore


@pytest.mark.django_db
class TestMyScoreView:
    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.get('/v1/gamification/score/')
        assert response.status_code == 401

    def test_returns_score_shape(self, auth_client):
        response = auth_client.get('/v1/gamification/score/')
        assert response.status_code == 200
        data = response.json()
        assert 'total_points' in data
        assert 'badges' in data
        assert isinstance(data['badges'], list)

    def test_returns_zero_points_for_new_user(self, auth_client):
        response = auth_client.get('/v1/gamification/score/')
        assert response.json()['total_points'] == 0


@pytest.mark.django_db
class TestLeaderboardView:
    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.get('/v1/gamification/leaderboard/')
        assert response.status_code == 401

    def test_returns_list_with_expected_fields(self, auth_client, user):
        UserScore.objects.create(user=user, total_points=50)
        response = auth_client.get('/v1/gamification/leaderboard/')
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        entry = data[0]
        assert 'rank' in entry
        assert 'display_name' in entry
        assert 'avatar_url' in entry
        assert 'total_points' in entry

    def test_ordered_by_points_descending(self, auth_client, user, other_user):
        UserScore.objects.create(user=user, total_points=100)
        UserScore.objects.create(user=other_user, total_points=200)
        response = auth_client.get('/v1/gamification/leaderboard/')
        data = response.json()
        assert data[0]['total_points'] >= data[1]['total_points']


@pytest.mark.django_db
class TestBadgeUnlock:
    def test_badge_unlocked_when_points_threshold_reached(self, user):
        badge = Badge.objects.create(name='First Report', description='', required_points=10)
        score, _ = UserScore.objects.get_or_create(user=user)
        score.total_points = 10
        score.save()
        new_badges = Badge.objects.filter(required_points__lte=score.total_points).exclude(
            id__in=score.badges.values_list('id', flat=True)
        )
        score.badges.add(*new_badges)
        score.refresh_from_db()
        assert score.badges.filter(pk=badge.pk).exists()

    def test_badge_not_unlocked_below_threshold(self, user):
        badge = Badge.objects.create(name='Power User', description='', required_points=100)
        score, _ = UserScore.objects.get_or_create(user=user)
        score.total_points = 10
        score.save()
        assert not score.badges.filter(pk=badge.pk).exists()
