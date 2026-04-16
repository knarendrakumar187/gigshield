import uuid
from decimal import Decimal
from django.utils import timezone
from workers.models import User
from policies.models import WeeklyPolicy
from claims.models import Claim
from payouts.models import Payout
from triggers.models import DisruptionTrigger

trigger = DisruptionTrigger.objects.first()
now = timezone.now()
created = 0
for worker in User.objects.filter(role='WORKER'):
    policy = WeeklyPolicy.objects.filter(worker=worker, status='ACTIVE').first()
    if not policy:
        try:
            policy = WeeklyPolicy.objects.create(worker=worker, tier='standard', status='ACTIVE', week_start=now.date(), week_end=now.date())
        except Exception:
            continue
    
    # Just checking what happens
    c = Claim.objects.create(
        worker=worker,
        policy=policy,
        trigger=trigger,
        claimed_amount=Decimal('480.00'),
        approved_amount=Decimal('500.00'),
        status='APPROVED',
        fraud_score=15.0,
        auto_processed=True,
        payout_ref=f'pout_{uuid.uuid4().hex[:14]}',
        processed_at=now
    )
    
    Payout.objects.create(
        claim=c,
        amount=Decimal('500.00'),
        method='WALLET',
        upi_id=worker.upi_id or 'user@ybl',
        transaction_ref=c.payout_ref,
        status='SUCCESS',
        completed_at=now
    )
    created += 1

print(f"Created {created} realistic mock payouts!")
