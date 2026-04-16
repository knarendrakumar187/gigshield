from datetime import timedelta

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.db import models
from django.db.models import Avg, Count, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from claims.models import Claim, FraudLog
from claims.serializers import ClaimSerializer
from policies.financial_model import calculate_weekly_financials, is_premium_adequate
from policies.models import ActuarialReserve, WeeklyPolicy
from triggers.models import DisruptionTrigger
from triggers.serializers import DisruptionTriggerSerializer, SimulateTriggerSerializer
from triggers.tasks import process_trigger_claims
from workers.models import User
from workers.permissions import IsAdminRole
from workers.serializers import UserSerializer


class AdminDashboardView(APIView):
    permission_classes = (IsAdminRole,)

    def get(self, request):
        today = timezone.localdate()
        ws = today - timedelta(days=today.weekday())
        policies_ws = WeeklyPolicy.objects.filter(week_start=ws)
        prem = policies_ws.aggregate(s=Sum("premium_paid"))["s"] or 0
        claims_ws = Claim.objects.filter(policy__week_start=ws)
        paid = claims_ws.filter(status="APPROVED").aggregate(s=Sum("approved_amount"))["s"] or 0
        loss_ratio = float(paid / prem) if prem else 0
        fraud_avg = claims_ws.aggregate(a=Avg("fraud_score"))["a"] or 0
        workers_n = User.objects.filter(role=User.Role.WORKER).count()
        active_workers = WeeklyPolicy.objects.filter(status="ACTIVE").values("worker_id").distinct().count()
        active_policies = WeeklyPolicy.objects.filter(status="ACTIVE").count()
        triggers_fired = DisruptionTrigger.objects.filter(triggered_at__gte=timezone.now() - timedelta(days=7)).count()
        fraud_flagged = Claim.objects.filter(fraud_score__gte=60).count()
        awaiting_review = Claim.objects.filter(status=Claim.Status.MANUAL_REVIEW).count()
        reserves = list(ActuarialReserve.objects.order_by("-week_start")[:8])
        sla = []
        for c in Claim.objects.filter(processed_at__isnull=False).select_related("trigger").order_by("-id")[:100]:
            if c.trigger:
                sla.append((c.processed_at - c.trigger.triggered_at).total_seconds())
        avg_sla = sum(sla) / len(sla) if sla else 0
        active_cov = WeeklyPolicy.objects.filter(status="ACTIVE").aggregate(s=Sum("coverage_amount"))["s"] or 0
        reserve_held = float(active_cov) * 0.30 if active_cov else 0

        active_worker_qs = (
            WeeklyPolicy.objects.filter(status="ACTIVE")
            .select_related("worker")
            .order_by("-week_start")
        )
        active_worker_ids = []
        active_workers_details = []
        for p in active_worker_qs:
            if p.worker_id in active_worker_ids:
                continue
            active_worker_ids.append(p.worker_id)
            active_workers_details.append(
                {
                    "worker_id": p.worker_id,
                    "name": (p.worker.get_full_name() or p.worker.username),
                    "city": p.worker.city,
                    "zone": p.worker.zone,
                    "platform": p.worker.platform,
                    "tier": p.tier,
                    "week_start": p.week_start,
                    "week_end": p.week_end,
                    "coverage_amount": str(p.coverage_amount),
                    "premium_paid": str(p.premium_paid),
                }
            )

        # Claims queue for all active workers: include a "no claim yet" row when absent.
        latest_claim_by_worker = {}
        latest_claims = (
            Claim.objects.filter(worker_id__in=active_worker_ids)
            .select_related("worker", "trigger")
            .order_by("worker_id", "-created_at")
        )
        for c in latest_claims:
            if c.worker_id not in latest_claim_by_worker:
                latest_claim_by_worker[c.worker_id] = c

        queue_out = []
        for w in active_workers_details:
            worker_id = w["worker_id"]
            c = latest_claim_by_worker.get(worker_id)
            if not c:
                queue_out.append(
                    {
                        "id": None,
                        "status": "NO_CLAIM_YET",
                        "worker": {
                            "id": worker_id,
                            "name": w["name"],
                            "city": w["city"],
                            "zone": w["zone"],
                            "platform": w["platform"],
                        },
                        "trigger": {
                            "type": None,
                            "city": w["city"],
                            "zone": w["zone"],
                            "severity": None,
                            "duration_hours": None,
                        },
                        "fraud_score": 0.0,
                        "fraud_flags": [],
                        "claimed_amount": "0",
                        "created_at": None,
                    }
                )
                continue

            flags = c.fraud_flags or []
            queue_out.append(
                {
                    "id": c.id,
                    "status": c.status,
                    "worker": {
                        "id": c.worker_id,
                        "name": (c.worker.get_full_name() or c.worker.username),
                        "city": c.worker.city,
                        "zone": c.worker.zone,
                        "platform": c.worker.platform,
                    },
                    "trigger": {
                        "type": getattr(c.trigger, "trigger_type", None),
                        "city": getattr(c.trigger, "city", ""),
                        "zone": getattr(c.trigger, "zone", ""),
                        "severity": getattr(c.trigger, "severity", None),
                        "duration_hours": getattr(c.trigger, "duration_hours", None),
                    },
                    "fraud_score": float(c.fraud_score or 0),
                    "fraud_flags": flags,
                    "claimed_amount": str(c.claimed_amount),
                    "created_at": c.created_at,
                }
            )

        # Risk leaderboard: workers ranked by max fraud score in last 30 days
        since = timezone.now() - timedelta(days=30)
        leaderboard_rows = (
            Claim.objects.filter(created_at__gte=since)
            .values("worker_id", "worker__city", "worker__platform", "worker__username", "worker__first_name", "worker__last_name")
            .annotate(
                max_score=models.Max("fraud_score"),
                claims_n=Count("id"),
            )
            .order_by("-max_score", "-claims_n")[:12]
        )
        leaderboard = []
        for r in leaderboard_rows:
            nm = " ".join([x for x in [r.get("worker__first_name"), r.get("worker__last_name")] if x]).strip() or r.get("worker__username")
            leaderboard.append(
                {
                    "worker_id": r["worker_id"],
                    "name": nm,
                    "city": r.get("worker__city") or "",
                    "platform": r.get("worker__platform") or "",
                    "claims": r.get("claims_n") or 0,
                    "score": float(r.get("max_score") or 0),
                }
            )

        # Recent triggers
        recent_triggers = [
            {
                "id": t.id,
                "trigger_type": t.trigger_type,
                "city": t.city,
                "zone": t.zone,
                "severity": t.severity,
                "triggered_at": t.triggered_at,
                "affected_workers_count": t.affected_workers_count,
                "total_payout_triggered": str(t.total_payout_triggered),
            }
            for t in DisruptionTrigger.objects.order_by("-triggered_at")[:25]
        ]

        # Weekly premiums vs payouts (for chart)
        weekly_series = [
            {
                "week_start": str(r.week_start),
                "premiums": str(r.total_premiums_collected),
                "payouts": str(r.total_claims_paid),
            }
            for r in reversed(reserves)
        ]

        # Claim outcomes for the current week
        outcomes = {
            "APPROVED": claims_ws.filter(status=Claim.Status.APPROVED).count(),
            "REJECTED": claims_ws.filter(status=Claim.Status.REJECTED).count(),
        }

        # Fraud heatmap by zone (using avg fraud score lookback)
        heat_rows = (
            Claim.objects.filter(created_at__gte=since)
            .values("worker__zone")
            .annotate(
                n=Count("id"),
                flagged=Count("id", filter=models.Q(fraud_score__gte=60)),
                avg_score=Avg("fraud_score"),
            )
            .order_by("-n")[:12]
        )
        heatmap = []
        for r in heat_rows:
            zone = r.get("worker__zone") or ""
            avg_score = float(r.get("avg_score") or 0)
            heat_score = int(round(avg_score))
            if heat_score <= 24:
                category = "SAFE"
            elif heat_score <= 49:
                category = "WATCH"
            elif heat_score <= 74:
                category = "ALERT"
            else:
                category = "CRITICAL"
            heatmap.append(
                {
                    "zone": zone,
                    "claims": r.get("n") or 0,
                    "flagged": r.get("flagged") or 0,
                    "heat_score": heat_score,
                    "category": category,
                }
            )

        # Actuarial health panel values from latest reserve row
        latest = reserves[0] if reserves else None
        profit_margin = None
        over_target = None
        expense_ratio = None
        if latest:
            expense_ratio = latest.expense_ratio
            combined_ratio = latest.combined_ratio
            profit_margin = max(0.0, 1.0 - combined_ratio)
            over_target = profit_margin >= 0.15
        actuarial_health = {
            "loss_ratio": getattr(latest, "loss_ratio", 0) if latest else 0,
            "expense_ratio": expense_ratio,
            "profit_margin": profit_margin,
            "combined_ratio": getattr(latest, "combined_ratio", 0) if latest else 0,
            "over_target": over_target,
        }

        return Response(
            {
                "week_start": str(ws),
                "premiums_collected": str(prem),
                "claims_paid": str(paid),
                "loss_ratio": round(loss_ratio, 4),
                "loss_ratio_target_band": [0.60, 0.65],
                "fraud_score_avg": round(fraud_avg, 2),
                "active_workers": workers_n,
                "active_workers_with_policy": active_workers,
                "active_policies": active_policies,
                "fraud_flagged": fraud_flagged,
                "triggers_fired_7d": triggers_fired,
                "awaiting_review": awaiting_review,
                "solvency_margin_latest": reserves[0].solvency_margin if reserves else None,
                "avg_trigger_to_payout_seconds": round(avg_sla, 2),
                "reserve_held": reserve_held,
                "max_exposure": str(active_cov),
                "claims_queue": queue_out,
                "active_workers_details": active_workers_details,
                "risk_leaderboard": leaderboard,
                "recent_triggers": recent_triggers,
                "weekly_premium_vs_payouts": weekly_series,
                "claim_outcomes": outcomes,
                "fraud_heatmap_by_zone": heatmap,
                "actuarial_health": actuarial_health,
                "actuarial_recent": [
                    {
                        "week_start": str(r.week_start),
                        "loss_ratio": r.loss_ratio,
                        "combined_ratio": r.combined_ratio,
                        "solvency_margin": r.solvency_margin,
                    }
                    for r in reserves
                ],
            }
        )


