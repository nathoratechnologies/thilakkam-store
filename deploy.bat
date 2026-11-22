@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   Thilakkam Store - publishing to Firebase
echo ============================================
echo.
echo [1/3] Google login - a browser opens: choose thilakkam.official@gmail.com and click Allow
echo       (only the first time; if it says "already logged in" that is fine)
call npx --yes firebase-tools login:add thilakkam.official@gmail.com
echo.
echo [2/3] Installing parts (first time only) and building the website...
call npm install --no-audit --no-fund
call npm run build
if errorlevel 1 (echo BUILD FAILED - send a screenshot of this window to Claude & pause & exit /b 1)
echo.
echo [3/3] Uploading website + security rules to Firebase...
call npx --yes firebase-tools deploy --project thilakkam-store --account thilakkam.official@gmail.com
if errorlevel 1 (echo DEPLOY FAILED - send a screenshot of this window to Claude & pause & exit /b 1)
echo.
echo DONE! Open this on your phone:  https://thilakkam-store.web.app
pause
