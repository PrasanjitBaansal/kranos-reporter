/**
 * ============================================================================
 * KRANOS GYM AUTHENTICATION SYSTEM - INTEGRATION EXAMPLE
 * ============================================================================
 * Complete example showing how to integrate authentication with existing system
 * Demonstrates SvelteKit hooks, API routes, and page-level authentication
 * ============================================================================
 */

// ============================================================================
// 1. SVELTEKIT HOOKS INTEGRATION
// ============================================================================

// File: src/hooks.server.js
import { authGuard, rateLimit } from '$lib/security/auth-middleware.js';

export async function handle({ event, resolve }) {
    // Apply rate limiting
    const rateLimitResult = await rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // requests per window
    })(event);
    
    if (rateLimitResult) {
        return rateLimitResult;
    }
    
    // Apply authentication guard
    const authResult = await authGuard(event);
    if (authResult) {
        return authResult;
    }
    
    // Continue to route
    const response = await resolve(event);
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    return response;
}

// ============================================================================
// 2. API ROUTES IMPLEMENTATION
// ============================================================================

// File: src/routes/api/auth/login/+server.js
import { json } from '@sveltejs/kit';
import AuthenticationService from '$lib/security/auth-service.js';
import { validateEmail, validatePasswordStrength } from '$lib/utils/auth-utils.js';
import { rateLimit } from '$lib/security/auth-middleware.js';

const authService = new AuthenticationService();

export async function POST({ request, getClientAddress }) {
    try {
        // Apply rate limiting specifically for login attempts
        const rateLimitResult = await rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5, // 5 login attempts per window
            message: 'Too many login attempts. Please try again later.'
        })({ request });
        
        if (rateLimitResult) {
            return rateLimitResult;
        }
        
        const { username, password } = await request.json();
        
        // Validate inputs
        if (!username || !password) {
            return json({ 
                error: 'Username and password are required' 
            }, { status: 400 });
        }
        
        // Extract device information
        const deviceInfo = {
            ipAddress: getClientAddress(),
            userAgent: request.headers.get('User-Agent'),
            timestamp: new Date().toISOString()
        };
        
        // Attempt login
        const loginResult = await authService.login(username, password, deviceInfo);
        
        // Set secure HTTP-only cookie
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60, // 1 hour
            path: '/'
        };
        
        return json({
            success: true,
            user: loginResult.user,
            expiresAt: loginResult.expiresAt
        }, {
            headers: {
                'Set-Cookie': `auth-token=${loginResult.token}; ${Object.entries(cookieOptions)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('; ')}`
            }
        });
        
    } catch (error) {
        return json({ 
            error: error.message 
        }, { status: 401 });
    }
}

// File: src/routes/api/auth/register/+server.js
export async function POST({ request, getClientAddress }) {
    try {
        const { username, email, password, role = 'member' } = await request.json();
        
        // Validate inputs
        const usernameValidation = validateUsername(username);
        if (!usernameValidation.isValid) {
            return json({ errors: usernameValidation.errors }, { status: 400 });
        }
        
        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
            return json({ errors: emailValidation.errors }, { status: 400 });
        }
        
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            return json({ errors: passwordValidation.errors }, { status: 400 });
        }
        
        // Create user
        const newUser = await authService.createUser({
            username: usernameValidation.username,
            email: emailValidation.email,
            password,
            role
        });
        
        return json({
            success: true,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
            }
        });
        
    } catch (error) {
        return json({ 
            error: error.message 
        }, { status: 400 });
    }
}

// File: src/routes/api/auth/refresh/+server.js
export async function POST({ request, getClientAddress }) {
    try {
        const { refreshToken } = await request.json();
        
        if (!refreshToken) {
            return json({ error: 'Refresh token required' }, { status: 400 });
        }
        
        const deviceInfo = {
            ipAddress: getClientAddress(),
            userAgent: request.headers.get('User-Agent')
        };
        
        const refreshResult = await authService.refreshToken(refreshToken, deviceInfo);
        
        return json({
            success: true,
            token: refreshResult.token,
            expiresAt: refreshResult.expiresAt
        });
        
    } catch (error) {
        return json({ 
            error: 'Invalid refresh token' 
        }, { status: 401 });
    }
}

// ============================================================================
// 3. PAGE-LEVEL AUTHENTICATION
// ============================================================================

// File: src/routes/members/+page.server.js
import { requirePermissions } from '$lib/security/auth-middleware.js';
import KranosSQLite from '$lib/db/database.js';

export async function load({ event }) {
    // Require members.view permission
    const authCheck = await requirePermissions(['members.view'])(event);
    if (authCheck) {
        return authCheck;
    }
    
    const db = new KranosSQLite();
    
    try {
        // Get members data
        const members = db.getMembers();
        
        // Log activity
        await db.logActivity({
            user_id: event.locals.auth.user.id,
            session_id: event.locals.auth.session.id,
            action: 'view_members',
            resource_type: 'member',
            resource_id: null,
            success: true,
            ip_address: event.locals.auth.deviceInfo.ipAddress,
            user_agent: event.locals.auth.deviceInfo.userAgent,
            request_method: 'GET',
            request_path: '/members'
        });
        
        return {
            members,
            user: event.locals.auth.user,
            permissions: event.locals.auth.permissions
        };
        
    } catch (error) {
        console.error('Error loading members:', error);
        
        // Log error
        await db.logActivity({
            user_id: event.locals.auth.user.id,
            session_id: event.locals.auth.session.id,
            action: 'view_members_failed',
            resource_type: 'member',
            resource_id: null,
            success: false,
            error_message: error.message,
            severity: 'error'
        });
        
        throw error;
    } finally {
        db.close();
    }
}

