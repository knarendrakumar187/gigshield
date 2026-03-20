from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

from django.db import models, transaction
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response

from apps.claims.models import Claim
from apps.fraud.analyzer import persist_fraud_check
from apps.payouts.models import Payout
from apps.policies.models import Policy
from apps.workers.models import WorkerProfile
import random

from .engine import TRIGGER_RULES, is_threshold_met
from .models import CrowdsourcedReport, TriggerEvent
from .serializers import TriggerEventSerializer
from .providers import fetch_live_conditions

import logging
logger = logging.getLogger(__name__)


def _derive_lost_hours(severity: int) -> int:
    return {1: 2, 2: 4, 3: 5, 4: 7, 5: 8}.get(int(severity or 1), 4)


class LiveTriggersView(generics.ListAPIView):
    serializer_class = TriggerEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TriggerEvent.objects.order_by('-created_at')[:50]


class MockTriggerCreateView(generics.CreateAPIView):
    serializer_class = TriggerEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        trigger_type = payload.get('trigger_type')
        rule = TRIGGER_RULES.get(trigger_type)
        payload['source_type'] = payload.get('source_type') or 'mock'
        payload['threshold_value'] = rule.threshold if rule else {}

        if not payload.get('event_start'):
            payload['event_start'] = timezone.now().isoformat()
        if not payload.get('event_end'):
            payload['event_end'] = (timezone.now() + timedelta(hours=6)).isoformat()
        if not payload.get('severity'):
            payload['severity'] = 3

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)

        source_value = serializer.validated_data.get('source_value') or {}
        
        # New Strict Validation Logic
        valid_keys = {
            'heavy_rain': ['rainfall_mm_6h'],
            'extreme_heat': ['temperature_c'],
            'severe_aqi': ['aqi'],
            'flood_alert': ['flood_alert'],
            'zone_closure': ['zone_closed'],
        }
        allowed = valid_keys.get(trigger_type, [])
        for k in source_value.keys():
            if k not in allowed:
                return Response({'error': f"Invalid field '{k}' for trigger type '{trigger_type}'"}, status=400)
        for k in allowed:
            if k not in source_value:
                return Response({'error': f"Missing required field '{k}' for trigger type '{trigger_type}'"}, status=400)

        if not is_threshold_met(trigger_type, source_value):
            return Response(
                {
                    'error': 'Threshold not met for this trigger type',
                    'expected_threshold': rule.threshold if rule else {},
                    'received_source_value': source_value,
                },
                status=400,
            )

        event = serializer.save()
        
        # Auto-evaluate Event (Trigger -> Engine -> Claim -> Fraud -> Payout)
        evaluation = EvaluateTriggersView._evaluate_event(event)
        
        return Response({
            'event': TriggerEventSerializer(event).data,
            'evaluation': evaluation
        })


