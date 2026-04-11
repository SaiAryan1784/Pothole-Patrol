from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0004_add_description_to_report'),
    ]

    operations = [
        migrations.AddField(
            model_name='report',
            name='area_name',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='report',
            name='city',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
