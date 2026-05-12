@echo off
title Chat Environment Setup
echo Checking system requirements...

:: Check if Node is installed
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Node.js is not installe!
    echo Please download and install Node.js from https://nodejs.org/en/download
    echo.
    pause
    exit /b
)

echo Node.js is installed! 
echo.

:: Navigate to the script's folder, then go UP one level to the project root
cd /d "%~dp0.."

echo Step 1/2: Installing dependencies (this may take a minute)...
call npm install

echo.
echo Step 2/2: Compiling the production build...
call npm run build

echo.
echo Setup Complete! You can now close this window and double-click start-server.bat.
pause