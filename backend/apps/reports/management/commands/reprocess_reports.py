"""
Management command to re-queue ML verification for stuck reports.

Usage:
    python manage.py reprocess_reports               # re-queues PENDING + NEEDS_REVIEW
    python manage.py reprocess_reports --status PENDING
    python manage.py reprocess_reports --all         # also re-queues NEEDS_REVIEW
    python manage.py reprocess_reports --ids 1 2 3   # specific report IDs
"""
from django.core.management.base import BaseCommand

from apps.reports.models import Report, STATUS_CHOICES
from apps.reports.tasks import process_report_ml


class Command(BaseCommand):
    help = 'Re-queue ML verification for stuck or unverified reports'

    def add_arguments(self, parser):
        parser.add_argument(
            '--status',
            nargs='+',
            default=['PENDING', 'NEEDS_REVIEW'],
            help='Status values to reprocess (default: PENDING NEEDS_REVIEW)',
        )
        parser.add_argument(
            '--ids',
            nargs='+',
            type=int,
            help='Specific report IDs to reprocess',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print what would be reprocessed without enqueuing tasks',
        )

    def handle(self, *args, **options):
        if options['ids']:
            reports = Report.objects.filter(pk__in=options['ids'])
        else:
            reports = Report.objects.filter(status__in=options['status'])

        count = reports.count()
        if count == 0:
            self.stdout.write(self.style.WARNING('No matching reports found.'))
            return

        self.stdout.write(f'Found {count} report(s) to reprocess.')

        if options['dry_run']:
            for r in reports:
                self.stdout.write(f'  [DRY RUN] Report {r.id} status={r.status} confidence={r.confidence:.2f}')
            return

        queued = 0
        for r in reports:
            prev_status = r.status
            # Reset to PENDING so the polling UI shows the right state
            r.status = STATUS_CHOICES.PENDING
            r.save(update_fields=['status', 'updated_at'])
            # Use apply_async with ignore_result=True to avoid the Redis result-backend
            # pub/sub subscription — this is safe when running `railway run` locally
            # because the task only needs the broker (write), not the result channel (read).
            process_report_ml.apply_async(args=[r.pk], ignore_result=True)
            queued += 1
            self.stdout.write(f'  Queued report {r.id} (was {prev_status})')

        self.stdout.write(self.style.SUCCESS(f'Enqueued {queued} task(s). Watch Celery worker logs for results.'))
