@echo off
echo ==========================================
echo   SISTEMA FABRICA - MODO DESENVOLVIMENTO
echo ==========================================
echo.
echo Iniciando backend e frontend...
echo.

start "Backend" cmd /k "cd /d %~dp0 && node server.js"
timeout /t 3 >nul
start "Frontend" cmd /k "cd /d %~dp0\client && npm run dev"

echo.
echo Acesse o sistema em:
echo   - Frontend: http://localhost:5173
echo   - Backend API: http://localhost:3000
echo.
echo Feche as janelas do terminal para parar
echo ==========================================
echo.

pause
