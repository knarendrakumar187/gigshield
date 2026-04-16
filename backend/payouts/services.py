"""Payout simulation and receipt generation."""
from __future__ import annotations

import uuid
from decimal import Decimal

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from claims.models import Claim
from payouts.models import Payout


import random
import time
import logging

logger = logging.getLogger(__name__)

class RazorpayTestModeSimulator:
    """Simulates the RazorpayX Payouts API flow (Test Mode)."""
    
    @staticmethod
    def create_contact(worker):
        logger.info("[RazorpayX] -> POST /contacts")
        payload = {
            "name": worker.username,
            "contact": getattr(worker, "phone", "9999999999"),
            "type": "worker",
            "reference_id": f"worker_{worker.id}"
        }
        logger.info(f"[RazorpayX] Payload: {payload}")
        time.sleep(0.5)
        return f"cont_{uuid.uuid4().hex[:14]}"

    @staticmethod
    def create_fund_account(contact_id, upi_id):
        logger.info("[RazorpayX] -> POST /fund_accounts")
        payload = {
            "contact_id": contact_id,
            "account_type": "vpa",
            "vpa": {"address": upi_id}
        }
        logger.info(f"[RazorpayX] Payload: {payload}")
        time.sleep(0.4)
        return f"fa_{uuid.uuid4().hex[:14]}"

    @staticmethod
    def create_payout(fund_account_id, amount, reference_id, upi_id):
        logger.info("[RazorpayX] -> POST /payouts")
        # Razorpay handles amount in paise
        amount_paise = int(amount * 100)
        payload = {
            "account_number": "7878780080316316", # Default test mode account
            "fund_account_id": fund_account_id,
            "amount": amount_paise,
            "currency": "INR",
            "mode": "UPI",
            "purpose": "payout",
            "queue_if_low_balance": True,
            "reference_id": reference_id
        }
        logger.info(f"[RazorpayX] Payload: {payload}")
        time.sleep(0.8)
        
        if "fail" in upi_id.lower():
            return {"id": f"pout_{uuid.uuid4().hex[:14]}", "status": "rejected", "status_details": {"reason": "invalid_upi_id"}}
            
        return {"id": f"pout_{uuid.uuid4().hex[:14]}", "status": "processed", "utr": f"UTR{uuid.uuid4().hex[:12].upper()}"}


@shared_task
def process_payout_task(claim_id: int):
    claim = Claim.objects.select_related("worker").get(id=claim_id)
    if claim.payout_ref:
        return {"ok": True, "existing": claim.payout_ref}

    upi_id = (claim.worker.upi_id or "pending@upi").strip()
    amount_float = float(claim.approved_amount)

    logger.info(f"====== INITIATING RAZORPAY TEST MODE PAYOUT FOR CLAIM {claim.id} ======")
    
    # 1. Create/Retrieve Contact
    contact_id = RazorpayTestModeSimulator.create_contact(claim.worker)
    
    # 2. Create/Retrieve Fund Account (UPI)
    fund_account_id = RazorpayTestModeSimulator.create_fund_account(contact_id, upi_id)
    
    # 3. Trigger Payout
    reference_id = f"claim_{claim.id}_{int(time.time())}"
    rzp_response = RazorpayTestModeSimulator.create_payout(fund_account_id, amount_float, reference_id, upi_id)
    
    ref = rzp_response["id"]
    status_ok = rzp_response["status"] in ["processed", "processing"]
    reason = rzp_response.get("status_details", {}).get("reason", "Razorpay rejected transaction")
    
    payout = Payout.objects.create(
        claim=claim,
        amount=claim.approved_amount,
        method=Payout.Method.WALLET,  # RazorpayX uses Razorpay Wallet abstraction
        upi_id=upi_id,
        transaction_ref=ref,
        status=Payout.Status.INITIATED,
    )

    if not status_ok:
        logger.warning(f"[RazorpayX] Payout {ref} Failed: {reason}")
        payout.status = Payout.Status.FAILED
        payout.failure_reason = f"Razorpay Test Mode: {reason}"
        payout.save(update_fields=["status", "failure_reason"])
        return {"transaction_ref": ref, "amount": str(payout.amount), "status": payout.status, "gateway": "RAZORPAY"}

    logger.info(f"[RazorpayX] Payout {ref} Processed. UTR: {rzp_response.get('utr')}")
    payout.status = Payout.Status.SUCCESS
    payout.completed_at = timezone.now()
    payout.save(update_fields=["status", "completed_at"])

    claim.payout_ref = ref
    claim.save(update_fields=["payout_ref"])

    if settings.DEBUG:
        # Compatibility handling for .run vs .apply
        if hasattr(generate_receipt_pdf, "run"):
            generate_receipt_pdf.run(payout.id)
        else:
            generate_receipt_pdf(payout.id)
    else:
        generate_receipt_pdf.delay(payout.id)
        
    return {"transaction_ref": ref, "amount": str(payout.amount), "status": payout.status, "gateway": "RAZORPAY"}