class EvaluateTriggersView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    @staticmethod
    def _evaluate_event(event: TriggerEvent, *, estimated_lost_hours=None) -> dict:
        impacted_workers = list(WorkerProfile.objects.filter(city__iexact=event.city).filter(
            models.Q(primary_zone__iexact=event.zone) | models.Q(secondary_zone__iexact=event.zone)
        ))

        now = timezone.now()

        # DEMO FEATURE: Auto-generate 3-5 workers if not enough exist
        target_count = random.randint(3, 5)
        if len(impacted_workers) < target_count:
            from django.contrib.auth import get_user_model
            from apps.workers.models import ActivityLog
            User = get_user_model()
            needed = target_count - len(impacted_workers)
            for i in range(needed):
                u_name = f"demo_rider_{uuid4().hex[:4]}"
                new_user = User.objects.create_user(username=u_name, password="password123")
                w = WorkerProfile.objects.create(
                    user=new_user,
                    platform_name=random.choice(['Swiggy', 'Zomato', 'Zepto']),
                    city=event.city,
                    primary_zone=event.zone,
                    avg_weekly_hours=random.randint(40, 60),
                    avg_weekly_income=random.randint(2000, 5000),
                    preferred_work_start="08:00:00",
                    preferred_work_end="20:00:00",
                    device_id=f"device_{uuid4().hex[:8]}"
                )
                Policy.objects.create(
                    worker=w,
                    coverage_tier='standard',
                    policy_status=Policy.Status.ACTIVE,
                    active_from=now - timedelta(days=2),
                    active_to=now + timedelta(days=5),
                    weekly_premium=25.00,
                    max_covered_hours=10,
                    coverage_ratio=random.choice([0.5, 0.75, 1.0]),
                )
                
                # Push 1 worker into Fraud territory on purpose (Teleportation!)
                if i == 0:
                    ActivityLog.objects.create(
                        worker=w, timestamp=now - timedelta(minutes=5),
                        latitude=28.7041, longitude=77.1025, zone="Delhi" # Far away!
                    )

                impacted_workers.append(w)

        workers_count = len(impacted_workers)
        logger.info(f"Trigger {event.id}: Found {workers_count} impacted workers in {event.city} - {event.zone}.")

        created_claims = []
        claim_details = []
        auto_approved = 0
        flagged = 0
        total_payout = Decimal('0.00')
        active_policies_found = 0
        for worker in impacted_workers:
            policy = (
                Policy.objects.filter(
                    worker=worker,
                    policy_status=Policy.Status.ACTIVE,
                    active_from__lte=event.event_start,
                    active_to__gte=event.event_start,
                )
                .order_by('-active_from')
                .first()
            )
            if not policy:
                logger.info(f"Worker {worker.id}: No active policy found for event time.")
                continue
                
            active_policies_found += 1

            # Limit max claims per week to 3
            recent_claims = Claim.objects.filter(
                worker=worker, 
                created_at__gte=now - timedelta(days=7)
            ).count()
            if recent_claims >= 10: # Relaxed for hackathon demo to avoid 0 claims early
                logger.info(f"Worker {worker.id}: Reached weekly claim limit.")
                continue

            requested_lost = estimated_lost_hours
            if requested_lost is None:
                requested_lost = random.randint(3, 6)

            lost_hours = Decimal(str(requested_lost))
            lost_hours = min(lost_hours, Decimal(str(policy.max_covered_hours)))

            hourly = Decimal(str(worker.hourly_earnings))
            ratio = Decimal(str(policy.coverage_ratio))
            payout_amount = (lost_hours * hourly * ratio).quantize(Decimal('0.01'))

            # Cap loss ratio correction: Limit total payouts on this policy
            sum_agg = Claim.objects.filter(
                policy=policy, claim_status=Claim.Status.APPROVED
            ).aggregate(sum_p=models.Sum('payout_amount'))['sum_p']
            total_policy_payouts = sum_agg if sum_agg is not None else Decimal('0.00')

            cap_limit = policy.weekly_premium * Decimal('1.8')  # Force loss ratio approx 180% cap per policy

            if (total_policy_payouts + payout_amount) > cap_limit:
                payout_amount = cap_limit - total_policy_payouts
                if payout_amount <= Decimal('0.00'):
                    logger.info(f"Worker {worker.id}: Policy cap completely reached. Payout zeroed.")
                    continue  # Cap completely reached

            with transaction.atomic():
                claim, created = Claim.objects.get_or_create(
                    worker=worker,
                    policy=policy,
                    trigger_event=event,
                    defaults={
                        'estimated_lost_hours': lost_hours,
                        'payout_amount': payout_amount,
                    },
                )
                if not created:
                    logger.info(f"Worker {worker.id}: Claim already exists for event {event.id}.")
                    continue
                    
                logger.info(f"Worker {worker.id}: Created Claim {claim.id}. Running Fraud Check.")
                fraud_check = persist_fraud_check(claim)

                if fraud_check.decision == 'approve':
                    claim.claim_status = Claim.Status.APPROVED
                    claim.save(update_fields=['claim_status'])
                    auto_approved += 1

                    payout = Payout.objects.create(
                        claim=claim,
                        worker=worker,
                        payout_channel=worker.payout_method or 'UPI',
                        payout_status=Payout.Status.SUCCESS,
                        transaction_ref=f'MOCK-{uuid4().hex[:12].upper()}',
                        payout_amount=payout_amount,
                        processed_at=now,
                    )
                    total_payout += payout.payout_amount
                elif fraud_check.decision == 'review':
                    claim.claim_status = Claim.Status.REVIEW
                    claim.save(update_fields=['claim_status'])
                    flagged += 1
                else:
                    claim.claim_status = Claim.Status.REJECTED
                    claim.save(update_fields=['claim_status'])
                    flagged += 1

                created_claims.append(claim.id)
                claim_details.append({
                    'claim_id': claim.id,
                    'worker_name': worker.user.username,
                    'payout': float(payout_amount) if fraud_check.decision == 'approve' else 0.0,
                    'lost_hours': float(lost_hours),
                    'hourly_income': float(hourly),
                    'coverage_ratio': float(ratio),
                    'fraud_score': float(fraud_check.fraud_score),
                    'fraud_decision': fraud_check.decision,
                    'fraud_reason': fraud_check.reason
                })

        logger.info(f"Trigger {event.id}: Matched {active_policies_found} active policies. Created {len(created_claims)} claims.")

        return {
            'event_id': event.id,
            'affected_workers_count': workers_count,
            'created_claim_ids': created_claims,
            'claim_details': claim_details,
            'auto_approved_count': auto_approved,
            'flagged_count': flagged,
            'total_payout_amount': float(total_payout),
        }

    def post(self, request, *args, **kwargs):
        event_id = request.data.get('event_id')
        if not event_id:
            return Response({'error': 'event_id is required'}, status=400)

        event = TriggerEvent.objects.get(id=event_id)
        requested_lost = request.data.get('estimated_lost_hours')
        return Response(self._evaluate_event(event, estimated_lost_hours=requested_lost))

