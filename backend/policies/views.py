from datetime import date, datetime, timedelta
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from policies.models import ExclusionAcknowledgment, WeeklyPolicy
from policies.premium_engine import calculate_weekly_premium
from policies.serializers import PurchaseSerializer, WeeklyPolicySerializer
from workers.models import WorkerProfile


def _run_auto_purchase_demo(policy, worker_profile):
    """
    After a worker buys a weekly policy, create one targeted parametric trigger
    so the user immediately sees the automatic claim flow without admin action.
    Works in both DEBUG and production mode.
    """
    from django.conf import settings
    from claims.models import Claim
    from triggers.models import DisruptionTrigger
    from triggers.tasks import process_trigger_claims

    if Claim.objects.filter(policy=policy).exists():
        return

    recent = DisruptionTrigger.objects.filter(
        source="AUTO_PURCHASE_DEMO",
        city=policy.worker.city,
        zone=policy.worker.zone,
        triggered_at__gte=timezone.now() - timedelta(hours=1)
    ).first()

    if recent:
        trigger = recent
    else:
        trigger = DisruptionTrigger.objects.create(
            trigger_type="RAIN",
            city=policy.worker.city,
            zone=policy.worker.zone,
            severity=4,
            threshold_value=50.0,
            actual_value=100.0,
            triggered_at=timezone.now(),
            duration_hours=3.0,
            source="AUTO_PURCHASE_DEMO",
            affected_lat=None,
            affected_lon=None,
            radius_km=0.0,
        )

    # Use apply() even in production for the demo so it is INSTANT
    process_trigger_claims.apply(args=(trigger.id,))



