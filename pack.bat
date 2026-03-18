@echo off
cd /d "%~dp0"

echo ==========================================
echo  CRM Platform Packer
echo ==========================================

set OUTFILE=%~dp0crm-ai-platform-dist.zip

if exist "%OUTFILE%" (
    echo [INFO] Removing old archive...
    del "%OUTFILE%"
)

echo [INFO] Packing project...

powershell -NoProfile -Command ^
  "$root = '%~dp0'.TrimEnd('\');" ^
  "$out = '%OUTFILE%';" ^
  "$include = @('src','public','docker','start-app.bat','stop.bat','start-app.sh','package.json','package-lock.json','tsconfig.json','next.config.ts','components.json','postcss.config.mjs','eslint.config.mjs','.gitignore','.env.example');" ^
  "$files = New-Object System.Collections.Generic.List[string];" ^
  "foreach ($item in $include) {" ^
  "  $p = Join-Path $root $item;" ^
  "  if (Test-Path $p) { $files.Add($p) } else { Write-Warning \"Not found: $item\" }" ^
  "};" ^
  "$standalone = Join-Path $root '.next\standalone';" ^
  "if (Test-Path $standalone) { $files.Add($standalone) } else { Write-Warning '.next\standalone not found - run start-app.bat first to build' };" ^
  "Compress-Archive -LiteralPath $files -DestinationPath $out -Force;" ^
  "Write-Host '[INFO] Created:' $out"

echo [INFO] Done.
timeout /t 3 /nobreak >nul
