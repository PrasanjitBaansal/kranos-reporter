/**
 * ============================================================================
 * KRANOS GYM AUTHENTICATION MIDDLEWARE
 * ============================================================================
 * SvelteKit-compatible authentication and authorization middleware
 * Handles JWT validation, session management, and permission checking
 * ============================================================================
 */

import { redirect } from '@sveltejs/kit';
import AuthenticationService from './auth-service.js';

const authService = new AuthenticationService();

/**
 * Extract JWT token from request headers or cookies
 */
function extractToken(request) {
    // Try Authorization header first
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Try cookies
    const cookies = request.headers.get('Cookie');
    if (cookies) {
        const tokenMatch = cookies.match(/auth-token=([^;]+)/);
        if (tokenMatch) {
            return tokenMatch[1];
        }
    }

    return null;
}

/**
 * Extract device information from request
 */
function extractDeviceInfo(request) {
    const userAgent = request.headers.get('User-Agent') || '';
    const ipAddress = request.headers.get('X-Forwarded-For') || 
                     request.headers.get('X-Real-IP') || 
                     request.headers.get('Remote-Addr') || 
                     'unknown';

    return {
        userAgent,
        ipAddress: ipAddress.split(',')[0].trim(), // Handle multiple IPs in X-Forwarded-For
        timestamp: new Date().toISOString()
    };
}

/**
 * Authentication middleware - validates JWT and sets user context
 */
export async function authenticate(request, event) {
    const token = extractToken(request);
    const deviceInfo = extractDeviceInfo(request);
    
    if (!token) {
        return {
            authenticated: false,
            user: null,
            session: null,
            deviceInfo
        };
    }

    try {
        // Verify JWT token
        const decoded = authService.verifyJWT(token);
        
        // Validate session in database
        const sessionData = await authService.validateSession(decoded.sessionId);
        
        if (!sessionData) {
            return {
                authenticated: false,
                user: null,
                session: null,
                deviceInfo,
                error: 'Session expired or invalid'
            };
        }

        // Check if user is still active
        if (sessionData.user.status !== 'active') {
            return {
                authenticated: false,
                user: null,
                session: null,
                deviceInfo,
                error: 'User account is not active'
            };
        }

        // Log activity
        await authService.logActivity(
            sessionData.user.id,
            sessionData.session.id,
            'page_access',
            'request',
            null,
            {
                success: true,
                metadata: {
                    path: request.url,
                    method: request.method
                },
                ipAddress: deviceInfo.ipAddress,
                userAgent: deviceInfo.userAgent,
                requestMethod: request.method,
                requestPath: new URL(request.url).pathname
            }
        );

        return {
            authenticated: true,
            user: sessionData.user,
            session: sessionData.session,
            deviceInfo,
            permissions: await authService.getUserPermissions(sessionData.user.id)
        };

    } catch (error) {
        // Log security event for invalid token
        await authService.logSecurityEvent(
            null,
            'invalid_token_access',
            'medium',
            `Invalid token used to access ${request.url}`,
            deviceInfo
        );

        return {
            authenticated: false,
            user: null,
            session: null,
            deviceInfo,
            error: error.message
        };
    }
}

/**
 * Authorization middleware - checks if user has required permissions
 */
