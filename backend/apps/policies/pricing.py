from __future__ import annotations

from dataclasses import dataclass

from apps.triggers.models import ZoneRiskScore
from apps.workers.models import WorkerProfile


@dataclass(frozen=True)
class TierConfig:
    tier: str
    max_covered_hours: int
    coverage_ratio: float
    base_premium: int


TIERS: dict[str, TierConfig] = {
    'basic': TierConfig(tier='basic', max_covered_hours=5, coverage_ratio=0.65, base_premium=22),
    'standard': TierConfig(tier='standard', max_covered_hours=8, coverage_ratio=0.80, base_premium=25),
    'plus': TierConfig(tier='plus', max_covered_hours=12, coverage_ratio=0.90, base_premium=35),
}


def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def get_zone_risk(worker: WorkerProfile) -> ZoneRiskScore | None:
    return ZoneRiskScore.objects.filter(city=worker.city, zone=worker.primary_zone).first()


def calculate_weekly_premium(worker: WorkerProfile, tier: str, suspicious_history: bool = False) -> tuple[float, float, dict]:
    """
    Weekly Premium = Base + ZoneRisk + Weather + Pollution + IncomeExposure + ClaimHistoryAdj - SafeDiscount
    Returns: (premium_amount, risk_score, pricing_factors)
    """
    cfg = TIERS.get(tier, TIERS['standard'])
    zone_risk = get_zone_risk(worker)

    rain = zone_risk.rain_risk_score if zone_risk else 0.3
    heat = zone_risk.heat_risk_score if zone_risk else 0.3
    aqi = zone_risk.aqi_risk_score if zone_risk else 0.3
    flood = zone_risk.flood_risk_score if zone_risk else 0.2
    closure = zone_risk.closure_risk_score if zone_risk else 0.2

    # Risk score (0..1) is used for UX + pricing explainability.
    # MVP upgrade: make it vary per worker, not only per zone.
    zone_base_risk = clamp((rain + heat + aqi + flood + closure) / 5.0, 0.0, 1.0)

    # Exposure signals (scaled 0..1)
    hours_scaled = clamp(worker.avg_weekly_hours / 60.0, 0.0, 1.0)  # 0..60+ hrs/week
    income_scaled = clamp(worker.avg_weekly_income / 9000.0, 0.0, 1.0)  # 0..₹9k+ per week
    history_scaled = 0.25 if suspicious_history else 0.0

    # Weighted blend: mostly zone-driven, but personalized by exposure + history.
    risk_score = clamp(
        (0.65 * zone_base_risk) + (0.20 * hours_scaled) + (0.15 * income_scaled) + history_scaled,
        0.0,
        1.0,
    )

    zone_risk_add = 2 + 8 * risk_score
    weather_risk_add = 2 + 6 * ((rain + flood + heat) / 3.0)
    pollution_risk_add = 1 + 5 * aqi

    income_exposure_add = clamp(worker.avg_weekly_income / 1500.0, 0.0, 6.0)  # ₹4.5k→3, ₹9k→6

    claim_history_adj = 6.0 if suspicious_history else -2.0
    safe_discount = 2.0 if not suspicious_history else 0.0

    from sklearn.ensemble import RandomForestRegressor
    import numpy as np

    base_calc = (
        cfg.base_premium
        + zone_risk_add
        + weather_risk_add
        + pollution_risk_add
        + income_exposure_add
        + claim_history_adj
        - safe_discount
    )

    # ML Premium Prediction (Hackathon demo wrapper)
    rng = 42
    model = RandomForestRegressor(n_estimators=10, random_state=rng)
    # Fit on synthetic historical data representing previous weeks
    features_base = np.array([zone_base_risk, hours_scaled, income_scaled, history_scaled])
    noise = np.random.default_rng(rng).normal(0, 0.1, size=(50, 4))
    X_train = np.clip(features_base + noise, 0, 1)
    
    # Target: Base calculations with some historical variance
    y_train = []
    for f in X_train:
        # Reconstruct rough premium
        synthetic_prem = cfg.base_premium + (10 * f[0]) + (5 * f[1]) + (6 * f[2]) + (10 * f[3])
        y_train.append(synthetic_prem)
        
    model.fit(X_train, np.array(y_train))
    ml_predicted_premium = float(model.predict(features_base.reshape(1, -1))[0])
    
    # Blended premium: 50% rules + 50% ML prediction
    premium = (base_calc + ml_predicted_premium) / 2.0

    premium = float(round(clamp(premium, 19.0, 55.0), 0))
    factors = {
        'base_premium': cfg.base_premium,
        'zone_base_risk': round(zone_base_risk, 3),
        'exposure_hours_scaled': round(hours_scaled, 3),
        'exposure_income_scaled': round(income_scaled, 3),
        'history_risk_add': round(history_scaled, 3),
        'zone_risk_add': round(zone_risk_add, 2),
        'weather_risk_add': round(weather_risk_add, 2),
        'pollution_risk_add': round(pollution_risk_add, 2),
        'income_exposure_add': round(income_exposure_add, 2),
        'claim_history_adjustment': round(claim_history_adj, 2),
        'safe_behavior_discount': round(safe_discount, 2),
        'risk_score': round(risk_score, 3),
    }
    return premium, float(risk_score), factors