class AdminWorkersView(APIView):
    permission_classes = (IsAdminRole,)

    def get(self, request):
        qs = (
            User.objects.filter(role=User.Role.WORKER, weekly_policies__status="ACTIVE")
            .select_related("worker_profile")
            .distinct()
        )
        return Response(UserSerializer(qs, many=True).data)


class AdminFraudAlertsView(APIView):
    permission_classes = (IsAdminRole,)

    def get(self, request):
        logs = FraudLog.objects.filter(result="FAIL").select_related("claim").order_by("-checked_at")[:100]
        return Response(
            [
                {
                    "id": L.id,
                    "claim_id": L.claim_id,
                    "check_type": L.check_type,
                    "details": L.details,
                    "checked_at": L.checked_at,
                }
                for L in logs
            ]
        )


class AdminTriggerCreateView(APIView):
    permission_classes = (IsAdminRole,)

    def post(self, request):
        ser = SimulateTriggerSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        tr = DisruptionTrigger.objects.create(
            trigger_type=d["trigger_type"],
            city=d["city"],
            zone=d["zone"],
            severity=d["severity"],
            threshold_value=d["threshold_value"],
            actual_value=d["actual_value"],
            triggered_at=timezone.now(),
            duration_hours=d["duration_hours"],
            source=d.get("source") or "admin",
            affected_lat=d.get("affected_lat"),
            affected_lon=d.get("affected_lon"),
            radius_km=d.get("radius_km") or 5.0,
        )
        if settings.DEBUG:
            process_trigger_claims.apply(args=(tr.id,))
        else:
            process_trigger_claims.delay(tr.id)
        return Response(DisruptionTriggerSerializer(tr).data, status=status.HTTP_201_CREATED)


