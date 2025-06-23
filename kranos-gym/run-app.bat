@echo off
REM Kranos Gym Management System - Local Development Runner (Windows)
REM This script runs the one-time migration and launches the app in development mode

echo 🏃‍♂️ Starting Kranos Gym Management System...
echo ==========================================

REM Check if we're in the right directory
if not exist package.json (
    echo ❌ Error: package.json not found. Please run this script from the kranos-gym directory.
    pause
    exit /b 1
)

REM Kill any existing processes on ports 5173 and 5174
echo 🔄 Stopping any existing development servers...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5174" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
timeout /t 1 /nobreak >nul

REM Check if node_modules exists, if not install dependencies
if not exist node_modules (
    echo 📦 Installing dependencies...
    npm install
)

REM Run the migration script (only if database doesn't exist or is empty)
echo 🗄️  Checking database...
if not exist kranos.db (
    echo 🔄 Running database migration...
    node src/lib/db/migrate.js
    echo ✅ Database migration completed!
) else (
    echo ✅ Database already exists and populated
)

REM Start the development server
echo 🚀 Starting development server...
echo 📝 The app will open in your browser automatically
echo 🌐 Access URL: http://localhost:5173
echo ⏹️  Press Ctrl+C to stop the server
echo ==========================================

REM Start the server and open browser
npm run dev -- --open

echo 👋 Thanks for using Kranos Gym Management System!
pause