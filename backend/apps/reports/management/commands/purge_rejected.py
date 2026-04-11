"""
Management command: purge_rejected

Deletes all REJECTED reports and their Cloudinary images.
Run this once to clean up existing bad uploads, then the ML task
handles new rejections automatically going forward.

Usage:
    python manage.py purge_rejected           # dry run — shows what would be deleted
    python manage.py purge_rejected --confirm # actually deletes
"""
import logging

import cloudinary.uploader
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


def _cloudinary_public_id(image_url: str) -> str | None:
    """
    Extract the Cloudinary public_id from a secure URL.

    Cloudinary URLs look like:
      https://res.cloudinary.com/<cloud>/image/upload/v1234/pothole-patrol/abc.jpg
    The public_id is everything after /upload/v<version>/ without the extension:
      pothole-patrol/abc
    """
    try:
        # Split on '/upload/' and take the right side
        after_upload = image_url.split('/upload/')[1]
        # Drop the version segment if present (v followed by digits)
        parts = after_upload.split('/')
        if parts[0].startswith('v') and parts[0][1:].isdigit():
            parts = parts[1:]
        # Drop file extension from last segment
        last = parts[-1]
        parts[-1] = last.rsplit('.', 1)[0]
        return '/'.join(parts)
    except (IndexError, AttributeError):
        return None


class Command(BaseCommand):
    help = 'Delete all REJECTED reports and their Cloudinary images.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Actually perform the deletion. Without this flag the command runs in dry-run mode.',
        )

    def handle(self, *args, **options):
        from apps.reports.models import Report, STATUS_CHOICES

        dry_run = not options['confirm']
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — pass --confirm to actually delete.\n'))

        rejected = Report.objects.filter(status=STATUS_CHOICES.REJECTED)
        count = rejected.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No rejected reports found.'))
            return

        self.stdout.write(f'Found {count} rejected report(s).\n')

        deleted_images = 0
        failed_images = 0

        for report in rejected:
            public_id = _cloudinary_public_id(report.image_url)
            if public_id:
                if not dry_run:
                    try:
                        cloudinary.uploader.destroy(public_id, resource_type='image')
                        deleted_images += 1
                        logger.info('Deleted Cloudinary image %s', public_id)
                    except Exception as exc:
                        failed_images += 1
                        logger.warning('Failed to delete Cloudinary image %s: %s', public_id, exc)
                        self.stdout.write(self.style.WARNING(f'  Could not delete image {public_id}: {exc}'))
                else:
                    self.stdout.write(f'  Would delete image: {public_id}')
            else:
                self.stdout.write(self.style.WARNING(f'  Could not parse public_id from: {report.image_url}'))

        if not dry_run:
            rejected.delete()
            self.stdout.write(self.style.SUCCESS(
                f'\nDone. Deleted {count} report(s), {deleted_images} Cloudinary image(s). '
                f'({failed_images} image deletion(s) failed — reports still deleted from DB.)'
            ))
        else:
            self.stdout.write(self.style.WARNING(f'\nDry run complete. Would delete {count} report(s).'))
