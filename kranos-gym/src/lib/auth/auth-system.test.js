/**
 * Authentication System Integration Test
 * Tests database schema, JWT utilities, and core auth functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import KranosSQLite from '../db/database.js';
import { createTokenSet, verifyAccessToken, generateSessionId } from '../security/jwt-utils.js';
import bcrypt from 'bcrypt';

describe('Authentication System Integration', () => {
    let db;
    let testUser;

    beforeAll(() => {
        db = new KranosSQLite();
        
        // Test user data
        testUser = {
            username: 'test_admin',
            email: 'test@kranosgym.com',
            password: 'TestPassword123!',
            role: 'admin',
            full_name: 'Test Administrator'
        };
    });

    afterAll(() => {
        if (db) {
            // Clean up test data
            try {
                db.connect();
                const deleteUserStmt = db.prepare('DELETE FROM users WHERE username = ?');
                deleteUserStmt.run(testUser.username);
                
                const deleteSessionStmt = db.prepare('DELETE FROM user_sessions WHERE user_id NOT IN (SELECT id FROM users)');
                deleteSessionStmt.run();
            } catch (error) {
                console.warn('Cleanup error:', error.message);
            } finally {
                db.close();
            }
        }
    });

    beforeEach(() => {
        // Ensure fresh connection for each test
        if (db.db) {
            db.close();
        }
    });

    describe('Database Schema', () => {
        it('should have all authentication tables', () => {
            db.connect();
            
            // Check that all required tables exist
            const tables = db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name IN ('users', 'permissions', 'role_permissions', 'user_sessions', 'user_activity_log', 'security_events')
            `).all();
            
            expect(tables).toHaveLength(6);
            expect(tables.map(t => t.name)).toEqual(
                expect.arrayContaining(['users', 'permissions', 'role_permissions', 'user_sessions', 'user_activity_log', 'security_events'])
            );
        });

        it('should have permissions data populated', () => {
            db.connect();
            
            const permissionCount = db.prepare('SELECT COUNT(*) as count FROM permissions').get();
            expect(permissionCount.count).toBeGreaterThan(0);
            
            const rolePermissionCount = db.prepare('SELECT COUNT(*) as count FROM role_permissions').get();
            expect(rolePermissionCount.count).toBeGreaterThan(0);
        });

        it('should have correct role constraints', () => {
            db.connect();
            
            // Test valid roles
            const validRoles = ['admin', 'trainer', 'member'];
            for (const role of validRoles) {
                const rolePermissions = db.prepare('SELECT COUNT(*) as count FROM role_permissions WHERE role = ?').get(role);
                expect(rolePermissions.count).toBeGreaterThan(0);
            }
        });
    });

    describe('User Management', () => {
        it('should create a user with hashed password', async () => {
            db.connect();
            
            // Hash password
            const salt = await bcrypt.genSalt(12);
            const password_hash = await bcrypt.hash(testUser.password, salt);
            
            // Create user
            const userData = {
                username: testUser.username,
                email: testUser.email,
                password_hash,
                salt,
                role: testUser.role,
                full_name: testUser.full_name
            };
            
            const result = db.createUser(userData);
            expect(result).toHaveProperty('id');
            expect(result.username).toBe(testUser.username);
            
            // Verify user was created
            const createdUser = db.getUserByUsername(testUser.username);
            expect(createdUser).toBeTruthy();
            expect(createdUser.email).toBe(testUser.email);
            expect(createdUser.role).toBe(testUser.role);
        });

        it('should retrieve user by username and email', () => {
            db.connect();
            
            const userByUsername = db.getUserByUsername(testUser.username);
            expect(userByUsername).toBeTruthy();
            expect(userByUsername.email).toBe(testUser.email);
            
            const userByEmail = db.getUserByEmail(testUser.email);
            expect(userByEmail).toBeTruthy();
            expect(userByEmail.username).toBe(testUser.username);
        });

        it('should check user permissions', () => {
            db.connect();
            
            const user = db.getUserByUsername(testUser.username);
            expect(user).toBeTruthy();
            
            // Check admin permissions
            const hasReportsPermission = db.hasPermission(user.id, 'reports.view');
            expect(hasReportsPermission).toBe(true);
            
            const hasUsersPermission = db.hasPermission(user.id, 'users.create');
            expect(hasUsersPermission).toBe(true);
        });
    });

    describe('JWT Token Management', () => {
        let sessionId;
        let tokens;

        beforeEach(() => {
            sessionId = generateSessionId();
        });

        it('should generate valid JWT tokens', () => {
            const user = {
                id: 1,
                username: testUser.username,
                email: testUser.email,
                role: testUser.role,
                full_name: testUser.full_name
            };

            tokens = createTokenSet(user, sessionId);
            
            expect(tokens).toHaveProperty('accessToken');
            expect(tokens).toHaveProperty('refreshToken');
            expect(tokens).toHaveProperty('accessExpiresAt');
            expect(tokens).toHaveProperty('refreshExpiresAt');
            expect(tokens).toHaveProperty('sessionId');
            expect(tokens.sessionId).toBe(sessionId);
        });

        it('should verify and decode access tokens', () => {
            if (!tokens) {
                const user = {
                    id: 1,
                    username: testUser.username,
                    email: testUser.email,
                    role: testUser.role,
                    full_name: testUser.full_name
                };
                tokens = createTokenSet(user, sessionId);
            }

            const decoded = verifyAccessToken(tokens.accessToken);
            
            expect(decoded).toHaveProperty('sub');
            expect(decoded).toHaveProperty('username');
            expect(decoded).toHaveProperty('role');
            expect(decoded).toHaveProperty('session_id');
            expect(decoded.username).toBe(testUser.username);
            expect(decoded.role).toBe(testUser.role);
            expect(decoded.session_id).toBe(sessionId);
        });

        it('should reject invalid tokens', () => {
            expect(() => {
                verifyAccessToken('invalid.token.here');
            }).toThrow();
            
            expect(() => {
                verifyAccessToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid');
            }).toThrow();
        });
    });

    describe('Session Management', () => {
        it('should create and retrieve sessions', () => {
            db.connect();
            
            const user = db.getUserByUsername(testUser.username);
            const sessionId = generateSessionId();
            const tokens = createTokenSet(user, sessionId);
            
            // Create session
            const sessionData = {
                user_id: user.id,
                session_token: tokens.accessToken,
                refresh_token: tokens.refreshToken,
                device_info: 'Test Browser',
                ip_address: '127.0.0.1',
                user_agent: 'Test Browser/1.0',
                expires_at: tokens.accessExpiresAt
            };
            
            const session = db.createSession(sessionData);
            expect(session).toHaveProperty('id');
            
            // Retrieve session
            const retrievedSession = db.getSessionByToken(tokens.accessToken);
            expect(retrievedSession).toBeTruthy();
            expect(retrievedSession.user_id).toBe(user.id);
            expect(retrievedSession.username).toBe(user.username);
        });

        it('should deactivate sessions', () => {
            db.connect();
            
            const user = db.getUserByUsername(testUser.username);
            const sessionId = generateSessionId();
            const tokens = createTokenSet(user, sessionId);
            
            // Create session first
            const sessionData = {
                user_id: user.id,
                session_token: tokens.accessToken,
                refresh_token: tokens.refreshToken,
                device_info: 'Test Browser',
                ip_address: '127.0.0.1',
                user_agent: 'Test Browser/1.0',
                expires_at: tokens.accessExpiresAt
            };
            
            db.createSession(sessionData);
            
            // Deactivate session
            const result = db.deactivateSession(tokens.accessToken);
            expect(result.changes).toBeGreaterThan(0);
            
            // Verify session is no longer active
            const retrievedSession = db.getSessionByToken(tokens.accessToken);
            expect(retrievedSession).toBeFalsy();
        });
    });

    describe('Activity Logging', () => {
        it('should log user activities', () => {
            db.connect();
            
            const user = db.getUserByUsername(testUser.username);
            
            const activityData = {
                user_id: user.id,
                username: user.username,
                action: 'login',
                resource_type: 'user',
                resource_id: user.id.toString(),
                ip_address: '127.0.0.1',
                user_agent: 'Test Browser',
                details: { success: true, response_code: 200 }
            };
            
            const result = db.logActivity(activityData);
            expect(result).toHaveProperty('id');
        });

        it('should log security events', () => {
            db.connect();
            
            const user = db.getUserByUsername(testUser.username);
            
            const eventData = {
                user_id: user.id,
                username: user.username,
                event_type: 'login_success',
                severity: 'info',
                ip_address: '127.0.0.1',
                user_agent: 'Test Browser',
                details: { source: 'web_app', description: 'User successfully logged in' }
            };
            
            const result = db.logSecurityEvent(eventData);
            expect(result).toHaveProperty('id');
        });
    });
});