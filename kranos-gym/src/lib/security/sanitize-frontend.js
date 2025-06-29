/**
 * Frontend Input Sanitization Helpers
 * Client-side input sanitization for search, forms, and user inputs
 */

/**
 * Sanitize search query for safe client-side usage
 * @param {string} query - Search query input
 * @returns {string} Sanitized search query
 */
export function sanitizeSearchQuery(query) {
    if (!query || typeof query !== 'string') return '';
    
    // Basic sanitization for search
    let sanitized = query.trim();
    
    // Remove HTML tags and entities
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    // Limit length
    if (sanitized.length > 100) {
        sanitized = sanitized.substring(0, 100);
    }
    
    // Remove potentially dangerous characters for SQL injection
    sanitized = sanitized.replace(/['"`;]/g, '');
    
    return sanitized;
}

/**
 * Sanitize form input values on the frontend
 * @param {string} value - Input value
 * @returns {string} Sanitized value
 */
export function sanitizeFormInput(value) {
    if (!value || typeof value !== 'string') return '';
    
    let sanitized = value.trim();
    
    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    // Replace HTML entities
    sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    
    return sanitized;
}

/**
 * Validate and sanitize phone number input
 * @param {string} phone - Phone number input
 * @returns {object} { isValid: boolean, sanitized: string, error?: string }
 */
export function sanitizePhoneInput(phone) {
    if (!phone || typeof phone !== 'string') {
        return { isValid: false, sanitized: '', error: 'Phone number is required' };
    }
    
    // Remove all non-digit characters
    const sanitized = phone.replace(/\D/g, '');
    
    // Validate length
    if (sanitized.length !== 10) {
        return { 
            isValid: false, 
            sanitized, 
            error: 'Phone number must be exactly 10 digits' 
        };
    }
    
    // Additional validation for Indian mobile numbers
    if (!sanitized.match(/^[6-9]\d{9}$/)) {
        return { 
            isValid: false, 
            sanitized, 
            error: 'Invalid phone number format' 
        };
    }
    
    return { isValid: true, sanitized };
}

/**
 * Validate and sanitize email input
 * @param {string} email - Email input
 * @returns {object} { isValid: boolean, sanitized: string, error?: string }
 */
export function sanitizeEmailInput(email) {
    if (!email || typeof email !== 'string') {
        return { isValid: true, sanitized: '' }; // Email is optional
    }
    
    let sanitized = email.trim().toLowerCase();
    
    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    // Validate length
    if (sanitized.length > 254) {
        return { 
            isValid: false, 
            sanitized, 
            error: 'Email address too long' 
        };
    }
    
    // Basic email validation
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (sanitized && !emailPattern.test(sanitized)) {
        return { 
            isValid: false, 
            sanitized, 
            error: 'Invalid email format' 
        };
    }
    
    return { isValid: true, sanitized };
}

/**
 * Validate and sanitize name input
 * @param {string} name - Name input
 * @returns {object} { isValid: boolean, sanitized: string, error?: string }
 */
export function sanitizeNameInput(name) {
    if (!name || typeof name !== 'string') {
        return { isValid: false, sanitized: '', error: 'Name is required' };
    }
    
    let sanitized = name.trim();
    
    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    // Remove extra spaces between words
    sanitized = sanitized.replace(/\s+/g, ' ');
    
    // Validate length
    if (sanitized.length < 2) {
        return { 
            isValid: false, 
            sanitized, 
            error: 'Name must be at least 2 characters long' 
        };
    }
    if (sanitized.length > 100) {
        return { 
            isValid: false, 
            sanitized, 
            error: 'Name must not exceed 100 characters' 
        };
    }
    
    // Allow only letters, spaces, hyphens, apostrophes
    const namePattern = /^[a-zA-Z\s'-]+$/;
    if (!namePattern.test(sanitized)) {
        return { 
            isValid: false, 
            sanitized, 
            error: 'Name can only contain letters, spaces, hyphens, and apostrophes' 
        };
    }
    
    return { isValid: true, sanitized };
}

/**
 * Sanitize numeric input (amounts, durations)
 * @param {string|number} value - Numeric input
 * @param {object} options - Validation options
 * @returns {object} { isValid: boolean, sanitized: number, error?: string }
 */
export function sanitizeNumericInput(value, options = {}) {
    const { min = 0, max = Infinity, allowDecimals = false, required = true } = options;
    
    if (value === null || value === undefined || value === '') {
        if (required) {
            return { isValid: false, sanitized: 0, error: 'This field is required' };
        }
        return { isValid: true, sanitized: 0 };
    }
    
    let sanitized = allowDecimals ? parseFloat(value) : parseInt(value, 10);
    
    if (isNaN(sanitized)) {
        return { 
            isValid: false, 
            sanitized: 0, 
            error: 'Must be a valid number' 
        };
    }
    
    if (allowDecimals) {
        // Round to 2 decimal places
        sanitized = Math.round(sanitized * 100) / 100;
    }
    
    if (sanitized < min) {
        return { 
            isValid: false, 
            sanitized, 
            error: `Value must be at least ${min}` 
        };
    }
    
    if (sanitized > max) {
        return { 
            isValid: false, 
            sanitized, 
            error: `Value must not exceed ${max}` 
        };
    }
    
    return { isValid: true, sanitized };
}

/**
 * Real-time form validation helper
 * @param {object} formData - Form data object
 * @param {object} rules - Validation rules
 * @returns {object} { isValid: boolean, sanitized: object, errors: object }
 */
export function validateFormData(formData, rules) {
    const sanitized = {};
    const errors = {};
    let isValid = true;
    
    for (const [field, value] of Object.entries(formData)) {
        const rule = rules[field];
        if (!rule) {
            sanitized[field] = value;
            continue;
        }
        
        let result;
        switch (rule.type) {
            case 'name':
                result = sanitizeNameInput(value);
                break;
            case 'email':
                result = sanitizeEmailInput(value);
                break;
            case 'phone':
                result = sanitizePhoneInput(value);
                break;
            case 'numeric':
                result = sanitizeNumericInput(value, rule.options);
                break;
            default:
                result = { isValid: true, sanitized: sanitizeFormInput(value) };
        }
        
        sanitized[field] = result.sanitized;
        if (!result.isValid) {
            errors[field] = result.error;
            isValid = false;
        }
    }
    
    return { isValid, sanitized, errors };
}