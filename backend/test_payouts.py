import os
import django
from django.conf import settings
from django.utils import timezone

# Force debug to run tasks synchronously if not already
settings.DEBUG = True

from triggers.tasks import monitor_weather_triggers, poll_government_alerts
from claims.models import Claim
from payouts.models import Payout

print("=======================================")
print("  Simulating Weather/Disruption Event  ")
print("=======================================")
# We set an environment variable that the task uses to force a demo trigger
os.environ["GIGSHIELD_DEMO_FORCE_TRIGGER"] = "1"
os.environ["GIGSHIELD_DEMO_FORCE_CITY"] = "mumbai"
os.environ["GIGSHIELD_DEMO_FORCE_KIND"] = "RAIN"

# Flush previous dummy claims/payouts for clean output in this test (Optional)
# Payout.objects.all().delete()

print("Firing triggers...")
# Run synchronously
monitor_weather_triggers()

print("\n=======================================")
print("            Checking Payouts           ")
print("=======================================")
payouts = Payout.objects.all().order_by('-initiated_at')[:5]
if not payouts:
    print("No payouts found. Please make sure there is an active WeeklyPolicy in the system for this trigger.")
else:
    for p in payouts:
        print(f"Payout ID: {p.id}")
        print(f"  Method: {p.method}")
        print(f"  Amount: ₹{p.amount}")
        print(f"  Status: {p.status}")
        print(f"  Ref: {p.transaction_ref}")
        if p.failure_reason:
            print(f"  Failure Reason: {p.failure_reason}")
        print(f"  Receipt URL: {p.receipt_url}")
        print("---------------------------------------")
