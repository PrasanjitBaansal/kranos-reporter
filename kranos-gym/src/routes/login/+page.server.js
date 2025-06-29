import { redirect } from '@sveltejs/kit';
import Database from '$lib/db/database.js';
import { generateAccessToken, generateRefreshToken } from '$lib/security/jwt-utils.js';
import bcrypt from 'bcrypt';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	// If user is already authenticated, redirect to dashboard
	if (locals.user) {
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
			if (user.locked_until && new Date(user.locked_until) > new Date()) {
				const lockTime = new Date(user.locked_until);
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
				db.recordFailedLogin(user.id, getClientAddress());
				
				console.log(`Login attempt failed: Invalid password for user '${username}'`);
				return {
					success: false,
					error: 'Invalid username or password'
				};
			}
			
			// Password is valid - clear failed attempts and proceed with login
			db.clearFailedLoginAttempts(user.id);
			
			// Generate JWT tokens
			const accessToken = generateAccessToken({
				userId: user.id,
				username: user.username,
				role: user.role
			});
			
			const refreshToken = generateRefreshToken({
				userId: user.id,
				username: user.username
			});
			
			// Create session in database
			const sessionData = {
				user_id: user.id,
				refresh_token: refreshToken,
				device_info: request.headers.get('user-agent') || 'Unknown Device',
				ip_address: getClientAddress(),
				expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
			};
			
			const session = db.createUserSession(sessionData);
			
			// Log successful login
			db.logUserActivity(user.id, 'login', {
				ip_address: getClientAddress(),
				device_info: sessionData.device_info,
				session_id: session.id
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
			
			return {
				success: true,
				user: {
					id: user.id,
					username: user.username,
					email: user.email,
					role: user.role,
					created_at: user.created_at
				}
			};
			
		} catch (error) {
			console.error('Login error:', error);
			return {
				success: false,
				error: 'An error occurred during login. Please try again.'
			};
		} finally {
			db.close();
		}
	}
};