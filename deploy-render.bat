@echo off
title Deploy Automatico - Sistema Fabrica para Render.com
cls

echo ============================================
echo    DEPLOY AUTOMATICO - SISTEMA FABRICA
echo              para Render.com
echo ============================================
echo.

echo [INFO] Verificando PowerShell...
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] PowerShell nao encontrado!
    pause
    exit /b 1
)

echo [INFO] PowerShell encontrado
echo [INFO] Iniciando script de deploy...
echo.

:: Executar script PowerShell
powershell -ExecutionPolicy Bypass -File "%~dp0deploy-render.ps1"

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Deploy falhou!
    pause
    exit /b 1
)

echo.
echo [OK] Deploy concluido!
pause