class PremiumPreviewView(APIView):
    """GET ?tier=standard&week_start=optional"""

    def get(self, request):
        prof, _ = WorkerProfile.objects.get_or_create(
            user=request.user, defaults={"city_zone": f"{request.user.city} {request.user.zone}"}
        )
        tier = request.query_params.get("tier", "standard")
        ws_raw = request.query_params.get("week_start")
        if ws_raw:
            s = str(ws_raw).strip()
            try:
                if len(s) >= 10 and s[4] == "-" and s[7] == "-" and "T" not in s[:10]:
                    ws = date.fromisoformat(s[:10])
                else:
                    ws = datetime.fromisoformat(s.replace("Z", "+00:00")).date()
            except ValueError:
                return Response(
                    {"error": "Invalid week_start; use an ISO date (YYYY-MM-DD)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            ws = timezone.localdate()
        ws = ws - timedelta(days=ws.weekday())
        return Response(calculate_weekly_premium(prof, tier, ws))


class PolicyListView(generics.ListAPIView):
    serializer_class = WeeklyPolicySerializer

    def get_queryset(self):
        return WeeklyPolicy.objects.filter(worker=self.request.user)


class ActivePolicyView(APIView):
    def get(self, request):
        today = timezone.localdate()
        p = (
            WeeklyPolicy.objects.filter(worker=request.user, status="ACTIVE", week_start__lte=today, week_end__gte=today)
            .order_by("-week_start")
            .first()
        )
        if not p:
            return Response({"active": None})
        return Response({"active": WeeklyPolicySerializer(p).data})


class PolicyDetailView(generics.RetrieveAPIView):
    serializer_class = WeeklyPolicySerializer

    def get_queryset(self):
        return WeeklyPolicy.objects.filter(worker=self.request.user)


class PurchaseView(APIView):
    def post(self, request):
        ser = PurchaseSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        if not ser.validated_data["exclusions_acknowledged"]:
            return Response({"error": "Must acknowledge exclusions"}, status=status.HTTP_400_BAD_REQUEST)
        tier_raw = ser.validated_data["tier"]
        ws = ser.validated_data.get("week_start") or timezone.localdate()
        ws = ws - timedelta(days=ws.weekday())
        we = ws + timedelta(days=6)
        prof, _ = WorkerProfile.objects.get_or_create(
            user=request.user, defaults={"city_zone": f"{request.user.city} {request.user.zone}"}
        )
        prof.city_zone = f"{request.user.city} {request.user.zone}".strip()
        prof.save(update_fields=["city_zone"])
        upi = (ser.validated_data.get("upi_id") or "").strip()
        if upi:
            request.user.upi_id = upi[:50]
            request.user.save(update_fields=["upi_id"])
        if WeeklyPolicy.objects.filter(
            worker=request.user,
            week_start=ws,
            status=WeeklyPolicy.Status.ACTIVE,
        ).exists():
            return Response(
                {"error": "You already have an active policy for this week."},
                status=status.HTTP_409_CONFLICT,
            )
        breakdown = calculate_weekly_premium(prof, tier_raw, ws)
        try:
            with transaction.atomic():
                policy = WeeklyPolicy.objects.create(
                    worker=request.user,
                    week_start=ws,
                    week_end=we,
                    premium_paid=Decimal(str(breakdown["final_premium"])),
                    coverage_amount=Decimal(str(breakdown["coverage_amount"])),
                    tier=tier_raw.upper() if isinstance(tier_raw, str) else "STANDARD",
                    exclusions_acknowledged=True,
                    exclusions_version=ser.validated_data.get("exclusions_version") or "v1.0",
                    expected_loss_amount=Decimal(str(breakdown.get("expected_loss_estimate") or 0)),
                    zone_risk_multiplier=breakdown.get("combined_multiplier"),
                    premium_breakdown=breakdown,
                    covered_triggers=ser.validated_data.get("covered_triggers") or ["RAIN", "HEAT"],
                )
                ExclusionAcknowledgment.objects.create(
                    worker=request.user,
                    policy=policy,
                    exclusions_version=policy.exclusions_version,
                    ip_address=ser.validated_data.get("ip_address"),
                    device_fingerprint=ser.validated_data.get("device_fingerprint") or "",
                )
        except IntegrityError:
            return Response(
                {"error": "You already have an active policy for this week."},
                status=status.HTTP_409_CONFLICT,
            )
        _run_auto_purchase_demo(policy, prof)
        return Response({"policy": WeeklyPolicySerializer(policy).data, "premium_breakdown": breakdown}, status=status.HTTP_201_CREATED)


class CancelPolicyView(APIView):
    def post(self, request, pk):
        p = get_object_or_404(WeeklyPolicy, pk=pk, worker=request.user)
        p.status = WeeklyPolicy.Status.CANCELLED
        p.cancellation_reason = request.data.get("reason", "")
        p.save(update_fields=["status", "cancellation_reason"])
        return Response(WeeklyPolicySerializer(p).data)


class PolicyCertificatePDFView(APIView):
    """Generates and streams a Policy Certificate PDF for the active policy."""

    def get(self, request, pk):
        from io import BytesIO
        from django.http import HttpResponse
        from django.utils import timezone
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.pdfgen import canvas as rl_canvas

        policy = get_object_or_404(WeeklyPolicy, pk=pk, worker=request.user)
        worker = request.user
        buf = BytesIO()
        W, H = A4
        c = rl_canvas.Canvas(buf, pagesize=A4)
        margin = 20 * mm
        content_w = W - 2 * margin

        teal = colors.HexColor("#00d4aa")
        dark = colors.HexColor("#0f1923")
        mid = colors.HexColor("#4a5568")
        light_bg = colors.HexColor("#f7fafc")
        border = colors.HexColor("#e2e8f0")
        green = colors.HexColor("#28a745")

        # Header bar
        c.setFillColor(dark)
        c.rect(0, H - 55 * mm, W, 55 * mm, fill=1, stroke=0)
        c.setFillColor(teal)
        c.setFont("Helvetica-Bold", 26)
        c.drawString(margin, H - 20 * mm, "GigShield")
        c.setFillColor(colors.HexColor("#94a3b8"))
        c.setFont("Helvetica", 9)
        c.drawString(margin, H - 28 * mm, "Parametric Income Protection Insurance")
        badge_x = W - margin - 70 * mm
        c.setFillColor(teal)
        c.roundRect(badge_x, H - 30 * mm, 70 * mm, 12 * mm, 3, fill=1, stroke=0)
        c.setFillColor(dark)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(badge_x + 35 * mm, H - 24.5 * mm, "POLICY CERTIFICATE")
        c.setFillColor(colors.HexColor("#64748b"))
        c.setFont("Courier", 8)
        c.drawRightString(W - margin, H - 36 * mm, f"Policy #GS-{policy.id:06d}")

        # Status bar
        c.setFillColor(colors.HexColor("#d4edda"))
        c.rect(0, H - 70 * mm, W, 15 * mm, fill=1, stroke=0)
        c.setFillColor(green)
        c.rect(0, H - 70 * mm, 4, 15 * mm, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#155724"))
        c.setFont("Helvetica-Bold", 11)
        c.drawString(margin + 2 * mm, H - 60 * mm, f"ACTIVE — {policy.tier} Cover")
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#1e7e34"))
        c.drawString(margin + 2 * mm, H - 66 * mm, f"Valid from {policy.week_start}  to  {policy.week_end}")

        # Coverage amount box
        box_y = H - 115 * mm
        c.setFillColor(light_bg)
        c.setStrokeColor(border)
        c.roundRect(margin, box_y, content_w, 35 * mm, 6, fill=1, stroke=1)
        c.setFillColor(mid)
        c.setFont("Helvetica", 8)
        c.drawCentredString(W / 2, box_y + 29 * mm, "TOTAL COVERAGE AMOUNT")
        c.setFont("Helvetica-Bold", 38)
        c.setFillColor(dark)
        c.drawCentredString(W / 2, box_y + 15 * mm, f"Rs. {float(policy.coverage_amount):,.2f}")
        c.setFont("Helvetica", 9)
        c.setFillColor(mid)
        c.drawCentredString(W / 2, box_y + 7 * mm, f"Premium Paid: Rs. {float(policy.premium_paid):,.2f}  |  Tier: {policy.tier}")

        # Details table
        def draw_section(title, y):
            c.setFillColor(colors.HexColor("#edf2f7"))
            c.rect(margin, y - 7 * mm, content_w, 7 * mm, fill=1, stroke=0)
            c.setFillColor(teal)
            c.rect(margin, y - 7 * mm, 3, 7 * mm, fill=1, stroke=0)
            c.setFillColor(mid)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(margin + 3 * mm, y - 5 * mm, title.upper())
            return y - 7 * mm

        def draw_rows(rows, start_y):
            row_h = 9 * mm
            for i, (k, v) in enumerate(rows):
                c.setFillColor(colors.white if i % 2 == 0 else light_bg)
                c.rect(margin, start_y - row_h, content_w, row_h, fill=1, stroke=0)
                c.setStrokeColor(border)
                c.setLineWidth(0.3)
                c.line(margin, start_y - row_h, margin + content_w, start_y - row_h)
                c.setFillColor(mid)
                c.setFont("Helvetica", 9)
                c.drawString(margin + 3 * mm, start_y - 6 * mm, k)
                c.setFillColor(dark)
                c.setFont("Helvetica-Bold", 9)
                c.drawRightString(margin + content_w - 3 * mm, start_y - 6 * mm, str(v))
                start_y -= row_h
            c.setStrokeColor(border)
            c.setLineWidth(0.5)
            c.rect(margin, start_y, content_w, row_h * len(rows), fill=0, stroke=1)
            return start_y - 4 * mm

        cur_y = box_y - 8 * mm
        cur_y = draw_section("Policyholder Details", cur_y)
        cur_y = draw_rows([
            ("Name / Username", worker.get_full_name() or worker.username),
            ("Platform", worker.platform),
            ("City / Zone", f"{worker.city}, {worker.zone}"),
            ("Worker ID", f"GS-WKR-{worker.id:05d}"),
            ("UPI / VPA", worker.upi_id or "—"),
        ], cur_y)

        cur_y = draw_section("Coverage Terms", cur_y)
        triggers_str = "All Events" if "ALL" in policy.covered_triggers or not policy.covered_triggers else ", ".join(policy.covered_triggers)
        cur_y = draw_rows([
            ("Cover Type", f"Parametric Insurance ({triggers_str})"),
            ("Trigger Condition", "Event severity exceeds thresholds"),
            ("Pay-out Basis", "Daily earnings for duration of disruption"),
            ("Exclusions Version", policy.exclusions_version),
            ("Issued On", str(timezone.now().date())),
        ], cur_y)

        # Footer
        c.setFillColor(colors.HexColor("#edf2f7"))
        c.rect(0, 0, W, 22 * mm, fill=1, stroke=0)
        c.setStrokeColor(border)
        c.setLineWidth(0.5)
        c.line(0, 22 * mm, W, 22 * mm)
        c.setFillColor(mid)
        c.setFont("Helvetica", 7.5)
        c.drawCentredString(W / 2, 17 * mm, "This certificate is system-generated and constitutes a valid policy document under GigShield Parametric Insurance (Demo Mode).")
        c.setFont("Helvetica", 7)
        c.setFillColor(colors.HexColor("#94a3b8"))
        c.drawString(margin, 6 * mm, f"GigShield (c) {timezone.now().year}  |  CIN: U66010MH2024PTC000001  |  IRDAI Demo Reg: IR-DEMO-2024")
        c.drawRightString(W - margin, 6 * mm, "support@gigshield.in")
        c.save()

        buf.seek(0)
        resp = HttpResponse(buf.read(), content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="GigShield_Policy_{policy.id}.pdf"'
        return resp


class ExclusionsDocView(APIView):
    """Generates and streams the standard Exclusions document as a PDF."""

    def get(self, request):
        from io import BytesIO
        from django.http import HttpResponse
        from django.utils import timezone
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.pdfgen import canvas as rl_canvas

        W, H = A4
        buf = BytesIO()
        c = rl_canvas.Canvas(buf, pagesize=A4)
        margin = 20 * mm
        content_w = W - 2 * margin
        teal = colors.HexColor("#00d4aa")
        dark = colors.HexColor("#0f1923")
        mid = colors.HexColor("#4a5568")
        red = colors.HexColor("#dc3545")

        # Header
        c.setFillColor(dark)
        c.rect(0, H - 50 * mm, W, 50 * mm, fill=1, stroke=0)
        c.setFillColor(teal)
        c.setFont("Helvetica-Bold", 24)
        c.drawString(margin, H - 18 * mm, "GigShield")
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(margin, H - 28 * mm, "Standard Exclusions & General Wordings — v1.0")
        c.setFillColor(colors.HexColor("#94a3b8"))
        c.setFont("Helvetica", 8)
        c.drawString(margin, H - 35 * mm, f"Effective Date: 01 January 2024  |  Reviewed: {timezone.now().strftime('%d %B %Y')}")

        EXCLUSIONS = [
            ("EX-01", "War & Civil Unrest",
             "Any disruption arising from declared war, armed conflict, civil war, invasion, rebellion,\n"
             "revolution, insurrection, military or usurped power, or civil commotion."),
            ("EX-02", "Pandemic & Epidemic",
             "Losses arising from any government-declared pandemic, epidemic, or public health\n"
             "emergency (including but not limited to COVID-19 and future variants)."),
            ("EX-03", "Government Shutdowns (Policy-Induced)",
             "Mandatory shutdowns imposed as deliberate economic policy (not weather-related\n"
             "emergency measures) by central or state governments."),
            ("EX-04", "Voluntary Absence",
             "Earnings lost due to the worker's own choice not to work, personal leave,\n"
             "or voluntary suspension of delivery activity."),
            ("EX-05", "Platform-Side Issues",
             "Losses caused by the worker's own platform account suspension, poor ratings,\n"
             "violation of platform terms, or platform-side technical issues."),
            ("EX-06", "Pre-Announced Disruptions",
             "Weather events or disruptions that were officially announced or forecasted\n"
             "more than 24 hours before the policy purchase date."),
            ("EX-07", "Fraud & Misrepresentation",
             "Any claim found to have involved material misrepresentation of earnings,\n"
             "identity, location, or working status at time of purchase."),
            ("EX-08", "Nuclear & Radioactive Contamination",
             "Any loss, damage, or disruption caused directly or indirectly by nuclear\n"
             "radiation or radioactive contamination."),
        ]

        cur_y = H - 58 * mm
        for code, title, desc in EXCLUSIONS:
            if cur_y < 40 * mm:
                c.showPage()
                cur_y = H - 20 * mm

            box_h = 28 * mm
            c.setFillColor(colors.HexColor("#fff5f5"))
            c.setStrokeColor(colors.HexColor("#fca5a5"))
            c.setLineWidth(0.5)
            c.roundRect(margin, cur_y - box_h, content_w, box_h, 4, fill=1, stroke=1)

            # Red left bar
            c.setFillColor(red)
            c.roundRect(margin, cur_y - box_h, 4, box_h, 2, fill=1, stroke=0)

            # Code badge
            c.setFillColor(red)
            c.roundRect(margin + 8 * mm, cur_y - 7 * mm, 14 * mm, 5 * mm, 2, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 7)
            c.drawCentredString(margin + 15 * mm, cur_y - 4.5 * mm, code)

            # Title
            c.setFillColor(dark)
            c.setFont("Helvetica-Bold", 10)
            c.drawString(margin + 24 * mm, cur_y - 5 * mm, title)

            # Description
            c.setFillColor(mid)
            c.setFont("Helvetica", 8)
            lines = desc.split("\n")
            for i, ln in enumerate(lines):
                c.drawString(margin + 8 * mm, cur_y - 13 * mm - i * 5 * mm, ln.strip())

            cur_y -= (box_h + 3 * mm)

        # Footer
        c.setFillColor(colors.HexColor("#edf2f7"))
        c.rect(0, 0, W, 20 * mm, fill=1, stroke=0)
        c.setFillColor(mid)
        c.setFont("Helvetica", 7.5)
        c.drawCentredString(W / 2, 14 * mm, "This document lists standard exclusions applicable to all GigShield parametric policies. For full policy wording, refer to your policy certificate.")
        c.setFont("Helvetica", 7)
        c.setFillColor(colors.HexColor("#94a3b8"))
        c.drawString(margin, 5 * mm, f"GigShield Standard Exclusions v1.0  |  (c) {timezone.now().year} GigShield Parametric Insurance")
        c.drawRightString(W - margin, 5 * mm, "support@gigshield.in")
        c.save()

        buf.seek(0)
        resp = HttpResponse(buf.read(), content_type="application/pdf")
        resp["Content-Disposition"] = 'inline; filename="GigShield_Exclusions_v1.0.pdf"'
        return resp

