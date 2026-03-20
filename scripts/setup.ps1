$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Write-Host "== GigShield setup ==" -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot"

# --- Backend (Python/Django) ---
$BackendDir = Join-Path $RepoRoot "backend"
$VenvDir = Join-Path $BackendDir ".venv"
$Py = Join-Path $VenvDir "Scripts\\python.exe"

if (-not (Test-Path $BackendDir)) {
  throw "backend/ not found at $BackendDir"
}

Write-Host "Backend: creating venv (if missing)..." -ForegroundColor Cyan
if (-not (Test-Path $Py)) {
  Push-Location $BackendDir
  try {
    py -3 -m venv .venv
  } finally {
    Pop-Location
  }
}

Write-Host "Backend: installing requirements..." -ForegroundColor Cyan
& $Py -m pip install -U pip
& $Py -m pip install -r (Join-Path $BackendDir "requirements.txt")

Write-Host "Backend: migrate + seed demo data..." -ForegroundColor Cyan
Push-Location $BackendDir
try {
  & $Py manage.py migrate
  & $Py manage.py shell -c "from scripts.seed_demo import run; run()"
} finally {
  Pop-Location
}

# --- Frontend (Node/Vite) ---
$FrontendDir = Join-Path $RepoRoot "frontend"
if (-not (Test-Path $FrontendDir)) {
  throw "frontend/ not found at $FrontendDir"
}

Write-Host "Frontend: npm install..." -ForegroundColor Cyan
Push-Location $FrontendDir
try {
  npm install
} finally {
  Pop-Location
}

Write-Host "== Setup complete ==" -ForegroundColor Green

