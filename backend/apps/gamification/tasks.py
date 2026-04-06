"""
Gamification tasks — awarding points and unlocking badges.
"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)

POINTS_VERIFIED_REPORT = 10


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def award_points_for_report(self, report_id: int) -> dict:
    """
    Award points to the report author when a report is auto-verified.
    Creates a UserScore row for the user if one doesn't exist yet.
    Also checks if any new badges should be unlocked.
    """
    from apps.reports.models import Report
    from apps.gamification.models import UserScore, Badge

    try:
        report = Report.objects.select_related('user').get(pk=report_id)
    except Report.DoesNotExist:
        logger.error('award_points_for_report: Report %s not found', report_id)
        return {'error': 'report_not_found'}

    score, _ = UserScore.objects.get_or_create(user=report.user)
    score.total_points += POINTS_VERIFIED_REPORT
    score.save(update_fields=['total_points'])

    # Unlock any newly eligible badges
    earned_badges = Badge.objects.filter(
        required_points__lte=score.total_points
    ).exclude(userscore=score)
    score.badges.add(*earned_badges)

    logger.info(
        'Awarded %d points to user %s (total=%d)',
        POINTS_VERIFIED_REPORT, report.user_id, score.total_points,
    )

    new_badge_names = [b.name for b in earned_badges]
    if new_badge_names:
        # Notify the user about new badges
        from apps.notifications.tasks import send_push_notification
        send_push_notification.delay(
            user_id=str(report.user_id),
            title='🏅 Badge Unlocked!',
            body=f'You earned: {", ".join(new_badge_names)}',
        )

    return {
        'user_id': str(report.user_id),
        'points_awarded': POINTS_VERIFIED_REPORT,
        'total_points': score.total_points,
        'new_badges': new_badge_names,
    }
