@echo off
rem Starts AutoShip (dev server on port 3100) and opens it in your browser. Double-click to run.
rem Port 3100 avoids port 3000, which other local tools (for example Grafana) often use.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$port = 3100; $url = \"http://localhost:$port/signin\";" ^
  "function Test-AutoShip { try { (Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 5).Content -match 'AutoShip' } catch { $false } }" ^
  "if (-not (Test-AutoShip)) {" ^
  "  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { Write-Host \"Port $port is used by another program. Close it and try again.\"; pause; exit 1 }" ^
  "  if (-not (Test-Path node_modules)) { Write-Host 'Installing packages (first run)...'; & npm.cmd install }" ^
  "  Start-Process cmd.exe -ArgumentList \"/k title AutoShip server ^&^& npm.cmd run dev -- -p $port\" -WindowStyle Minimized;" ^
  "  Write-Host 'Starting AutoShip...';" ^
  "  for ($i = 0; $i -lt 90 -and -not (Test-AutoShip); $i++) { Start-Sleep 1 }" ^
  "}" ^
  "Start-Process $url"
