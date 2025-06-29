import { json } from '@sveltejs/kit';
import Database from '$lib/db/database.js';

/**
 * API endpoint for updating member statuses
 * Moved from main page load for better performance
 */
export async function POST() {
    const db = new Database();
    try {
        console.log('API: Starting member status updates...');
        const startTime = Date.now();
        
        await db.connect();
        
        // Update all member statuses based on their current memberships
        const results = await db.updateAllMemberStatuses();
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`API: Updated ${results.length} member statuses in ${duration}ms`);
        
        return json({
            success: true,
            updated_count: results.length,
            duration_ms: duration,
            results
        });
        
    } catch (error) {
        console.error('API Error updating member statuses:', error);
        return json({ 
            success: false, 
            error: 'Failed to update member statuses' 
        }, { status: 500 });
    } finally {
        try {
            await db.close();
        } catch (closeError) {
            console.error('API Error closing database:', closeError);
        }
    }
}

/**
 * GET endpoint to check when statuses were last updated
 */
export async function GET() {
    const db = new Database();
    try {
        await db.connect();
        
        // Get status update metadata (could be stored in app_settings table)
        const stmt = db.prepare(`
            SELECT setting_value as last_update 
            FROM app_settings 
            WHERE setting_key = 'last_status_update'
        `);
        const result = stmt.get();
        
        return json({
            success: true,
            last_update: result?.last_update || null,
            needs_update: !result || Date.now() - new Date(result.last_update).getTime() > 3600000 // 1 hour
        });
        
    } catch (error) {
        console.error('API Error checking status update time:', error);
        return json({ 
            success: false, 
            error: 'Failed to check status update time' 
        }, { status: 500 });
    } finally {
        try {
            await db.close();
        } catch (closeError) {
            console.error('API Error closing database:', closeError);
        }
    }
}