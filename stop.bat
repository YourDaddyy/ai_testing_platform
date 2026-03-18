@echo off
echo [INFO] Stopping CRM Platform Server...

powershell -NoProfile -Command ^
  "$p = (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).OwningProcess;" ^
  "if ($p) { Stop-Process -Id $p -Force; Write-Host '[INFO] Killed PID' $p } else { Write-Host '[INFO] No server on port 3000' }"

echo [INFO] Done.
timeout /t 2 /nobreak >nul
