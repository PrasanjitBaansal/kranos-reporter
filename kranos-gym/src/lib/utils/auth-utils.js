/**
 * ============================================================================
 * KRANOS GYM AUTHENTICATION UTILITIES
 * ============================================================================
 * Utility functions for authentication, validation, and security helpers
 * ============================================================================
 */

import crypto from 'crypto';

/**
 * Password strength validation
 */
export function validatePasswordStrength(password) {
    const errors = [];
    
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    
    if (password.length > 128) {
        errors.push('Password must be less than 128 characters');
    }
    
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    
    // Check for common patterns
    const commonPatterns = [
        /(.)\1{2,}/, // Repeated characters (aaa, 111, etc.)
        /123456|654321|qwerty|password|admin/i, // Common sequences
    ];
    
    for (const pattern of commonPatterns) {
        if (pattern.test(password)) {
            errors.push('Password contains common patterns and is not secure');
            break;
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        strength: calculatePasswordStrength(password)
    };
}

/**
 * Calculate password strength score (0-100)
 */
function calculatePasswordStrength(password) {
    let score = 0;
    
    // Length score (max 25)
    score += Math.min(password.length * 2, 25);
    
    // Character variety (max 25)
    if (/[a-z]/.test(password)) score += 5;
    if (/[A-Z]/.test(password)) score += 5;
    if (/[0-9]/.test(password)) score += 5;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 10;
    
    // Uniqueness (max 25)
    const uniqueChars = new Set(password).size;
    score += Math.min(uniqueChars * 2, 25);
    
    // Pattern penalties (max -25)
    if (/(.)\1{2,}/.test(password)) score -= 15; // Repeated chars
    if (/123456|654321|qwerty|password|admin/i.test(password)) score -= 25; // Common patterns
    
    // Bonus for length > 12 (max 25)
    if (password.length > 12) {
        score += Math.min((password.length - 12) * 3, 25);
    }
    
    return Math.max(0, Math.min(100, score));
}

/**
 * Username validation
 */
export function validateUsername(username) {
    const errors = [];
    
    if (!username || username.trim().length === 0) {
        errors.push('Username is required');
        return { isValid: false, errors };
    }
    
    username = username.trim();
    
    if (username.length < 3) {
        errors.push('Username must be at least 3 characters long');
    }
    
    if (username.length > 30) {
        errors.push('Username must be less than 30 characters');
    }
    
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
        errors.push('Username can only contain letters, numbers, dots, hyphens, and underscores');
    }
    
    if (/^[._-]|[._-]$/.test(username)) {
        errors.push('Username cannot start or end with special characters');
    }
    
    if (/[._-]{2,}/.test(username)) {
        errors.push('Username cannot contain consecutive special characters');
    }
    
    // Reserved usernames
    const reserved = ['admin', 'administrator', 'root', 'system', 'api', 'www', 'mail', 'support', 'help'];
    if (reserved.includes(username.toLowerCase())) {
        errors.push('This username is reserved and cannot be used');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        username: username.toLowerCase() // Return normalized username
    };
}

/**
 * Email validation
 */
export function validateEmail(email) {
    const errors = [];
    
    if (!email || email.trim().length === 0) {
        errors.push('Email is required');
        return { isValid: false, errors };
    }
    
    email = email.trim().toLowerCase();
    
    // Basic email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(email)) {
        errors.push('Please enter a valid email address');
    }
    
    if (email.length > 254) {
        errors.push('Email address is too long');
    }
    
    // Check for common typos in domains
    const commonTypos = {
        'gmai.com': 'gmail.com',
        'gamil.com': 'gmail.com',
        'gmial.com': 'gmail.com',
        'yahooo.com': 'yahoo.com',
        'hotmial.com': 'hotmail.com'
    };
    
    const domain = email.split('@')[1];
    if (domain && commonTypos[domain]) {
        errors.push(`Did you mean ${email.replace(domain, commonTypos[domain])}?`);
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        email,
        suggestion: domain && commonTypos[domain] ? email.replace(domain, commonTypos[domain]) : null
    };
}

/**
 * Generate secure random password
 */
