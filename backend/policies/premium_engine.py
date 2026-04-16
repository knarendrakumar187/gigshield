"""Weekly premium calculation with transparent multipliers."""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any

BASE_PREMIUMS = {
    "basic": {"weekly": Decimal("25"), "coverage": Decimal("300"), "max_claims_per_week": 2},
    "standard": {"weekly": Decimal("35"), "coverage": Decimal("500"), "max_claims_per_week": 3},
    "premium": {"weekly": Decimal("50"), "coverage": Decimal("800"), "max_claims_per_week": 5},
}

RISK_MULTIPLIERS = {
    "zone_flood_history_high": 1.25,
    "zone_flood_history_medium": 1.10,
    "coastal_proximity": 1.15,
    "low_elevation_zone": 1.12,
    "monsoon_season": 1.18,
    "pre_monsoon": 1.08,
    "summer_peak": 1.10,
    "high_aqi_zone": 1.12,
    "critical_aqi_zone": 1.20,
    "new_worker": 0.92,
    "veteran_worker_1yr": 0.95,
    "veteran_worker_2yr": 0.90,
    "zero_claims_6months": 0.88,
    "one_claim_3months": 1.05,
    "multiple_claims_3months": 1.20,
    "swiggy_preferred_zone": 0.97,
    "high_demand_zone": 1.05,
    "no_claims_bonus_4weeks": 0.88,
}

MULTIPLIER_DESCRIPTIONS = {k: k.replace("_", " ").title() for k in RISK_MULTIPLIERS}


def get_hyperlocal_multipliers(grid_cell) -> list[dict]:
    """
    Returns multipliers based on the worker's exact 500m grid cell.
    These are MORE precise than zone-level multipliers and override them.
    """
    multipliers = []

    # Waterlogging micro-risk
    if grid_cell.waterlog_score > 0.7:
        multipliers.append({
            "factor": "cell_high_waterlog",
            "multiplier": 1.30,
            "reason": f"Your street ({grid_cell.cell_id}) has flooded {grid_cell.flood_incidents_12m}x in 12 months"
        })
    elif grid_cell.waterlog_score > 0.4:
        multipliers.append({
            "factor": "cell_medium_waterlog",
            "multiplier": 1.15,
            "reason": "Your delivery area has moderate flood history"
        })

    # Low elevation (sea level risk)
    if grid_cell.elevation_meters < 5:
        multipliers.append({
            "factor": "cell_low_elevation",
            "multiplier": 1.20,
            "reason": "Your area is below 5m sea level — higher flood exposure"
        })

    # Urban heat island
    if grid_cell.heat_island_factor > 1.2:
        multipliers.append({
            "factor": "cell_heat_island",
            "multiplier": grid_cell.heat_island_factor,
            "reason": "Dense urban area — temperature runs higher than surrounding zones"
        })

    # Drainage quality discount
    if grid_cell.drainage_quality == 'GOOD':
        multipliers.append({
            "factor": "cell_good_drainage",
            "multiplier": 0.92,
            "reason": "Your street has well-maintained drainage — lower flood risk"
        })
    elif grid_cell.drainage_quality == 'POOR':
        multipliers.append({
            "factor": "cell_poor_drainage",
            "multiplier": 1.18,
            "reason": "Poor local drainage increases flood disruption risk"
        })

    # Historical disruption rate
    if grid_cell.historical_disruption_rate > 0.3:
        multipliers.append({
            "factor": "cell_high_disruption_history",
            "multiplier": 1.15,
            "reason": f"Workers in your exact area file claims {grid_cell.historical_disruption_rate:.0%} of weeks"
        })

    return multipliers
def get_zone_risk_data(city_zone: str) -> dict[str, Any]:
    z = (city_zone or "").lower()
    flood_high = any(x in z for x in ("dharavi", "kurla", "low-lying"))
    flood_med = "mumbai" in z or "bengaluru" in z
    coastal = "mumbai" in z or "chennai" in z
    low_elev = "dharavi" in z
    aqi_high = "delhi" in z
    aqi_crit = False
    high_demand = "koramangala" in z or "andheri" in z
    return {
        "zone_flood_history_high": flood_high,
        "zone_flood_history_medium": flood_med and not flood_high,
        "coastal_proximity": coastal,
        "low_elevation_zone": low_elev,
        "high_aqi_zone": aqi_high,
        "critical_aqi_zone": aqi_crit,
        "high_demand_zone": high_demand,
        "swiggy_preferred_zone": "whitefield" in z,
    }


