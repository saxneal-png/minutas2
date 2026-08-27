@echo off
title Minutas AI Studio
if exist "MinutasAI_Studio.exe" (
    start "" "MinutasAI_Studio.exe"
) else (
    echo Ejecutable no encontrado, iniciando via Python...
    start "" python desktop_app/main.py
)
