@echo off
setlocal

cd /d %~dp0

echo ==========================================
echo Complier GUI - Electron Launcher
echo ==========================================

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js bulunamadi.
  pause
  exit /b 1
)

where python >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Python bulunamadi.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [SETUP] Root npm install...
  call npm install
)

if not exist "core\web\node_modules" (
  echo [SETUP] Web npm install...
  cd core\web
  call npm install
  cd ..\..
)

echo [SETUP] Python requirements kontrol...
python -c "import fastapi,uvicorn" >nul 2>nul
if %errorlevel% neq 0 (
  echo [SETUP] Python requirements yukleniyor...
  python -m pip install -r core\requirements.txt
)

echo [START] Electron uygulamasi aciliyor...
call npm run dev

endlocal