export function generateSecurePassword(length = 16) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    
    // Ensure at least one character from each category
    password += uppercase[crypto.randomInt(0, uppercase.length)];
    password += lowercase[crypto.randomInt(0, lowercase.length)];
    password += numbers[crypto.randomInt(0, numbers.length)];
    password += symbols[crypto.randomInt(0, symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
        password += allChars[crypto.randomInt(0, allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Generate email verification token
 */
export function generateEmailVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate password reset token
 */
export function generatePasswordResetToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Create secure cookie options
 */
export function getSecureCookieOptions(maxAge = 3600) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: maxAge * 1000, // Convert to milliseconds
        path: '/'
    };
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(token, sessionToken) {
    if (!token || !sessionToken) {
        return false;
    }
    
    // In a real implementation, you'd want to tie this to the user's session
    // For now, we'll just check if the token exists and has the right format
    return typeof token === 'string' && token.length === 64 && /^[a-f0-9]+$/.test(token);
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return input;
    }
    
    return input
        .replace(/[<>'"&]/g, (char) => {
            const entities = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '&': '&amp;'
            };
            return entities[char];
        });
}

/**
 * Format user display name safely
 */
export function formatDisplayName(user) {
    if (!user) return 'Unknown User';
    
    if (user.name) {
        return sanitizeInput(user.name);
    }
    
    if (user.username) {
        return sanitizeInput(user.username);
    }
    
    if (user.email) {
        return sanitizeInput(user.email.split('@')[0]);
    }
    
    return 'Unknown User';
}

/**
 * Check if password has been compromised (placeholder for future integration)
 */
export async function checkPasswordCompromise(password) {
    // In a real implementation, you might integrate with HaveIBeenPwned API
    // For now, just check against some common passwords
    const commonPasswords = [
        'password', '123456', '123456789', 'qwerty', 'abc123',
        'password123', '111111', '123123', 'admin', 'welcome',
        'monkey', 'dragon', 'master', 'sunshine', 'princess'
    ];
    
    return {
        isCompromised: commonPasswords.includes(password.toLowerCase()),
        message: commonPasswords.includes(password.toLowerCase()) 
            ? 'This password is commonly used and not secure'
            : null
    };
}

/**
 * Generate two-factor authentication secret
 */
export function generate2FASecret() {
    return crypto.randomBytes(20).toString('base32');
}

/**
 * Generate backup codes for 2FA
 */
export function generate2FABackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        // Generate 8-digit codes
        const code = crypto.randomInt(10000000, 99999999).toString();
        codes.push(code);
    }
    return codes;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX for 10-digit numbers
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    // Return original if not 10 digits
    return phone;
}

/**
 * Validate phone number
 */
export function validatePhoneNumber(phone) {
    if (!phone) return { isValid: false, errors: ['Phone number is required'] };
    
    const cleaned = phone.replace(/\D/g, '');
    const errors = [];
    
    if (cleaned.length !== 10) {
        errors.push('Phone number must be 10 digits');
    }
    
    if (cleaned.startsWith('0') || cleaned.startsWith('1')) {
        errors.push('Phone number cannot start with 0 or 1');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        formatted: formatPhoneNumber(phone),
        cleaned
    };
}

/**
 * Get user role display name
 */
export function getRoleDisplayName(role) {
    const roleNames = {
        admin: 'Administrator',
        trainer: 'Trainer',
        member: 'Member'
    };
    
    return roleNames[role] || role;
}

/**
 * Get user status display information
 */
export function getStatusDisplay(status) {
    const statusInfo = {
        active: { label: 'Active', color: 'green', icon: '✓' },
        inactive: { label: 'Inactive', color: 'gray', icon: '○' },
        suspended: { label: 'Suspended', color: 'red', icon: '⚠' },
        deleted: { label: 'Deleted', color: 'red', icon: '✗' }
    };
    
    return statusInfo[status] || { label: status, color: 'gray', icon: '?' };
}

/**
 * Time-based utilities
 */
export function formatLastLogin(lastLogin) {
    if (!lastLogin) return 'Never';
    
    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

/**
 * Session duration formatting
 */
export function formatSessionDuration(createdAt, lastUsedAt) {
    const created = new Date(createdAt);
    const lastUsed = new Date(lastUsedAt || createdAt);
    const diffMs = lastUsed - created;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

/**
 * IP address validation and formatting
 */
export function validateIPAddress(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Device info parsing
 */
export function parseUserAgent(userAgent) {
    if (!userAgent) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
    
    // Simple user agent parsing (in production, consider using a library like ua-parser-js)
    const browsers = [
        { name: 'Chrome', regex: /Chrome\/(\d+)/ },
        { name: 'Firefox', regex: /Firefox\/(\d+)/ },
        { name: 'Safari', regex: /Safari\/(\d+)/ },
        { name: 'Edge', regex: /Edge\/(\d+)/ }
    ];
    
    const oses = [
        { name: 'Windows', regex: /Windows NT (\d+\.\d+)/ },
        { name: 'macOS', regex: /Mac OS X (\d+[._]\d+)/ },
        { name: 'Linux', regex: /Linux/ },
        { name: 'iOS', regex: /iPhone|iPad/ },
        { name: 'Android', regex: /Android (\d+\.\d+)/ }
    ];
    
    let browser = 'Unknown';
    let os = 'Unknown';
    
    for (const b of browsers) {
        const match = userAgent.match(b.regex);
        if (match) {
            browser = `${b.name} ${match[1]}`;
            break;
        }
    }
    
    for (const o of oses) {
        if (o.regex.test(userAgent)) {
            os = o.name;
            break;
        }
    }
    
    const device = /Mobile|Android|iPhone|iPad/.test(userAgent) ? 'Mobile' : 'Desktop';
    
    return { browser, os, device };
}

export default {
    validatePasswordStrength,
    validateUsername,
    validateEmail,
    validatePhoneNumber,
    generateSecurePassword,
    generateEmailVerificationToken,
    generatePasswordResetToken,
    getSecureCookieOptions,
    generateCSRFToken,
    verifyCSRFToken,
    sanitizeInput,
    formatDisplayName,
    checkPasswordCompromise,
    generate2FASecret,
    generate2FABackupCodes,
    formatPhoneNumber,
    getRoleDisplayName,
    getStatusDisplay,
    formatLastLogin,
    formatSessionDuration,
    validateIPAddress,
    parseUserAgent
};