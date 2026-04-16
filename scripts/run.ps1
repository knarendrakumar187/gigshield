# Run backend (8000) and frontend (5173) — open two terminals or use jobs
$root = Split-Path $PSScriptRoot -Parent
$pyVenv = Join-Path $root ".venv\Scripts\python.exe"
$py = if (Test-Path $pyVenv) { $pyVenv } else { "python" }

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; & $py manage.py runserver 127.0.0.1:8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev"

Write-Host "Started Django on http://127.0.0.1:8000 and Vite (see terminal for port)."
