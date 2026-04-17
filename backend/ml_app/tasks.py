import logging
from celery import shared_task
from django.db.models import Avg, StdDev, Max, Count
import numpy as np
from datetime import date, timedelta
from django.contrib.auth import get_user_model
from ml_app.models import WorkerBehaviorProfile
from claims.models import Claim
from claims.models import Claim, FraudLog

User = get_user_model()
logger = logging.getLogger(__name__)

@shared_task
def update_worker_behavior_profile(worker_id: int, claim_id: int = None):
    """
    Run after every claim is processed. Updates the worker's behavioral fingerprint.
    Called by process_trigger_claims after each claim status is set.
    """
    worker = User.objects.get(id=worker_id)
    claims = Claim.objects.filter(
        worker=worker,
        status__in=['APPROVED', 'REJECTED', 'MANUAL_REVIEW']
    ).order_by('-processed_at')

    if claims.count() < 2:
        # Not enough data — set low confidence profile
        profile, _ = WorkerBehaviorProfile.objects.get_or_create(worker=worker)
        profile.profile_confidence = claims.count() * 0.2
        profile.save()
        return

    # --- Claim frequency ---
    now = date.today()
    claims_3m = claims.filter(processed_at__gte=now - timedelta(days=90))
    claims_6m = claims.filter(processed_at__gte=now - timedelta(days=180))

    weeks_3m = 13  # 90 days / 7
    weeks_6m = 26

    avg_3m = claims_3m.count() / weeks_3m
    avg_6m = claims_6m.count() / weeks_6m

    # --- Amount statistics ---
    approved = claims.filter(status='APPROVED')
    amounts = list(approved.values_list('approved_amount', flat=True))
    avg_amount = np.mean(amounts) if amounts else 0
    std_amount = np.std(amounts) if len(amounts) > 1 else 0
    volatility = std_amount / avg_amount if avg_amount > 0 else 0

    # --- Temporal patterns ---
    claim_hours = [c.processed_at.hour for c in claims if c.processed_at]
    weekend_claims = sum(1 for c in claims if c.processed_at and c.processed_at.weekday() >= 5)
    weekend_ratio = weekend_claims / claims.count()

    monsoon_claims = sum(1 for c in claims
                        if c.processed_at and 6 <= c.processed_at.month <= 9)
    monsoon_ratio = monsoon_claims / claims.count()

    # --- Trigger distribution ---
    trigger_dist = {}
    for claim in claims:
        if claim.trigger:
            t = claim.trigger.trigger_type
            trigger_dist[t] = trigger_dist.get(t, 0) + 1
    total = sum(trigger_dist.values())
    trigger_dist_normalized = {k: v/total for k, v in trigger_dist.items()} if total else {}

    # --- Location consistency ---
    fraud_logs = FraudLog.objects.filter(
        claim__worker=worker, check_type='GPS'
    )
    gps_scores = [log.details.get('zone_match_score', 1.0) for log in fraud_logs]
    location_consistency = np.mean(gps_scores) if gps_scores else 1.0

    # --- Confidence score (higher with more data) ---
    confidence = min(1.0, claims.count() / 20)  # Full confidence at 20+ claims

    profile, _ = WorkerBehaviorProfile.objects.get_or_create(worker=worker)
    profile.avg_claims_per_week_3m = round(avg_3m, 3)
    profile.avg_claims_per_week_6m = round(avg_6m, 3)
    profile.max_claims_in_any_week = max(
        profile.max_claims_in_any_week,
        claims_3m.count()  # approximate
    )
    profile.avg_approved_amount = round(avg_amount, 2)
    profile.std_approved_amount = round(std_amount, 2)
    profile.amount_volatility = round(volatility, 3)
    profile.typical_claim_hours = sorted(set(claim_hours))
    profile.claims_on_weekends_ratio = round(weekend_ratio, 3)
    profile.claims_in_monsoon_ratio = round(monsoon_ratio, 3)
    profile.trigger_type_distribution = trigger_dist_normalized
    profile.location_consistency = round(location_consistency, 3)
    profile.prior_rejected_claims_count = claims.filter(status='REJECTED').count()
    profile.has_prior_fraud_flag = FraudLog.objects.filter(
        claim__worker=worker, result='FAIL'
    ).exists()
    profile.profile_confidence = round(confidence, 2)
    profile.total_claims_analyzed = claims.count()
    profile.save()
