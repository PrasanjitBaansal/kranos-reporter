import Auth from '../../../../lib/auth.js';
import { json } from '@sveltejs/kit';

const auth = new Auth();

export async function POST({ request }) {
    try {
        const sessionToken = request.headers.get('authorization');
        
        if (!sessionToken) {
            return json({
                valid: false,
                message: 'No session token provided'
            }, { status: 401 });
        }
        
        const result = auth.validateSession(sessionToken);
        
        if (result.valid) {
            return json(result, { status: 200 });
        } else {
            return json(result, { status: 401 });
        }
        
    } catch (error) {
        console.error('Validate API error:', error);
        return json({
            valid: false,
            message: 'Internal server error'
        }, { status: 500 });
    }
}