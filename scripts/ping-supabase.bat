@echo off
REM Supabase Keep-Alive Ping Script
REM This batch file provides easy double-click execution

title Supabase Keep-Alive Ping

echo.
echo ========================================
echo   Supabase Keep-Alive Ping Service
echo ========================================
echo.

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

REM Change to project root directory
cd /d "%PROJECT_ROOT%"

REM Check if Node.js is available
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if the ping script exists
if not exist "%SCRIPT_DIR%ping-supabase.js" (
    echo ERROR: Ping script not found at: %SCRIPT_DIR%ping-supabase.js
    pause
    exit /b 1
)

REM Run the ping script
echo Running Supabase ping...
echo.

node "%SCRIPT_DIR%ping-supabase.js"

set EXIT_CODE=%ERRORLEVEL%

echo.
echo ========================================

if %EXIT_CODE% equ 0 (
    echo SUCCESS: Ping completed successfully!
    echo ========================================
    echo.
    echo Your Supabase project has been pinged
    echo and will remain active.
) else (
    echo WARNING: Ping completed with errors
    echo ========================================
    echo.
    echo Check the logs directory for details.
)

echo.
echo Log file: logs\supabase-ping.log
echo.

REM If running from scheduled task, don't pause
if "%1"=="--no-pause" goto :end

echo Press any key to close this window...
pause >nul

:end
exit /b %EXIT_CODE%