@shared_task
def generate_receipt_pdf(payout_id: int):
    from pathlib import Path
    from django.conf import settings
    from django.utils import timezone

    payout = Payout.objects.select_related("claim__worker", "claim__trigger", "claim__policy").get(id=payout_id)
    media = Path(settings.MEDIA_ROOT) / "receipts"
    media.mkdir(parents=True, exist_ok=True)
    pdf_path = media / f"{payout.transaction_ref}.pdf"

    worker = payout.claim.worker
    trigger = payout.claim.trigger
    issued_at = payout.completed_at or timezone.now()
    gateway_method = payout.method or "UPI"
    gateway_label = {"WALLET": "Razorpay (Test Mode)", "UPI": "UPI Instant Transfer", "BANK": "Stripe (Sandbox)"}.get(gateway_method, "UPI")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    background: #f4f6f9;
    color: #1a2332;
    padding: 32px;
  }}
  .page {{
    max-width: 680px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.10);
  }}
  /* ── Header ── */
  .header {{
    background: linear-gradient(135deg, #0f1923 0%, #162230 100%);
    padding: 28px 36px 24px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }}
  .brand {{ color: #fff; }}
  .brand-name {{
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #00d4aa;
  }}
  .brand-tagline {{
    font-size: 11px;
    color: rgba(255,255,255,0.5);
    margin-top: 2px;
    letter-spacing: 0.5px;
  }}
  .receipt-badge {{
    text-align: right;
  }}
  .badge-label {{
    background: #00d4aa;
    color: #0f1923;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.2px;
    padding: 4px 10px;
    border-radius: 4px;
    text-transform: uppercase;
    display: inline-block;
  }}
  .receipt-num {{
    color: rgba(255,255,255,0.6);
    font-size: 11px;
    margin-top: 6px;
    font-family: 'Courier New', monospace;
  }}
  /* ── Status Banner ── */
  .status-banner {{
    background: #d4edda;
    border-left: 5px solid #28a746;
    padding: 14px 36px;
    display: flex;
    align-items: center;
    gap: 10px;
  }}
  .status-icon {{ font-size: 22px; }}
  .status-text {{ font-size: 13px; font-weight: 600; color: #155724; }}
  .status-sub {{ font-size: 11px; color: #1e7e34; margin-top: 2px; }}
  /* ── Amount Block ── */
  .amount-block {{
    padding: 28px 36px 20px;
    border-bottom: 1px solid #e8ecf0;
    text-align: center;
  }}
  .amount-label {{ font-size: 12px; color: #6c757d; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }}
  .amount-value {{ font-size: 48px; font-weight: 800; color: #0f1923; margin: 6px 0 4px; letter-spacing: -1px; }}
  .amount-currency {{ font-size: 24px; color: #00a887; }}
  .amount-words {{ font-size: 11px; color: #6c757d; font-style: italic; }}
  /* ── Details Grid ── */
  .details {{ padding: 24px 36px; }}
  .section-title {{
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: #6c757d;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 2px solid #f0f3f6;
  }}
  .detail-row {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #f4f6f9;
    font-size: 13px;
  }}
  .detail-row:last-child {{ border-bottom: none; }}
  .detail-key {{ color: #6c757d; font-weight: 500; }}
  .detail-val {{ color: #1a2332; font-weight: 600; text-align: right; font-family: 'Courier New', monospace; }}
  .detail-val.mono {{ letter-spacing: 0.3px; }}
  /* ── Two-col layout ── */
  .two-col {{ display: flex; gap: 24px; padding: 0 36px 24px; }}
  .col {{ flex: 1; }}
  /* ── Ref Block ── */
  .ref-block {{
    margin: 0 36px 24px;
    background: #f4f6f9;
    border-radius: 8px;
    padding: 16px 20px;
    border: 1px dashed #c8d0da;
  }}
  .ref-title {{ font-size: 10px; color: #6c757d; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }}
  .ref-value {{
    font-family: 'Courier New', monospace;
    font-size: 15px;
    font-weight: 700;
    color: #0f1923;
    word-break: break-all;
  }}
  .ref-gateway {{
    display: inline-block;
    margin-top: 8px;
    background: #2c7be5;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.8px;
    padding: 3px 8px;
    border-radius: 4px;
  }}
  /* ── Divider ── */
  .divider {{ height: 1px; background: #e8ecf0; margin: 0 36px 24px; }}
  /* ── Footer ── */
  .footer {{
    background: #f4f6f9;
    padding: 20px 36px;
    border-top: 1px solid #e8ecf0;
  }}
  .footer-disclaimer {{
    font-size: 10px;
    color: #9aa5b4;
    line-height: 1.6;
    margin-bottom: 12px;
  }}
  .footer-row {{
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #6c757d;
  }}
  .verified-stamp {{
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 2px solid #28a746;
    border-radius: 6px;
    padding: 4px 10px;
    color: #28a746;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
  }}
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="brand">
      <div class="brand-name">GigShield</div>
      <div class="brand-tagline">Gig Worker Income Protection</div>
    </div>
    <div class="receipt-badge">
      <div class="badge-label">Payment Receipt</div>
      <div class="receipt-num"># {payout.transaction_ref}</div>
    </div>
  </div>

  <!-- Status banner -->
  <div class="status-banner">
    <span class="status-icon">✅</span>
    <div>
      <div class="status-text">Payout Successful — Funds Transferred</div>
      <div class="status-sub">Processed on {issued_at.strftime("%d %B %Y at %I:%M %p IST")}</div>
    </div>
  </div>

  <!-- Amount -->
  <div class="amount-block">
    <div class="amount-label">Total Amount Paid</div>
    <div class="amount-value"><span class="amount-currency">₹</span>{float(payout.amount):,.2f}</div>
    <div class="amount-words">Rupees {int(float(payout.amount))} and {round((float(payout.amount) % 1)*100):02d} paise only</div>
  </div>

  <!-- Transaction Details -->
  <div class="details">
    <div class="section-title">Transaction Details</div>
    <div class="detail-row">
      <span class="detail-key">Receipt Date</span>
      <span class="detail-val">{issued_at.strftime("%d %b %Y")}</span>
    </div>
    <div class="detail-row">
      <span class="detail-key">Payment Method</span>
      <span class="detail-val">{gateway_label}</span>
    </div>
    <div class="detail-row">
      <span class="detail-key">Payment Status</span>
      <span class="detail-val" style="color:#28a746;">{payout.status}</span>
    </div>
    <div class="detail-row">
      <span class="detail-key">Recipient UPI / VPA</span>
      <span class="detail-val mono">{payout.upi_id or "—"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-key">Trigger Type</span>
      <span class="detail-val">{trigger.trigger_type if trigger else "—"} (Severity {trigger.severity if trigger else "—"})</span>
    </div>
    <div class="detail-row">
      <span class="detail-key">Trigger Zone</span>
      <span class="detail-val">{trigger.zone if trigger else "—"}, {trigger.city if trigger else "—"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-key">Claim ID</span>
      <span class="detail-val mono">#{payout.claim.id}</span>
    </div>
  </div>

  <!-- Worker Details -->
  <div class="details" style="padding-top: 0;">
    <div class="section-title">Worker Details</div>
    <div class="detail-row">
      <span class="detail-key">Name / Username</span>
      <span class="detail-val">{worker.get_full_name() or worker.username}</span>
    </div>
    <div class="detail-row">
      <span class="detail-key">Platform</span>
      <span class="detail-val">{worker.platform}</span>
    </div>
    <div class="detail-row">
      <span class="detail-key">City / Zone</span>
      <span class="detail-val">{worker.city}, {worker.zone}</span>
    </div>
    <div class="detail-row">
      <span class="detail-key">Worker ID</span>
      <span class="detail-val mono">GS-WKR-{worker.id:05d}</span>
    </div>
  </div>

  <!-- Reference Block -->
  <div class="ref-block">
    <div class="ref-title">Unique Transaction Reference</div>
    <div class="ref-value">{payout.transaction_ref}</div>
    <span class="ref-gateway">{gateway_label.upper()}</span>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-disclaimer">
      This is a system-generated receipt issued by GigShield Parametric Insurance (Demo Mode).
      This payout was automatically triggered and processed based on a verified environmental disruption event
      in your city zone. No manual action is required. This document serves as official proof of payout.
      For disputes, contact support@gigshield.in with the Transaction Reference above.
    </div>
    <div class="footer-row">
      <span>GigShield © {issued_at.year} · CIN: U66010MH2024PTC000001</span>
      <span class="verified-stamp">✓ Auto-Verified</span>
    </div>
  </div>

</div>
</body>
</html>"""

    try:
        from weasyprint import HTML
        HTML(string=html).write_pdf(str(pdf_path))
    except Exception:
        # Professional ReportLab canvas fallback
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.pdfgen import canvas as rl_canvas
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        import os

        # Try to register a Unicode font (DejaVu ships with many Python envs)
        rupee_sym = "Rs."
        font_reg = "Helvetica"
        font_bold = "Helvetica-Bold"
        font_mono = "Courier"
        for search_path in [
            r"C:\Windows\Fonts\DejaVuSans.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/dejavu/DejaVuSans.ttf",
        ]:
            if os.path.exists(search_path):
                try:
                    pdfmetrics.registerFont(TTFont("DejaVu", search_path))
                    pdfmetrics.registerFont(TTFont("DejaVuBold", search_path.replace("DejaVuSans", "DejaVuSans-Bold")))
                    font_reg = "DejaVu"
                    font_bold = "DejaVuBold"
                    rupee_sym = "\u20b9"  # ₹
                except Exception:
                    pass
                break

        W, H = A4  # 595.28 x 841.89 pts
        c = rl_canvas.Canvas(str(pdf_path), pagesize=A4)
        teal = colors.HexColor("#00d4aa")
        dark = colors.HexColor("#0f1923")
        mid = colors.HexColor("#4a5568")
        light_bg = colors.HexColor("#f7fafc")
        border = colors.HexColor("#e2e8f0")
        green = colors.HexColor("#28a745")
        blue = colors.HexColor("#2c7be5")

        margin = 24 * mm
        content_w = W - 2 * margin

        # ── Dark header bar ──────────────────────────────────────────────
        c.setFillColor(dark)
        c.rect(0, H - 60 * mm, W, 60 * mm, fill=1, stroke=0)

        # Brand name
        c.setFillColor(teal)
        c.setFont(font_bold, 28)
        c.drawString(margin, H - 22 * mm, "GigShield")

        # Tagline
        c.setFillColor(colors.HexColor("#94a3b8"))
        c.setFont(font_reg, 10)
        c.drawString(margin, H - 31 * mm, "Gig Worker Income Protection")

        # PAYMENT RECEIPT badge
        badge_x = W - margin - 68 * mm
        c.setFillColor(teal)
        c.roundRect(badge_x, H - 28 * mm, 68 * mm, 12 * mm, 3, fill=1, stroke=0)
        c.setFillColor(dark)
        c.setFont(font_bold, 10)
        c.drawCentredString(badge_x + 34 * mm, H - 22.5 * mm, "PAYMENT RECEIPT")

        # Receipt number
        c.setFillColor(colors.HexColor("#64748b"))
        c.setFont(font_mono, 8)
        c.drawRightString(W - margin, H - 35 * mm, f"# {payout.transaction_ref}")

        # ── Success status bar ───────────────────────────────────────────
        c.setFillColor(colors.HexColor("#d4edda"))
        c.rect(0, H - 76 * mm, W, 16 * mm, fill=1, stroke=0)
        c.setFillColor(green)
        c.rect(0, H - 76 * mm, 4, 16 * mm, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#155724"))
        c.setFont(font_bold, 11)
        c.drawString(margin + 2 * mm, H - 65 * mm, "Payout Successful — Funds Transferred")
        c.setFont(font_reg, 9)
        c.setFillColor(colors.HexColor("#1e7e34"))
        c.drawString(margin + 2 * mm, H - 71 * mm, f"Processed on {issued_at.strftime('%d %B %Y at %I:%M %p IST')}")

        # ── Amount box ───────────────────────────────────────────────────
        amt_y = H - 122 * mm
        c.setFillColor(light_bg)
        c.setStrokeColor(border)
        c.roundRect(margin, amt_y, content_w, 36 * mm, 6, fill=1, stroke=1)

        c.setFillColor(mid)
        c.setFont(font_reg, 9)
        c.drawCentredString(W / 2, amt_y + 30 * mm, "TOTAL AMOUNT PAID")

        amount_str = f"{rupee_sym} {float(payout.amount):,.2f}"
        c.setFont(font_bold, 40)
        c.setFillColor(dark)
        c.drawCentredString(W / 2, amt_y + 16 * mm, amount_str)

        amount_int = int(float(payout.amount))
        paise = round((float(payout.amount) % 1) * 100)
        c.setFont(font_reg, 9)
        c.setFillColor(mid)
        c.drawCentredString(W / 2, amt_y + 8 * mm, f"Rupees {amount_int} and {paise:02d} Paise only")

        # ── Section helper ───────────────────────────────────────────────
        def draw_section_header(title, y):
            c.setFillColor(colors.HexColor("#edf2f7"))
            c.rect(margin, y - 7 * mm, content_w, 7 * mm, fill=1, stroke=0)
            c.setStrokeColor(teal)
            c.setLineWidth(1.5)
            c.line(margin, y - 7 * mm, margin + 3, y)
            c.setFillColor(mid)
            c.setFont(font_bold, 8)
            c.drawString(margin + 3 * mm, y - 5 * mm, title.upper())
            return y - 7 * mm

        def draw_rows(rows_data, start_y):
            row_h = 9 * mm
            for i, (key, val) in enumerate(rows_data):
                bg = colors.white if i % 2 == 0 else light_bg
                c.setFillColor(bg)
                c.rect(margin, start_y - row_h, content_w, row_h, fill=1, stroke=0)
                c.setStrokeColor(border)
                c.setLineWidth(0.3)
                c.line(margin, start_y - row_h, margin + content_w, start_y - row_h)
                # Key
                c.setFillColor(mid)
                c.setFont(font_reg, 9)
                c.drawString(margin + 3 * mm, start_y - 6 * mm, key)
                # Value
                c.setFillColor(dark)
                c.setFont(font_bold, 9)
                c.drawRightString(margin + content_w - 3 * mm, start_y - 6 * mm, str(val))
                start_y -= row_h
            # Outer border
            total_h = row_h * len(rows_data)
            c.setStrokeColor(border)
            c.setLineWidth(0.5)
            c.rect(margin, start_y, content_w, total_h, fill=0, stroke=1)
            return start_y - 4 * mm

        # ── Transaction details ──────────────────────────────────────────
        cur_y = amt_y - 8 * mm
        cur_y = draw_section_header("Transaction Details", cur_y)
        tx_rows = [
            ("Receipt Date", issued_at.strftime("%d %b %Y")),
            ("Payment Method", gateway_label),
            ("Payment Status", "SUCCESS"),
            ("Recipient UPI / VPA", payout.upi_id or "—"),
            ("Trigger Event", f"{trigger.trigger_type} — Severity {trigger.severity}" if trigger else "—"),
            ("Trigger Zone / City", f"{trigger.zone}, {trigger.city}" if trigger else "—"),
            ("Claim ID", f"#{payout.claim.id}"),
        ]
        cur_y = draw_rows(tx_rows, cur_y)

        # ── Worker details ───────────────────────────────────────────────
        cur_y = draw_section_header("Worker Details", cur_y)
        wk_rows = [
            ("Name / Username", worker.get_full_name() or worker.username),
            ("Platform", worker.platform),
            ("City / Zone", f"{worker.city}, {worker.zone}"),
            ("Worker ID", f"GS-WKR-{worker.id:05d}"),
        ]
        cur_y = draw_rows(wk_rows, cur_y)

        # ── Unique reference block ───────────────────────────────────────
        ref_y = cur_y - 4 * mm
        c.setFillColor(light_bg)
        c.setStrokeColor(teal)
        c.setDash(4, 3)
        c.setLineWidth(0.8)
        c.roundRect(margin, ref_y - 22 * mm, content_w, 22 * mm, 4, fill=1, stroke=1)
        c.setDash()

        c.setFillColor(mid)
        c.setFont(font_bold, 7)
        c.drawString(margin + 4 * mm, ref_y - 7 * mm, "UNIQUE TRANSACTION REFERENCE")

        c.setFillColor(dark)
        c.setFont(font_mono, 11)
        c.drawString(margin + 4 * mm, ref_y - 14 * mm, payout.transaction_ref)

        # Gateway badge
        c.setFillColor(blue)
        c.roundRect(margin + 4 * mm, ref_y - 21 * mm, len(gateway_label) * 5.5 + 10, 6 * mm, 2, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont(font_bold, 7)
        c.drawString(margin + 6 * mm, ref_y - 17.5 * mm, gateway_label.upper())

        # Verified stamp
        stamp_x = W - margin - 36 * mm
        c.setStrokeColor(green)
        c.setLineWidth(1.2)
        c.roundRect(stamp_x, ref_y - 20 * mm, 34 * mm, 8 * mm, 3, fill=0, stroke=1)
        c.setFillColor(green)
        c.setFont(font_bold, 8)
        c.drawCentredString(stamp_x + 17 * mm, ref_y - 15.5 * mm, "VERIFIED  ✓")

        # ── Footer ───────────────────────────────────────────────────────
        c.setFillColor(colors.HexColor("#edf2f7"))
        c.rect(0, 0, W, 26 * mm, fill=1, stroke=0)
        c.setStrokeColor(border)
        c.setLineWidth(0.5)
        c.line(0, 26 * mm, W, 26 * mm)

        c.setFillColor(mid)
        c.setFont(font_reg, 7.5)
        disclaimer = (
            "This is a system-generated receipt issued by GigShield Parametric Insurance (Demo Mode). "
            "This payout was automatically triggered and processed based on a verified environmental disruption event. "
            "No manual action is required. This document is valid proof of payout. "
            "For disputes, contact support@gigshield.in with the reference above."
        )
        # Wrap disclaimer manually
        words = disclaimer.split()
        line, lines = [], []
        for w in words:
            test = " ".join(line + [w])
            if c.stringWidth(test, font_reg, 7.5) < content_w:
                line.append(w)
            else:
                lines.append(" ".join(line))
                line = [w]
        if line:
            lines.append(" ".join(line))

        text_y = 23 * mm
        for ln in lines[:3]:
            c.drawCentredString(W / 2, text_y, ln)
            text_y -= 3.5 * mm

        c.setFont(font_reg, 7)
        c.setFillColor(colors.HexColor("#94a3b8"))
        c.drawString(margin, 6 * mm, f"GigShield (c) {issued_at.year}  |  CIN: U66010MH2024PTC000001  |  IRDAI Demo Reg: IR-DEMO-2024")
        c.drawRightString(W - margin, 6 * mm, "support@gigshield.in")

        c.save()


    rel = f"/media/receipts/{payout.transaction_ref}.pdf"
    payout.receipt_url = rel
    payout.save(update_fields=["receipt_url"])
    return str(pdf_path)

