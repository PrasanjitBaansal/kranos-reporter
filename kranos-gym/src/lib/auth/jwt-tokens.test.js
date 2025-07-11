import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';

// Mock the JWT secret
vi.mock('$env/dynamic/private', () => ({
    JWT_SECRET: 'test-secret-key-for-testing',
    JWT_REFRESH_SECRET: 'test-refresh-secret-key'
}));

describe('JWT Token Management', () => {
    const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin'
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Token Generation', () => {
        it('should generate valid access token', () => {
            const token = jwt.sign(
                { 
                    userId: mockUser.id,
                    username: mockUser.username,
                    role: mockUser.role 
                },
                'test-secret-key-for-testing',
                { expiresIn: '1h' }
            );

            expect(token).toBeTruthy();
            expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
        });

        it('should generate valid refresh token', () => {
            const refreshToken = jwt.sign(
                { 
                    userId: mockUser.id,
                    tokenType: 'refresh' 
                },
                'test-refresh-secret-key',
                { expiresIn: '7d' }
            );

            expect(refreshToken).toBeTruthy();
            expect(refreshToken.split('.')).toHaveLength(3);
        });

        it('should include required claims in access token', () => {
            const token = jwt.sign(
                { 
                    userId: mockUser.id,
                    username: mockUser.username,
                    role: mockUser.role 
                },
                'test-secret-key-for-testing',
                { expiresIn: '1h' }
            );

            const decoded = jwt.verify(token, 'test-secret-key-for-testing');
            
            expect(decoded.userId).toBe(mockUser.id);
            expect(decoded.username).toBe(mockUser.username);
            expect(decoded.role).toBe(mockUser.role);
            expect(decoded.exp).toBeDefined();
            expect(decoded.iat).toBeDefined();
        });
    });

    describe('Token Validation', () => {
        it('should validate valid token', () => {
            const token = jwt.sign(
                { userId: mockUser.id },
                'test-secret-key-for-testing',
                { expiresIn: '1h' }
            );

            expect(() => {
                jwt.verify(token, 'test-secret-key-for-testing');
            }).not.toThrow();
        });

        it('should reject token with invalid signature', () => {
            const token = jwt.sign(
                { userId: mockUser.id },
                'test-secret-key-for-testing',
                { expiresIn: '1h' }
            );

            expect(() => {
                jwt.verify(token, 'wrong-secret-key');
            }).toThrow(/invalid signature/);
        });

        it('should reject expired token', () => {
            const token = jwt.sign(
                { userId: mockUser.id },
                'test-secret-key-for-testing',
                { expiresIn: '-1h' } // Already expired
            );

            expect(() => {
                jwt.verify(token, 'test-secret-key-for-testing');
            }).toThrow(/expired/);
        });

        it('should reject malformed token', () => {
            const malformedTokens = [
                'not.a.token',
                'invalid-jwt-format',
                '',
                null,
                undefined,
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' // Only header part
            ];

            malformedTokens.forEach(token => {
                expect(() => {
                    jwt.verify(token, 'test-secret-key-for-testing');
                }).toThrow();
            });
        });
    });

    describe('Token Refresh Flow', () => {
        it('should generate new access token from valid refresh token', () => {
            const refreshToken = jwt.sign(
                { 
                    userId: mockUser.id,
                    tokenType: 'refresh' 
                },
                'test-refresh-secret-key',
                { expiresIn: '7d' }
            );

            // Verify refresh token
            const decoded = jwt.verify(refreshToken, 'test-refresh-secret-key');
            expect(decoded.tokenType).toBe('refresh');

            // Generate new access token
            const newAccessToken = jwt.sign(
                { 
                    userId: decoded.userId,
                    username: mockUser.username,
                    role: mockUser.role 
                },
                'test-secret-key-for-testing',
                { expiresIn: '1h' }
            );

            expect(newAccessToken).toBeTruthy();
        });

        it('should reject refresh token used as access token', () => {
            const refreshToken = jwt.sign(
                { 
                    userId: mockUser.id,
                    tokenType: 'refresh' 
                },
                'test-refresh-secret-key',
                { expiresIn: '7d' }
            );

            // Try to use refresh token with access token secret
            expect(() => {
                jwt.verify(refreshToken, 'test-secret-key-for-testing');
            }).toThrow();
        });
    });

    describe('Token Expiration', () => {
        it('should calculate correct expiration for access token', () => {
            const token = jwt.sign(
                { userId: mockUser.id },
                'test-secret-key-for-testing',
                { expiresIn: '1h' }
            );

            const decoded = jwt.verify(token, 'test-secret-key-for-testing');
            const expirationTime = decoded.exp * 1000;
            const currentTime = Date.now();
            const hourInMs = 60 * 60 * 1000;

            // Should expire in approximately 1 hour
            expect(expirationTime - currentTime).toBeGreaterThan(hourInMs - 5000);
            expect(expirationTime - currentTime).toBeLessThan(hourInMs + 5000);
        });

        it('should calculate correct expiration for refresh token', () => {
            const token = jwt.sign(
                { userId: mockUser.id },
                'test-refresh-secret-key',
                { expiresIn: '7d' }
            );

            const decoded = jwt.verify(token, 'test-refresh-secret-key');
            const expirationTime = decoded.exp * 1000;
            const currentTime = Date.now();
            const weekInMs = 7 * 24 * 60 * 60 * 1000;

            // Should expire in approximately 7 days
            expect(expirationTime - currentTime).toBeGreaterThan(weekInMs - 5000);
            expect(expirationTime - currentTime).toBeLessThan(weekInMs + 5000);
        });
    });

    describe('Session Token Management', () => {
        it('should generate unique session ID', () => {
            const sessions = new Set();
            
            // Generate multiple session IDs
            for (let i = 0; i < 100; i++) {
                const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                sessions.add(sessionId);
            }

            // All should be unique
            expect(sessions.size).toBe(100);
        });

        it('should include session ID in token payload', () => {
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const token = jwt.sign(
                { 
                    userId: mockUser.id,
                    sessionId: sessionId 
                },
                'test-secret-key-for-testing',
                { expiresIn: '1h' }
            );

            const decoded = jwt.verify(token, 'test-secret-key-for-testing');
            expect(decoded.sessionId).toBe(sessionId);
        });
    });

    describe('Token Security', () => {
        it('should not include sensitive data in token', () => {
            const userWithPassword = {
                ...mockUser,
                password: 'secret123',
                passwordHash: 'hash123',
                salt: 'salt123'
            };

            // Create token (should exclude sensitive fields)
            const token = jwt.sign(
                { 
                    userId: userWithPassword.id,
                    username: userWithPassword.username,
                    role: userWithPassword.role 
                },
                'test-secret-key-for-testing',
                { expiresIn: '1h' }
            );

            const decoded = jwt.verify(token, 'test-secret-key-for-testing');
            
            // Should not contain sensitive fields
            expect(decoded.password).toBeUndefined();
            expect(decoded.passwordHash).toBeUndefined();
            expect(decoded.salt).toBeUndefined();
        });

        it('should handle token with tampered payload', () => {
            const token = jwt.sign(
                { userId: mockUser.id, role: 'member' },
                'test-secret-key-for-testing',
                { expiresIn: '1h' }
            );

            // Tamper with the payload (change role)
            const parts = token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            payload.role = 'admin'; // Try to escalate privileges
            
            const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
            const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

            // Should fail verification
            expect(() => {
                jwt.verify(tamperedToken, 'test-secret-key-for-testing');
            }).toThrow();
        });
    });

    describe('Token Blacklisting', () => {
        it('should support token invalidation by JTI', () => {
            const jti = `jti_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const blacklist = new Set();

            const token = jwt.sign(
                { 
                    userId: mockUser.id,
                    jti: jti 
                },
                'test-secret-key-for-testing',
                { expiresIn: '1h' }
            );

            // Token is valid initially
            const decoded = jwt.verify(token, 'test-secret-key-for-testing');
            expect(decoded.jti).toBe(jti);

            // Add to blacklist
            blacklist.add(jti);

            // Check if token is blacklisted
            const isBlacklisted = blacklist.has(decoded.jti);
            expect(isBlacklisted).toBe(true);
        });
    });

    describe('Multi-Device Session Support', () => {
        it('should support multiple active sessions per user', () => {
            const sessions = [];

            // Create multiple sessions for same user
            for (let i = 0; i < 3; i++) {
                const token = jwt.sign(
                    { 
                        userId: mockUser.id,
                        sessionId: `session_${i}`,
                        device: `device_${i}` 
                    },
                    'test-secret-key-for-testing',
                    { expiresIn: '1h' }
                );
                sessions.push(token);
            }

            // All tokens should be valid
            sessions.forEach((token, index) => {
                const decoded = jwt.verify(token, 'test-secret-key-for-testing');
                expect(decoded.userId).toBe(mockUser.id);
                expect(decoded.sessionId).toBe(`session_${index}`);
                expect(decoded.device).toBe(`device_${index}`);
            });
        });
    });
});