from datetime import time, timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.claims.models import Claim
from apps.fraud.models import FraudCheck
from apps.policies.models import Policy
from apps.policies.pricing import TIERS, calculate_weekly_premium
from apps.triggers.models import TriggerEvent, ZoneRiskScore
from apps.workers.models import WorkerProfile


def run():
    User = get_user_model()

    admin, _ = User.objects.get_or_create(
        username='admin@example.com',
        defaults={'email': 'admin@example.com', 'role': User.Role.ADMIN, 'is_staff': True},
    )
    admin.set_password('admin123')
    admin.save()

    rider, _ = User.objects.get_or_create(
        username='rider@example.com',
        defaults={'email': 'rider@example.com', 'role': User.Role.WORKER, 'first_name': 'Akhil'},
    )
    rider.set_password('rider123')
    rider.save()

    wp, _ = WorkerProfile.objects.get_or_create(
        user=rider,
        defaults={
            'platform_name': 'Swiggy',
            'city': 'Hyderabad',
            'primary_zone': 'Madhapur',
            'secondary_zone': 'Hitech City',
            'avg_weekly_income': 4800,
            'avg_weekly_hours': 48,
            'preferred_work_start': time(10, 0),
            'preferred_work_end': time(20, 0),
            'payout_method': 'UPI',
            'device_id': 'DEV-DEMO-001',
        },
    )

    ZoneRiskScore.objects.update_or_create(
        city='Hyderabad',
        zone='Madhapur',
        defaults={
            'rain_risk_score': 0.45,
            'heat_risk_score': 0.25,
            'aqi_risk_score': 0.20,
            'flood_risk_score': 0.30,
            'closure_risk_score': 0.15,
        },
    )

    tier = 'standard'
    suspicious = False
    premium, _, _ = calculate_weekly_premium(wp, tier=tier, suspicious_history=suspicious)
    cfg = TIERS[tier]

    now = timezone.now()
    # Make seeding idempotent: keep only one active demo policy for the rider.
    Policy.objects.filter(worker=wp, policy_status=Policy.Status.ACTIVE).update(policy_status=Policy.Status.EXPIRED)
    Policy.objects.create(
        worker=wp,
        coverage_tier=tier,
        weekly_premium=premium,
        max_covered_hours=cfg.max_covered_hours,
        coverage_ratio=cfg.coverage_ratio,
        active_from=now,
        active_to=now + timedelta(days=7),
        policy_status=Policy.Status.ACTIVE,
    )

    # Ensure 1-2 claims are marked as fraud for demo
    te1 = TriggerEvent.objects.create(
        city='Hyderabad',
        zone='Madhapur',
        trigger_type='extreme_heat',
        severity=90,
        event_start=now - timedelta(days=2),
        event_end=now - timedelta(days=2) + timedelta(hours=4),
        status='closed',
    )
    c1 = Claim.objects.create(
        worker=wp,
        policy=Policy.objects.filter(worker=wp).first(),
        trigger_event=te1,
        estimated_lost_hours=4,
        payout_amount=400,
        claim_status=Claim.Status.REJECTED,
    )
    FraudCheck.objects.create(
        claim=c1,
        gps_match_score=0.2,
        duplicate_flag=False,
        fraud_flag=True,
        activity_match_score=1.0,
        anomaly_score=0.8,
        fraud_score=85,
        decision='reject',
        reason='GPS mismatch',
    )

    te2 = TriggerEvent.objects.create(
        city='Hyderabad',
        zone='Madhapur',
        trigger_type='severe_aqi',
        severity=85,
        event_start=now - timedelta(days=1),
        event_end=now - timedelta(days=1) + timedelta(hours=3),
        status='closed',
    )
    c2 = Claim.objects.create(
        worker=wp,
        policy=Policy.objects.filter(worker=wp).first(),
        trigger_event=te2,
        estimated_lost_hours=3,
        payout_amount=300,
        claim_status=Claim.Status.REVIEW,
    )
    FraudCheck.objects.create(
        claim=c2,
        gps_match_score=1.0,
        duplicate_flag=True,
        fraud_flag=True,
        activity_match_score=1.0,
        anomaly_score=0.9,
        fraud_score=75,
        decision='review',
        reason='Duplicate claim detected',
    )


    print('Seeded demo users + worker profile + zone risk + active policy + 2 fraud claims.')

