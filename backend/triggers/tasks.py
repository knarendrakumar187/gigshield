"""Celery tasks: weather monitoring and claim processing."""
from __future__ import annotations

import os
import random
import uuid
from decimal import Decimal

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from claims.exclusions import ExclusionEngine
from claims.models import Claim
from claims.payout_calc import calculate_payout
from ml_app.fraud_detection import run_full_fraud_detection
from policies.models import WeeklyPolicy
from triggers.models import DisruptionTrigger, GovernmentAlert, MunicipalAlert
from triggers.weather import fetch_open_meteo


@shared_task(bind=True, max_retries=3)
def monitor_weather_triggers(self):
    from triggers.models import City

    for city in City.objects.filter(monitoring_active=True):
        try:
            demo_force = os.environ.get("GIGSHIELD_DEMO_FORCE_TRIGGER") == "1"
            if demo_force:
                # Keep demo fast + deterministic: don't hit external APIs and don't loop all cities.
                # This ensures the solo worker can immediately proceed to claim creation tasks.
                demo_city = (os.environ.get("GIGSHIELD_DEMO_FORCE_CITY") or "Mumbai").strip().lower()
                demo_kind = (os.environ.get("GIGSHIELD_DEMO_FORCE_KIND") or "RAIN").strip().upper()
                if city.name.strip().lower() != demo_city:
                    continue
                # Force metrics high/low enough to trip the selected trigger kind.
                data = {"rain_6h": 0.0, "temperature_2m_max": 34.0, "aqi": 80.0}
                if demo_kind == "RAIN":
                    data["rain_6h"] = 120.0
                elif demo_kind == "HEAT":
                    data["temperature_2m_max"] = 46.0
                elif demo_kind == "AQI":
                    data["aqi"] = 420.0
            else:
                data = fetch_open_meteo(city.lat, city.lon)
            triggered_ids = []
            zone = city.default_zone or city.name
            if data["rain_6h"] > 50:
                src = "demo_force" if demo_force else "open_meteo"
                triggered_ids.append(_fire_trigger("RAIN", city, data["rain_6h"], 50.0, zone=zone, source=src))
            if data["temperature_2m_max"] > 42:
                src = "demo_force" if demo_force else "open_meteo"
                triggered_ids.append(_fire_trigger("HEAT", city, data["temperature_2m_max"], 42.0, zone=zone, source=src))
            if data.get("aqi", 0) > 350:
                src = "demo_force" if demo_force else "open_meteo"
                triggered_ids.append(_fire_trigger("AQI", city, data["aqi"], 350.0, zone=zone, source=src))
            for m in MunicipalAlert.objects.filter(city=city.name, is_active=True, alert_type="FLOOD"):
                triggered_ids.append(
                    _fire_trigger("FLOOD", city, float(m.severity * 20), float(m.severity), zone=m.zone or "")
                )
            for tid in filter(None, triggered_ids):
                process_trigger_claims.delay(tid)
        except Exception as exc:
            self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3)
def poll_weather_triggers(self):
    """Compatibility alias used by diagnostics and beat schedule."""
    return monitor_weather_triggers.apply().get()


@shared_task(bind=True, max_retries=3)
def poll_government_alerts(self):
    from datetime import timedelta

    from triggers.models import City

    fired = []
    for alert in GovernmentAlert.objects.filter(is_active=True):
        city = City.objects.filter(name__iexact=alert.city).first()
        if not city:
            continue
        trigger_type = "CURFEW" if alert.alert_type in {"LOCKDOWN", "DISASTER_ACT"} else "ZONE_CLOSURE"
        zone = city.default_zone or city.name
        recent = DisruptionTrigger.objects.filter(
            city=city.name,
            zone=zone,
            trigger_type=trigger_type,
            source="government_alert",
            triggered_at__gte=timezone.now() - timedelta(hours=6),
        ).exists()
        if recent:
            continue
        trigger_id = _fire_trigger(
            trigger_type,
            city,
            actual=1.0,
            threshold=1.0,
            zone=zone,
            duration_hours=6,
            source="government_alert",
        )
        fired.append(trigger_id)
        if settings.DEBUG:
            process_trigger_claims.apply(args=(trigger_id,))
        else:
            process_trigger_claims.delay(trigger_id)
    return {"fired": len(fired), "trigger_ids": fired}


