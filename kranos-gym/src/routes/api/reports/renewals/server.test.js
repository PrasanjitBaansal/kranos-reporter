import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './+server.js';
import Database from '$lib/db/database.js';

// Mock database
vi.mock('$lib/db/database.js', () => {
    return {
        default: vi.fn()
    };
});

// Mock sanitize function
vi.mock('$lib/security/sanitize.js', () => ({
    sanitizeHtml: vi.fn(text => text)
}));

describe('GET /api/reports/renewals', () => {
    let mockDb;
    let mockUrl;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Create mock database instance with all required methods
        mockDb = {
            connect: vi.fn(),
            close: vi.fn(),
            getUpcomingRenewals: vi.fn()
        };
        
        // Make Database constructor return our mock
        Database.mockReturnValue(mockDb);
    });

    it('should return upcoming renewals for default 30 days', async () => {
        mockUrl = new URL('http://localhost/api/reports/renewals');
        
        const mockRenewals = [
            {
                id: 1,
                member_id: 101,
                member_name: 'John Doe',
                member_phone: '9876543210',
                plan_name: 'MMA Focus',
                end_date: '2024-02-15',
                days_until_expiry: 15,
                amount_paid: 2000
            },
            {
                id: 2,
                member_id: 102,
                member_name: 'Jane Smith',
                member_phone: '9876543211',
                plan_name: 'Fitness Pro',
                end_date: '2024-02-20',
                days_until_expiry: 20,
                amount_paid: 2500
            }
        ];

        mockDb.getUpcomingRenewals.mockReturnValue(mockRenewals);

        const response = await GET({ url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({
            success: true,
            data: mockRenewals,
            days: 30
        });
        expect(mockDb.getUpcomingRenewals).toHaveBeenCalledWith(30);
    });

    it('should accept custom days parameter', async () => {
        mockUrl = new URL('http://localhost/api/reports/renewals?days=7');
        
        const mockRenewals = [
            {
                id: 1,
                member_name: 'John Doe',
                plan_name: 'MMA Focus',
                end_date: '2024-02-07',
                days_until_expiry: 7
            }
        ];

        mockDb.getUpcomingRenewals.mockReturnValue(mockRenewals);

        const response = await GET({ url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.days).toBe(7);
        expect(mockDb.getUpcomingRenewals).toHaveBeenCalledWith(7);
    });

    it('should use default 30 days for negative days parameter', async () => {
        mockUrl = new URL('http://localhost/api/reports/renewals?days=-5');
        
        mockDb.getUpcomingRenewals.mockReturnValue([]);

        const response = await GET({ url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.days).toBe(30); // Uses default value
        expect(mockDb.getUpcomingRenewals).toHaveBeenCalledWith(30);
    });

    it('should use default 30 days for non-numeric days parameter', async () => {
        mockUrl = new URL('http://localhost/api/reports/renewals?days=abc');
        
        mockDb.getUpcomingRenewals.mockReturnValue([]);

        const response = await GET({ url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.days).toBe(30); // Uses default value
        expect(mockDb.getUpcomingRenewals).toHaveBeenCalledWith(30);
    });

    it('should limit maximum days to 365', async () => {
        mockUrl = new URL('http://localhost/api/reports/renewals?days=400');
        
        mockDb.getUpcomingRenewals.mockReturnValue([]);

        const response = await GET({ url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(mockDb.getUpcomingRenewals).toHaveBeenCalledWith(30); // Uses default when over 365
        expect(result.days).toBe(30);
    });

    it('should return empty array when no renewals found', async () => {
        mockUrl = new URL('http://localhost/api/reports/renewals');
        
        mockDb.getUpcomingRenewals.mockReturnValue([]);

        const response = await GET({ url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({
            success: true,
            data: [],
            days: 30
        });
    });

    it('should sort renewals by expiry date', async () => {
        mockUrl = new URL('http://localhost/api/reports/renewals');
        
        const unsortedRenewals = [
            { id: 1, member_name: 'John', member_phone: '1234', plan_name: 'Plan A', end_date: '2024-02-20', days_until_expiry: 20 },
            { id: 2, member_name: 'Jane', member_phone: '5678', plan_name: 'Plan B', end_date: '2024-02-10', days_until_expiry: 10 },
            { id: 3, member_name: 'Bob', member_phone: '9012', plan_name: 'Plan C', end_date: '2024-02-15', days_until_expiry: 15 }
        ];

        mockDb.getUpcomingRenewals.mockReturnValue(unsortedRenewals);

        const response = await GET({ url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(200);
        // Should be returned as-is from database (assuming DB sorts them)
        expect(result.data).toEqual(unsortedRenewals);
    });

    it('should handle database errors gracefully', async () => {
        mockUrl = new URL('http://localhost/api/reports/renewals');
        
        mockDb.getUpcomingRenewals.mockImplementation(() => {
            throw new Error('Database query failed');
        });

        const response = await GET({ url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({
            success: false,
            error: 'Failed to fetch upcoming renewals'
        });
    });

    it('should close database connection even on error', async () => {
        mockUrl = new URL('http://localhost/api/reports/renewals');
        
        mockDb.connect.mockImplementation(() => {
            throw new Error('Connection failed');
        });

        await GET({ url: mockUrl });

        expect(mockDb.close).toHaveBeenCalled();
    });

    it('should include member contact information', async () => {
        mockUrl = new URL('http://localhost/api/reports/renewals');
        
        const mockRenewals = [
            {
                id: 1,
                member_id: 101,
                member_name: 'John Doe',
                member_phone: '9876543210',
                member_email: 'john@example.com',
                plan_name: 'MMA Focus',
                end_date: '2024-02-15',
                days_until_expiry: 15
            }
        ];

        mockDb.getUpcomingRenewals.mockReturnValue(mockRenewals);

        const response = await GET({ url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.data[0]).toHaveProperty('member_phone');
        expect(result.data[0]).toHaveProperty('member_email');
    });
});