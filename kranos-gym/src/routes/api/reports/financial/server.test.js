import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './+server.js';
import Database from '$lib/db/database.js';

// Mock database
vi.mock('$lib/db/database.js', () => {
    return {
        default: vi.fn()
    };
});

describe('GET /api/reports/financial', () => {
    let mockDb;
    let mockUrl;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Create mock database instance with all required methods
        mockDb = {
            connect: vi.fn(),
            close: vi.fn(),
            getFinancialReport: vi.fn(),
            prepare: vi.fn().mockReturnValue({
                all: vi.fn().mockReturnValue([])
            })
        };
        
        // Make Database constructor return our mock
        Database.mockReturnValue(mockDb);
    });

    it('should return financial report for date range', async () => {
        mockUrl = new URL('http://localhost/api/reports/financial?startDate=2024-01-01&endDate=2024-01-31');
        
        const mockReportData = [
            { type: 'Group Class', count: 15, total_amount: 30000 },
            { type: 'Personal Training', count: 10, total_amount: 20000 }
        ];
        
        const mockTransactions = [
            {
                date: '2024-01-15',
                member_name: 'John Doe',
                type: 'group_class',
                plan_or_sessions: 'MMA Focus',
                amount: 2000
            },
            {
                date: '2024-01-20',
                member_name: 'Jane Smith',
                type: 'personal_training',
                plan_or_sessions: 'PT Sessions (10)',
                amount: 6000
            }
        ];

        mockDb.getFinancialReport.mockReturnValue(mockReportData);
        mockDb.prepare.mockReturnValue({
            all: vi.fn().mockReturnValue(mockTransactions)
        });

        const response = await GET({ url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.total_revenue).toBe(50000);
        expect(result.gc_revenue).toBe(30000);
        expect(result.pt_revenue).toBe(20000);
        expect(result.total_transactions).toBe(25);
        expect(result.transactions).toEqual(mockTransactions);
        expect(mockDb.getFinancialReport).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
    });

    it('should use default date range when not provided', async () => {
        mockUrl = new URL('http://localhost/api/reports/financial');
        
        const mockReportData = [
            { type: 'Group Class', count: 30, total_amount: 60000 },
            { type: 'Personal Training', count: 20, total_amount: 40000 }
        ];

        mockDb.getFinancialReport.mockReturnValue(mockReportData);

        const response = await GET({ url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.total_revenue).toBe(100000);
        
        // Should be called with null dates when not provided
        expect(mockDb.getFinancialReport).toHaveBeenCalledWith(null, null);
    });

    it('should validate date format', async () => {
        mockUrl = new URL('http://localhost/api/reports/financial?startDate=invalid-date&endDate=2024-01-31');

        const response = await GET({ url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toContain('Invalid date format');
    });

    it('should validate date range logic', async () => {
        mockUrl = new URL('http://localhost/api/reports/financial?startDate=2024-01-31&endDate=2024-01-01');

        const response = await GET({ url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Start date must be before end date');
    });

    it('should return empty report for no transactions', async () => {
        mockUrl = new URL('http://localhost/api/reports/financial?startDate=2024-01-01&endDate=2024-01-31');
        
        const emptyReportData = [];

        mockDb.getFinancialReport.mockReturnValue(emptyReportData);

        const response = await GET({ url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.total_revenue).toBe(0);
        expect(result.transactions).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
        mockUrl = new URL('http://localhost/api/reports/financial');
        
        mockDb.getFinancialReport.mockImplementation(() => {
            throw new Error('Database query failed');
        });

        const response = await GET({ url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Failed to generate financial report');
    });

    it('should close database connection even on error', async () => {
        mockUrl = new URL('http://localhost/api/reports/financial');
        
        mockDb.connect.mockImplementation(() => {
            throw new Error('Connection failed');
        });

        await GET({ url: mockUrl });

        expect(mockDb.close).toHaveBeenCalled();
    });

    it('should handle partial date parameters', async () => {
        mockUrl = new URL('http://localhost/api/reports/financial?startDate=2024-01-01');
        
        const mockReport = [
            { type: 'Group Class', count: 20, total_amount: 45000 },
            { type: 'Personal Training', count: 10, total_amount: 30000 }
        ];

        mockDb.getFinancialReport.mockReturnValue(mockReport);

        const response = await GET({ url: mockUrl });
        const result = await response.json();

        // API handles partial dates by passing null for missing parameters
        expect(response.status).toBe(200);
        expect(mockDb.getFinancialReport).toHaveBeenCalledWith('2024-01-01', null);
    });

    it('should include revenue breakdown by type', async () => {
        mockUrl = new URL('http://localhost/api/reports/financial?startDate=2024-01-01&endDate=2024-01-31');
        
        const mockReportData = [
            { type: 'Group Class', count: 15, total_amount: 30000 },
            { type: 'Personal Training', count: 10, total_amount: 20000 }
        ];

        mockDb.getFinancialReport.mockReturnValue(mockReportData);

        const response = await GET({ url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.gc_revenue).toBe(30000);
        expect(result.pt_revenue).toBe(20000);
    });
});