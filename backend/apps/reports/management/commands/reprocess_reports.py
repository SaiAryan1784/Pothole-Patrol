"""
Management command to re-queue ML verification for stuck reports.

Usage:
    # Queue via Celery (must be run inside Railway shell — Redis unreachable locally):
    python manage.py reprocess_reports

    # Run ML synchronously in-process — works locally with `railway run`:
    python manage.py reprocess_reports --local --model-path models/best.pt

    # Target specific IDs:
    python manage.py reprocess_reports --local --model-path models/best.pt --ids 1 2 3

    # Dry run to see what would be processed:
    python manage.py reprocess_reports --dry-run
"""
import os

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.reports.models import Report, STATUS_CHOICES


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
            help='Print what would be processed without making changes',
        )
        parser.add_argument(
            '--local',
            action='store_true',
            help=(
                'Run ML task synchronously in-process instead of queuing via Celery. '
                'Use this when running locally via `railway run` (Redis is unreachable). '
                'Requires --model-path.'
            ),
        )
        parser.add_argument(
            '--model-path',
            help='Override ML_MODEL_PATH for local runs (e.g. models/best.pt)',
        )

    def handle(self, *args, **options):
        if options['ids']:
            reports = list(Report.objects.filter(pk__in=options['ids']))
        else:
            reports = list(Report.objects.filter(status__in=options['status']))

        count = len(reports)
        if count == 0:
            self.stdout.write(self.style.WARNING('No matching reports found.'))
            return

        self.stdout.write(f'Found {count} report(s) to reprocess.')

        if options['dry_run']:
            for r in reports:
                self.stdout.write(
                    f'  [DRY RUN] Report {r.id} status={r.status} confidence={r.confidence:.2f}'
                )
            return

        if options['local']:
            self._run_local(reports, options.get('model_path'))
        else:
            self._run_via_celery(reports)

    def _run_local(self, reports, model_path_override):
        """Call the task function directly in-process — no Celery/Redis needed."""
        from apps.reports.tasks import process_report_ml as _task_fn

        if model_path_override:
            # Resolve relative paths from current working directory
            abs_path = os.path.abspath(model_path_override)
            self.stdout.write(f'Overriding ML_MODEL_PATH → {abs_path}')
            settings.ML_MODEL_PATH = abs_path

        for r in reports:
            self.stdout.write(f'  Processing report {r.id} (status={r.status})...')
            try:
                result = _task_fn(r.pk)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✓ Report {r.id} → {result.get("status")} '
                        f'(confidence={result.get("confidence", 0):.2f})'
                    )
                )
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f'  ✗ Report {r.id} failed: {exc}'))

    def _run_via_celery(self, reports):
        """Queue tasks via Celery broker — must be run inside Railway network."""
        from apps.reports.tasks import process_report_ml

        queued = 0
        for r in reports:
            prev_status = r.status
            r.status = STATUS_CHOICES.PENDING
            r.save(update_fields=['status', 'updated_at'])
            process_report_ml.apply_async(args=[r.pk], ignore_result=True)
            queued += 1
            self.stdout.write(f'  Queued report {r.id} (was {prev_status})')

        self.stdout.write(
            self.style.SUCCESS(f'Enqueued {queued} task(s). Watch Celery worker logs.')
        )
