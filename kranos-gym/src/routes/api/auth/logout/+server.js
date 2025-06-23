import Auth from '../../../../lib/auth.js';
import { json } from '@sveltejs/kit';

const auth = new Auth();

export async function POST({ request }) {
    try {
        const sessionToken = request.headers.get('authorization');
        
        if (!sessionToken) {
            return json({
                success: false,
                message: 'No session token provided'
            }, { status: 400 });
        }
        
        const result = auth.logout(sessionToken);
        return json(result, { status: 200 });
        
    } catch (error) {
        console.error('Logout API error:', error);
        return json({
            success: false,
            message: 'Internal server error'
        }, { status: 500 });
    }
}