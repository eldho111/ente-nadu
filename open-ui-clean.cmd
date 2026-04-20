@echo off
setlocal

cd /d "%~dp0"

echo Starting Civic Pulse full stack...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-full.ps1"
if errorlevel 1 (
  echo.
  echo Startup failed. Check the error output above.
  pause
  exit /b 1
)

set "EDGE_1=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
set "EDGE_2=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
set "TARGET_URL=http://localhost:3000/app?safe=1"

if exist "%EDGE_1%" (
  start "" "%EDGE_1%" --user-data-dir="%TEMP%\civicpulse-clean" --disable-extensions --disable-gpu --new-window "%TARGET_URL%"
  exit /b 0
)

if exist "%EDGE_2%" (
  start "" "%EDGE_2%" --user-data-dir="%TEMP%\civicpulse-clean" --disable-extensions --disable-gpu --new-window "%TARGET_URL%"
  exit /b 0
)

echo Edge not found. Opening default browser.
start "" "%TARGET_URL%"
exit /b 0
