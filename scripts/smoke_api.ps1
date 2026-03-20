$ErrorActionPreference = "Stop"

$Base = "http://127.0.0.1:8000"

function PostJson($url, $obj, $headers = $null) {
  $json = $obj | ConvertTo-Json -Depth 6
  if ($headers) {
    return Invoke-RestMethod -Method Post -Uri $url -Headers $headers -ContentType "application/json" -Body $json
  }
  return Invoke-RestMethod -Method Post -Uri $url -ContentType "application/json" -Body $json
}

function GetJson($url, $headers) {
  return Invoke-RestMethod -Method Get -Uri $url -Headers $headers
}

Write-Host "== GigShield API Smoke Test ==" -ForegroundColor Cyan
Write-Host "Base: $Base"

# Worker login
$login = PostJson "$Base/auth/login" @{ identifier="rider@example.com"; password="rider123" }
$token = $login.access
$H = @{ Authorization = "Bearer $token" }
Write-Host "Worker login OK" -ForegroundColor Green

# Worker profile
$profile = GetJson "$Base/auth/profile" $H
Write-Host ("Profile OK: {0} ({1})" -f $profile.username, $profile.role) -ForegroundColor Green

try {
  $wp = GetJson "$Base/worker/profile" $H
  Write-Host ("WorkerProfile OK: {0}/{1} hourly={2}" -f $wp.city, $wp.primary_zone, $wp.hourly_earnings) -ForegroundColor Green
} catch {
  Write-Host "WorkerProfile missing (OK if not onboarded)" -ForegroundColor Yellow
}

# Quote + create policy
$quote = PostJson "$Base/policy/quote" @{} $H
Write-Host ("Quote OK: recommended={0} tiers={1}" -f $quote.recommended_tier, ($quote.tiers | Measure-Object).Count) -ForegroundColor Green

$policy = PostJson "$Base/policy/create" @{ tier = $quote.recommended_tier } $H
Write-Host ("Policy create OK: id={0} tier={1}" -f $policy.id, $policy.coverage_tier) -ForegroundColor Green

# Worker dashboard
$dash = GetJson "$Base/dashboard/worker" $H
Write-Host ("Worker dashboard OK: active_policy={0}" -f $dash.active_policy.tier) -ForegroundColor Green

# Admin login
$alogin = PostJson "$Base/auth/login" @{ identifier="admin@example.com"; password="admin123" }
$atoken = $alogin.access
$AH = @{ Authorization = "Bearer $atoken" }
Write-Host "Admin login OK" -ForegroundColor Green

# Admin metrics
$metrics = GetJson "$Base/dashboard/admin/metrics" $AH
Write-Host ("Admin metrics OK: workers={0} payouts={1}" -f $metrics.total_active_workers, $metrics.total_payouts) -ForegroundColor Green

# Create trigger + evaluate
$ev = PostJson "$Base/triggers/mock" @{
  trigger_type="heavy_rain"
  city="Hyderabad"
  zone="Madhapur"
  severity=3
  source_value=@{ rainfall_mm_6h=72 }
} $AH

Write-Host ("Trigger created OK: id={0} type={1}" -f $ev.id, $ev.trigger_type) -ForegroundColor Green

$eval = PostJson "$Base/triggers/evaluate" @{ event_id = $ev.id } $AH
Write-Host ("Evaluate OK: claims={0} auto_approved={1} total_payout={2}" -f ($eval.created_claim_ids | Measure-Object).Count, $eval.auto_approved_count, $eval.total_payout_amount) -ForegroundColor Green

# Worker payout history
$payouts = GetJson "$Base/payouts/history" $H
if (($payouts | Measure-Object).Count -gt 0) {
  $p0 = $payouts[0]
  Write-Host ("Payout history OK: last_amount={0} ref={1}" -f $p0.payout_amount, $p0.transaction_ref) -ForegroundColor Green
} else {
  Write-Host "Payout history empty (unexpected after evaluation)" -ForegroundColor Yellow
}

Write-Host "== Smoke test complete ==" -ForegroundColor Cyan

