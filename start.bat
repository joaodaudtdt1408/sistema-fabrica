@echo off
echo ==========================================
echo   SISTEMA FABRICA - GESTAO DE PRODUCAO
echo ==========================================
echo.
echo Iniciando servidor...
echo.
echo Acesse o sistema em:
echo   - Local: http://localhost:3000
echo   - Rede: http://%COMPUTERNAME%:3000
echo.
echo Login padrao:
echo   Email: admin@fabrica.com
echo   Senha: admin123
echo.
echo Pressione Ctrl+C para parar
echo ==========================================
echo.

node server.js

pause
