@echo off
chcp 65001 > nul
title VozVerde TTS - Servidor Local MP3

echo ========================================================
echo        VOZVERDE - TEXT TO SPEECH EN FORMATO MP3
echo ========================================================
echo.
echo [1/2] Verificando dependencias...
python -m pip install -r requirements.txt --quiet

echo [2/2] Iniciando aplicacion web...
echo.
echo Servidor en ejecucion. Abre en tu navegador:
echo 👉 http://localhost:5000
echo.
echo Presiona Ctrl+C para detener el servidor.
echo ========================================================
echo.

python app.py
pause
