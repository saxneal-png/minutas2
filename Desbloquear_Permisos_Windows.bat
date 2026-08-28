@echo off
title Desbloquear Permisos de Windows
echo ========================================================
echo   Desbloqueando permisos de ejecucion para Windows
echo ========================================================
echo.
echo Eliminando marca de bloqueo de descarga de Windows...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path '.' -Recurse | Unblock-File"
echo.
echo [OK] Todos los archivos han sido desbloqueados con exito.
echo Ya puedes ejecutar MinutasAI_Studio.exe sin restricciones de permisos.
echo.
pause