@shared_task(bind=True, max_retries=3)
def poll_traffic_disruptions(self):
    """Low-frequency mock traffic closures for demo environments."""
    from datetime import timedelta

    from triggers.models import City

    fired = []
    for city in City.objects.filter(monitoring_active=True):
        if random.random() >= 0.02:
            continue
        zone = city.default_zone or city.name
        recent = DisruptionTrigger.objects.filter(
            city=city.name,
            zone=zone,
            trigger_type="ZONE_CLOSURE",
            source="traffic_mock",
            triggered_at__gte=timezone.now() - timedelta(hours=1),
        ).exists()
        if recent:
            continue
        trigger_id = _fire_trigger(
            "ZONE_CLOSURE",
            city,
            actual=1.0,
            threshold=1.0,
            zone=zone,
            duration_hours=2,
            source="traffic_mock",
        )
        fired.append(trigger_id)
        if settings.DEBUG:
            process_trigger_claims.apply(args=(trigger_id,))
        else:
            process_trigger_claims.delay(trigger_id)
    return {"fired": len(fired), "trigger_ids": fired}


def _fire_trigger(
    kind: str,
    city,
    actual: float,
    threshold: float,
    zone: str = "",
    duration_hours: float = 3,
    source: str = "open_meteo",
):
    from datetime import timedelta

    z = zone or city.default_zone or city.name
    recent = DisruptionTrigger.objects.filter(
        trigger_type=kind,
        city=city.name,
        zone=z,
        source=source,
        triggered_at__gte=timezone.now() - timedelta(hours=1),
    ).first()
    if recent:
        return recent.id
    if kind == "RAIN":
        sev = 1 if actual <= 75 else 2 if actual <= 100 else 3 if actual <= 150 else 4 if actual <= 200 else 5
    elif kind == "HEAT":
        sev = min(5, max(1, int((actual - 40) / 2)))
    else:
        sev = min(5, max(1, int(actual / 100)))
    tr = DisruptionTrigger.objects.create(
        trigger_type=kind,
        city=city.name,
        zone=z,
        severity=sev,
        threshold_value=float(threshold),
        actual_value=float(actual),
        triggered_at=timezone.now(),
        duration_hours=duration_hours,
        source=source,
    )
    return tr.id


