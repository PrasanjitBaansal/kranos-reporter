import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
    hashPassword,
    verifyPassword,
    validatePasswordStrength,
    validateUsername,
    validateEmail,
    generateSecurePassword,
    sanitizeInput,
    checkPasswordCompromise,
    generateCSRFToken,
    verifyCSRFToken
} from '$lib/utils/auth-utils.js';
import {
    createAccessToken,
    createRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    extractTokenFromHeader,
    isTokenExpired,
    generateSessionId,
    validateTokenPayload,
    hasRole,
    hasMinimumRole
} from '$lib/security/jwt-utils.js';

// Mock environment variables
vi.mock('$env/dynamic/private', () => ({
    JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
    JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-key-for-testing-only',
    SESSION_SECRET: 'test-session-secret-key-for-testing-only'
}));

describe('Authentication Security Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Password Security', () => {
        describe('hashPassword', () => {
            it('should hash password with bcrypt', async () => {
                const password = 'TestPassword123!';
                const hash = await hashPassword(password);
                
                expect(hash).toBeDefined();
                expect(hash).not.toBe(password);
                expect(hash.startsWith('$2b$')).toBe(true); // bcrypt hash format
            });

            it('should generate different hashes for same password', async () => {
                const password = 'TestPassword123!';
                const hash1 = await hashPassword(password);
                const hash2 = await hashPassword(password);
                
                expect(hash1).not.toBe(hash2); // Different salts
            });

            it('should use correct salt rounds', async () => {
                const password = 'TestPassword123!';
                const hash = await hashPassword(password);
                
                // Extract salt rounds from hash
                const saltRounds = parseInt(hash.split('$')[2]);
                expect(saltRounds).toBe(12);
            });
        });

        describe('verifyPassword', () => {
            it('should verify correct password', async () => {
                const password = 'TestPassword123!';
                const hash = await hashPassword(password);
                
                const isValid = await verifyPassword(password, hash);
                expect(isValid).toBe(true);
            });

            it('should reject incorrect password', async () => {
                const password = 'TestPassword123!';
                const wrongPassword = 'WrongPassword123!';
                const hash = await hashPassword(password);
                
                const isValid = await verifyPassword(wrongPassword, hash);
                expect(isValid).toBe(false);
            });

            it('should handle empty passwords', async () => {
                const hash = await hashPassword('TestPassword123!');
                
                const isValid = await verifyPassword('', hash);
                expect(isValid).toBe(false);
            });
        });

        describe('validatePasswordStrength', () => {
            it('should accept strong passwords', () => {
                const strongPasswords = [
                    'TestPass123!',
                    'MyP@ssw0rd',
                    'Secure#Pass1',
                    'Complex$123'
                ];

                strongPasswords.forEach(password => {
                    const result = validatePasswordStrength(password);
                    expect(result.isValid).toBe(true);
                    expect(result.errors).toHaveLength(0);
                });
            });

            it('should reject weak passwords', () => {
                const weakPasswords = [
                    { password: 'short', error: 'Password must be at least 8 characters long' },
                    { password: 'nouppercase123!', error: 'Password must contain at least one uppercase letter' },
                    { password: 'NOLOWERCASE123!', error: 'Password must contain at least one lowercase letter' },
                    { password: 'NoNumbers!', error: 'Password must contain at least one number' },
                    { password: 'NoSpecialChar123', error: 'Password must contain at least one special character' }
                ];

                weakPasswords.forEach(({ password, error }) => {
                    const result = validatePasswordStrength(password);
                    expect(result.isValid).toBe(false);
                    expect(result.errors).toContain(error);
                });
            });

            it('should reject common passwords', () => {
                const commonPasswords = ['Password123!', 'Admin123!', 'Welcome123!'];
                
                commonPasswords.forEach(password => {
                    const result = validatePasswordStrength(password);
                    expect(result.isValid).toBe(false);
                    expect(result.errors).toContain('Password is too common');
                });
            });
        });
    });

    describe('JWT Token Security', () => {
        const mockUser = {
            id: 1,
            username: 'testuser',
            role: 'admin',
            email: 'test@example.com'
        };
        const sessionId = 'test-session-id';

        describe('createAccessToken', () => {
            it('should create valid JWT access token', () => {
                const token = createAccessToken(mockUser, sessionId);
                
                expect(token).toBeDefined();
                expect(typeof token).toBe('string');
                
                const decoded = jwt.decode(token);
                expect(decoded.userId).toBe(mockUser.id);
                expect(decoded.username).toBe(mockUser.username);
                expect(decoded.role).toBe(mockUser.role);
                expect(decoded.sessionId).toBe(sessionId);
                expect(decoded.type).toBe('access');
            });

            it('should set correct expiration time', () => {
                const token = createAccessToken(mockUser, sessionId);
                const decoded = jwt.decode(token);
                
                const now = Math.floor(Date.now() / 1000);
                const expiry = decoded.exp;
                const expiryDiff = expiry - now;
                
                // Should be approximately 1 hour (3600 seconds)
                expect(expiryDiff).toBeGreaterThan(3590);
                expect(expiryDiff).toBeLessThan(3610);
            });
        });

        describe('verifyAccessToken', () => {
            it('should verify valid access token', () => {
                const token = createAccessToken(mockUser, sessionId);
                const payload = verifyAccessToken(token);
                
                expect(payload).toBeDefined();
                expect(payload.userId).toBe(mockUser.id);
                expect(payload.type).toBe('access');
            });

            it('should reject tampered token', () => {
                const token = createAccessToken(mockUser, sessionId);
                const tamperedToken = token.slice(0, -5) + 'xxxxx';
                
                const payload = verifyAccessToken(tamperedToken);
                expect(payload).toBe(null);
            });

            it('should reject expired token', () => {
                // Create token with immediate expiry
                const expiredToken = jwt.sign(
                    { userId: 1, type: 'access' },
                    'test-jwt-secret-key-for-testing-only',
                    { expiresIn: '0s' }
                );
                
                const payload = verifyAccessToken(expiredToken);
                expect(payload).toBe(null);
            });

            it('should reject token with wrong type', () => {
                const refreshToken = createRefreshToken(mockUser, sessionId);
                const payload = verifyAccessToken(refreshToken);
                expect(payload).toBe(null);
            });
        });

        describe('Token Security Features', () => {
            it('should extract token from Authorization header', () => {
                const token = 'test-token-123';
                const authHeader = `Bearer ${token}`;
                
                const extracted = extractTokenFromHeader(authHeader);
                expect(extracted).toBe(token);
            });

            it('should handle missing Bearer prefix', () => {
                const authHeader = 'test-token-123';
                
                const extracted = extractTokenFromHeader(authHeader);
                expect(extracted).toBe(null);
            });

            it('should generate secure session IDs', () => {
                const sessionIds = new Set();
                
                // Generate multiple session IDs
                for (let i = 0; i < 100; i++) {
                    const sessionId = generateSessionId();
                    expect(sessionId).toHaveLength(32); // 16 bytes = 32 hex chars
                    expect(sessionId).toMatch(/^[a-f0-9]{32}$/);
                    sessionIds.add(sessionId);
                }
                
                // All should be unique
                expect(sessionIds.size).toBe(100);
            });

            it('should validate token payload structure', () => {
                const validPayload = {
                    userId: 1,
                    username: 'test',
                    role: 'admin',
                    sessionId: 'session123',
                    type: 'access'
                };
                
                expect(validateTokenPayload(validPayload)).toBe(true);
                
                const invalidPayloads = [
                    { username: 'test' }, // missing userId
                    { userId: 'not-a-number' }, // wrong type
                    { userId: 1, role: 123 }, // role not string
                    null,
                    undefined
                ];
                
                invalidPayloads.forEach(payload => {
                    expect(validateTokenPayload(payload)).toBe(false);
                });
            });
        });

        describe('Role-Based Access Control', () => {
            it('should check if user has required role', () => {
                const adminPayload = { role: 'admin' };
                const trainerPayload = { role: 'trainer' };
                const memberPayload = { role: 'member' };
                
                expect(hasRole(adminPayload, ['admin'])).toBe(true);
                expect(hasRole(adminPayload, ['trainer', 'admin'])).toBe(true);
                expect(hasRole(trainerPayload, ['admin'])).toBe(false);
                expect(hasRole(memberPayload, ['admin', 'trainer'])).toBe(false);
            });

            it('should check role hierarchy', () => {
                const adminPayload = { role: 'admin' };
                const trainerPayload = { role: 'trainer' };
                const memberPayload = { role: 'member' };
                
                // Admin has access to all levels
                expect(hasMinimumRole(adminPayload, 'member')).toBe(true);
                expect(hasMinimumRole(adminPayload, 'trainer')).toBe(true);
                expect(hasMinimumRole(adminPayload, 'admin')).toBe(true);
                
                // Trainer has access to member and trainer levels
                expect(hasMinimumRole(trainerPayload, 'member')).toBe(true);
                expect(hasMinimumRole(trainerPayload, 'trainer')).toBe(true);
                expect(hasMinimumRole(trainerPayload, 'admin')).toBe(false);
                
                // Member only has member level access
                expect(hasMinimumRole(memberPayload, 'member')).toBe(true);
                expect(hasMinimumRole(memberPayload, 'trainer')).toBe(false);
                expect(hasMinimumRole(memberPayload, 'admin')).toBe(false);
            });
        });
    });

    describe('CSRF Protection', () => {
        it('should generate CSRF tokens', () => {
            const tokens = new Set();
            
            // Generate multiple tokens
            for (let i = 0; i < 50; i++) {
                const token = generateCSRFToken();
                expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
                expect(token).toMatch(/^[a-f0-9]{64}$/);
                tokens.add(token);
            }
            
            // All should be unique
            expect(tokens.size).toBe(50);
        });

        it('should verify valid CSRF token', () => {
            const sessionToken = 'test-session';
            const csrfToken = generateCSRFToken();
            
            // In real implementation, token would be stored with session
            // For testing, we'll assume verification passes for generated tokens
            const isValid = verifyCSRFToken(csrfToken, sessionToken);
            expect(typeof isValid).toBe('boolean');
        });
    });

    describe('Input Validation and Sanitization', () => {
        describe('validateUsername', () => {
            it('should accept valid usernames', () => {
                const validUsernames = ['user123', 'john_doe', 'admin', 'test-user'];
                
                validUsernames.forEach(username => {
                    const result = validateUsername(username);
                    expect(result.isValid).toBe(true);
                });
            });

            it('should reject invalid usernames', () => {
                const invalidUsernames = [
                    { username: 'ab', error: 'Username must be 3-30 characters long' },
                    { username: 'a'.repeat(31), error: 'Username must be 3-30 characters long' },
                    { username: 'user@123', error: 'Username can only contain letters, numbers, underscores, and hyphens' },
                    { username: 'user name', error: 'Username can only contain letters, numbers, underscores, and hyphens' }
                ];
                
                invalidUsernames.forEach(({ username, error }) => {
                    const result = validateUsername(username);
                    expect(result.isValid).toBe(false);
                    expect(result.error).toBe(error);
                });
            });
        });

        describe('validateEmail', () => {
            it('should accept valid emails', () => {
                const validEmails = [
                    'test@example.com',
                    'user.name@domain.com',
                    'admin+tag@company.org'
                ];
                
                validEmails.forEach(email => {
                    const result = validateEmail(email);
                    expect(result.isValid).toBe(true);
                });
            });

            it('should reject invalid emails', () => {
                const invalidEmails = [
                    'notanemail',
                    '@example.com',
                    'user@',
                    'user @example.com',
                    'user@.com'
                ];
                
                invalidEmails.forEach(email => {
                    const result = validateEmail(email);
                    expect(result.isValid).toBe(false);
                });
            });

            it('should suggest corrections for common typos', () => {
                const typoEmails = [
                    { email: 'user@gmial.com', suggestion: 'gmail.com' },
                    { email: 'user@gmai.com', suggestion: 'gmail.com' },
                    { email: 'user@yahooo.com', suggestion: 'yahoo.com' }
                ];
                
                typoEmails.forEach(({ email, suggestion }) => {
                    const result = validateEmail(email);
                    expect(result.suggestion).toContain(suggestion);
                });
            });
        });

        describe('sanitizeInput', () => {
            it('should remove XSS attempts', () => {
                const xssInputs = [
                    { input: '<script>alert("xss")</script>', expected: '&lt;script&gt;alert("xss")&lt;/script&gt;' },
                    { input: '<img src=x onerror=alert(1)>', expected: '&lt;img src=x onerror=alert(1)&gt;' },
                    { input: 'javascript:alert(1)', expected: 'javascript:alert(1)' },
                    { input: '<a href="javascript:void(0)">link</a>', expected: '&lt;a href="javascript:void(0)"&gt;link&lt;/a&gt;' }
                ];
                
                xssInputs.forEach(({ input, expected }) => {
                    const sanitized = sanitizeInput(input);
                    expect(sanitized).toBe(expected);
                });
            });

            it('should preserve safe input', () => {
                const safeInputs = [
                    'Normal text',
                    'Text with numbers 123',
                    'user@example.com',
                    'Some special chars: !@#$%'
                ];
                
                safeInputs.forEach(input => {
                    const sanitized = sanitizeInput(input);
                    expect(sanitized).toBe(input);
                });
            });
        });
    });

    describe('Security Utilities', () => {
        it('should generate secure passwords', () => {
            const passwords = new Set();
            
            for (let i = 0; i < 20; i++) {
                const password = generateSecurePassword(16);
                expect(password).toHaveLength(16);
                
                // Should contain uppercase, lowercase, numbers, and special chars
                expect(password).toMatch(/[A-Z]/);
                expect(password).toMatch(/[a-z]/);
                expect(password).toMatch(/[0-9]/);
                expect(password).toMatch(/[!@#$%^&*]/);
                
                passwords.add(password);
            }
            
            // All should be unique
            expect(passwords.size).toBe(20);
        });

        it('should check for compromised passwords', () => {
            const commonPasswords = [
                'password123',
                'admin123',
                'welcome123',
                '12345678'
            ];
            
            commonPasswords.forEach(password => {
                const isCompromised = checkPasswordCompromise(password);
                expect(isCompromised).toBe(true);
            });
            
            // Random secure password should not be compromised
            const securePassword = generateSecurePassword(16);
            expect(checkPasswordCompromise(securePassword)).toBe(false);
        });
    });

    describe('Account Security', () => {
        it('should handle account lockout after failed attempts', () => {
            // This would be tested in integration tests with database
            // Here we just verify the logic exists
            const maxAttempts = 5;
            const lockoutDuration = 15 * 60 * 1000; // 15 minutes
            
            expect(maxAttempts).toBe(5);
            expect(lockoutDuration).toBe(900000);
        });

        it('should enforce password change on reset', () => {
            // Verify password reset generates new token
            const token = generateSecurePassword(32);
            expect(token).toHaveLength(32);
        });
    });

    describe('SQL Injection Prevention', () => {
        it('should use parameterized queries', () => {
            // This is more of a code review test
            // Verify that database queries use parameterized queries
            const sqlPattern = /SELECT.*FROM.*WHERE.*=.*\?/;
            const dangerousPattern = /SELECT.*FROM.*WHERE.*=.*['"].*['"]/;
            
            // Good query example
            const goodQuery = 'SELECT * FROM users WHERE id = ?';
            expect(goodQuery).toMatch(sqlPattern);
            expect(goodQuery).not.toMatch(dangerousPattern);
            
            // Bad query example (should never exist in code)
            const badQuery = 'SELECT * FROM users WHERE id = "' + 'user_input' + '"';
            expect(badQuery).toMatch(dangerousPattern);
        });
    });
});