@echo off
setlocal

cd /d "%~dp0"

echo Rebuilding and starting Civic Pulse full stack...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-full.ps1" -Rebuild
if errorlevel 1 (
  echo.
  echo Startup failed. Check the error output above.
  pause
  exit /b 1
)

start "" "http://localhost:3000/app?safe=1"
exit /b 0