class AdminClaimReviewView(APIView):
    permission_classes = (IsAdminRole,)

    def patch(self, request, pk):
        claim = get_object_or_404(Claim, pk=pk)
        action = request.data.get("action")
        if action == "approve":
            claim.status = Claim.Status.APPROVED
            claim.approved_amount = claim.claimed_amount
        elif action == "reject":
            claim.status = Claim.Status.REJECTED
            from decimal import Decimal

            claim.approved_amount = Decimal("0")
        else:
            return Response({"error": "action approve|reject"}, status=400)
        claim.processed_at = timezone.now()
        claim.save()
        if claim.status == Claim.Status.APPROVED:
            from payouts.services import process_payout_task

            # In local DEBUG mode we don't want Celery/Redis dependency to break the admin UI.
            if settings.DEBUG:
                process_payout_task.apply(args=(claim.id,))
            else:
                process_payout_task.delay(claim.id)
        return Response(ClaimSerializer(claim).data)


class AdminActuarialView(APIView):
    permission_classes = (IsAdminRole,)

    def get(self, request):
        today = timezone.localdate()
        ws = today - timedelta(days=today.weekday())
        row = calculate_weekly_financials(ws)
        series = list(ActuarialReserve.objects.order_by("-week_start")[:24])
        return Response(
            {
                "current": {
                    "week_start": str(row.week_start),
                    "premiums": str(row.total_premiums_collected),
                    "claims_paid": str(row.total_claims_paid),
                    "loss_ratio": row.loss_ratio,
                    "combined_ratio": row.combined_ratio,
                    "solvency_margin": row.solvency_margin,
                },
                "series": [
                    {"week_start": str(x.week_start), "loss_ratio": x.loss_ratio, "premiums": str(x.total_premiums_collected)}
                    for x in reversed(series)
                ],
            }
        )


