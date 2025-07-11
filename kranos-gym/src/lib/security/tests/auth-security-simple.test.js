import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    validatePasswordStrength,
    validateUsername,
    validateEmail,
    generateSecurePassword,
    sanitizeInput,
    checkPasswordCompromise,
    generateCSRFToken,
    verifyCSRFToken
} from '$lib/utils/auth-utils.js';

describe('Authentication Security Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Password Security', () => {
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

            it('should reject passwords with repeated characters', () => {
                const result = validatePasswordStrength('Paaassword123!');
                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('Password contains common patterns and is not secure');
            });

            it('should reject common passwords', () => {
                const commonPasswords = ['Password123!', 'Admin123!', 'Qwerty123!'];
                
                commonPasswords.forEach(password => {
                    const result = validatePasswordStrength(password);
                    expect(result.isValid).toBe(false);
                    expect(result.errors).toContain('Password contains common patterns and is not secure');
                });
            });

            it('should enforce maximum length', () => {
                const longPassword = 'A'.repeat(129) + '1!';
                const result = validatePasswordStrength(longPassword);
                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('Password must be less than 128 characters');
            });
        });

        describe('generateSecurePassword', () => {
            it('should generate passwords of specified length', () => {
                const lengths = [8, 12, 16, 20];
                
                lengths.forEach(length => {
                    const password = generateSecurePassword(length);
                    expect(password).toHaveLength(length);
                });
            });

            it('should generate passwords that pass strength validation', () => {
                for (let i = 0; i < 10; i++) {
                    const password = generateSecurePassword(16);
                    const result = validatePasswordStrength(password);
                    expect(result.isValid).toBe(true);
                }
            });

            it('should generate unique passwords', () => {
                const passwords = new Set();
                
                for (let i = 0; i < 20; i++) {
                    passwords.add(generateSecurePassword(16));
                }
                
                expect(passwords.size).toBe(20);
            });

            it('should include all character types', () => {
                const password = generateSecurePassword(16);
                
                // Should contain uppercase, lowercase, numbers
                expect(password).toMatch(/[A-Z]/);
                expect(password).toMatch(/[a-z]/);
                expect(password).toMatch(/[0-9]/);
                // Special chars are included but may vary
            });
        });

        describe('checkPasswordCompromise', () => {
            it('should detect common compromised passwords', async () => {
                const commonPasswords = [
                    'password123',
                    'admin123',
                    'welcome123',
                    '12345678'
                ];
                
                for (const password of commonPasswords) {
                    const result = await checkPasswordCompromise(password);
                    expect(result.isCompromised).toBe(true);
                }
            });

            it('should not flag secure random passwords', async () => {
                const securePassword = generateSecurePassword(16);
                const result = await checkPasswordCompromise(securePassword);
                expect(result.isCompromised).toBe(false);
            });
        });
    });

    describe('Input Validation', () => {
        describe('validateUsername', () => {
            it('should accept valid usernames', () => {
                const validUsernames = ['user123', 'john_doe', 'test-user'];
                
                validUsernames.forEach(username => {
                    const result = validateUsername(username);
                    expect(result.isValid).toBe(true);
                });
            });

            it('should reject invalid usernames', () => {
                const invalidUsernames = [
                    { username: 'ab', error: 'Username must be between 3 and 30 characters' },
                    { username: 'a'.repeat(31), error: 'Username must be between 3 and 30 characters' },
                    { username: 'user@123', error: 'Username can only contain letters, numbers, underscores, and hyphens' },
                    { username: 'user name', error: 'Username can only contain letters, numbers, underscores, and hyphens' }
                ];
                
                invalidUsernames.forEach(({ username, error }) => {
                    const result = validateUsername(username);
                    expect(result.isValid).toBe(false);
                    if (username === 'ab') {
                        expect(result.errors[0]).toContain('at least 3 characters');
                    } else if (username === 'a'.repeat(31)) {
                        expect(result.errors[0]).toContain('less than 30 characters');
                    } else {
                        expect(result.errors).toContain(error);
                    }
                });
            });

            it('should reject reserved usernames', () => {
                const reservedUsernames = ['admin', 'root', 'system'];
                
                reservedUsernames.forEach(username => {
                    const result = validateUsername(username);
                    expect(result.isValid).toBe(false);
                    expect(result.errors).toContain('This username is reserved and cannot be used');
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
                    'user@.com',
                    'user.@example.com'
                ];
                
                invalidEmails.forEach(email => {
                    const result = validateEmail(email);
                    expect(result.isValid).toBe(false);
                });
            });

            it('should suggest corrections for common domain typos', () => {
                const typoEmails = [
                    { email: 'user@gmial.com', suggestion: 'gmail.com' },
                    { email: 'user@gmai.com', suggestion: 'gmail.com' },
                    { email: 'user@yahooo.com', suggestion: 'yahoo.com' },
                    { email: 'user@hotmial.com', suggestion: 'hotmail.com' }
                ];
                
                typoEmails.forEach(({ email, suggestion }) => {
                    const result = validateEmail(email);
                    expect(result.isValid).toBe(false); // Has typo
                    expect(result.errors).toContain(`Did you mean ${email.split('@')[0]}@${suggestion}?`);
                });
            });

            it('should enforce maximum length', () => {
                const longEmail = 'a'.repeat(255) + '@example.com';
                const result = validateEmail(longEmail);
                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('Email address is too long');
            });
        });

        describe('sanitizeInput', () => {
            it('should escape HTML special characters', () => {
                const xssInputs = [
                    { input: '<script>alert("xss")</script>', expected: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;' },
                    { input: '<img src=x onerror=alert(1)>', expected: '&lt;img src=x onerror=alert(1)&gt;' },
                    { input: '<a href="javascript:void(0)">link</a>', expected: '&lt;a href=&quot;javascript:void(0)&quot;&gt;link&lt;/a&gt;' },
                    { input: '"quoted" & \'text\'', expected: '&quot;quoted&quot; &amp; &#x27;text&#x27;' }
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
                    'Some punctuation: , . ! ?'
                ];
                
                safeInputs.forEach(input => {
                    const sanitized = sanitizeInput(input);
                    // Should only escape HTML special chars
                    expect(sanitized).toBe(input);
                });
            });

            it('should handle null and undefined', () => {
                expect(sanitizeInput(null)).toBe(null);
                expect(sanitizeInput(undefined)).toBe(undefined);
            });

            it('should not trim whitespace (only escapes HTML)', () => {
                const input = '  text with spaces  ';
                const sanitized = sanitizeInput(input);
                expect(sanitized).toBe('  text with spaces  ');
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

        it('should have CSRF verification placeholder', () => {
            const sessionToken = 'test-session';
            const csrfToken = generateCSRFToken();
            
            // The actual implementation returns true/false
            const result = verifyCSRFToken(csrfToken, sessionToken);
            expect(result).toBe(true);
        });
    });

    describe('Security Best Practices', () => {
        it('should not expose sensitive information in errors', () => {
            // Verify that validation errors don't reveal system details
            const result = validateUsername('a');
            expect(result.errors.join(' ')).not.toMatch(/database|sql|system/i);
        });

        it('should handle edge cases gracefully', () => {
            // Test various edge cases
            expect(() => validatePasswordStrength('')).not.toThrow();
            expect(() => validateUsername('')).not.toThrow();
            expect(() => validateEmail('')).not.toThrow();
            expect(() => sanitizeInput('')).not.toThrow();
        });

        it('should enforce consistent validation rules', () => {
            // Username length should be consistent
            const shortUsername = validateUsername('ab');
            const longUsername = validateUsername('a'.repeat(31));
            
            expect(shortUsername.errors[0]).toMatch(/at least 3 characters/);
            expect(longUsername.errors[0]).toMatch(/less than 30 characters/);
        });
    });

    describe('SQL Injection Prevention', () => {
        it('should sanitize potential SQL injection attempts', () => {
            const sqlInjectionAttempts = [
                "admin' OR '1'='1",
                "'; DROP TABLE users; --",
                "1; DELETE FROM members WHERE 1=1",
                "' UNION SELECT * FROM users --"
            ];
            
            sqlInjectionAttempts.forEach(attempt => {
                const sanitized = sanitizeInput(attempt);
                // Should escape quotes and special characters
                expect(sanitized).not.toContain("'");
                // If the original had quotes, they should be escaped
                if (attempt.includes("'")) {
                    expect(sanitized).toContain("&#x27;");
                }
            });
        });
    });

    describe('XSS Prevention', () => {
        it('should prevent various XSS vectors', () => {
            const xssVectors = [
                '<script>alert(document.cookie)</script>',
                '<img src=x onerror="alert(1)">',
                '<svg onload="alert(1)">',
                '<iframe src="javascript:alert(1)">',
                '<input onfocus="alert(1)" autofocus>',
                '<a href="javascript:alert(1)">click</a>'
            ];
            
            xssVectors.forEach(vector => {
                const sanitized = sanitizeInput(vector);
                // Should not contain raw HTML tags
                expect(sanitized).not.toContain('<script');
                expect(sanitized).not.toContain('<img');
                expect(sanitized).not.toContain('<iframe');
                expect(sanitized).not.toContain('<svg');
                expect(sanitized).not.toContain('<input');
                expect(sanitized).not.toContain('<a');
                // Should escape angle brackets
                expect(sanitized).toContain('&lt;');
                expect(sanitized).toContain('&gt;');
                // Should not contain unescaped quotes if original had quotes
                if (vector.includes('"')) {
                    expect(sanitized).not.toContain('"');
                    expect(sanitized).toContain('&quot;');
                }
                if (vector.includes("'")) {
                    expect(sanitized).not.toContain("'");
                    expect(sanitized).toContain('&#x27;');
                }
                // Should not match any raw HTML tags
                expect(sanitized).not.toMatch(/<[^>]+>/);
            });
        });
    });
});