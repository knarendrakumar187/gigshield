"""Actuarial KPIs and reserve calculations."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.db.models import Sum

LOSS_RATIO_TARGET = 0.65
EXPENSE_RATIO = 0.20
PROFIT_MARGIN_TARGET = 0.15
COMBINED_RATIO_MAX = 0.85
RESERVE_RATE = 0.30
MIN_SOLVENCY_MARGIN = 1.5


def calculate_weekly_financials(week_start: date):
    from claims.models import Claim
    from policies.models import ActuarialReserve, WeeklyPolicy

    policies = WeeklyPolicy.objects.filter(week_start=week_start, status__in=["ACTIVE", "EXPIRED"])
    claims = Claim.objects.filter(policy__week_start=week_start)
    premiums_collected = sum((p.premium_paid for p in policies), Decimal("0"))
    claims_paid = claims.filter(status="APPROVED").aggregate(t=Sum("approved_amount"))["t"] or Decimal("0")
    claims_pending_q = claims.filter(status="MANUAL_REVIEW")
    claims_pending = sum((c.claimed_amount for c in claims_pending_q), Decimal("0"))
    loss_ratio = float(claims_paid / premiums_collected) if premiums_collected else 0.0
    combined_ratio = loss_ratio + EXPENSE_RATIO
    active = policies.filter(status="ACTIVE")
    reserve_held = sum((p.coverage_amount for p in active), Decimal("0")) * Decimal(str(RESERVE_RATE))
    max_cov = max((p.coverage_amount for p in active), default=Decimal("0"))
    solvency_margin = float(reserve_held / max_cov) if max_cov else 999.0
    row, _ = ActuarialReserve.objects.update_or_create(
        week_start=week_start,
        defaults={
            "total_premiums_collected": premiums_collected,
            "total_claims_paid": claims_paid,
            "total_claims_pending": claims_pending,
            "loss_ratio": round(loss_ratio, 4),
            "expense_ratio": EXPENSE_RATIO,
            "combined_ratio": round(combined_ratio, 4),
            "reserve_held": reserve_held,
            "solvency_margin": round(solvency_margin, 2),
        },
    )
    return row


def get_historical_claims_aggregate(zone: str, lookback_weeks: int = 52) -> dict:
    from datetime import timedelta

    from claims.models import Claim

    today = date.today()
    start = today - timedelta(weeks=lookback_weeks)
    qs = Claim.objects.filter(
        worker__zone=zone,
        created_at__date__gte=start,
        status="APPROVED",
    )
    n_weeks = max(lookback_weeks, 1)
    cnt = qs.count()
    amt = qs.aggregate(s=Sum("approved_amount"))["s"] or Decimal("0")
    workers = max(
        Claim.objects.filter(created_at__date__gte=start, worker__zone=zone)
        .values("worker")
        .distinct()
        .count(),
        1,
    )
    return {
        "avg_claims_per_week_per_worker": (cnt / n_weeks) / workers,
        "avg_approved_amount": float(amt / cnt) if cnt else 0.0,
    }


def is_premium_adequate(zone: str, tier: str, week_start: date | None = None) -> dict:
    from policies.premium_engine import BASE_PREMIUMS

    h = get_historical_claims_aggregate(zone)
    freq = h["avg_claims_per_week_per_worker"] or 0.02
    avg_amt = h["avg_approved_amount"] or 200.0
    expected_weekly_loss = freq * avg_amt
    tier_key = tier.lower()
    tier_premium = float(BASE_PREMIUMS[tier_key]["weekly"])
    floor_loss = expected_weekly_loss * LOSS_RATIO_TARGET
    adequate = tier_premium >= floor_loss
    adequacy_ratio = tier_premium / (expected_weekly_loss + 0.001)
    return {
        "zone": zone,
        "tier": tier,
        "tier_premium": tier_premium,
        "expected_loss_per_worker": round(expected_weekly_loss, 2),
        "adequacy_ratio": round(adequacy_ratio, 2),
        "is_adequate": adequate,
        "recommendation": "VIABLE" if adequate else "REPRICE_REQUIRED",
    }
