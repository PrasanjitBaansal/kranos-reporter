// Context7-grounded: Dynamic expense categories API
import Database from '$lib/db/database.js';
import { json } from '@sveltejs/kit';

export async function GET({ url, locals }) {
    // Context7-grounded: Permission check
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!locals.permissions.includes('payments.view')) {
        return json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const db = new Database();
    try {
        db.connect();
        
        // Get all unique categories
        const categories = db.getExpenseCategories();
        
        return json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('Categories API error:', error);
        return json({ 
            success: false, 
            error: 'Failed to fetch categories' 
        }, { status: 500 });
    } finally {
        db.close();
    }
}