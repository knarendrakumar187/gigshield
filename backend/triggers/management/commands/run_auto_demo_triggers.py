import time
from collections import OrderedDict

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from policies.models import WeeklyPolicy
from triggers.models import DisruptionTrigger
from triggers.tasks import process_trigger_claims


TRIGGER_ROTATION = [
    {"trigger_type": "RAIN", "severity": 4, "actual_value": 100.0, "threshold_value": 50.0, "duration_hours": 3.0},
    {"trigger_type": "AQI", "severity": 4, "actual_value": 420.0, "threshold_value": 350.0, "duration_hours": 3.0},
    {"trigger_type": "HEAT", "severity": 4, "actual_value": 45.0, "threshold_value": 42.0, "duration_hours": 3.0},
]


class Command(BaseCommand):
    help = "Continuously fire automatic demo triggers for all active policy zones."

    def add_arguments(self, parser):
        parser.add_argument(
            "--interval",
            type=int,
            default=45,
            help="Seconds between trigger cycles.",
        )

    def handle(self, *args, **options):
        interval = max(10, int(options["interval"]))
        self.stdout.write(self.style.SUCCESS(f"Auto demo trigger loop started. Interval: {interval}s"))
        rotation_index = 0

        while True:
            today = timezone.localdate()
            active = (
                WeeklyPolicy.objects.filter(
                    status=WeeklyPolicy.Status.ACTIVE,
                    week_start__lte=today,
                    week_end__gte=today,
                )
                .select_related("worker")
                .order_by("worker__city", "worker__zone")
            )

            zone_map = OrderedDict()
            for policy in active:
                worker = policy.worker
                key = (worker.city or "", worker.zone or "")
                if not key[0] or not key[1]:
                    continue
                zone_map.setdefault(
                    key,
                    {
                        "city": worker.city,
                        "zone": worker.zone,
                    },
                )

            if not zone_map:
                self.stdout.write("No active policy zones found. Waiting for new purchases...")
                time.sleep(interval)
                continue

            trigger_template = TRIGGER_ROTATION[rotation_index % len(TRIGGER_ROTATION)]
            rotation_index += 1

            fired = []
            for item in zone_map.values():
                trigger = DisruptionTrigger.objects.create(
                    trigger_type=trigger_template["trigger_type"],
                    city=item["city"],
                    zone=item["zone"],
                    severity=trigger_template["severity"],
                    threshold_value=trigger_template["threshold_value"],
                    actual_value=trigger_template["actual_value"],
                    triggered_at=timezone.now(),
                    duration_hours=trigger_template["duration_hours"],
                    source="AUTO_DEMO_GLOBAL",
                )

                if settings.DEBUG:
                    process_trigger_claims.apply(args=(trigger.id,))
                else:
                    process_trigger_claims.delay(trigger.id)

                fired.append(f"{item['city']} / {item['zone']} -> {trigger.trigger_type}")

            self.stdout.write(f"Fired {len(fired)} auto demo triggers:")
            for line in fired:
                self.stdout.write(f"  - {line}")

            time.sleep(interval)
