import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    determineMembershipType,
    calculateEndDate,
    checkMembershipOverlap,
    calculateMembershipStatus,
    calculateDaysUntilExpiry,
    validateMembership,
    calculateTotalAmount,
    formatMembershipDisplay,
    calculateSessionUsagePercentage
} from './calculations.js';
import { MembershipFactory } from '../../test/factories/membership.factory.js';

describe('Membership Calculations', () => {
    beforeEach(() => {
        MembershipFactory.reset();
        // Mock current date for consistent testing
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('determineMembershipType', () => {
        it('should return New for member with no existing memberships', () => {
            const result = determineMembershipType(1, []);
            expect(result).toBe('New');
        });

        it('should return Renewal for member with existing memberships', () => {
            const existingMemberships = [
                { memberId: 1, id: 1 },
                { memberId: 2, id: 2 }
            ];
            const result = determineMembershipType(1, existingMemberships);
            expect(result).toBe('Renewal');
        });

        it('should return New if existingMemberships is not an array', () => {
            expect(determineMembershipType(1, null)).toBe('New');
            expect(determineMembershipType(1, undefined)).toBe('New');
            expect(determineMembershipType(1, 'invalid')).toBe('New');
        });

        it('should only consider memberships for the same member', () => {
            const existingMemberships = [
                { memberId: 2, id: 1 },
                { memberId: 3, id: 2 }
            ];
            const result = determineMembershipType(1, existingMemberships);
            expect(result).toBe('New');
        });
    });

    describe('calculateEndDate', () => {
        it('should calculate end date correctly for 1 month', () => {
            const result = calculateEndDate('2024-01-15', 1);
            expect(result).toBe('2024-02-14');
        });

        it('should calculate end date correctly for 3 months', () => {
            const result = calculateEndDate('2024-01-15', 3);
            expect(result).toBe('2024-04-14');
        });

        it('should handle year boundary correctly', () => {
            const result = calculateEndDate('2023-11-15', 3);
            expect(result).toBe('2024-02-14');
        });

        it('should handle month-end dates correctly', () => {
            const result = calculateEndDate('2023-01-31', 1);
            // JavaScript adds 1 month to Jan 31, which becomes Mar 3 (31 days into Feb)
            // Then we subtract 1 day, so it becomes Mar 2
            expect(result).toBe('2023-03-02');
        });

        it('should handle leap year correctly', () => {
            const result = calculateEndDate('2024-01-31', 1);
            // JavaScript adds 1 month to Jan 31, which becomes Mar 2 in leap year
            // Then we subtract 1 day, so it becomes Mar 1
            expect(result).toBe('2024-03-01');
        });

        it('should return null for invalid inputs', () => {
            expect(calculateEndDate(null, 1)).toBe(null);
            expect(calculateEndDate('2024-01-15', null)).toBe(null);
            expect(calculateEndDate('invalid-date', 1)).toBe(null);
        });

        it('should handle edge case of 12 months', () => {
            const result = calculateEndDate('2024-01-15', 12);
            expect(result).toBe('2025-01-14');
        });
    });

    describe('checkMembershipOverlap', () => {
        // Don't use fake timers for this test as it affects Date parsing
        beforeEach(() => {
            vi.useRealTimers();
        });

        afterEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2024-01-15'));
        });

        it('should detect overlapping memberships', () => {
            // Use real timers for Date parsing
            vi.useRealTimers();
            
            const newMembership = {
                memberId: 1,
                startDate: '2024-02-01',
                endDate: '2024-02-29' // Feb 2024 has 29 days
            };
            const existingMemberships = [
                {
                    memberId: 1,
                    startDate: '2024-01-15',
                    endDate: '2024-02-15'
                }
            ];
            
            const result = checkMembershipOverlap(newMembership, existingMemberships);
            // Debug: newStart=Feb 1, newEnd=Feb 29, existingStart=Jan 15, existingEnd=Feb 15
            // Overlap: Feb 1-15 is within both ranges
            expect(result).toBe(true);
        });

        it('should not detect overlap for non-overlapping memberships', () => {
            const newMembership = {
                memberId: 1,
                startDate: '2024-03-01',
                endDate: '2024-03-31'
            };
            const existingMemberships = [
                {
                    memberId: 1,
                    startDate: '2024-01-01',
                    endDate: '2024-01-31'
                }
            ];
            
            expect(checkMembershipOverlap(newMembership, existingMemberships)).toBe(false);
        });

        it('should allow consecutive memberships (renewal)', () => {
            const newMembership = {
                memberId: 1,
                startDate: '2024-02-01',
                endDate: '2024-02-29'
            };
            const existingMemberships = [
                {
                    memberId: 1,
                    startDate: '2024-01-01',
                    endDate: '2024-01-31'
                }
            ];
            
            expect(checkMembershipOverlap(newMembership, existingMemberships)).toBe(false);
        });

        it('should not check overlap for different members', () => {
            const newMembership = {
                memberId: 1,
                startDate: '2024-01-15',
                endDate: '2024-02-15'
            };
            const existingMemberships = [
                {
                    memberId: 2,
                    startDate: '2024-01-15',
                    endDate: '2024-02-15'
                }
            ];
            
            expect(checkMembershipOverlap(newMembership, existingMemberships)).toBe(false);
        });

        it('should skip same membership ID (for updates)', () => {
            const newMembership = {
                id: 1,
                memberId: 1,
                startDate: '2024-01-15',
                endDate: '2024-02-15'
            };
            const existingMemberships = [
                {
                    id: 1,
                    memberId: 1,
                    startDate: '2024-01-01',
                    endDate: '2024-01-31'
                }
            ];
            
            expect(checkMembershipOverlap(newMembership, existingMemberships)).toBe(false);
        });

        it('should handle empty or invalid existing memberships', () => {
            const newMembership = {
                memberId: 1,
                startDate: '2024-01-15',
                endDate: '2024-02-15'
            };
            
            expect(checkMembershipOverlap(newMembership, [])).toBe(false);
            expect(checkMembershipOverlap(newMembership, null)).toBe(false);
            expect(checkMembershipOverlap(newMembership, undefined)).toBe(false);
        });
    });

    describe('calculateMembershipStatus', () => {
        it('should return Active for current membership', () => {
            const result = calculateMembershipStatus('2024-01-01', '2024-01-31');
            expect(result).toBe('Active');
        });

        it('should return Expired for past membership', () => {
            const result = calculateMembershipStatus('2023-12-01', '2023-12-31');
            expect(result).toBe('Expired');
        });

        it('should return Future for future membership', () => {
            const result = calculateMembershipStatus('2024-02-01', '2024-02-29');
            expect(result).toBe('Future');
        });

        it('should consider membership active on start date', () => {
            const result = calculateMembershipStatus('2024-01-15', '2024-02-15');
            expect(result).toBe('Active');
        });

        it('should consider membership active on end date', () => {
            const result = calculateMembershipStatus('2023-12-15', '2024-01-15');
            expect(result).toBe('Active');
        });
    });

    describe('calculateDaysUntilExpiry', () => {
        it('should calculate positive days for future expiry', () => {
            const result = calculateDaysUntilExpiry('2024-01-31');
            expect(result).toBe(16); // From Jan 15 to Jan 31
        });

        it('should calculate 0 for today expiry', () => {
            const result = calculateDaysUntilExpiry('2024-01-15');
            expect(result).toBe(0);
        });

        it('should calculate negative days for past expiry', () => {
            const result = calculateDaysUntilExpiry('2024-01-10');
            expect(result).toBe(-5);
        });

        it('should handle far future dates', () => {
            const result = calculateDaysUntilExpiry('2025-01-15');
            expect(result).toBe(366); // 2024 is a leap year, so 366 days
        });
    });

    describe('validateMembership', () => {
        it('should validate valid GC membership', () => {
            const membership = {
                memberId: 1,
                membershipType: 'GC',
                planId: 1,
                startDate: '2024-01-15',
                endDate: '2024-02-14',
                amount: 2000,
                paymentMode: 'Cash'
            };
            
            const result = validateMembership(membership);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate valid PT membership', () => {
            const membership = {
                memberId: 1,
                membershipType: 'PT',
                startDate: '2024-01-15',
                amount: 5000,
                paymentMode: 'Cash',
                sessions: 10,
                trainerName: 'John Trainer'
            };
            
            const result = validateMembership(membership);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should catch all validation errors', () => {
            const membership = {
                membershipType: 'GC'
            };
            
            const result = validateMembership(membership);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Member is required');
            expect(result.errors).toContain('Plan is required for Group Class membership');
            expect(result.errors).toContain('Start date is required');
            expect(result.errors).toContain('End date is required for Group Class membership');
            expect(result.errors).toContain('Valid amount is required');
            expect(result.errors).toContain('Payment mode is required');
        });

        it('should validate date order', () => {
            const membership = {
                memberId: 1,
                membershipType: 'GC',
                planId: 1,
                startDate: '2024-01-31',
                endDate: '2024-01-15',
                amount: 2000,
                paymentMode: 'Cash'
            };
            
            const result = validateMembership(membership);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('End date must be after start date');
        });

        it('should validate PT specific fields', () => {
            const membership = {
                memberId: 1,
                membershipType: 'PT',
                startDate: '2024-01-15',
                amount: 5000,
                paymentMode: 'Cash'
            };
            
            const result = validateMembership(membership);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Number of sessions is required for PT membership');
            expect(result.errors).toContain('Trainer selection is required for PT membership');
        });

        it('should validate amount is positive', () => {
            const membership = {
                memberId: 1,
                membershipType: 'GC',
                planId: 1,
                startDate: '2024-01-15',
                endDate: '2024-02-14',
                amount: -1000,
                paymentMode: 'Cash'
            };
            
            const result = validateMembership(membership);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Valid amount is required');
        });
    });

    describe('calculateTotalAmount', () => {
        it('should calculate total with registration fee for new member', () => {
            const result = calculateTotalAmount(2000, 500, true);
            expect(result).toBe(2500);
        });

        it('should calculate total without registration fee for existing member', () => {
            const result = calculateTotalAmount(2000, 500, false);
            expect(result).toBe(2000);
        });

        it('should handle missing registration fee', () => {
            const result = calculateTotalAmount(2000, null, true);
            expect(result).toBe(2000);
        });

        it('should handle invalid base amount', () => {
            const result = calculateTotalAmount(null, 500, true);
            expect(result).toBe(500);
        });

        it('should handle string amounts', () => {
            const result = calculateTotalAmount('2000', '500', true);
            expect(result).toBe(2500);
        });
    });

    describe('formatMembershipDisplay', () => {
        it('should format PT membership correctly', () => {
            const membership = {
                membershipType: 'PT',
                sessions: 10
            };
            const result = formatMembershipDisplay(membership);
            expect(result).toBe('PT - 10 Sessions');
        });

        it('should format GC membership with plan name', () => {
            const membership = {
                membershipType: 'GC',
                planName: '3 Months'
            };
            const result = formatMembershipDisplay(membership);
            expect(result).toBe('3 Months');
        });

        it('should use default for GC without plan name', () => {
            const membership = {
                membershipType: 'GC'
            };
            const result = formatMembershipDisplay(membership);
            expect(result).toBe('Group Class');
        });
    });

    describe('calculateSessionUsagePercentage', () => {
        it('should calculate percentage correctly', () => {
            expect(calculateSessionUsagePercentage(3, 10)).toBe(30);
            expect(calculateSessionUsagePercentage(5, 10)).toBe(50);
            expect(calculateSessionUsagePercentage(10, 10)).toBe(100);
        });

        it('should handle zero total sessions', () => {
            expect(calculateSessionUsagePercentage(5, 0)).toBe(0);
            expect(calculateSessionUsagePercentage(0, 0)).toBe(0);
        });

        it('should cap at 100%', () => {
            expect(calculateSessionUsagePercentage(15, 10)).toBe(100);
        });

        it('should handle invalid inputs', () => {
            expect(calculateSessionUsagePercentage(null, 10)).toBe(0);
            expect(calculateSessionUsagePercentage(5, null)).toBe(0);
        });

        it('should round to nearest integer', () => {
            expect(calculateSessionUsagePercentage(1, 3)).toBe(33);
            expect(calculateSessionUsagePercentage(2, 3)).toBe(67);
        });
    });
});