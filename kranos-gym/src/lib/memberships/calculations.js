// Membership calculation utilities

/**
 * Determine membership type (New or Renewal)
 * @param {number} memberId - Member ID
 * @param {Array} existingMemberships - Array of existing memberships for the member
 * @returns {string} 'New' or 'Renewal'
 */
export function determineMembershipType(memberId, existingMemberships) {
    if (!Array.isArray(existingMemberships)) {
        return 'New';
    }

    const memberMemberships = existingMemberships.filter(m => m.memberId === memberId);
    return memberMemberships.length > 0 ? 'Renewal' : 'New';
}

/**
 * Calculate end date based on start date and duration
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {number} durationMonths - Duration in months
 * @returns {string} End date in YYYY-MM-DD format
 */
export function calculateEndDate(startDate, durationMonths) {
    if (!startDate || !durationMonths) {
        return null;
    }

    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
        return null;
    }

    const end = new Date(start);
    end.setMonth(end.getMonth() + durationMonths);
    end.setDate(end.getDate() - 1); // End date is inclusive

    return end.toISOString().split('T')[0];
}

/**
 * Check if memberships overlap
 * @param {Object} newMembership - New membership to check
 * @param {Array} existingMemberships - Array of existing memberships
 * @returns {boolean} True if overlapping
 */
export function checkMembershipOverlap(newMembership, existingMemberships) {
    if (!Array.isArray(existingMemberships) || existingMemberships.length === 0) {
        return false;
    }

    const newStart = new Date(newMembership.startDate);
    newStart.setHours(0, 0, 0, 0);
    const newEnd = new Date(newMembership.endDate);
    newEnd.setHours(0, 0, 0, 0);

    return existingMemberships.some(existing => {
        // Only check memberships for the same member
        if (existing.memberId !== newMembership.memberId) {
            return false;
        }

        // Skip if it's the same membership (for updates)
        if (existing.id && newMembership.id && existing.id === newMembership.id) {
            return false;
        }

        const existingStart = new Date(existing.startDate);
        existingStart.setHours(0, 0, 0, 0);
        const existingEnd = new Date(existing.endDate);
        existingEnd.setHours(0, 0, 0, 0);

        // Check for overlap
        const hasOverlap = (newStart <= existingEnd && newEnd >= existingStart);
        
        return hasOverlap;
    });
}

/**
 * Calculate membership status
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {string} 'Active', 'Expired', or 'Future'
 */
export function calculateMembershipStatus(startDate, endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    if (today < start) {
        return 'Future';
    } else if (today > end) {
        return 'Expired';
    } else {
        return 'Active';
    }
}

/**
 * Calculate days until expiry
 * @param {string} endDate - End date
 * @returns {number} Days until expiry (negative if already expired)
 */
export function calculateDaysUntilExpiry(endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

/**
 * Validate membership data
 * @param {Object} membership - Membership object to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateMembership(membership) {
    const errors = [];

    if (!membership.memberId) {
        errors.push('Member is required');
    }

    if (!membership.planId && membership.membershipType === 'GC') {
        errors.push('Plan is required for Group Class membership');
    }

    if (!membership.startDate) {
        errors.push('Start date is required');
    }

    if (membership.membershipType === 'GC' && !membership.endDate) {
        errors.push('End date is required for Group Class membership');
    }

    if (!membership.amount || membership.amount <= 0) {
        errors.push('Valid amount is required');
    }

    if (!membership.paymentMode) {
        errors.push('Payment mode is required');
    }

    // Date validation
    if (membership.startDate && membership.endDate) {
        const start = new Date(membership.startDate);
        const end = new Date(membership.endDate);
        
        if (end <= start) {
            errors.push('End date must be after start date');
        }
    }

    // PT specific validation
    if (membership.membershipType === 'PT') {
        if (!membership.sessions || membership.sessions <= 0) {
            errors.push('Number of sessions is required for PT membership');
        }
        if (!membership.trainerName) {
            errors.push('Trainer selection is required for PT membership');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Calculate total amount including registration fee
 * @param {number} baseAmount - Base membership amount
 * @param {number} registrationFee - Registration fee
 * @param {boolean} isNewMember - Whether this is a new member
 * @returns {number} Total amount
 */
export function calculateTotalAmount(baseAmount, registrationFee = 0, isNewMember = false) {
    const base = parseFloat(baseAmount) || 0;
    const fee = isNewMember ? (parseFloat(registrationFee) || 0) : 0;
    return base + fee;
}

/**
 * Format membership display
 * @param {Object} membership - Membership object
 * @returns {string} Formatted display string
 */
export function formatMembershipDisplay(membership) {
    if (membership.membershipType === 'PT') {
        return `PT - ${membership.sessions} Sessions`;
    } else {
        return membership.planName || 'Group Class';
    }
}

/**
 * Calculate PT session usage percentage
 * @param {number} sessionsUsed - Number of sessions used
 * @param {number} totalSessions - Total number of sessions
 * @returns {number} Usage percentage (0-100)
 */
export function calculateSessionUsagePercentage(sessionsUsed, totalSessions) {
    if (!totalSessions || totalSessions <= 0) {
        return 0;
    }

    const percentage = (sessionsUsed / totalSessions) * 100;
    return Math.min(100, Math.max(0, Math.round(percentage)));
}