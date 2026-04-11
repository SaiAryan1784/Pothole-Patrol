"""
Fix type mismatch between django_admin_log.user_id (bigint) and
accounts_customuser.firebase_uid (varchar).

Django's built-in LogEntry model assumes the user PK is a bigint, but
CustomUser uses firebase_uid (CharField) as its primary key. This causes
a PostgreSQL "operator does not exist: bigint = character varying" error
when the admin dashboard tries to render recent actions.

We alter the column type and drop/recreate the foreign key constraint.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_alter_customuser_options_alter_customuser_managers_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE django_admin_log
                    DROP CONSTRAINT IF EXISTS django_admin_log_user_id_c564eba6_fk_auth_user_id;

                ALTER TABLE django_admin_log
                    ALTER COLUMN user_id TYPE varchar(255) USING user_id::varchar;

                ALTER TABLE django_admin_log
                    ADD CONSTRAINT django_admin_log_user_id_fk_customuser
                    FOREIGN KEY (user_id)
                    REFERENCES accounts_customuser(firebase_uid)
                    DEFERRABLE INITIALLY DEFERRED;
            """,
            reverse_sql="""
                ALTER TABLE django_admin_log
                    DROP CONSTRAINT IF EXISTS django_admin_log_user_id_fk_customuser;

                ALTER TABLE django_admin_log
                    ALTER COLUMN user_id TYPE bigint USING user_id::bigint;
            """,
        ),
    ]
