@echo off
title CheckU - Web (Next.js)
cd /d "%~dp0web"
echo ========================================
echo   Iniciando CheckU Web (Next.js)
echo   URL: http://localhost:3000
echo ========================================
npm run dev
pause
