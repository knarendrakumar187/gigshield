import os
import django
from datetime import datetime, timedelta

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "gigshield.settings")
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from workers.models import WorkerProfile
from policies.models import WeeklyPolicy
from triggers.models import DisruptionTrigger
from claims.models import Claim

User = get_user_model()
trigger = DisruptionTrigger.objects.last()
week_date = trigger.triggered_at.date()

print("Trigger zone:", trigger.zone, trigger.city)
affected = WeeklyPolicy.objects.filter(
    worker__zone=trigger.zone,
    worker__city=trigger.city,
    status="ACTIVE",
    week_start__lte=week_date,
    week_end__gte=week_date,
)
print("Affected policies:", list(affected))
if affected:
    from claims.exclusions import ExclusionEngine
    ex = ExclusionEngine().check_claim(None, trigger, affected[0])
    print("Exclusion:", ex)