export function authorize(requiredPermissions = [], options = {}) {
    const { 
        redirectTo = '/login',
        requireAll = false, // true = user needs ALL permissions, false = user needs ANY permission
        allowedRoles = [] // Alternative to permissions - check roles directly
    } = options;

    return async (event) => {
        const { request } = event;
        
        // First authenticate the user
        const authResult = await authenticate(request, event);
        
        if (!authResult.authenticated) {
            // For API routes, return 401
            if (request.url.includes('/api/')) {
                return new Response(
                    JSON.stringify({ 
                        error: 'Authentication required',
                        message: authResult.error || 'Please log in to access this resource'
                    }),
                    { 
                        status: 401,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            }
            
            // For page routes, redirect to login
            throw redirect(302, `${redirectTo}?redirect=${encodeURIComponent(request.url)}`);
        }

        // Check role-based access if specified
        if (allowedRoles.length > 0) {
            if (!allowedRoles.includes(authResult.user.role)) {
                // Log unauthorized access attempt
                await authService.logSecurityEvent(
                    authResult.user.id,
                    'unauthorized_access',
                    'high',
                    `User with role '${authResult.user.role}' attempted to access resource requiring roles: ${allowedRoles.join(', ')}`,
                    authResult.deviceInfo
                );

                if (request.url.includes('/api/')) {
                    return new Response(
                        JSON.stringify({ 
                            error: 'Insufficient permissions',
                            message: 'You do not have permission to access this resource'
                        }),
                        { 
                            status: 403,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                }
                
                throw redirect(302, '/unauthorized');
            }
        }

        // Check permission-based access
        if (requiredPermissions.length > 0) {
            const userPermissions = authResult.permissions.map(p => p.name);
            
            let hasAccess = false;
            
            if (requireAll) {
                // User must have ALL required permissions
                hasAccess = requiredPermissions.every(perm => userPermissions.includes(perm));
            } else {
                // User must have ANY of the required permissions
                hasAccess = requiredPermissions.some(perm => userPermissions.includes(perm));
            }

            if (!hasAccess) {
                // Log unauthorized access attempt
                await authService.logSecurityEvent(
                    authResult.user.id,
                    'unauthorized_access',
                    'high',
                    `User attempted to access resource requiring permissions: ${requiredPermissions.join(', ')}`,
                    authResult.deviceInfo
                );

                if (request.url.includes('/api/')) {
                    return new Response(
                        JSON.stringify({ 
                            error: 'Insufficient permissions',
                            message: 'You do not have permission to access this resource',
                            required: requiredPermissions,
                            user_permissions: userPermissions
                        }),
                        { 
                            status: 403,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                }
                
                throw redirect(302, '/unauthorized');
            }
        }

        // Add auth context to event.locals for use in routes
        event.locals.auth = authResult;
        
        return null; // Continue to next middleware/route
    };
}

/**
 * Require authentication for specific roles
 */
export const requireAdmin = authorize([], { allowedRoles: ['admin'] });
export const requireTrainer = authorize([], { allowedRoles: ['admin', 'trainer'] });
export const requireMember = authorize([], { allowedRoles: ['admin', 'trainer', 'member'] });

/**
 * Require specific permissions
 */
export const requirePermissions = (permissions, requireAll = false) => 
    authorize(permissions, { requireAll });

/**
 * Authentication guard for SvelteKit hooks
 */
export async function authGuard(event) {
    const { request } = event;
    
    // Skip authentication for public routes
    const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/api/auth'];
    const pathname = new URL(request.url).pathname;
    
    if (publicRoutes.some(route => pathname.startsWith(route))) {
        return;
    }

    // Skip authentication for static assets
    if (pathname.startsWith('/_app/') || pathname.startsWith('/favicon')) {
        return;
    }

    // Authenticate user
    const authResult = await authenticate(request, event);
    
    // Add auth context to locals
    event.locals.auth = authResult;
    
    // For protected routes, ensure user is authenticated
    if (!authResult.authenticated) {
        if (pathname.startsWith('/api/')) {
            return new Response(
                JSON.stringify({ 
                    error: 'Authentication required',
                    message: 'Please log in to access this resource'
                }),
                { 
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        
        throw redirect(302, `/login?redirect=${encodeURIComponent(request.url)}`);
    }
}

/**
 * Utility function to check permissions in route handlers
 */
export async function hasPermission(event, permissionName) {
    const auth = event.locals.auth;
    if (!auth || !auth.authenticated) {
        return false;
    }
    
    return auth.permissions.some(p => p.name === permissionName);
}

/**
 * Utility function to check role in route handlers
 */
export function hasRole(event, roleName) {
    const auth = event.locals.auth;
    if (!auth || !auth.authenticated) {
        return false;
    }
    
    return auth.user.role === roleName;
}

/**
 * Utility function to get current user from event
 */
export function getCurrentUser(event) {
    const auth = event.locals.auth;
    return auth && auth.authenticated ? auth.user : null;
}

/**
 * Rate limiting middleware
 */
export function rateLimit(options = {}) {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        max = 100, // requests per window
        message = 'Too many requests',
        skipSuccessfulRequests = false
    } = options;

    const requests = new Map();

    return async (event) => {
        const { request } = event;
        const deviceInfo = extractDeviceInfo(request);
        const key = `${deviceInfo.ipAddress}-${request.method}-${new URL(request.url).pathname}`;
        
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Clean old entries
        for (const [k, v] of requests.entries()) {
            if (v.timestamp < windowStart) {
                requests.delete(k);
            }
        }
        
        // Get current request count
        const current = requests.get(key) || { count: 0, timestamp: now };
        
        if (current.timestamp < windowStart) {
            // Reset counter for new window
            current.count = 0;
            current.timestamp = now;
        }
        
        current.count++;
        requests.set(key, current);
        
        if (current.count > max) {
            // Log rate limit violation
            await authService.logSecurityEvent(
                event.locals.auth?.user?.id || null,
                'rate_limit_exceeded',
                'medium',
                `Rate limit exceeded: ${current.count} requests from ${deviceInfo.ipAddress}`,
                deviceInfo
            );

            return new Response(
                JSON.stringify({ 
                    error: 'Rate limit exceeded',
                    message,
                    retryAfter: Math.ceil(windowMs / 1000)
                }),
                { 
                    status: 429,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Retry-After': Math.ceil(windowMs / 1000).toString()
                    }
                }
            );
        }
        
        return null; // Continue to next middleware/route
    };
}

/**
 * CSRF protection middleware
 */
export function csrfProtection(event) {
    const { request } = event;
    
    // Skip CSRF for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        return null;
    }
    
    // Check CSRF token
    const token = request.headers.get('X-CSRF-Token') || 
                 request.headers.get('X-Requested-With');
    
    if (!token) {
        return new Response(
            JSON.stringify({ 
                error: 'CSRF token missing',
                message: 'Request must include CSRF protection'
            }),
            { 
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
    
    return null;
}

export default {
    authenticate,
    authorize,
    authGuard,
    requireAdmin,
    requireTrainer,
    requireMember,
    requirePermissions,
    hasPermission,
    hasRole,
    getCurrentUser,
    rateLimit,
    csrfProtection
};