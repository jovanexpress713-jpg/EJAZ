@echo off
setlocal
cd /d "%~dp0"
if not exist ".env" (
  echo ERROR: .env is missing.
  echo First run PowerShell as Administrator and execute:
  echo   powershell -ExecutionPolicy Bypass -File setup-central-server.ps1
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Installing dependencies...
  call npm ci
  if errorlevel 1 goto :fail
)
if not exist "dist\index.html" (
  echo Building client...
  call npm run build
  if errorlevel 1 goto :fail
)
echo Starting VICTORIA Logistics ERP local central server...
echo Keep this window open while phones are using the system.
call npm start
if errorlevel 1 goto :fail
exit /b 0
:fail
echo.
echo Server startup failed. Review the error above and CENTRAL-SERVER-SETUP.md.
pause
exit /b 1
