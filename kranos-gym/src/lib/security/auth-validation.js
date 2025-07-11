/**
 * Authentication Security Validation Functions
 * Password strength, username validation, and security checks
 */

// Common weak passwords list
const COMMON_PASSWORDS = [
    'password', 'Password', 'password123', 'Password123', 'admin', 'Admin123',
    'qwerty', 'Qwerty123', '12345678', 'letmein', 'welcome', 'monkey',
    'dragon', 'football', 'baseball', 'master', 'michael', 'shadow'
];

// Reserved usernames that shouldn't be allowed
const RESERVED_USERNAMES = [
    'admin', 'administrator', 'root', 'system', 'user', 'test',
    'guest', 'demo', 'api', 'www', 'mail', 'ftp', 'web', 'blog'
];

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} { isValid: boolean, errors: string[] }
 */
export function validatePasswordStrength(password) {
    const errors = [];
    
    if (!password || typeof password !== 'string') {
        return { isValid: false, errors: ['Password is required'] };
    }
    
    // Length checks
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    if (password.length > 128) {
        errors.push('Password is too long');
    }
    
    // Character type checks
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    
    // Pattern checks
    if (/(.)\1{2,}/.test(password)) {
        errors.push('Password contains common patterns and is not secure');
    }
    
    // Common password check
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common.toLowerCase()))) {
        errors.push('Password contains common patterns and is not secure');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Generate a secure random password
 * @param {number} length - Password length (default 16)
 * @returns {string} Generated password
 */
export function generateSecurePassword(length = 16) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = lowercase + uppercase + numbers + special;
    
    let password = '';
    
    // Ensure at least one of each type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Fill the rest
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Check if password is compromised (simplified version)
 * @param {string} password - Password to check
 * @returns {boolean} True if compromised
 */
export function checkPasswordCompromise(password) {
    if (!password) return false;
    
    const commonPatterns = [
        'password', '123456', 'qwerty', 'admin', 'letmein',
        'welcome', 'monkey', 'dragon', 'football', 'baseball'
    ];
    
    const lowerPassword = password.toLowerCase();
    return commonPatterns.some(pattern => lowerPassword.includes(pattern));
}

/**
 * Validate username
 * @param {string} username - Username to validate
 * @returns {object} { isValid: boolean, errors: string[] }
 */
export function validateUsername(username) {
    const errors = [];
    
    if (!username || typeof username !== 'string') {
        return { isValid: false, errors: ['Username is required'] };
    }
    
    const trimmed = username.trim().toLowerCase();
    
    // Length check
    if (trimmed.length < 3) {
        errors.push('Username must be at least 3 characters');
    }
    if (trimmed.length > 30) {
        errors.push('Username must not exceed 30 characters');
    }
    
    // Character check
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
        errors.push('Username can only contain letters, numbers, and underscores');
    }
    
    // Reserved username check
    if (RESERVED_USERNAMES.includes(trimmed)) {
        errors.push('This username is reserved');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @param {boolean} suggestCorrections - Whether to suggest corrections
 * @returns {object} { isValid: boolean, errors: string[], suggestions?: string[] }
 */
export function validateEmail(email, suggestCorrections = false) {
    const errors = [];
    const suggestions = [];
    
    if (!email || typeof email !== 'string') {
        return { isValid: false, errors: ['Email is required'] };
    }
    
    const trimmed = email.trim().toLowerCase();
    
    // Length check
    if (trimmed.length > 254) {
        errors.push('Email address is too long');
    }
    
    // Basic format check
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
        errors.push('Invalid email format');
    }
    
    // Common typo corrections
    if (suggestCorrections) {
        const commonTypos = {
            'gmial.com': 'gmail.com',
            'gmai.com': 'gmail.com',
            'yahooo.com': 'yahoo.com',
            'yaho.com': 'yahoo.com',
            'hotmial.com': 'hotmail.com'
        };
        
        for (const [typo, correct] of Object.entries(commonTypos)) {
            if (trimmed.includes(typo)) {
                suggestions.push(trimmed.replace(typo, correct));
            }
        }
    }
    
    const result = {
        isValid: errors.length === 0,
        errors
    };
    
    if (suggestions.length > 0) {
        result.suggestions = suggestions;
    }
    
    return result;
}

/**
 * Sanitize input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
    if (!input) return '';
    if (typeof input !== 'string') return String(input);
    
    const htmlEntities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#96;',
        '=': '&#x3D;'
    };
    
    return input.replace(/[&<>"'`=\/]/g, char => htmlEntities[char] || char);
}

/**
 * Generate CSRF token
 * @returns {string} CSRF token
 */
export function generateCSRFToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

/**
 * Verify CSRF token (placeholder for actual implementation)
 * @param {string} token - Token to verify
 * @param {string} sessionToken - Session token
 * @returns {boolean} True if valid
 */
export function verifyCSRFToken(token, sessionToken) {
    // This is a placeholder - actual implementation would verify against stored token
    return token && token.length === 32;
}