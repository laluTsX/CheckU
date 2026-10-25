@echo off
title CheckU - Movil Expo Go
cd /d "%~dp0MovilExpo"
echo ===================================================
echo             CHECKU - EXPO GO (MOVIL)
echo ===================================================
echo.
echo Iniciando servidor Metro de Expo...
echo - Abre la aplicacion "Expo Go" en tu telefono
echo - Escanea el codigo QR que aparecera en pantalla
echo - Asegurate de que tu telefono y PC esten en el mismo Wi-Fi
echo.
npx expo start -c
pause
