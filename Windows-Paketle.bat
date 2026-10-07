@echo off
setlocal
cd /d "%~dp0"
call npm install
if errorlevel 1 goto error
call npm run dist:win
if errorlevel 1 goto error
echo.
echo Paketler release klasorune olusturuldu.
pause
exit /b 0

:error
echo.
echo Paketleme tamamlanamadi. Yukaridaki hata mesajini kontrol edin.
pause
exit /b 1
