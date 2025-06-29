/**
 * ============================================================================
 * KRANOS GYM AUTHENTICATION SERVICE
 * ============================================================================
 * Enterprise-grade authentication service using better-sqlite3 patterns
 * Features: JWT tokens, bcrypt hashing, session management, activity logging
 * ============================================================================
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import KranosSQLite from '../db/database.js';

// Configuration constants
const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const SESSION_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

class AuthenticationService {
    constructor() {
        this.db = new KranosSQLite();
        this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
        this.refreshSecret = process.env.REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
        
        // Initialize cleanup interval
        this.startSessionCleanup();
    }

    /**
     * Hash password using bcrypt with salt
     */
    async hashPassword(password) {
        const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
        const hash = await bcrypt.hash(password, salt);
        return { hash, salt };
    }

    /**
     * Verify password against stored hash
     */
    async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    /**
     * Generate secure random token
     */
    generateSecureToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Generate JWT token with user payload
     */
    generateJWT(user, sessionId) {
        const payload = {
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            sessionId: sessionId,
            jti: crypto.randomUUID() // JWT ID for token blacklisting
        };

        return jwt.sign(payload, this.jwtSecret, {
            expiresIn: JWT_EXPIRES_IN,
            issuer: 'kranos-gym',
            audience: 'kranos-gym-app'
        });
    }

    /**
     * Generate refresh token
     */
    generateRefreshToken() {
        return jwt.sign(
            { type: 'refresh', tokenId: crypto.randomUUID() },
            this.refreshSecret,
            { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
        );
    }

    /**
     * Verify and decode JWT token
     */
    verifyJWT(token) {
        try {
            return jwt.verify(token, this.jwtSecret, {
                issuer: 'kranos-gym',
                audience: 'kranos-gym-app'
            });
        } catch (error) {
            throw new Error(`Invalid token: ${error.message}`);
        }
    }

    /**
     * Create new user account
     */
    async createUser(userData) {
        this.db.connect();
        
        const { username, email, password, role = 'member', memberId = null, createdBy = null } = userData;
        
        try {
            // Check if username or email already exists
            const existingUser = this.db.prepare(`
                SELECT id FROM users WHERE username = ? OR email = ?
            `).get(username, email);
            
            if (existingUser) {
                throw new Error('Username or email already exists');
            }

            // Hash password
            const { hash, salt } = await this.hashPassword(password);

            // Create user
            const stmt = this.db.prepare(`
                INSERT INTO users (
                    username, email, password_hash, salt, role, member_id, 
                    created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const now = new Date().toISOString();
            const result = stmt.run(username, email, hash, salt, role, memberId, createdBy, now, now);
            
            const newUser = this.db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
            
            // Log the activity (async operation)
            this.logActivity(newUser.id, null, 'user_created', 'user', newUser.id, {
                success: true,
                metadata: { role, createdBy }
            });

            // Return user without sensitive data
            const { password_hash, salt: userSalt, ...safeUser } = newUser;
            return safeUser;

        } catch (error) {
            this.logActivity(null, null, 'user_creation_failed', 'user', null, {
                success: false,
                error: error.message,
                metadata: { username, email, role }
            });
            throw error;
        }
    }

    /**
     * Authenticate user login
     */
    async login(username, password, deviceInfo = {}) {
        this.db.connect();
        
        try {
            // Get user by username or email
            const user = this.db.prepare(`
                SELECT * FROM users 
                WHERE (username = ? OR email = ?) AND status = 'active'
            `).get(username, username);

            if (!user) {
                await this.logSecurityEvent(null, 'failed_login', 'medium', 
                    `Login attempt with invalid username: ${username}`, deviceInfo);
                throw new Error('Invalid credentials');
            }

            // Check if account is locked
            if (user.locked_until && new Date(user.locked_until) > new Date()) {
                await this.logSecurityEvent(user.id, 'login_blocked_locked', 'high',
                    'Login attempt on locked account', deviceInfo);
                throw new Error('Account is temporarily locked');
            }

            // Verify password
            const isValidPassword = await this.verifyPassword(password, user.password_hash);
            
            if (!isValidPassword) {
                await this.handleFailedLogin(user.id, deviceInfo);
                throw new Error('Invalid credentials');
            }

            // Reset failed attempts on successful login
            await this.resetFailedAttempts(user.id);

            // Create session
            const session = await this.createSession(user, deviceInfo);

            // Update last login
            this.db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
                .run(new Date().toISOString(), user.id);

            // Log successful login
            await this.logActivity(user.id, session.id, 'login_success', 'user', user.id, {
                success: true,
                metadata: deviceInfo
            });

            return {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    emailVerified: user.email_verified,
                    twoFactorEnabled: user.two_factor_enabled
                },
                token: session.token,
                refreshToken: session.refreshToken,
                expiresAt: session.expiresAt
            };

        } catch (error) {
            await this.logActivity(null, null, 'login_failed', 'user', null, {
                success: false,
                error: error.message,
                metadata: { username, ...deviceInfo }
            });
            throw error;
        } finally {
            this.db.close();
        }
    }

    /**
     * Handle failed login attempts
     */
    async handleFailedLogin(userId, deviceInfo) {
        this.db.connect();
        
        const user = this.db.prepare('SELECT failed_login_attempts FROM users WHERE id = ?').get(userId);
        const newAttempts = (user.failed_login_attempts || 0) + 1;
        
        let lockUntil = null;
        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
            lockUntil = new Date(Date.now() + LOCKOUT_DURATION).toISOString();
            
            await this.logSecurityEvent(userId, 'account_locked', 'high',
                `Account locked after ${newAttempts} failed login attempts`, deviceInfo);
        }

        this.db.prepare(`
            UPDATE users 
            SET failed_login_attempts = ?, locked_until = ? 
            WHERE id = ?
        `).run(newAttempts, lockUntil, userId);

        await this.logSecurityEvent(userId, 'failed_login', 'medium',
            `Failed login attempt ${newAttempts}/${MAX_FAILED_ATTEMPTS}`, deviceInfo);
    }

    /**
     * Reset failed login attempts
     */
    async resetFailedAttempts(userId) {
        this.db.connect();
        this.db.prepare(`
            UPDATE users 
            SET failed_login_attempts = 0, locked_until = NULL 
            WHERE id = ?
        `).run(userId);
    }

    /**
     * Create user session
     */
    async createSession(user, deviceInfo = {}) {
        this.db.connect();
        
        const sessionToken = this.generateSecureToken();
        const refreshToken = this.generateRefreshToken();
        const jwtId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + (60 * 60 * 1000)).toISOString(); // 1 hour
        
        const stmt = this.db.prepare(`
            INSERT INTO user_sessions (
                user_id, session_token, refresh_token, jwt_id, device_info, 
                ip_address, expires_at, created_at, last_used_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const now = new Date().toISOString();
        const result = stmt.run(
            user.id, sessionToken, refreshToken, jwtId,
            JSON.stringify(deviceInfo), deviceInfo.ipAddress,
            expiresAt, now, now
        );

        const jwt_token = this.generateJWT(user, result.lastInsertRowid);

        return {
            id: result.lastInsertRowid,
            token: jwt_token,
            refreshToken: refreshToken,
            expiresAt: expiresAt
        };
    }

    /**
     * Refresh JWT token using refresh token
     */
    async refreshToken(refreshToken, deviceInfo = {}) {
        this.db.connect();
        
        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, this.refreshSecret);
            
            // Find session
            const session = this.db.prepare(`
                SELECT s.*, u.* FROM user_sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.refresh_token = ? AND s.is_active = 1 AND s.expires_at > ?
            `).get(refreshToken, new Date().toISOString());

            if (!session) {
                throw new Error('Invalid refresh token');
            }

            // Generate new JWT
            const newJwtToken = this.generateJWT(session, session.id);
            
            // Update session last used
            this.db.prepare('UPDATE user_sessions SET last_used_at = ? WHERE id = ?')
                .run(new Date().toISOString(), session.id);

            await this.logActivity(session.user_id, session.id, 'token_refreshed', 'session', session.id, {
                success: true,
                metadata: deviceInfo
            });

            return {
                token: newJwtToken,
                expiresAt: new Date(Date.now() + (60 * 60 * 1000)).toISOString()
            };

        } catch (error) {
            await this.logSecurityEvent(null, 'token_refresh_failed', 'medium',
                'Failed token refresh attempt', deviceInfo);
            throw new Error('Failed to refresh token');
        } finally {
            this.db.close();
        }
    }

    /**
     * Logout user and invalidate session
     */
    async logout(sessionToken, userId = null) {
        this.db.connect();
        
        try {
            const result = this.db.prepare(`
                UPDATE user_sessions 
                SET is_active = 0 
                WHERE session_token = ? OR (user_id = ? AND is_active = 1)
            `).run(sessionToken, userId);

            if (userId) {
                await this.logActivity(userId, null, 'logout', 'session', null, {
                    success: true,
                    metadata: { sessionToken: sessionToken?.substring(0, 8) + '...' }
                });
            }

            return { success: true, sessionsInvalidated: result.changes };
        } catch (error) {
            await this.logActivity(userId, null, 'logout_failed', 'session', null, {
                success: false,
                error: error.message
            });
            throw error;
        } finally {
            this.db.close();
        }
    }

    /**
     * Validate session and get user
     */
    async validateSession(sessionToken) {
        this.db.connect();
        
        try {
            const session = this.db.prepare(`
                SELECT s.*, u.id as user_id, u.username, u.email, u.role, u.status
                FROM user_sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.session_token = ? AND s.is_active = 1 AND s.expires_at > ?
            `).get(sessionToken, new Date().toISOString());

            if (!session) {
                return null;
            }

            // Update last used
            this.db.prepare('UPDATE user_sessions SET last_used_at = ? WHERE id = ?')
                .run(new Date().toISOString(), session.id);

            return {
                user: {
                    id: session.user_id,
                    username: session.username,
                    email: session.email,
                    role: session.role,
                    status: session.status
                },
                session: {
                    id: session.id,
                    jwtId: session.jwt_id,
                    deviceInfo: JSON.parse(session.device_info || '{}'),
                    createdAt: session.created_at,
                    lastUsedAt: session.last_used_at
                }
            };
        } finally {
            this.db.close();
        }
    }

    /**
     * Check if user has specific permission
     */
    hasPermission(userId, permissionName) {
        this.db.connect();
        
        const result = this.db.prepare(`
            SELECT COUNT(*) as count
            FROM users u
            JOIN role_permissions rp ON u.role = rp.role
            JOIN permissions p ON rp.permission_id = p.id
            WHERE u.id = ? AND p.name = ? AND rp.granted = 1
        `).get(userId, permissionName);

        return result.count > 0;
    }

    /**
     * Get user permissions
     */
    getUserPermissions(userId) {
        this.db.connect();
        
        return this.db.prepare(`
            SELECT p.name, p.description, p.category
            FROM users u
            JOIN role_permissions rp ON u.role = rp.role
            JOIN permissions p ON rp.permission_id = p.id
            WHERE u.id = ? AND rp.granted = 1
            ORDER BY p.category, p.name
        `).all(userId);
    }

    /**
     * Change user password
     */
    async changePassword(userId, currentPassword, newPassword) {
        this.db.connect();
        
        try {
            const user = this.db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
            
            if (!user) {
                throw new Error('User not found');
            }

            // Verify current password
            const isValidCurrent = await this.verifyPassword(currentPassword, user.password_hash);
            if (!isValidCurrent) {
                throw new Error('Current password is incorrect');
            }

            // Hash new password
            const { hash, salt } = await this.hashPassword(newPassword);

            // Update password
            this.db.prepare(`
                UPDATE users 
                SET password_hash = ?, salt = ?, password_changed_at = ?, must_change_password = 0
                WHERE id = ?
            `).run(hash, salt, new Date().toISOString(), userId);

            // Invalidate all existing sessions except current one
            this.db.prepare('UPDATE user_sessions SET is_active = 0 WHERE user_id = ?').run(userId);

            await this.logActivity(userId, null, 'password_changed', 'user', userId, {
                success: true
            });

            return { success: true };

        } catch (error) {
            await this.logActivity(userId, null, 'password_change_failed', 'user', userId, {
                success: false,
                error: error.message
            });
            throw error;
        } finally {
            this.db.close();
        }
    }

    /**
     * Log user activity
     */
    async logActivity(userId, sessionId, action, resourceType, resourceId, options = {}) {
        this.db.connect();
        
        const {
            success = true,
            error = null,
            metadata = {},
            severity = 'info',
            ipAddress = null,
            userAgent = null,
            requestMethod = null,
            requestPath = null,
            responseCode = null,
            executionTime = null
        } = options;

        try {
            const stmt = this.db.prepare(`
                INSERT INTO user_activity_log (
                    user_id, session_id, action, resource_type, resource_id,
                    ip_address, user_agent, request_method, request_path,
                    success, error_message, response_code, execution_time_ms,
                    metadata, severity, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                userId, sessionId, action, resourceType, resourceId,
                ipAddress, userAgent, requestMethod, requestPath,
                success ? 1 : 0, error, responseCode, executionTime,
                JSON.stringify(metadata), severity, new Date().toISOString()
            );
        } catch (logError) {
            console.error('Failed to log activity:', logError);
        } finally {
            this.db.close();
        }
    }

    /**
     * Log security events
     */
    async logSecurityEvent(userId, eventType, severity, description, additionalData = {}) {
        this.db.connect();
        
        try {
            const stmt = this.db.prepare(`
                INSERT INTO security_events (
                    user_id, event_type, severity, description, 
                    ip_address, user_agent, additional_data, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                userId, eventType, severity, description,
                additionalData.ipAddress, additionalData.userAgent,
                JSON.stringify(additionalData), new Date().toISOString()
            );
        } catch (logError) {
            console.error('Failed to log security event:', logError);
        } finally {
            this.db.close();
        }
    }

    /**
     * Clean up expired sessions
     */
    async cleanupExpiredSessions() {
        this.db.connect();
        
        try {
            const result = this.db.prepare(`
                DELETE FROM user_sessions 
                WHERE expires_at < ? OR is_active = 0
            `).run(new Date().toISOString());

            console.log(`Cleaned up ${result.changes} expired sessions`);
            return result.changes;
        } finally {
            this.db.close();
        }
    }

    /**
     * Start automatic session cleanup
     */
    startSessionCleanup() {
        setInterval(async () => {
            try {
                await this.cleanupExpiredSessions();
            } catch (error) {
                console.error('Session cleanup failed:', error);
            }
        }, SESSION_CLEANUP_INTERVAL);
    }

    /**
     * Get user's active sessions
     */
    async getUserSessions(userId) {
        this.db.connect();
        
        return this.db.prepare(`
            SELECT id, device_info, ip_address, location, created_at, 
                   last_used_at, expires_at, is_remembered
            FROM user_sessions
            WHERE user_id = ? AND is_active = 1 AND expires_at > ?
            ORDER BY last_used_at DESC
        `).all(userId, new Date().toISOString());
    }

    /**
     * Revoke specific session
     */
    async revokeSession(userId, sessionId) {
        this.db.connect();
        
        const result = this.db.prepare(`
            UPDATE user_sessions 
            SET is_active = 0 
            WHERE id = ? AND user_id = ?
        `).run(sessionId, userId);

        if (result.changes > 0) {
            await this.logActivity(userId, sessionId, 'session_revoked', 'session', sessionId, {
                success: true
            });
        }

        return result.changes > 0;
    }

    /**
     * Get all users with optional filtering
     */
    getAllUsers(options = {}) {
        this.db.connect();
        
        const { includeInactive = false, role = null } = options;
        
        let query = `
            SELECT id, username, email, role, status, email_verified, 
                   two_factor_enabled, failed_login_attempts, last_login_at,
                   created_at, updated_at
            FROM users
            WHERE 1=1
        `;
        
        const params = [];
        
        if (!includeInactive) {
            query += ` AND status = ?`;
            params.push('active');
        }
        
        if (role) {
            query += ` AND role = ?`;
            params.push(role);
        }
        
        query += ` ORDER BY created_at DESC`;
        
        const stmt = this.db.prepare(query);
        return stmt.all(...params);
    }

    /**
     * Get user by ID with full details
     */
    getUserById(userId) {
        this.db.connect();
        
        const user = this.db.prepare(`
            SELECT id, username, email, role, status, email_verified,
                   two_factor_enabled, failed_login_attempts, last_login_at,
                   created_at, updated_at, member_id, created_by
            FROM users 
            WHERE id = ?
        `).get(userId);
        
        if (user) {
            // Get user permissions
            const permissions = this.db.prepare(`
                SELECT p.name, p.description, p.category
                FROM role_permissions rp
                JOIN permissions p ON rp.permission_id = p.id
                WHERE rp.role = ? AND rp.granted = 1
                ORDER BY p.category, p.name
            `).all(user.role);
            
            user.permissions = permissions;
        }
        
        return user;
    }

    /**
     * Update user information
     */
    async updateUser(userId, updates, updatedBy = null) {
        this.db.connect();
        
        try {
            const currentUser = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
            if (!currentUser) {
                throw new Error('User not found');
            }

            const allowedFields = ['username', 'email', 'role', 'status', 'email_verified', 'must_change_password'];
            const updateFields = [];
            const updateValues = [];
            
            // Build dynamic update query
            for (const [field, value] of Object.entries(updates)) {
                if (allowedFields.includes(field) && value !== undefined) {
                    updateFields.push(`${field} = ?`);
                    updateValues.push(value);
                }
            }
            
            if (updateFields.length === 0) {
                throw new Error('No valid fields to update');
            }
            
            // Check for username/email conflicts
            if (updates.username || updates.email) {
                const existingUser = this.db.prepare(`
                    SELECT id FROM users 
                    WHERE (username = ? OR email = ?) AND id != ?
                `).get(updates.username || currentUser.username, updates.email || currentUser.email, userId);
                
                if (existingUser) {
                    throw new Error('Username or email already exists');
                }
            }
            
            updateFields.push('updated_at = ?');
            updateValues.push(new Date().toISOString());
            updateValues.push(userId);
            
            const stmt = this.db.prepare(`
                UPDATE users 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `);
            
            const result = stmt.run(...updateValues);
            
            if (result.changes === 0) {
                throw new Error('No changes made');
            }
            
            // If status is being deactivated, invalidate all sessions
            if (updates.status === 'inactive') {
                this.db.prepare('UPDATE user_sessions SET is_active = 0 WHERE user_id = ?').run(userId);
            }
            
            // Log the activity (async operation)
            this.logActivity(updatedBy, null, 'user_updated', 'user', userId, {
                success: true,
                metadata: { updates, updatedBy }
            });
            
            return this.getUserById(userId);
            
        } catch (error) {
            this.logActivity(updatedBy, null, 'user_update_failed', 'user', userId, {
                success: false,
                error: error.message,
                metadata: { updates, updatedBy }
            });
            throw error;
        }
    }

    /**
     * Delete user (soft delete)
     */
    async deleteUser(userId, deletedBy = null) {
        this.db.connect();
        
        try {
            const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
            if (!user) {
                throw new Error('User not found');
            }
            
            // Prevent self-deletion
            if (userId === deletedBy) {
                throw new Error('Cannot delete your own account');
            }
            
            // Soft delete by updating status
            const result = this.db.prepare(`
                UPDATE users 
                SET status = 'inactive', updated_at = ?
                WHERE id = ?
            `).run(new Date().toISOString(), userId);
            
            // Invalidate all user sessions
            this.db.prepare('UPDATE user_sessions SET is_active = 0 WHERE user_id = ?').run(userId);
            
            // Log the activity (async operation)
            this.logActivity(deletedBy, null, 'user_deleted', 'user', userId, {
                success: true,
                metadata: { deletedUser: user.username, deletedBy }
            });
            
            return { success: true, message: 'User deactivated successfully' };
            
        } catch (error) {
            this.logActivity(deletedBy, null, 'user_deletion_failed', 'user', userId, {
                success: false,
                error: error.message,
                metadata: { deletedBy }
            });
            throw error;
        }
    }

    /**
     * Reset user password (admin function)
     */
    async resetUserPassword(userId, newPassword, resetBy = null) {
        this.db.connect();
        
        try {
            const user = this.db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Hash new password
            const { hash, salt } = await this.hashPassword(newPassword);

            // Update password and force password change on next login
            this.db.prepare(`
                UPDATE users 
                SET password_hash = ?, salt = ?, password_changed_at = ?, 
                    must_change_password = 1, failed_login_attempts = 0, locked_until = NULL
                WHERE id = ?
            `).run(hash, salt, new Date().toISOString(), userId);

            // Invalidate all existing sessions
            this.db.prepare('UPDATE user_sessions SET is_active = 0 WHERE user_id = ?').run(userId);

            // Log the activity (async operation)
            this.logActivity(resetBy, null, 'password_reset_by_admin', 'user', userId, {
                success: true,
                metadata: { resetBy, targetUser: user.username }
            });

            return { success: true, message: 'Password reset successfully' };

        } catch (error) {
            this.logActivity(resetBy, null, 'password_reset_failed', 'user', userId, {
                success: false,
                error: error.message,
                metadata: { resetBy }
            });
            throw error;
        }
    }
}

export default AuthenticationService;