/**
 * Input Sanitization and Validation Library
 * Provides comprehensive XSS prevention, data validation, and input sanitization
 */

// HTML entities to prevent XSS attacks
const HTML_ENTITIES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#96;',
    '=': '&#x3D;'
};

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} str - Input string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeHtml(str) {
    if (typeof str !== 'string') return '';
    
    return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize and validate member name
 * @param {string} name - Member name input
 * @returns {object} { isValid: boolean, sanitized: string, errors: string[] }
 */
export function sanitizeName(name) {
    const errors = [];
    
    if (!name || typeof name !== 'string') {
        return { isValid: false, sanitized: '', errors: ['Name is required'] };
    }
    
    // Remove leading/trailing whitespace
    let sanitized = name.trim();
    
    // Sanitize HTML entities
    sanitized = sanitizeHtml(sanitized);
    
    // Remove extra spaces between words
    sanitized = sanitized.replace(/\s+/g, ' ');
    
    // Validate length
    if (sanitized.length < 2) {
        errors.push('Name must be at least 2 characters long');
    }
    if (sanitized.length > 100) {
        errors.push('Name must not exceed 100 characters');
    }
    
    // Allow only letters, spaces, hyphens, apostrophes
    const namePattern = /^[a-zA-Z\s'-]+$/;
    if (!namePattern.test(sanitized)) {
        errors.push('Name can only contain letters, spaces, hyphens, and apostrophes');
    }
    
    return {
        isValid: errors.length === 0,
        sanitized,
        errors
    };
}

/**
 * Sanitize and validate phone number
 * @param {string} phone - Phone number input
 * @returns {object} { isValid: boolean, sanitized: string, errors: string[] }
 */
export function sanitizePhone(phone) {
    const errors = [];
    
    if (!phone || typeof phone !== 'string') {
        return { isValid: false, sanitized: '', errors: ['Phone number is required'] };
    }
    
    // Remove all non-digit characters
    let sanitized = phone.replace(/\D/g, '');
    
    // Validate length (assuming 10-digit format)
    if (sanitized.length !== 10) {
        errors.push('Phone number must be exactly 10 digits');
    }
    
    // Additional validation for Indian mobile numbers (optional)
    if (sanitized.length === 10 && !sanitized.match(/^[6-9]\d{9}$/)) {
        errors.push('Invalid phone number format');
    }
    
    return {
        isValid: errors.length === 0,
        sanitized,
        errors
    };
}

/**
 * Sanitize and validate email address
 * @param {string} email - Email input
 * @returns {object} { isValid: boolean, sanitized: string, errors: string[] }
 */
export function sanitizeEmail(email) {
    const errors = [];
    
    if (!email || typeof email !== 'string') {
        return { isValid: true, sanitized: '', errors: [] }; // Email is optional
    }
    
    // Trim and convert to lowercase
    let sanitized = email.trim().toLowerCase();
    
    // Sanitize HTML entities
    sanitized = sanitizeHtml(sanitized);
    
    // Validate length
    if (sanitized.length > 254) {
        errors.push('Email address too long');
    }
    
    // Basic email validation
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (sanitized && !emailPattern.test(sanitized)) {
        errors.push('Invalid email format');
    }
    
    return {
        isValid: errors.length === 0,
        sanitized,
        errors
    };
}

/**
 * Sanitize and validate plan name
 * @param {string} planName - Plan name input
 * @returns {object} { isValid: boolean, sanitized: string, errors: string[] }
 */
export function sanitizePlanName(planName) {
    const errors = [];
    
    if (!planName || typeof planName !== 'string') {
        return { isValid: false, sanitized: '', errors: ['Plan name is required'] };
    }
    
    let sanitized = planName.trim();
    sanitized = sanitizeHtml(sanitized);
    sanitized = sanitized.replace(/\s+/g, ' ');
    
    if (sanitized.length < 2) {
        errors.push('Plan name must be at least 2 characters long');
    }
    if (sanitized.length > 100) {
        errors.push('Plan name must not exceed 100 characters');
    }
    
    // Allow letters, numbers, spaces, hyphens, parentheses
    const planPattern = /^[a-zA-Z0-9\s\-()]+$/;
    if (!planPattern.test(sanitized)) {
        errors.push('Plan name contains invalid characters');
    }
    
    return {
        isValid: errors.length === 0,
        sanitized,
        errors
    };
}

/**
 * Sanitize and validate numeric amount
 * @param {string|number} amount - Amount input
 * @returns {object} { isValid: boolean, sanitized: number, errors: string[] }
 */
export function sanitizeAmount(amount) {
    const errors = [];
    
    if (amount === null || amount === undefined || amount === '') {
        return { isValid: false, sanitized: 0, errors: ['Amount is required'] };
    }
    
    let sanitized = parseFloat(amount);
    
    if (isNaN(sanitized)) {
        errors.push('Amount must be a valid number');
        sanitized = 0;
    } else {
        // Round to 2 decimal places
        sanitized = Math.round(sanitized * 100) / 100;
        
        if (sanitized < 0) {
            errors.push('Amount cannot be negative');
        }
        if (sanitized > 1000000) {
            errors.push('Amount is too large');
        }
    }
    
    return {
        isValid: errors.length === 0,
        sanitized,
        errors
    };
}

/**
 * Sanitize and validate date string (DD-MM-YYYY or DD/MM/YYYY format)
 * @param {string} dateStr - Date string input
 * @returns {object} { isValid: boolean, sanitized: string, errors: string[] }
 */
export function sanitizeDate(dateStr) {
    const errors = [];
    
    if (!dateStr || typeof dateStr !== 'string') {
        return { isValid: false, sanitized: '', errors: ['Date is required'] };
    }
    
    let sanitized = dateStr.trim();
    
    // Accept DD-MM-YYYY or DD/MM/YYYY format
    const datePattern = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
    const match = sanitized.match(datePattern);
    
    if (!match) {
        errors.push('Date must be in DD-MM-YYYY or DD/MM/YYYY format');
        return { isValid: false, sanitized, errors };
    }
    
    const [, day, month, year] = match;
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    // Validate ranges
    if (dayNum < 1 || dayNum > 31) {
        errors.push('Invalid day');
    }
    if (monthNum < 1 || monthNum > 12) {
        errors.push('Invalid month');
    }
    if (yearNum < 1900 || yearNum > 2100) {
        errors.push('Invalid year');
    }
    
    // Validate actual date
    const testDate = new Date(yearNum, monthNum - 1, dayNum);
    if (testDate.getDate() !== dayNum || testDate.getMonth() !== monthNum - 1 || testDate.getFullYear() !== yearNum) {
        errors.push('Invalid date');
    }
    
    // Return in DD-MM-YYYY format for consistency
    sanitized = `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
    
    return {
        isValid: errors.length === 0,
        sanitized,
        errors
    };
}

/**
 * Sanitize and validate duration in days
 * @param {string|number} duration - Duration input
 * @returns {object} { isValid: boolean, sanitized: number, errors: string[] }
 */
export function sanitizeDuration(duration) {
    const errors = [];
    
    if (duration === null || duration === undefined || duration === '') {
        return { isValid: false, sanitized: 0, errors: ['Duration is required'] };
    }
    
    let sanitized = parseInt(duration, 10);
    
    if (isNaN(sanitized)) {
        errors.push('Duration must be a valid number');
        sanitized = 0;
    } else {
        if (sanitized < 1) {
            errors.push('Duration must be at least 1 day');
        }
        if (sanitized > 3650) { // Max 10 years
            errors.push('Duration cannot exceed 3650 days');
        }
    }
    
    return {
        isValid: errors.length === 0,
        sanitized,
        errors
    };
}

/**
 * Sanitize and validate search query
 * @param {string} query - Search query input
 * @returns {object} { isValid: boolean, sanitized: string, errors: string[] }
 */
export function sanitizeSearchQuery(query) {
    const errors = [];
    
    if (!query || typeof query !== 'string') {
        return { isValid: true, sanitized: '', errors: [] };
    }
    
    let sanitized = query.trim();
    sanitized = sanitizeHtml(sanitized);
    
    // Limit search query length
    if (sanitized.length > 100) {
        errors.push('Search query too long');
        sanitized = sanitized.substring(0, 100);
    }
    
    // Remove potential SQL injection patterns
    const dangerousPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
        /(--|\*\/|\/\*)/g,
        /['"`;]/g
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(sanitized)) {
            errors.push('Search query contains invalid characters');
            sanitized = sanitized.replace(pattern, '');
        }
    }
    
    return {
        isValid: errors.length === 0,
        sanitized,
        errors
    };
}