// ============================================================================
// 4. MEMBER-SPECIFIC AUTHENTICATION INTEGRATION
// ============================================================================

// File: src/routes/api/members/+server.js - Create Member with Authentication
import { requirePermissions, getCurrentUser } from '$lib/security/auth-middleware.js';

export async function POST({ request, event }) {
    // Check permissions
    const authCheck = await requirePermissions(['members.create'])(event);
    if (authCheck) {
        return authCheck;
    }
    
    const db = new KranosSQLite();
    
    try {
        const memberData = await request.json();
        const currentUser = getCurrentUser(event);
        
        // Create member
        const newMember = db.createMember(memberData);
        
        // Log activity
        await db.logActivity({
            user_id: currentUser.id,
            session_id: event.locals.auth.session.id,
            action: 'create_member',
            resource_type: 'member',
            resource_id: newMember.id,
            success: true,
            metadata: { 
                memberName: newMember.name,
                memberPhone: newMember.phone 
            }
        });
        
        return json({
            success: true,
            member: newMember
        });
        
    } catch (error) {
        // Log error
        await db.logActivity({
            user_id: getCurrentUser(event)?.id,
            action: 'create_member_failed',
            resource_type: 'member',
            success: false,
            error_message: error.message,
            severity: 'error'
        });
        
        return json({ 
            error: error.message 
        }, { status: 400 });
    } finally {
        db.close();
    }
}

// ============================================================================
// 5. LINKING USERS TO EXISTING MEMBERS
// ============================================================================

// Function to link a user account to an existing member
export async function linkUserToMember(userId, memberId, createdBy) {
    const db = new KranosSQLite();
    
    try {
        // Verify member exists
        const member = db.getMemberById(memberId);
        if (!member) {
            throw new Error('Member not found');
        }
        
        // Verify user exists
        const user = db.getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        
        // Check if member already has a user account
        const existingUser = db.prepare('SELECT id FROM users WHERE member_id = ?').get(memberId);
        if (existingUser) {
            throw new Error('Member already has a user account');
        }
        
        // Link user to member
        const result = db.updateUser(userId, { member_id: memberId });
        
        // Log the linking activity
        await db.logActivity({
            user_id: createdBy,
            action: 'link_user_to_member',
            resource_type: 'user',
            resource_id: userId,
            success: true,
            metadata: {
                memberId: memberId,
                memberName: member.name,
                memberPhone: member.phone
            }
        });
        
        return { success: true, changes: result.changes };
        
    } catch (error) {
        await db.logActivity({
            user_id: createdBy,
            action: 'link_user_to_member_failed',
            resource_type: 'user',
            resource_id: userId,
            success: false,
            error_message: error.message,
            severity: 'error'
        });
        
        throw error;
    } finally {
        db.close();
    }
}

// ============================================================================
// 6. ROLE-BASED DASHBOARD ROUTING
// ============================================================================

// File: src/routes/+layout.server.js
export async function load({ event }) {
    const auth = event.locals.auth;
    
    if (!auth || !auth.authenticated) {
        return {
            user: null,
            permissions: []
        };
    }
    
    // Get user's navigation based on role and permissions
    const navigation = getNavigationForUser(auth.user, auth.permissions);
    
    return {
        user: auth.user,
        permissions: auth.permissions,
        navigation
    };
}

function getNavigationForUser(user, permissions) {
    const nav = [];
    
    // Dashboard (always available to authenticated users)
    nav.push({ 
        name: 'Dashboard', 
        href: '/dashboard', 
        icon: 'home' 
    });
    
    // Members section
    if (permissions.some(p => p.name.startsWith('members.'))) {
        nav.push({
            name: 'Members',
            href: '/members',
            icon: 'users',
            children: [
                { name: 'View Members', href: '/members', permission: 'members.view' },
                { name: 'Add Member', href: '/members/new', permission: 'members.create' }
            ].filter(item => !item.permission || permissions.some(p => p.name === item.permission))
        });
    }
    
    // Plans section
    if (permissions.some(p => p.name.startsWith('plans.'))) {
        nav.push({
            name: 'Plans',
            href: '/plans',
            icon: 'calendar',
            children: [
                { name: 'View Plans', href: '/plans', permission: 'plans.view' },
                { name: 'Create Plan', href: '/plans/new', permission: 'plans.create' }
            ].filter(item => !item.permission || permissions.some(p => p.name === item.permission))
        });
    }
    
    // Reports section
    if (permissions.some(p => p.name.startsWith('reports.'))) {
        nav.push({
            name: 'Reports',
            href: '/reports',
            icon: 'chart',
            children: [
                { name: 'Member Reports', href: '/reports/members', permission: 'reports.view' },
                { name: 'Financial Reports', href: '/reports/financial', permission: 'reports.financial' }
            ].filter(item => !item.permission || permissions.some(p => p.name === item.permission))
        });
    }
    
    // Admin section (admin only)
    if (user.role === 'admin') {
        nav.push({
            name: 'Administration',
            href: '/admin',
            icon: 'settings',
            children: [
                { name: 'User Management', href: '/admin/users' },
                { name: 'System Settings', href: '/admin/settings' },
                { name: 'Security Logs', href: '/admin/security' }
            ]
        });
    }
    
    return nav;
}

