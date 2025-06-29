import { redirect } from '@sveltejs/kit';
import Database from '$lib/db/database.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, cookies, getClientAddress }) {
	const db = new Database();
	
	try {
		db.connect();
		
		// If user is authenticated, log the logout and clean up session
		if (locals.user) {
			const sessionId = cookies.get('session_id');
			
			// Invalidate the session in database
			if (sessionId) {
				db.invalidateUserSession(parseInt(sessionId));
			}
			
			// Log the logout activity
			db.logUserActivity(locals.user.id, 'logout', {
				ip_address: getClientAddress(),
				session_id: sessionId
			});
			
			console.log(`Logout: User '${locals.user.username}' (ID: ${locals.user.id}) logged out from ${getClientAddress()}`);
		}
		
	} catch (error) {
		console.error('Logout error:', error);
	} finally {
		db.close();
	}
	
	// Clear all authentication cookies
	const cookieOptions = {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		path: '/',
		maxAge: 0 // Expire immediately
	};
	
	cookies.set('access_token', '', cookieOptions);
	cookies.set('refresh_token', '', cookieOptions);
	cookies.set('session_id', '', cookieOptions);
	
	// Redirect to login page
	throw redirect(302, '/login');
}