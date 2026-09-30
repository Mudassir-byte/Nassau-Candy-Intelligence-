@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found. Install Python 3 and try again.
  pause
  exit /b 1
)

start "Nassau Candy Dashboard Server" /min python -m http.server 8000
set /a attempts=0

:wait_for_server
powershell -NoProfile -Command "try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/' -UseBasicParsing -TimeoutSec 1; if ($response.StatusCode -eq 200) { exit 0 }; exit 1 } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto open_dashboard
set /a attempts+=1
if %attempts% geq 15 (
  echo The local server did not start. Check whether port 8000 is already in use.
  pause
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto wait_for_server

:open_dashboard
start "" "http://127.0.0.1:8000/"
endlocal