# GigShield one-time setup (Windows)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Creating Python venv..."
python -m venv .venv
& .\.venv\Scripts\pip.exe install -U pip
& .\.venv\Scripts\pip.exe install -r backend\requirements.txt

Write-Host "Migrating database..."
Set-Location backend
& ..\.venv\Scripts\python.exe manage.py migrate
& ..\.venv\Scripts\python.exe manage.py seed_demo
& ..\.venv\Scripts\python.exe manage.py train_fraud_model
Set-Location ..

Write-Host "Installing frontend deps..."
Set-Location frontend
npm install
Set-Location ..

Write-Host "Done. Run .\scripts\run.ps1 to start backend + frontend dev servers."
