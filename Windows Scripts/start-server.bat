@echo off
title Gies P2P Chat
echo Starting Gies P2P Chat Server...
:: Navigate to the folder where this batch file lives
cd /d "%~dp0.."
:: Start the server
node server.cjs
pause