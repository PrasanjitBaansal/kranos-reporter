import { redirect } from '@sveltejs/kit';
import Database from '$lib/db/database.js';
import { verifyAccessToken, createAccessToken } from '$lib/security/jwt-utils.js';

// Route permission definitions based on role hierarchy
const ROUTE_PERMISSIONS = {
	// Admin and Trainer can access members (updated below for create/edit/delete restrictions)
	'/members': ['members.view'],
	'/api/members': ['members.view'],
	
	// Admin and Trainer can access plans
	'/plans': ['plans.view'],
	
	// Admin and Trainer can access memberships
	'/memberships': ['memberships.view'],
	'/memberships/bulk-import': ['memberships.bulk_import'],
	
	// Only Admin can access reports (Trainers excluded)
	'/reporting': ['reports.view'],
	'/api/reports': ['reports.view'],
	
	// Settings require admin permissions
	'/settings': ['settings.view'],
	
	// User management - Admin only
	'/users': ['users.view'],
	
	// Member profile - Members only (members can view their own profile)
	'/profile': ['profile.view']
};

// Check if user has required permissions for a route
function hasRouteAccess(userPermissions, pathname) {
	// Find matching route pattern
	for (const [routePattern, requiredPerms] of Object.entries(ROUTE_PERMISSIONS)) {
		if (pathname.startsWith(routePattern)) {
			// User needs ANY of the required permissions
			return requiredPerms.some(perm => userPermissions.includes(perm));
		}
	}
	// If no specific permissions required, allow access (like dashboard)
	return true;
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const { cookies, url } = event;
	
	// Public routes that don't require authentication
	const publicRoutes = ['/login', '/logout', '/setup', '/api/health'];
	const isPublicRoute = publicRoutes.some(route => url.pathname.startsWith(route));
	
	// Static assets and API routes
	const isStaticAsset = url.pathname.startsWith('/_app/') || 
	                    url.pathname.startsWith('/favicon') ||
	                    url.pathname.endsWith('.css') ||
	                    url.pathname.endsWith('.js') ||
	                    url.pathname.endsWith('.png') ||
	                    url.pathname.endsWith('.jpg') ||
	                    url.pathname.endsWith('.svg');
	
	// Skip authentication for static assets
	if (isStaticAsset) {
		return resolve(event);
	}
	
	// Check for first-time setup (no admin users exist)
	// Skip this check for /setup route to avoid infinite redirects
	if (url.pathname !== '/setup') {
		const db = new Database();
		try {
			db.connect();
			
			if (db.isFirstTimeSetup()) {
				console.log('First-time setup detected, redirecting to /setup');
				throw redirect(302, '/setup');
			}
		} catch (error) {
			if (error?.status === 302) {
				throw error; // Re-throw redirect
			}
			console.error('First-time setup check error:', error);
			// Continue on error to avoid breaking the app
		} finally {
			db.close();
		}
	}
	
	const accessToken = cookies.get('access_token');
	const refreshToken = cookies.get('refresh_token');
	const sessionId = cookies.get('session_id');
	
	let user = null;
	let needsTokenRefresh = false;
	
	// Try to verify access token
	if (accessToken) {
		try {
			const payload = verifyAccessToken(accessToken);
			user = {
				id: parseInt(payload.sub), // JWT standard uses 'sub' for subject (user ID)
				username: payload.username,
				role: payload.role
			};
		} catch (error) {
			console.log('Access token verification failed:', error.message);
			needsTokenRefresh = true;
		}
	} else if (refreshToken) {
		needsTokenRefresh = true;
	}
	
	// Try to refresh token if needed
	if (needsTokenRefresh && refreshToken && sessionId) {
		const db = new Database();
		try {
			db.connect();
			
			// Verify session exists and is valid
			const session = db.getUserSession(parseInt(sessionId));
			
			if (session && session.refresh_token === refreshToken && new Date(session.expires_at) > new Date()) {
				// Get user details
				const userData = db.getUserById(session.user_id);
				
				if (userData) {
					// Generate new access token
					const { token: newAccessToken } = createAccessToken({
						id: userData.id,
						username: userData.username,
						role: userData.role,
						email: userData.email,
						full_name: userData.full_name
					}, session.session_token);
					
					// Set new access token cookie
					cookies.set('access_token', newAccessToken, {
						httpOnly: true,
						secure: process.env.NODE_ENV === 'production',
						sameSite: 'strict',
						path: '/',
						maxAge: 60 * 60 // 1 hour
					});
					
					user = {
						id: userData.id,
						username: userData.username,
						role: userData.role
					};
					
					console.log(`Token refreshed for user: ${userData.username}`);
				}
			} else {
				// Session is invalid, clear cookies
				const cookieOptions = {
					httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'strict',
					path: '/',
					maxAge: 0
				};
				
				cookies.set('access_token', '', cookieOptions);
				cookies.set('refresh_token', '', cookieOptions);
				cookies.set('session_id', '', cookieOptions);
				
				console.log('Invalid session detected, cookies cleared');
			}
		} catch (error) {
			console.error('Token refresh error:', error);
		} finally {
			db.close();
		}
	}
	
	// Set user in locals for access in routes
	event.locals.user = user;
	
	// Handle authentication requirements
	if (!isPublicRoute && !user) {
		// User is not authenticated and trying to access protected route
		console.log(`Unauthorized access attempt to: ${url.pathname}`);
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	
	if (isPublicRoute && user && url.pathname === '/login') {
		// User is already authenticated and trying to access login page
		throw redirect(302, '/');
	}
	
	// Check role-based permissions for authenticated users
	if (user && !isPublicRoute) {
		const db = new Database();
		try {
			db.connect();
			
			// Get user permissions from database
			const userPermissions = db.getUserPermissions(user.id);
			const permissionNames = userPermissions.map(p => p.name);
			
			// Check if user has access to this route
			if (!hasRouteAccess(permissionNames, url.pathname)) {
				console.log(`Permission denied for user '${user.username}' (${user.role}) accessing: ${url.pathname}`);
				console.log(`User permissions: ${permissionNames.join(', ')}`);
				
				// Log security event
				db.logSecurityEvent({
					event_type: 'unauthorized_access',
					user_id: user.id,
					username: user.username,
					severity: 'high',
					details: JSON.stringify({
						attempted_route: url.pathname,
						user_role: user.role,
						user_permissions: permissionNames
					})
				});
				
				// Redirect to unauthorized page or dashboard
				throw redirect(302, '/?error=unauthorized');
			}
			
			// Add permissions to locals for use in routes
			event.locals.permissions = permissionNames;
			
		} catch (error) {
			console.error('Permission checking error:', error);
			// On error, allow access but log the issue
		} finally {
			db.close();
		}
	}
	
	return resolve(event);
}

/** @type {import('@sveltejs/kit').HandleServerError} */
export async function handleError({ error, event }) {
	console.error('Server error:', error);
	
	// Log error details if user is authenticated
	if (event.locals.user) {
		const db = new Database();
		try {
			db.connect();
			db.logSecurityEvent({
				event_type: 'server_error',
				user_id: event.locals.user.id,
				username: event.locals.user.username,
				severity: 'high',
				details: JSON.stringify({
					error: error.message,
					stack: error.stack,
					url: event.url.pathname,
					method: event.request.method
				})
			});
		} catch (dbError) {
			console.error('Failed to log error to database:', dbError);
		} finally {
			db.close();
		}
	}
	
	return {
		message: 'An unexpected error occurred',
		code: error?.code ?? 'UNKNOWN'
	};
}