@shared_task
def process_trigger_claims(trigger_id: int):
    from payouts.services import process_payout_task

    trigger = DisruptionTrigger.objects.get(id=trigger_id)
    if trigger.is_excluded_event:
        return {"skipped": True, "reason": trigger.exclusion_reason}
    exclusion_engine = ExclusionEngine()
    week_date = trigger.triggered_at.date()

    if trigger.affected_lat and trigger.affected_lon and trigger.radius_km:
        from math import radians, cos, sin, asin, sqrt
        from workers.models import GridCell
        def haversine(lat1, lon1, lat2, lon2):
            R = 6371  # Earth radius km
            dlat = radians(lat2 - lat1)
            dlon = radians(lon2 - lon1)
            a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
            return R * 2 * asin(sqrt(a))

        affected_cells = [
            cell for cell in GridCell.objects.filter(city=trigger.city)
            if haversine(trigger.affected_lat, trigger.affected_lon,
                        cell.center_lat, cell.center_lon) <= trigger.radius_km
        ]
        affected_cell_ids = [c.id for c in affected_cells]
        
        trigger.affected_cell_ids = affected_cell_ids
        trigger.save(update_fields=['affected_cell_ids'])

        affected = WeeklyPolicy.objects.filter(
            worker__worker_profile__grid_cell_id__in=affected_cell_ids,
            status="ACTIVE",
            week_start__lte=week_date,
            week_end__gte=week_date
        ).select_related("worker")
    else:
        # Fallback: zone-level matching (existing behavior)
        query = {
            "status": "ACTIVE",
            "week_start__lte": week_date,
            "week_end__gte": week_date,
        }
        if trigger.city and trigger.city != "ALL":
            query["worker__city"] = trigger.city
        if trigger.zone and trigger.zone != "ALL":
            query["worker__zone"] = trigger.zone

        affected = WeeklyPolicy.objects.filter(**query).select_related("worker")
    results = []
    for policy in affected:
        worker = policy.worker
        ex = exclusion_engine.check_claim(None, trigger, policy)
        if ex["is_excluded"]:
            continue
        payout_calc = calculate_payout(worker, trigger, policy)
        if payout_calc["excluded"]:
            continue
        duplicate = Claim.objects.filter(worker=worker, trigger=trigger)
        if duplicate.exists():
            continue
        best_amount = payout_calc["amount"]
        related_ids = [trigger.id]
        for other in (
            DisruptionTrigger.objects.filter(city=trigger.city, zone=trigger.zone, triggered_at__date=trigger.triggered_at.date())
            .exclude(id=trigger.id)
            .filter(is_active=True)
        ):
            alt = calculate_payout(worker, other, policy)
            if not alt["excluded"] and alt["amount"] > best_amount:
                best_amount = alt["amount"]
                related_ids = [other.id, trigger.id]
        claim = Claim.objects.create(
            worker=worker,
            policy=policy,
            trigger=trigger,
            claimed_amount=best_amount,
            approved_amount=Decimal("0"),
            exclusion_check_passed=True,
            payout_calculation=payout_calc.get("calculation", {}),
            related_trigger_ids=related_ids,
        )

        # Rich fraud context (improves GPS-spoof + behavioral signals for the demo).
        from datetime import timedelta

        from django.db.models import Avg

        from policies.models import ExclusionAcknowledgment

        now = timezone.now()
        ack = ExclusionAcknowledgment.objects.filter(policy=policy).first()
        ip_address = str(ack.ip_address) if ack and ack.ip_address else None

        zone_match_score = 0.95 if str(worker.zone).strip() == str(trigger.zone).strip() else 0.4
        peer_den = max(WeeklyPolicy.objects.filter(worker__zone=trigger.zone, status="ACTIVE").count(), 1)
        peer_n = Claim.objects.filter(worker__zone=trigger.zone, created_at__gte=now - timedelta(days=7)).count()
        peer_claim_ratio = float(peer_n) / float(peer_den)

        hist = worker.claims.filter(created_at__gte=now - timedelta(days=30)).aggregate(a=Avg("fraud_score"))["a"]
        historical_fraud_score_avg = float(hist or 25.0)

        # `gps_zone` is treated as "where the worker claims to be". For precise radius triggers,
        # we may include workers outside `trigger.zone`, letting the fraud engine detect mismatches.
        metadata = {
            "zone_match_score": zone_match_score,
            "device_consistency_score": 0.95,
            "peer_claim_ratio": peer_claim_ratio,
            "historical_fraud_score_avg": historical_fraud_score_avg,
            "gps_zone": trigger.zone,
            "ip_address": ip_address,
        }
        fraud = run_full_fraud_detection(claim, trigger, worker, metadata)
        claim.fraud_score = fraud["fraud_score"]
        claim.fraud_flags = fraud["hard_fails"] + fraud["warnings"]
        claim.fraud_model_version = fraud["model_version"]
        claim.status = fraud["status"]
        claim.approved_amount = best_amount if fraud["status"] == "APPROVED" else Decimal("0")
        claim.auto_processed = True
        claim.processed_at = timezone.now()
        if ex.get("exclusion_id"):
            claim.exclusion_id = ex["exclusion_id"]
        claim.save()
        
        # Ensure behavior profiles are updated async later
        from ml_app.tasks import update_worker_behavior_profile
        from django.conf import settings
        if settings.DEBUG:
            update_worker_behavior_profile.apply(args=(worker.id, claim.id))
        else:
            update_worker_behavior_profile.delay(worker.id, claim.id)

        if claim.status == "APPROVED":
            if settings.DEBUG:
                process_payout_task.apply(args=(claim.id,))
            else:
                process_payout_task.delay(claim.id)
        results.append({"worker": worker.id, "status": claim.status, "amount": str(claim.approved_amount)})
    total = sum(Decimal(str(r["amount"])) for r in results if r["status"] == "APPROVED")
    trigger.affected_workers_count = len(results)
    trigger.total_payout_triggered = total
    trigger.save(update_fields=["affected_workers_count", "total_payout_triggered"])
    return results


