@echo off
setlocal
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0build_windows_exe.ps1"
if errorlevel 1 (
 echo.
 echo BUILD FAILED.
 pause
 exit /b 1
)
echo.
echo EXE: %~dp0dist\ASTTC_Tender_Portal.exe
pause
