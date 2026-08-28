@echo off
title Generador del Instalador Windows - Minutas AI Studio
echo =======================================================================
echo   Generando Instalador_MinutasAI_Studio.exe (Inno Setup)
echo =======================================================================
echo.
python desktop_app/build_exe.py
echo.
pause
