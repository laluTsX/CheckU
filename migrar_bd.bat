@echo off
title CheckU - Gestor de Migraciones MySQL (BD: cuu)
setlocal enabledelayedexpansion

cd /d "%~dp0BackEnd"

:menu
cls
echo ===================================================================
echo          CHECKU - CONTROL DE MIGRACIONES MYSQL (BD: cuu)
echo ===================================================================
echo.
echo  Base de datos destino: MySQL 'cuu' en localhost:3306
echo.
echo  [1] Generar archivo de migracion tras cambiar modelos (flask migrate)
echo  [2] Aplicar cambios a las tablas en MySQL cuu (flask upgrade)
echo  [3] Proceso completo: Generar y Aplicar (Migrate + Upgrade)
echo  [4] Sembrar datos demo (flask seed)
echo  [5] Comprobar conexion y tablas en MySQL cuu
echo  [6] Salir
echo.
echo ===================================================================
set /p opc="Selecciona una opcion (1-6): "

if "%opc%"=="1" goto opc_migrate
if "%opc%"=="2" goto opc_upgrade
if "%opc%"=="3" goto opc_all
if "%opc%"=="4" goto opc_seed
if "%opc%"=="5" goto opc_check
if "%opc%"=="6" goto fin

goto menu

:opc_migrate
echo.
set /p msg="Ingresa una descripcion del cambio realizado (Ej. agregar_campo_x): "
if "%msg%"=="" set msg=actualizacion_modelo
echo.
echo [CheckU] Detectando cambios en modelos y generando migracion...
python -m flask db migrate -m "%msg%"
echo.
pause
goto menu

:opc_upgrade
echo.
echo [CheckU] Aplicando migraciones pendientes a MySQL cuu...
python -m flask db upgrade
echo.
pause
goto menu

:opc_all
echo.
set /p msg="Ingresa una descripcion del cambio realizado: "
if "%msg%"=="" set msg=actualizacion_cuu
echo.
echo [CheckU] [Paso 1/2] Generando migracion...
python -m flask db migrate -m "%msg%"
echo.
echo [CheckU] [Paso 2/2] Aplicando cambios a MySQL cuu...
python -m flask db upgrade
echo.
pause
goto menu

:opc_seed
echo.
echo [CheckU] Sembrando datos iniciales en MySQL cuu...
python -m flask seed
echo.
pause
goto menu

:opc_check
echo.
echo [CheckU] Verificando estado de MySQL cuu...
python -c "from app import create_app; from extensions import db; app=create_app(); ctx=app.app_context(); ctx.push(); print('Conectado a:', db.engine.url); print('Tablas activas:', list(db.metadata.tables.keys())); ctx.pop()"
echo.
pause
goto menu

:fin
exit /b 0