class AdminAdequacyView(APIView):
    permission_classes = (IsAdminRole,)

    def get(self, request):
        zones = request.query_params.getlist("zone") or ["Andheri West", "Koramangala", "Connaught Place"]
        tiers = ["basic", "standard", "premium"]
        out = []
        for z in zones:
            for t in tiers:
                out.append(is_premium_adequate(z, t))
        return Response({"adequacy": out})


class AdminManualReviewQueueView(APIView):
    permission_classes = (IsAdminRole,)

    def get(self, request):
        qs = Claim.objects.filter(status=Claim.Status.MANUAL_REVIEW).select_related("worker", "trigger")
        return Response(ClaimSerializer(qs, many=True).data)


class FraudHeatmapView(APIView):
    permission_classes = (IsAdminRole,)

    def get(self, request):
        rows = (
            Claim.objects.values("worker__zone")
            .annotate(n=Count("id"), high_risk=Count("id", filter=models.Q(fraud_score__gte=60)))
            .order_by("-n")[:30]
        )
        return Response(list(rows))

class AdminWorkerBehaviorView(APIView):
    permission_classes = (IsAdminRole,)

    def get(self, request, pk):
        from ml_app.models import WorkerBehaviorProfile
        try:
            profile = WorkerBehaviorProfile.objects.get(worker_id=pk)
            return Response({
                "avg_claims_per_week_3m": profile.avg_claims_per_week_3m,
                "avg_claims_per_week_6m": profile.avg_claims_per_week_6m,
                "max_claims_in_any_week": profile.max_claims_in_any_week,
                "weeks_since_last_claim": profile.weeks_since_last_claim,
                "avg_approved_amount": profile.avg_approved_amount,
                "std_approved_amount": profile.std_approved_amount,
                "max_approved_amount": profile.max_approved_amount,
                "amount_volatility": profile.amount_volatility,
                "typical_claim_hours": profile.typical_claim_hours,
                "claims_on_weekends_ratio": profile.claims_on_weekends_ratio,
                "claims_in_monsoon_ratio": profile.claims_in_monsoon_ratio,
                "avg_zone_match_score": profile.avg_zone_match_score,
                "location_consistency": profile.location_consistency,
                "trigger_type_distribution": profile.trigger_type_distribution,
                "claims_per_trigger_type": profile.claims_per_trigger_type,
                "has_prior_fraud_flag": profile.has_prior_fraud_flag,
                "prior_rejected_claims_count": profile.prior_rejected_claims_count,
                "appeal_success_rate": profile.appeal_success_rate,
                "total_claims_analyzed": profile.total_claims_analyzed,
                "profile_confidence": profile.profile_confidence,
            })
        except WorkerBehaviorProfile.DoesNotExist:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

