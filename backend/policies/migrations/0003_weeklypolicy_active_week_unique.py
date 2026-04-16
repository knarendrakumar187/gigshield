# Generated manually — dedupe duplicate ACTIVE policies per worker/week, then partial unique constraint.

from django.db import migrations, models


def dedupe_active_policies_per_week(apps, schema_editor):
    WeeklyPolicy = apps.get_model("policies", "WeeklyPolicy")
    from django.db.models import Count

    dupes = (
        WeeklyPolicy.objects.filter(status="ACTIVE")
        .values("worker_id", "week_start")
        .annotate(n=Count("id"))
        .filter(n__gt=1)
    )
    for row in dupes:
        qs = WeeklyPolicy.objects.filter(
            worker_id=row["worker_id"],
            week_start=row["week_start"],
            status="ACTIVE",
        ).order_by("id")
        keep = qs.first()
        if keep:
            qs.exclude(pk=keep.pk).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("policies", "0002_initial"),
    ]

    operations = [
        migrations.RunPython(dedupe_active_policies_per_week, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="weeklypolicy",
            constraint=models.UniqueConstraint(
                condition=models.Q(status="ACTIVE"),
                fields=("worker", "week_start"),
                name="weeklypolicy_worker_week_active_uniq",
            ),
        ),
    ]
