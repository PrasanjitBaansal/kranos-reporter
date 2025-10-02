import { redirect } from '@sveltejs/kit';
import Database from '$lib/db/database.js';
import { createAccessToken, createRefreshToken } from '$lib/security/jwt-utils.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	// If user is already authenticated, redirect to dashboard
	if (locals.user) {
		console.log('User already authenticated, redirecting to dashboard');
		throw redirect(302, '/');
	}
	
	return {};
}

/** @type {import('./$types').Actions} */
export const actions = {
	login: async ({ request, cookies, getClientAddress }) => {
		const formData = await request.formData();
		const username = formData.get('username')?.toString().trim();
		const password = formData.get('password')?.toString();
		
		// Validation
		const errors = {};
		if (!username) {
			errors.username = 'Username is required';
		}
		if (!password) {
			errors.password = 'Password is required';
		}
		
		if (Object.keys(errors).length > 0) {
			return {
				success: false,
				error: 'Please fill in all required fields',
				errors
			};
		}
		
		const db = new Database();
		
		try {
			db.connect();
			
			// Get user by username
			const user = db.getUserByUsername(username);
			
			if (!user) {
				// User doesn't exist
				console.log(`Login attempt failed: User '${username}' not found`);
				return {
					success: false,
					error: 'Invalid username or password'
				};
			}
			
			// Check if account is locked
			if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
				const lockTime = new Date(user.account_locked_until);
				const timeRemaining = Math.ceil((lockTime - new Date()) / 60000); // minutes
				
				console.log(`Login attempt blocked: Account '${username}' is locked for ${timeRemaining} more minutes`);
				return {
					success: false,
					error: `Account is locked. Try again in ${timeRemaining} minutes.`
				};
			}
			
			// Verify password
			const passwordValid = await bcrypt.compare(password, user.password_hash);
			
			if (!passwordValid) {
				// Invalid password - increment failed attempts
				const newAttempts = (user.failed_login_attempts || 0) + 1;
				const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
				
				db.updateUser(user.id, {
					failed_login_attempts: newAttempts,
					account_locked_until: lockUntil
				});
				
				console.log(`Login attempt failed: Invalid password for user '${username}'`);
				return {
					success: false,
					error: 'Invalid username or password'
				};
			}
			
			// Password is valid - clear failed attempts and proceed with login
			db.updateUser(user.id, {
				failed_login_attempts: 0,
				account_locked_until: null,
				last_login: new Date().toISOString()
			});
			
			// Generate JWT tokens
			console.log('Creating tokens for user:', { id: user.id, username: user.username, role: user.role });
			const sessionId = crypto.randomBytes(32).toString('hex');
			const { token: accessToken } = createAccessToken(user, sessionId);
			const { token: refreshToken } = createRefreshToken(user, sessionId);
			
			// Create session in database
			const sessionData = {
				user_id: user.id,
				session_token: sessionId,
				refresh_token: refreshToken,
				device_info: JSON.stringify({
					userAgent: request.headers.get('user-agent') || 'Unknown Device',
					ipAddress: getClientAddress()
				}),
				ip_address: getClientAddress(),
				user_agent: request.headers.get('user-agent') || 'Unknown Device',
				expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
			};
			
			const session = db.createSession(sessionData);
			
			// Log successful login
			db.logActivity({
				user_id: user.id,
				username: user.username,
				action: 'login',
				resource_type: 'session',
				resource_id: session.id,
				ip_address: getClientAddress(),
				user_agent: request.headers.get('user-agent') || 'Unknown Device',
				details: {
					session_id: session.id
				}
			});
			
			// Set secure HTTP-only cookies
			const cookieOptions = {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'strict',
				path: '/'
			};
			
			// Access token - 1 hour
			cookies.set('access_token', accessToken, {
				...cookieOptions,
				maxAge: 60 * 60 // 1 hour
			});
			
			// Refresh token - 7 days
			cookies.set('refresh_token', refreshToken, {
				...cookieOptions,
				maxAge: 7 * 24 * 60 * 60 // 7 days
			});
			
			// Session ID for additional security
			cookies.set('session_id', session.id.toString(), {
				...cookieOptions,
				maxAge: 7 * 24 * 60 * 60 // 7 days
			});
			
			console.log(`Login successful: User '${username}' (ID: ${user.id}) logged in from ${getClientAddress()}`);

			// Redirect to dashboard or originally requested page
			// This ensures cookies are set before the redirect happens
			throw redirect(302, '/');
			
		} catch (error) {
			// Check if this is a redirect (which is thrown intentionally)
			if (error?.status === 302) {
				db.close();
				throw error; // Re-throw redirect
			}

			console.error('Login error:', error);
			console.error('Error stack:', error.stack);
			console.error('Error type:', error.constructor.name);
			return {
				success: false,
				error: 'An error occurred during login. Please try again.',
				details: error.message // Add error details for debugging
			};
		} finally {
			db.close();
		}
	}
};