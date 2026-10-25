@echo off
title CheckU - Movil (React Native)
cd /d "%~dp0Movil"
echo ========================================
echo   Configurando ADB y puertos inversos...
echo ========================================
adb reverse tcp:8081 tcp:8081
adb reverse tcp:5000 tcp:5000
echo.
echo ========================================
echo   Iniciando Metro Bundler y App Android...
echo ========================================
npm start
pause
