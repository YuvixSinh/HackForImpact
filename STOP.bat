@echo off
rem Stops every AutoShip dev server started from this folder. Double-click to run.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$dir = (Get-Location).Path;" ^
  "$procs = Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like \"*$dir*\" -and $_.CommandLine -match 'next' };" ^
  "if (-not $procs) { Write-Host 'AutoShip is not running.' } else { $procs | ForEach-Object { taskkill /PID $_.ProcessId /T /F 2>$null | Out-Null }; Write-Host 'AutoShip stopped.' };" ^
  "Start-Sleep 2"
