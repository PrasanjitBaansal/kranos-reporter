#!/usr/bin/env node

import { exec } from 'child_process';
import { existsSync, statSync } from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function killPortProcesses(port) {
    try {
        const { stdout } = await execAsync(`lsof -ti :${port}`);
        if (stdout.trim()) {
            console.log(`🔄 Stopping existing processes on port ${port}...`);
            await execAsync(`kill -9 ${stdout.trim()}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        // No processes found on port, which is fine
    }
}

async function startApp() {
    console.log('🏃‍♂️ Starting Kranos Gym Management System...');
    console.log('==========================================');

    try {
        // Clean up ports 5173 and 5174 to ensure fresh start
        await killPortProcesses(5173);
        await killPortProcesses(5174);
        // Check if database exists and has content
        const dbExists = existsSync('kranos.db');
        const dbHasContent = dbExists && statSync('kranos.db').size > 0;

        if (!dbHasContent) {
            console.log('🔄 Running database migration...');
            await execAsync('node src/lib/db/migrate.js');
            console.log('✅ Database migration completed!');
        } else {
            console.log('✅ Database already exists and populated');
        }

        console.log('🚀 Starting development server...');
        console.log('📝 The app will open in your browser automatically');
        console.log('🌐 Access URL: http://localhost:5173');
        console.log('⏹️  Press Ctrl+C to stop the server');
        console.log('==========================================');

        // Start the development server
        const child = exec('npm run dev -- --open');
        
        // Pipe output to console
        child.stdout?.pipe(process.stdout);
        child.stderr?.pipe(process.stderr);

        // Handle process termination
        process.on('SIGINT', () => {
            console.log('\n👋 Thanks for using Kranos Gym Management System!');
            child.kill('SIGINT');
            process.exit(0);
        });

        await new Promise((resolve, reject) => {
            child.on('close', resolve);
            child.on('error', reject);
        });

    } catch (error) {
        console.error('❌ Error starting app:', error.message);
        process.exit(1);
    }
}

startApp();