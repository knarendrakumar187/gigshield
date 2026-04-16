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
from ml_app.fraud_detection import run_full_fraud_detection
from policies.views import _run_auto_purchase_demo
from triggers.tasks import process_trigger_claims

User = get_user_model()

def test_deduplication():
    print("🧹 Cleaning up old test data...")
    User.objects.filter(username="test_worker_123").delete()

    print("\n👤 Creating test worker and policy...")
    user = User.objects.create_user(username="test_worker_123", password="password", city="Mumbai", zone="Andheri West")
    prof = WorkerProfile.objects.create(user=user, city_zone="Mumbai Andheri West")
    
    ws = timezone.localdate()
    policy = WeeklyPolicy.objects.create(
        worker=user,
        week_start=ws,
        week_end=ws + timedelta(days=6),
        premium_paid=50,
        coverage_amount=500,
        tier="PREMIUM",
        status="ACTIVE"
    )

    claims_before = Claim.objects.count()
    triggers_before = DisruptionTrigger.objects.count()

    print("\n🚀 Firing First Purchase Demo Trigger...")
    _run_auto_purchase_demo(policy, prof)
    
    claims_after_1 = Claim.objects.filter(worker=user).count()
    triggers_after_1 = DisruptionTrigger.objects.filter(source="AUTO_PURCHASE_DEMO", city="Mumbai", zone="Andheri West").count()
    print(f"   Triggers for user: {triggers_after_1}")
    print(f"   Claims for user: {claims_after_1}")

    print("\n🔄 Simulating System Polling / Second Purchase Action...")
    try:
        _run_auto_purchase_demo(policy, prof)
    except Exception as e:
        print(f"Error during second run: {e}")

    # Also simulate background task polling the same trigger
    recent_trigger = DisruptionTrigger.objects.filter(source="AUTO_PURCHASE_DEMO").first()
    if recent_trigger:
        process_trigger_claims.apply(args=(recent_trigger.id,))

    claims_after_2 = Claim.objects.filter(worker=user).count()
    triggers_after_2 = DisruptionTrigger.objects.filter(source="AUTO_PURCHASE_DEMO", city="Mumbai", zone="Andheri West").count()

    print(f"   Triggers after second run: {triggers_after_2} (Expected: 1)")
    print(f"   Claims after second run: {claims_after_2} (Expected: 1)")

    if triggers_after_2 == 1 and claims_after_2 == 1:
        print("\n✅ SUCCESS: Trigger deduplication and Claim idempotency working perfectly!")
    else:
        print("\n❌ FAILURE: Duplication bug still present.")

    # Cleanup
    user.delete()

if __name__ == "__main__":
    test_deduplication()
