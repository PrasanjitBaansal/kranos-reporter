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

describe('Authentication Utilities Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Password Validation', () => {
        it('should validate password strength requirements', () => {
            // Too short
            expect(validatePasswordStrength('Short1!')).toEqual({
                isValid: false,
                errors: ['Password must be at least 8 characters long']
            });

            // Missing uppercase
            expect(validatePasswordStrength('lowercase1!')).toEqual({
                isValid: false,
                errors: ['Password must contain at least one uppercase letter']
            });

            // Missing lowercase
            expect(validatePasswordStrength('UPPERCASE1!')).toEqual({
                isValid: false,
                errors: ['Password must contain at least one lowercase letter']
            });

            // Missing number
            expect(validatePasswordStrength('NoNumber!')).toEqual({
                isValid: false,
                errors: ['Password must contain at least one number']
            });

            // Missing special character
            expect(validatePasswordStrength('NoSpecial1')).toEqual({
                isValid: false,
                errors: ['Password must contain at least one special character']
            });

            // Valid password
            expect(validatePasswordStrength('ValidPass123!')).toEqual({
                isValid: true,
                errors: []
            });
        });

        it('should reject common patterns', () => {
            const result = validatePasswordStrength('aaa123ABC!');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Password contains common patterns and is not secure');
        });

        it('should reject common passwords', () => {
            const result = validatePasswordStrength('Password123!');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Password contains common patterns and is not secure');
        });
    });

    describe('Username Validation', () => {
        it('should validate username requirements', () => {
            // Too short
            expect(validateUsername('ab')).toEqual({
                isValid: false,
                errors: ['Username must be between 3 and 20 characters']
            });

            // Too long
            expect(validateUsername('a'.repeat(21))).toEqual({
                isValid: false,
                errors: ['Username must be between 3 and 20 characters']
            });

            // Invalid characters
            expect(validateUsername('user@name')).toEqual({
                isValid: false,
                errors: ['Username can only contain letters, numbers, and underscores']
            });

            // Valid username
            expect(validateUsername('valid_user123')).toEqual({
                isValid: true,
                errors: []
            });
        });
    });

    describe('Email Validation', () => {
        it('should validate email format', () => {
            // Invalid formats
            expect(validateEmail('notanemail')).toEqual({
                isValid: false,
                errors: ['Invalid email format']
            });

            expect(validateEmail('missing@domain')).toEqual({
                isValid: false,
                errors: ['Invalid email format']
            });

            expect(validateEmail('@example.com')).toEqual({
                isValid: false,
                errors: ['Invalid email format']
            });

            // Valid email
            expect(validateEmail('user@example.com')).toEqual({
                isValid: true,
                errors: []
            });
        });

        it('should reject emails that are too long', () => {
            const longEmail = 'a'.repeat(200) + '@example.com';
            expect(validateEmail(longEmail)).toEqual({
                isValid: false,
                errors: ['Email must be less than 100 characters']
            });
        });
    });

    describe('Secure Password Generation', () => {
        it('should generate secure passwords', () => {
            const password = generateSecurePassword();
            
            // Check length
            expect(password.length).toBe(16);
            
            // Verify it meets all requirements
            const validation = validatePasswordStrength(password);
            expect(validation.isValid).toBe(true);
        });

        it('should generate passwords of custom length', () => {
            const password = generateSecurePassword(20);
            expect(password.length).toBe(20);
        });

        it('should generate unique passwords', () => {
            const passwords = new Set();
            for (let i = 0; i < 100; i++) {
                passwords.add(generateSecurePassword());
            }
            // All should be unique
            expect(passwords.size).toBe(100);
        });
    });

    describe('Input Sanitization', () => {
        it('should sanitize HTML tags', () => {
            expect(sanitizeInput('<script>alert("xss")</script>')).toBe('');
            expect(sanitizeInput('Hello <b>World</b>')).toBe('Hello World');
        });

        it('should trim whitespace', () => {
            expect(sanitizeInput('  hello  ')).toBe('hello');
        });

        it('should handle null and undefined', () => {
            expect(sanitizeInput(null)).toBe('');
            expect(sanitizeInput(undefined)).toBe('');
        });

        it('should preserve safe text', () => {
            expect(sanitizeInput('Hello World 123!')).toBe('Hello World 123!');
        });
    });

    describe('CSRF Token Management', () => {
        it('should generate CSRF tokens', () => {
            const token = generateCSRFToken();
            
            expect(token).toBeDefined();
            expect(token.length).toBeGreaterThan(0);
            // Should be base64 encoded
            expect(token).toMatch(/^[A-Za-z0-9+/]+=*$/);
        });

        it('should generate unique tokens', () => {
            const tokens = new Set();
            for (let i = 0; i < 100; i++) {
                tokens.add(generateCSRFToken());
            }
            expect(tokens.size).toBe(100);
        });

        it('should verify matching tokens', () => {
            const token = generateCSRFToken();
            expect(verifyCSRFToken(token, token)).toBe(true);
        });

        it('should reject mismatched tokens', () => {
            const token1 = generateCSRFToken();
            const token2 = generateCSRFToken();
            expect(verifyCSRFToken(token1, token2)).toBe(false);
        });

        it('should handle invalid tokens', () => {
            expect(verifyCSRFToken(null, 'token')).toBe(false);
            expect(verifyCSRFToken('token', null)).toBe(false);
            expect(verifyCSRFToken('', '')).toBe(false);
        });
    });

    describe('Password Compromise Check', () => {
        it('should check for compromised passwords', async () => {
            // Mock the check to avoid actual API calls
            vi.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: true,
                text: async () => 'ABCDE:5\nFGHIJ:10'
            });

            const result = await checkPasswordCompromise('password123');
            expect(result.isCompromised).toBeDefined();
        });

        it('should handle API errors gracefully', async () => {
            vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

            const result = await checkPasswordCompromise('password123');
            expect(result.isCompromised).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
});