def get_temporal_risk(week_start: date) -> dict[str, bool]:
    m = week_start.month
    return {
        "monsoon_season": m in (6, 7, 8, 9),
        "pre_monsoon": m in (4, 5),
        "summer_peak": m in (3, 4, 5, 6),
    }


def get_worker_risk_history(profile, today: date) -> dict[str, bool]:
    from datetime import timedelta

    from claims.models import Claim

    if not profile or not getattr(profile, "user_id", None):
        return {"new_worker": True, "zero_claims_6months": True}
    user = profile.user
    joined = getattr(profile, "active_since", None) or user.date_joined.date()
    tenure_days = (today - joined).days
    new_worker = tenure_days < 90
    vet_1 = 365 <= tenure_days < 730
    vet_2 = tenure_days >= 730
    since_6m = today - timedelta(days=180)
    since_90d = today - timedelta(days=90)
    claims_6m = Claim.objects.filter(worker=user, created_at__date__gte=since_6m).count()
    claims_3m = Claim.objects.filter(worker=user, created_at__date__gte=since_90d).count()
    claims_4w = Claim.objects.filter(worker=user, created_at__date__gte=today - timedelta(days=28)).count()
    return {
        "new_worker": new_worker,
        "veteran_worker_1yr": vet_1,
        "veteran_worker_2yr": vet_2,
        "zero_claims_6months": claims_6m == 0,
        "one_claim_3months": claims_3m == 1,
        "multiple_claims_3months": claims_3m > 2,
        "no_claims_bonus_4weeks": claims_4w == 0,
    }


def should_apply_multiplier(key: str, zone_data: dict, temporal_data: dict, worker_data: dict) -> bool:
    if key in zone_data:
        return bool(zone_data.get(key))
    if key in temporal_data:
        return bool(temporal_data.get(key))
    if key in worker_data:
        return bool(worker_data.get(key))
    return False


def calculate_expected_loss(zone_data: dict, tier: str, temporal_data: dict) -> Decimal:
    base_cov = BASE_PREMIUMS[tier]["coverage"]
    freq = Decimal("0.08")
    if zone_data.get("zone_flood_history_high") or temporal_data.get("monsoon_season"):
        freq += Decimal("0.05")
    if zone_data.get("critical_aqi_zone"):
        freq += Decimal("0.04")
    return (base_cov * freq).quantize(Decimal("0.01"))


def calculate_weekly_premium(worker_profile, tier: str, week_start: date) -> dict[str, Any]:
    tier_key = (tier or "standard").lower()
    if tier_key not in BASE_PREMIUMS:
        tier_key = "standard"
    base = float(BASE_PREMIUMS[tier_key]["weekly"])
    zone_data = get_zone_risk_data(worker_profile.city_zone if worker_profile else "")
    temporal_data = get_temporal_risk(week_start)
    worker_data = get_worker_risk_history(worker_profile, week_start)
    multipliers_applied = []
    combined = 1.0
    for key, value in RISK_MULTIPLIERS.items():
        if should_apply_multiplier(key, zone_data, temporal_data, worker_data):
            combined *= value
            multipliers_applied.append(
                {
                    "factor": key,
                    "adjustment": f"{'+' if value > 1 else ''}{round((value - 1) * 100)}%",
                    "reason": MULTIPLIER_DESCRIPTIONS.get(key, key),
                }
            )

    if worker_profile and getattr(worker_profile, "grid_cell", None):
        hyper_mults = get_hyperlocal_multipliers(worker_profile.grid_cell)
        for h in hyper_mults:
            mult_val = h.get("multiplier", 1.0)
            combined *= mult_val
            h["adjustment"] = f"{'+' if mult_val > 1 else ''}{round((mult_val - 1) * 100)}%"
            multipliers_applied.append(h)

    final_premium = round(base * combined, 2)
    final_premium = max(15, min(75, final_premium))
    exp_loss = calculate_expected_loss(zone_data, tier_key, temporal_data)
    is_adequate = Decimal(str(final_premium)) >= exp_loss * Decimal("0.65")
    return {
        "base_premium": base,
        "final_premium": final_premium,
        "combined_multiplier": round(combined, 3),
        "multipliers_applied": multipliers_applied,
        "coverage_amount": float(BASE_PREMIUMS[tier_key]["coverage"]),
        "max_claims_per_week": BASE_PREMIUMS[tier_key]["max_claims_per_week"],
        "expected_loss_estimate": float(exp_loss),
        "premium_adequate": bool(is_adequate),
        "tier": tier_key,
        "week_start": week_start.isoformat(),
        "week_end": (week_start + timedelta(days=6)).isoformat(),
    }