class PollLiveTriggersView(generics.GenericAPIView):
    """
    Free (no-key) integration: polls Open-Meteo for a city's current weather/AQI,
    creates threshold-met TriggerEvents, and can optionally auto-evaluate them into claims/payouts.
    """

    permission_classes = [permissions.IsAdminUser]

    def post(self, request, *args, **kwargs):
        city = (request.data.get('city') or 'Hyderabad').strip()
        zone = (request.data.get('zone') or 'Madhapur').strip()
        auto_evaluate = bool(request.data.get('auto_evaluate') or False)

        live = fetch_live_conditions(city)
        if not live:
            return Response({'error': f'No live provider mapping for city={city}. Add city mapping or use mocks.'}, status=400)

        created_events: list[TriggerEvent] = []
        now = timezone.now()

        for trigger_type, rule in TRIGGER_RULES.items():
            if not is_threshold_met(trigger_type, live.source_value):
                continue
            event = TriggerEvent.objects.create(
                trigger_type=trigger_type,
                city=city,
                zone=zone,
                source_type=live.source_type,
                source_value=live.source_value,
                threshold_value=rule.threshold,
                event_start=now,
                event_end=now + timedelta(hours=6),
                severity=3,
            )
            created_events.append(event)

        resp: dict = {
            'city': city,
            'zone': zone,
            'source_type': live.source_type,
            'source_value': live.source_value,
            'created_event_count': len(created_events),
            'events': TriggerEventSerializer(created_events, many=True).data,
        }

        if auto_evaluate and created_events:
            evaluations = [EvaluateTriggersView._evaluate_event(ev) for ev in created_events]
            resp['auto_evaluations'] = evaluations

        return Response(resp)


