from django.core.management.base import BaseCommand
from django_celery_beat.models import CrontabSchedule, PeriodicTask


TASKS = [
    {
        "name": "poll-weather-triggers-every-15-min",
        "task": "triggers.tasks.poll_weather_triggers",
        "minute": "*/15",
        "hour": "*",
        "kwargs": "{}",
        "expires": 60 * 14,
    },
    {
        "name": "poll-government-alerts-hourly",
        "task": "triggers.tasks.poll_government_alerts",
        "minute": "0",
        "hour": "*",
        "kwargs": "{}",
    },
    {
        "name": "poll-traffic-disruptions-every-30-min",
        "task": "triggers.tasks.poll_traffic_disruptions",
        "minute": "*/30",
        "hour": "*",
        "kwargs": "{}",
    },
]


class Command(BaseCommand):
    help = "Create or update GigShield Celery beat tasks"

    def add_arguments(self, parser):
        parser.add_argument(
            "--demo-fast",
            action="store_true",
            help="Use fast demo cadence (weather poll every minute).",
        )

    def handle(self, *args, **options):
        weather_minute = "*/1" if options.get("demo_fast") else "*/15"

        for item in TASKS:
            minute_value = item["minute"]
            if item["name"] == "poll-weather-triggers-every-15-min":
                minute_value = weather_minute

            schedule, _ = CrontabSchedule.objects.get_or_create(
                minute=minute_value,
                hour=item["hour"],
                day_of_week="*",
                day_of_month="*",
                month_of_year="*",
                timezone="Asia/Kolkata",
            )
            defaults = {
                "task": item["task"],
                "crontab": schedule,
                "kwargs": item.get("kwargs", "{}"),
                "enabled": True,
            }
            if "expires" in item:
                defaults["expire_seconds"] = item["expires"]
            PeriodicTask.objects.update_or_create(name=item["name"], defaults=defaults)
            self.stdout.write(self.style.SUCCESS(f"Synced {item['name']}"))
