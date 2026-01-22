@echo off
REM ConnectIO Startup Script for Windows

echo.
echo ========================================
echo    ConnectIO - Video Conferencing App
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
  echo Packages not found. Installing dependencies...
  echo.
  call npm install
  echo.
)

REM Check if .env file exists
if not exist ".env" (
  echo .env file not found. Creating from template...
  copy .env.example .env
  echo.
  echo ^⚠️  IMPORTANT: Edit .env file with your Gmail app password before running!
  echo.
  pause
)

echo.
echo Starting ConnectIO server...
echo.
echo Express Server: http://localhost:3030
echo Google Auth: Required (Login with Google)
echo.
echo PeerJS is built-in and will run on the same port (3030)
echo.

call npm start

pause