class FetchLiveDataView(generics.GenericAPIView):
    """
    Called by Admin UI to auto-fill the trigger simulator.
    Fetches real data via Open-Meteo if available, else returns realistic mocks.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        city = (request.data.get('city') or 'Hyderabad').strip()
        trigger_type = request.data.get('trigger_type')

        live = fetch_live_conditions(city)
        if live:
            return Response({'source': 'openmeteo', 'data': live.source_value})

        # Fallback to realistic mock values for the demo if city not mapped
        mock_data = {
            'temperature_c_3h': 35.0,
            'rainfall_mm_6h': 10.0,
            'aqi_4h': 150.0,
        }
        
        # Make the mock threshold-breaking if they selected a specific trigger
        if trigger_type == 'heavy_rain':
            mock_data['rainfall_mm_6h'] = random.uniform(55.0, 120.0)
        elif trigger_type == 'extreme_heat':
            mock_data['temperature_c_3h'] = random.uniform(43.0, 48.0)
        elif trigger_type == 'severe_aqi':
            mock_data['aqi_4h'] = random.uniform(420.0, 500.0)
        
        return Response({'source': 'mock', 'data': {
            'temperature_c_3h': round(mock_data['temperature_c_3h'], 2),
            'rainfall_mm_6h': round(mock_data['rainfall_mm_6h'], 2),
            'aqi_4h': round(mock_data['aqi_4h'], 2),
        }})


class WorkerCrowdReportView(generics.CreateAPIView):
    """
    Called by Worker UI (Worker Dashboard) when reporting a disruption natively.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # Prevent accessing worker_profile for non-worker accounts (like superusers visiting user dashboard config accidentally)
        if not hasattr(request.user, 'worker_profile'):
            return Response({'error': 'Admin accounts cannot natively crowd-report disruptions.'}, status=403)
            
        worker = request.user.worker_profile
        trigger_type = request.data.get('trigger_type')
        message = request.data.get('message', '')
        
        # Admin Demo Shortcut overriding the standard flow
        demo_force = request.data.get('demo_force') is True

        if not trigger_type:
            return Response({'error': 'trigger_type is required'}, status=400)

        now = timezone.now()

        # 1. Anti-spam/Fraud check: prevent identical user spamming the same disruption type
        is_duplicate = CrowdsourcedReport.objects.filter(
            worker=worker, trigger_type=trigger_type, reported_at__gte=now - timedelta(hours=3)
        ).exists()

        if is_duplicate and not demo_force:
            return Response({'error': 'You have already reported this disruption recently.'}, status=400)

        # 2. Record the Report
        report = CrowdsourcedReport.objects.create(
            worker=worker,
            trigger_type=trigger_type,
            city=worker.city,
            zone=worker.primary_zone,
            message=message
        )

        # Demo mode logic (simulate 5 extra reports immediately to reach consensus)
        if demo_force:
            # Seed 4 fake cluster buddies in the background to simulate rapid consensus
            for _ in range(4):
                # We use random workers from the DB just to bypass unique checks (or dummy entries)
                # But creating mock workers is slow, so we'll just fake it by directly setting the confidence flag higher
                pass

        # 3. Analyze Cluster Size (same zone + type + recent time window)
        cluster = CrowdsourcedReport.objects.filter(
            trigger_type=trigger_type,
            city=worker.city,
            zone=worker.primary_zone,
            reported_at__gte=now - timedelta(minutes=45),
            status=CrowdsourcedReport.Status.PENDING
        )

        # Distinct worker metric (vital for fraud weighting)
        distinct_reporters = cluster.values('worker').distinct().count()
        if demo_force:
            distinct_reporters += 4  # artificially pump the cluster size

        threshold_needed = 3
        confidence = min(1.0, float(distinct_reporters) / float(threshold_needed))

        # Update all matching pending clusters
        cluster.update(confidence_score=confidence)

        if distinct_reporters >= threshold_needed:
            # 4. HYBRID VALIDATION + THRESHOLD REACHED -> TRIGGER ENGINE!
            # We reached minimum consensus density!
            
            # (In production, we would inject an additional `fetch_live_conditions()` check here 
            # to boost confidence score combining AI and API.)

            event = TriggerEvent.objects.create(
                trigger_type=trigger_type,
                city=worker.city,
                zone=worker.primary_zone,
                source_type='crowdsourced',
                source_value={
                    'consensus_reports': distinct_reporters,
                    'confidence': confidence,
                    'demo_simulated': demo_force
                },
                threshold_value={'min_workers': threshold_needed},
                event_start=now - timedelta(minutes=30),
                event_end=now + timedelta(hours=6),
                severity=request.data.get('severity', 4)  # High severity assumed automatically for crowd
            )

            # Mark all pending cluster tickets as Verified against this new trigger
            cluster.update(status=CrowdsourcedReport.Status.VERIFIED, trigger_event=event)

            # Trigger the standard pipeline
            eval_results = EvaluateTriggersView._evaluate_event(event)

            return Response({
                'status': 'validated',
                'message': 'Cluster threshold met! Disruption validated and payout flow engaged.',
                'consensus_count': distinct_reporters,
                'confidence': confidence,
                'event_id': event.id,
                'evaluation': eval_results
            })

        return Response({
            'status': 'pending', 
            'message': 'Report submitted securely. Awaiting additional validation from nearby workers.',
            'consensus_count': distinct_reporters,
            'confidence': confidence,
            'reports_needed_to_trigger': threshold_needed - distinct_reporters
        })


class AdminCrowdReportView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        now = timezone.now()
        reports = CrowdsourcedReport.objects.order_by('-reported_at')[:50]
        data = []
        for r in reports:
            data.append({
                'id': r.id,
                'worker': r.worker.user.username,
                'city': r.city,
                'zone': r.zone,
                'trigger_type': r.trigger_type,
                'confidence_score': r.confidence_score,
                'status': r.status,
                'time': r.reported_at,
                'message': r.message
            })
            
        return Response({'reports': data})

class TriggerLocationsView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.workers.models import WorkerProfile
        from apps.triggers.models import CrowdsourcedReport
        locations = {}
        for w in WorkerProfile.objects.all():
            city = w.city.strip()
            zone = w.primary_zone.strip()
            if not city or not zone: continue
            
            if city not in locations:
                locations[city] = {}
            if zone not in locations[city]:
                report = CrowdsourcedReport.objects.filter(city__iexact=city, zone__iexact=zone).order_by('-reported_at').first()
                suggested = report.trigger_type if report else 'heavy_rain'
                locations[city][zone] = {'count': 0, 'suggested_trigger': suggested}
                
            locations[city][zone]['count'] += 1
            
        data = []
        for city, zones in locations.items():
            zone_list = [{'zone': z, 'worker_count': info['count'], 'suggested_trigger': info['suggested_trigger']} for z, info in zones.items()]
            data.append({'city': city, 'zones': zone_list})
            
        return Response({'locations': data})

