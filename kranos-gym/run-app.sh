#!/bin/bash

# Kranos Gym Management System - Local Development Runner
# This script runs the one-time migration and launches the app in development mode

set -e  # Exit on error

echo "🏃‍♂️ Starting Kranos Gym Management System..."
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the kranos-gym directory."
    exit 1
fi

# Function to kill processes on specific ports
kill_port_processes() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ ! -z "$pids" ]; then
        echo "🔄 Stopping existing processes on port $port..."
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Clean up ports 5173 and 5174 to ensure fresh start
kill_port_processes 5173
kill_port_processes 5174

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run the migration script (only if database doesn't exist or is empty)
echo "🗄️  Checking database..."
if [ ! -f "kranos.db" ] || [ ! -s "kranos.db" ]; then
    echo "🔄 Running database migration..."
    node src/lib/db/migrate.js
    echo "✅ Database migration completed!"
else
    echo "✅ Database already exists and populated"
fi

# Start the development server
echo "🚀 Starting development server..."
echo "📝 The app will open in your browser automatically"
echo "🌐 Access URL: http://localhost:5173"
echo "⏹️  Press Ctrl+C to stop the server"
echo "=========================================="

# Start the server and open browser
npm run dev -- --open

echo "👋 Thanks for using Kranos Gym Management System!"