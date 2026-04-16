"""Parametric payout calculation."""
from __future__ import annotations

from decimal import Decimal
from typing import Any

from claims.exclusions import ExclusionEngine

PAYOUT_RATES = {
    "RAIN": Decimal("0.60"),
    "HEAT": Decimal("0.50"),
    "AQI": Decimal("0.55"),
    "FLOOD": Decimal("0.70"),
    "ZONE_CLOSURE": Decimal("0.65"),
    "CURFEW": Decimal("0.65"),
}

SEVERITY_SCALE = {
    1: Decimal("0.6"),
    2: Decimal("0.75"),
    3: Decimal("0.88"),
    4: Decimal("1.0"),
    5: Decimal("1.15"),
}


def calculate_payout(worker, trigger, policy) -> dict[str, Any]:
    if policy.covered_triggers and trigger.trigger_type not in policy.covered_triggers and "ALL" not in policy.covered_triggers:
        return {
            "amount": Decimal("0"),
            "excluded": True,
            "reason": f"Event {trigger.trigger_type} not selected in policy coverage",
            "exclusion_id": "EX-00",
            "calculation": {},
        }
    engine = ExclusionEngine()
    exclusion = engine.check_claim(None, trigger, policy)
    if exclusion["is_excluded"]:
        return {
            "amount": Decimal("0"),
            "excluded": True,
            "reason": exclusion["reason"],
            "exclusion_id": exclusion["exclusion_id"],
            "calculation": {},
        }

    rate = PAYOUT_RATES.get(trigger.trigger_type, Decimal("0.55"))
    daily = Decimal(str(worker.avg_daily_earnings))
    if daily <= 0:
        daily = Decimal("450.00") # Fallback for new demo users with no history
        
    dur = Decimal(str(trigger.duration_hours))
    raw = rate * daily * dur
    sev = SEVERITY_SCALE.get(min(max(trigger.severity, 1), 5), Decimal("1"))
    scaled = raw * sev
    cap = min(Decimal(str(policy.coverage_amount)), daily * 3)
    final = min(scaled, cap)
    final = final.quantize(Decimal("0.01"))
    return {
        "amount": final,
        "excluded": False,
        "exclusion_id": None,
        "reason": None,
        "calculation": {
            "rate": float(rate),
            "daily_earnings": float(daily),
            "duration_hours": float(dur),
            "severity_multiplier": float(sev),
            "coverage_cap": float(cap),
            "raw": float(raw.quantize(Decimal("0.01"))),
            "scaled": float(scaled.quantize(Decimal("0.01"))),
            "final": float(final),
        },
    }
