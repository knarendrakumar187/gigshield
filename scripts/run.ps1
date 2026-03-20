$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$BackendDir = Join-Path $RepoRoot "backend"
$FrontendDir = Join-Path $RepoRoot "frontend"
$Py = Join-Path $BackendDir ".venv\\Scripts\\python.exe"

if (-not (Test-Path $Py)) {
  throw "Backend venv not found. Run .\\scripts\\setup.ps1 first."
}

Write-Host "== GigShield run ==" -ForegroundColor Cyan
Write-Host "Backend: http://127.0.0.1:8000"
Write-Host "Frontend: http://localhost:5173"

Write-Host "Starting backend + frontend in new windows..." -ForegroundColor Cyan

Start-Process powershell -WorkingDirectory $BackendDir -ArgumentList @(
  "-NoExit",
  "-Command",
  "& `"$Py`" manage.py runserver 0.0.0.0:8000"
)

Start-Process powershell -WorkingDirectory $FrontendDir -ArgumentList @(
  "-NoExit",
  "-Command",
  "npm run dev"
)

Write-Host "Done. Close the two spawned terminals to stop." -ForegroundColor Green

