# Script de inicio rapido de PowerShell para VozVerde TTS
Write-Host "========================================================" -ForegroundColor Green
Write-Host "       VOZVERDE - TEXT TO SPEECH EN FORMATO MP3" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""

Write-Host "[1/2] Verificando dependencias de Python..." -ForegroundColor Cyan
python -m pip install -r requirements.txt --quiet

Write-Host "[2/2] Iniciando servidor web..." -ForegroundColor Cyan
Write-Host ""
Write-Host "👉 Abre en tu navegador: http://localhost:5000" -ForegroundColor Yellow
Write-Host "Presiona Ctrl+C en esta terminal para detener el servidor." -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""

# Abrir el navegador automaticamente si es posible
Start-Process "http://localhost:5000"

python app.py
