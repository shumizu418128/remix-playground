@echo off
setlocal

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

start "Remix Dev Server" cmd /c "cd /d ""%PROJECT_DIR%"" && npm run dev"

timeout /t 3 >nul

start "" "http://localhost:5173"

endlocal
exit /b 0