/**
 * Sanitize CSV cell content to prevent CSV injection
 * @param {string} cellValue - CSV cell content
 * @returns {string} Sanitized cell content
 */
export function sanitizeCsvCell(cellValue) {
    if (!cellValue || typeof cellValue !== 'string') return '';
    
    let sanitized = cellValue.trim();
    
    // Remove potential CSV injection patterns
    if (sanitized.startsWith('=') || sanitized.startsWith('+') || 
        sanitized.startsWith('-') || sanitized.startsWith('@')) {
        sanitized = "'" + sanitized; // Prefix with quote to prevent formula execution
    }
    
    // Sanitize HTML entities
    sanitized = sanitizeHtml(sanitized);
    
    return sanitized;
}

/**
 * Validate and sanitize member data object
 * @param {object} memberData - Member data to validate
 * @returns {object} { isValid: boolean, sanitized: object, errors: object }
 */
export function validateMemberData(memberData) {
    const nameResult = sanitizeName(memberData.name);
    const phoneResult = sanitizePhone(memberData.phone);
    const emailResult = sanitizeEmail(memberData.email);
    
    const sanitized = {
        name: nameResult.sanitized,
        phone: phoneResult.sanitized,
        email: emailResult.sanitized,
        join_date: memberData.join_date,
        status: memberData.status || 'New'
    };
    
    const errors = {
        name: nameResult.errors,
        phone: phoneResult.errors,
        email: emailResult.errors
    };
    
    const isValid = nameResult.isValid && phoneResult.isValid && emailResult.isValid;
    
    return { isValid, sanitized, errors };
}

