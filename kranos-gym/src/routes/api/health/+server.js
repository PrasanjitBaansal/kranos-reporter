import { json } from '@sveltejs/kit';
import Database from '$lib/db/database.js';

export async function GET() {
    try {
        // Check database connection
        const db = new Database();
        db.connect();
        
        // Simple query to verify database is accessible
        const result = db.prepare('SELECT 1 as health_check').get();
        db.close();
        
        if (result && result.health_check === 1) {
            return json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                database: 'connected'
            });
        }
        
        throw new Error('Database check failed');
    } catch (error) {
        console.error('Health check failed:', error);
        return json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        }, { status: 503 });
    }
}