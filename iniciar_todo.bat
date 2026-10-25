@echo off
title CheckU - Lanzador General
echo ===================================================
echo             CHECKU - INICIADOR GENERAL
echo ===================================================
echo.
echo [1/3] Iniciando Backend Flask en puerto 5000...
start "CheckU - Backend" cmd /k "cd /d %~dp0BackEnd && python run.py"
timeout /t 2 /nobreak >nul

echo.
echo [2/3] Iniciando App Web en puerto 3000...
start "CheckU - Web" cmd /k "cd /d %~dp0web && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo [3/3] Iniciando Metro Bundler para Expo Go...
start "CheckU - Expo Go" cmd /k "cd /d %~dp0MovilExpo && npx expo start -c"

echo.
echo ===================================================
echo  Todos los servicios se han iniciado:
echo  - Backend API: http://localhost:5000
echo  - Web App:     http://localhost:3000
echo  - Expo Go:     Metro Bundler (Escanea el QR)
echo ===================================================
echo.
pause
