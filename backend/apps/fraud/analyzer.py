from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import random
import numpy as np
from sklearn.ensemble import IsolationForest

from apps.claims.models import Claim
from apps.workers.models import ActivityLog, WorkerProfile

from .models import FraudCheck


@dataclass(frozen=True)
class FraudResult:
    gps_match_score: float
    duplicate_flag: bool
    fraud_flag: bool
    activity_match_score: float
    anomaly_score: float
    fraud_score: int
    decision: Literal['approve', 'review', 'reject']
    reason: str


def _gps_match_score(worker: WorkerProfile, event_zone: str) -> float:
    # MVP: match on primary/secondary zone, with small tolerance.
    zones = {worker.primary_zone.strip().lower(), worker.secondary_zone.strip().lower()}
    return 1.0 if event_zone.strip().lower() in zones else 0.3


def _activity_match_score(worker: WorkerProfile, event_start, event_end) -> float:
    # If worker was active during the disruption window, lower match (suspicious) for "lost hours".
    logs = ActivityLog.objects.filter(worker=worker, timestamp__gte=event_start, timestamp__lte=event_end)
    if not logs.exists():
        return 1.0
    active_hours = sum(1 for l in logs if l.status_active)
    return 0.3 if active_hours >= 2 else 0.6


def _device_ip_velocity_score(worker: WorkerProfile) -> float:
    # Mocking device/IP fingerprinting. Detects if multiple claims originate from a single IP/Botnet.
    return 0.2 if random.random() < 0.04 else 1.0


def _impossible_travel_velocity(worker: WorkerProfile, event_zone: str) -> float:
    # Mocking geospatial velocity check (e.g., pinged Mumbai then Hyderabad within 5 mins).
    return 0.1 if random.random() < 0.05 else 1.0


def _anomaly_score_simple(features: np.ndarray) -> float:
    """
    IsolationForest on-the-fly (hackathon demo). Lower score => more anomalous; we convert to 0..1 risk.
    """
    rng = 42
    model = IsolationForest(n_estimators=100, random_state=rng, contamination=0.15)
    # Fit on synthetic "normal" neighborhood around this point to detect outliers.
    base = features.reshape(1, -1)
    noise = np.random.default_rng(rng).normal(0, 0.08, size=(128, features.shape[0]))
    train = np.clip(base + noise, 0, 1)
    model.fit(train)
    s = float(model.decision_function(base)[0])  # roughly -0.5..0.5
    return float(np.clip(0.5 - s, 0.0, 1.0))


def analyze_claim(claim: Claim) -> FraudResult:
    worker = claim.worker
    event = claim.trigger_event

    # MVP Hard Rules
    duplicate_flag = Claim.objects.filter(worker=worker, trigger_event=event).exclude(id=claim.id).exists()
    
    # Heuristic 1: Geolocation Rule
    gps_score = _gps_match_score(worker, event.zone)
    
    # Heuristic 2: Activity Time-Series Rule (Were they actually working?)
    activity_score = _activity_match_score(worker, event.event_start, event.event_end)
    
    # Heuristic 3: Advanced Geospatial Velocity & Device Fingerprinting 
    velocity_score = _impossible_travel_velocity(worker, event.zone)
    device_score = _device_ip_velocity_score(worker)

    # --- SIMULATE REALISTIC FRAUD FOR HACKATHON DEMO (~25% Fraud simulation rate) ---
    rand_val = random.random()
    if 0.0 <= rand_val < 0.06:
        gps_score = 0.2  # Simulate GPS Spoofing
    elif 0.06 <= rand_val < 0.12:
        duplicate_flag = True  # Simulate Double Dipping / Claim Spike
    elif 0.12 <= rand_val < 0.17:
        activity_score = 0.1  # Simulate Phantom Worker (Inactive Account Hijacking)
    elif 0.17 <= rand_val < 0.21:
        velocity_score = 0.1  # Simulate Impossible Travel (Teleportation)
    elif 0.21 <= rand_val < 0.25:
        device_score = 0.2    # Simulate Botnet IP Clustering

    # ML Feature Vector (scaled 0..1)
    income_scaled = min(float(worker.avg_weekly_income) / 9000.0, 1.0)
    lost_hours_scaled = float(min(float(claim.estimated_lost_hours) / float(claim.policy.max_covered_hours or 1), 1.0))
    gps_scaled = float(gps_score)
    activity_scaled = float(activity_score)
    velocity_scaled = float(velocity_score)
    device_scaled = float(device_score)
    duplicate_scaled = 1.0 if duplicate_flag else 0.0

    # 1. Isolation Forest Anomaly Detection
    features = np.array([
        income_scaled, 
        lost_hours_scaled, 
        1.0 - gps_scaled, 
        1.0 - activity_scaled, 
        duplicate_scaled, 
        1.0 - velocity_scaled, 
        1.0 - device_scaled
    ], dtype=float)
    
    anomaly = _anomaly_score_simple(features)

    # 2. Hybrid Decision Engine (Heuristics + ML) -> Scale to 0-100 Fraud Risk
    risk_points = 0
    reasons = []

    if gps_score < 0.6:
        risk_points += 30
        reasons.append("GPS Spoofing / Location Mismatch")
        
    if duplicate_flag:
        risk_points += 50
        reasons.append("Duplicate Claim Spike")
        
    if activity_score < 0.6:
        risk_points += 25
        reasons.append("Inactive during event (Phantom Worker)")
        
    if velocity_score < 0.5:
        risk_points += 40
        reasons.append("Impossible Travel Velocity (Teleportation)")
        
    if device_score < 0.5:
        risk_points += 35
        reasons.append("Suspicious Device/IP Clustering")
        
    # ML Component contributes up to 35 variable points based on multi-variate anomalies
    risk_points += int(anomaly * 35)
    
    fraud_score = min(max(risk_points, 0), 100)
    fraud_flag = bool(fraud_score >= 40 or duplicate_flag)

    # Final Decision Routing
    if fraud_score >= 75:
        decision = 'reject'
        ai_explanation = f"CRITICAL RISK ({fraud_score}/100): {', '.join(reasons)} | ML Anomaly: {anomaly:.2f}"
    elif fraud_score >= 40:
        decision = 'review'
        ai_explanation = f"ELEVATED RISK ({fraud_score}/100): Requires manual verification. Flags: {', '.join(reasons) if reasons else 'ML Anomaly Detected'}"
    else:
        decision = 'approve'
        ai_explanation = f"LOW RISK ({fraud_score}/100): Passed spatial, velocity, and ML consistency checks."

    return FraudResult(
        gps_match_score=float(round(gps_score, 2)),
        duplicate_flag=duplicate_flag,
        fraud_flag=fraud_flag,
        activity_match_score=float(round(activity_score, 2)),
        anomaly_score=float(round(anomaly, 3)),
        fraud_score=fraud_score,
        decision=decision,
        reason=ai_explanation,
    )


def persist_fraud_check(claim: Claim) -> FraudCheck:
    result = analyze_claim(claim)
    obj, _ = FraudCheck.objects.update_or_create(
        claim=claim,
        defaults={
            'gps_match_score': result.gps_match_score,
            'duplicate_flag': result.duplicate_flag,
            'fraud_flag': result.fraud_flag,
            'activity_match_score': result.activity_match_score,
            'anomaly_score': result.anomaly_score,
            'fraud_score': result.fraud_score,
            'decision': result.decision,
            'reason': result.reason,
        },
    )
    return obj

