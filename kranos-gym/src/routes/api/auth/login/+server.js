import Auth from '../../../../lib/auth.js';
import { json } from '@sveltejs/kit';

const auth = new Auth();

export async function POST({ request }) {
    try {
        const { username, password } = await request.json();
        
        if (!username || !password) {
            return json({
                success: false,
                message: 'Username and password are required'
            }, { status: 400 });
        }
        
        const result = await auth.login(username, password);
        
        if (result.success) {
            return json(result, { status: 200 });
        } else {
            return json(result, { status: 401 });
        }
        
    } catch (error) {
        console.error('Login API error:', error);
        return json({
            success: false,
            message: 'Internal server error'
        }, { status: 500 });
    }
}