/**
 * Validate and sanitize plan data object
 * @param {object} planData - Plan data to validate
 * @returns {object} { isValid: boolean, sanitized: object, errors: object }
 */
export function validatePlanData(planData) {
    const nameResult = sanitizePlanName(planData.name);
    const displayNameResult = sanitizePlanName(planData.display_name || planData.name);
    const durationResult = sanitizeDuration(planData.duration_days);
    const amountResult = sanitizeAmount(planData.default_amount);
    
    const sanitized = {
        name: nameResult.sanitized,
        display_name: displayNameResult.sanitized,
        duration_days: durationResult.sanitized,
        default_amount: amountResult.sanitized,
        status: planData.status || 'Active'
    };
    
    const errors = {
        name: nameResult.errors,
        display_name: displayNameResult.errors,
        duration_days: durationResult.errors,
        default_amount: amountResult.errors
    };
    
    const isValid = nameResult.isValid && displayNameResult.isValid && 
                    durationResult.isValid && amountResult.isValid;
    
    return { isValid, sanitized, errors };
}

/**
 * Validate and sanitize membership data object
 * @param {object} membershipData - Membership data to validate
 * @returns {object} { isValid: boolean, sanitized: object, errors: object }
 */
export function validateMembershipData(membershipData) {
    const startDateResult = sanitizeDate(membershipData.start_date);
    const endDateResult = sanitizeDate(membershipData.end_date);
    const purchaseDateResult = sanitizeDate(membershipData.purchase_date);
    const amountResult = sanitizeAmount(membershipData.amount_paid);
    
    const sanitized = {
        member_id: parseInt(membershipData.member_id, 10),
        plan_id: parseInt(membershipData.plan_id, 10),
        start_date: startDateResult.sanitized,
        end_date: endDateResult.sanitized,
        purchase_date: purchaseDateResult.sanitized,
        amount_paid: amountResult.sanitized,
        membership_type: membershipData.membership_type || 'New',
        status: membershipData.status || 'Active'
    };
    
    const errors = {
        start_date: startDateResult.errors,
        end_date: endDateResult.errors,
        purchase_date: purchaseDateResult.errors,
        amount_paid: amountResult.errors
    };
    
    const isValid = startDateResult.isValid && endDateResult.isValid && 
                    purchaseDateResult.isValid && amountResult.isValid &&
                    !isNaN(sanitized.member_id) && !isNaN(sanitized.plan_id);
    
    return { isValid, sanitized, errors };
}