// ============================================================================
// 7. SECURITY MONITORING DASHBOARD
// ============================================================================

// File: src/routes/admin/security/+page.server.js
import { requireAdmin } from '$lib/security/auth-middleware.js';

export async function load({ event }) {
    // Require admin role
    const authCheck = await requireAdmin(event);
    if (authCheck) {
        return authCheck;
    }
    
    const db = new KranosSQLite();
    
    try {
        // Get security metrics
        const securityMetrics = {
            // Recent failed logins
            recentFailedLogins: db.prepare(`
                SELECT COUNT(*) as count
                FROM security_events 
                WHERE event_type = 'failed_login' 
                AND created_at > datetime('now', '-24 hours')
            `).get(),
            
            // Locked accounts
            lockedAccounts: db.prepare(`
                SELECT COUNT(*) as count
                FROM users 
                WHERE locked_until > datetime('now')
            `).get(),
            
            // Active sessions
            activeSessions: db.prepare(`
                SELECT COUNT(*) as count
                FROM user_sessions 
                WHERE is_active = 1 AND expires_at > datetime('now')
            `).get(),
            
            // High severity security events (last 7 days)
            highSeverityEvents: db.prepare(`
                SELECT *
                FROM security_events se
                LEFT JOIN users u ON se.user_id = u.id
                WHERE se.severity IN ('high', 'critical')
                AND se.created_at > datetime('now', '-7 days')
                ORDER BY se.created_at DESC
                LIMIT 50
            `).all()
        };
        
        return {
            securityMetrics
        };
        
    } finally {
        db.close();
    }
}

// ============================================================================
// 8. USER PROFILE MANAGEMENT
// ============================================================================

// File: src/routes/profile/+page.server.js
export async function load({ event }) {
    const auth = event.locals.auth;
    
    if (!auth || !auth.authenticated) {
        throw redirect(302, '/login');
    }
    
    const db = new KranosSQLite();
    
    try {
        // Get user's complete profile including linked member data
        const userProfile = db.prepare(`
            SELECT u.*, m.name as member_name, m.phone as member_phone, m.email as member_email
            FROM users u
            LEFT JOIN members m ON u.member_id = m.id
            WHERE u.id = ?
        `).get(auth.user.id);
        
        // Get user's active sessions
        const activeSessions = await authService.getUserSessions(auth.user.id);
        
        return {
            profile: userProfile,
            activeSessions
        };
        
    } finally {
        db.close();
    }
}

// File: src/routes/profile/change-password/+page.server.js
import { fail } from '@sveltejs/kit';

export const actions = {
    changePassword: async ({ request, event }) => {
        const auth = event.locals.auth;
        
        if (!auth || !auth.authenticated) {
            return fail(401, { error: 'Not authenticated' });
        }
        
        const formData = await request.formData();
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');
        
        // Validate passwords match
        if (newPassword !== confirmPassword) {
            return fail(400, { error: 'New passwords do not match' });
        }
        
        // Validate password strength
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
            return fail(400, { errors: passwordValidation.errors });
        }
        
        try {
            await authService.changePassword(auth.user.id, currentPassword, newPassword);
            
            return {
                success: true,
                message: 'Password changed successfully'
            };
            
        } catch (error) {
            return fail(400, { error: error.message });
        }
    }
};

// ============================================================================
// 9. MIGRATION RUNNER
// ============================================================================

// File: src/scripts/setup-auth.js
import AuthMigration from '../lib/db/auth-migration.js';

async function setupAuthentication() {
    console.log('Setting up Kranos Gym Authentication System...');
    
    const migration = new AuthMigration();
    
    try {
        await migration.migrate();
        console.log('✅ Authentication system setup complete!');
        
        console.log('\nNext steps:');
        console.log('1. Install required dependencies: npm install bcrypt jsonwebtoken');
        console.log('2. Set environment variables in .env file');
        console.log('3. Set admin password: npm run auth:set-admin-password');
        console.log('4. Test the system: npm run dev');
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    setupAuthentication();
}

export default setupAuthentication;

// ============================================================================
// 10. PACKAGE.JSON SCRIPTS
// ============================================================================

/*
Add these scripts to your package.json:

{
  "scripts": {
    "auth:setup": "node src/scripts/setup-auth.js",
    "auth:migrate": "node src/lib/db/auth-migration.js migrate",
    "auth:rollback": "node src/lib/db/auth-migration.js rollback"
  },
  "dependencies": {
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0"
  }
}
*/