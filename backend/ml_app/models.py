from django.db import models
from django.db.models import Model, OneToOneField, FloatField, IntegerField, JSONField, BooleanField, DateTimeField, CASCADE
from django.contrib.auth import get_user_model

User = get_user_model()

class WorkerBehaviorProfile(Model):
    """
    Updated after every claim event. Tracks personal patterns for fraud detection.
    This is what enables INDIVIDUAL behavioral analysis vs zone-average.
    """
    worker = OneToOneField(User, on_delete=CASCADE)

    # Claim frequency patterns
    avg_claims_per_week_3m = FloatField(default=0.0)   # Rolling 3-month average
    avg_claims_per_week_6m = FloatField(default=0.0)   # Rolling 6-month average
    max_claims_in_any_week = IntegerField(default=0)
    weeks_since_last_claim = IntegerField(default=99)

    # Amount patterns
    avg_approved_amount = FloatField(default=0.0)
    std_approved_amount = FloatField(default=0.0)       # Standard deviation
    max_approved_amount = FloatField(default=0.0)
    amount_volatility = FloatField(default=0.0)         # std / avg

    # Temporal patterns (WHEN does this worker usually claim?)
    typical_claim_hours = JSONField(default=list)       # e.g., [8, 9, 10, 14, 15]
    claims_on_weekends_ratio = FloatField(default=0.0)
    claims_in_monsoon_ratio = FloatField(default=0.0)   # % of claims during Jun-Sep

    # Location consistency
    avg_zone_match_score = FloatField(default=0.8)      # Historical GPS accuracy
    location_consistency = FloatField(default=1.0)      # 1=always same area, 0=erratic

    # Trigger type patterns
    trigger_type_distribution = JSONField(default=dict) # e.g., {"RAIN": 0.6, "HEAT": 0.3}
    claims_per_trigger_type = JSONField(default=dict)

    # Risk flags
    has_prior_fraud_flag = BooleanField(default=False)
    prior_rejected_claims_count = IntegerField(default=0)
    appeal_success_rate = FloatField(default=0.0)

    # Profile freshness
    last_updated = DateTimeField(auto_now=True)
    total_claims_analyzed = IntegerField(default=0)
    profile_confidence = FloatField(default=0.0)  # 0–1: low if < 5 claims history
