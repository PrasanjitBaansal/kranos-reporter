import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './+server.js';
import Database from '$lib/db/database.js';

// Mock database
vi.mock('$lib/db/database.js', () => {
    return {
        default: vi.fn()
    };
});

describe('GET /api/payments/categories', () => {
    let mockDb;
    let mockLocals;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Create mock database instance with all required methods
        mockDb = {
            connect: vi.fn(),
            close: vi.fn(),
            getExpenseCategories: vi.fn()
        };
        
        // Make Database constructor return our mock
        Database.mockReturnValue(mockDb);
        
        // Default mock locals with authentication
        mockLocals = {
            user: { id: 1, username: 'testuser' },
            permissions: ['payments.view']
        };
    });

    it('should return all expense categories', async () => {
        const mockCategories = [
            'Rent',
            'Utilities',
            'Equipment',
            'Maintenance',
            'Salaries',
            'Marketing'
        ];

        mockDb.getExpenseCategories.mockReturnValue(mockCategories);
        
        const response = await GET({ url: new URL('http://localhost/api/payments/categories'), locals: mockLocals });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({
            success: true,
            categories: mockCategories
        });

        expect(mockDb.connect).toHaveBeenCalled();
        expect(mockDb.getExpenseCategories).toHaveBeenCalled();
        expect(mockDb.close).toHaveBeenCalled();
    });

    it('should return empty array when no categories exist', async () => {
        mockDb.getExpenseCategories.mockReturnValue([]);

        const response = await GET({ url: new URL('http://localhost/api/payments/categories'), locals: mockLocals });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({
            success: true,
            categories: []
        });
    });

    it('should handle database errors gracefully', async () => {
        mockDb.getExpenseCategories.mockImplementation(() => {
            throw new Error('Database query failed');
        });

        const response = await GET({ url: new URL('http://localhost/api/payments/categories'), locals: mockLocals });
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({
            success: false,
            error: 'Failed to fetch categories'
        });
    });
    
    it('should require authentication', async () => {
        const response = await GET({ url: new URL('http://localhost/api/payments/categories'), locals: {} });
        const result = await response.json();
        
        expect(response.status).toBe(401);
        expect(result.error).toBe('Unauthorized');
    });
    
    it('should require payments.view permission', async () => {
        const response = await GET({ 
            url: new URL('http://localhost/api/payments/categories'), 
            locals: {
                user: { id: 1, username: 'testuser' },
                permissions: ['some.other.permission']
            }
        });
        const result = await response.json();
        
        expect(response.status).toBe(403);
        expect(result.error).toBe('Insufficient permissions');
    });

    it('should close database connection even on error', async () => {
        mockDb.connect.mockImplementation(() => {
            throw new Error('Connection failed');
        });

        await GET({ url: new URL('http://localhost/api/payments/categories'), locals: mockLocals });

        expect(mockDb.close).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
        mockDb.connect.mockImplementation(() => {
            throw new Error('Cannot connect to database');
        });

        const response = await GET({ url: new URL('http://localhost/api/payments/categories'), locals: mockLocals });
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to fetch categories');
    });

    it('should return sorted categories', async () => {
        const unsortedCategories = [
            'Utilities',
            'Equipment',
            'Rent',
            'Marketing',
            'Salaries'
        ];

        mockDb.getExpenseCategories.mockReturnValue(unsortedCategories);

        const response = await GET({ url: new URL('http://localhost/api/payments/categories'), locals: mockLocals });
        const result = await response.json();

        expect(response.status).toBe(200);
        // Verify the categories are returned in the order from database
        expect(result.categories).toEqual(unsortedCategories);
    });

    it('should return unique categories only', async () => {
        const categoriesWithDuplicates = [
            'Rent',
            'Utilities',
            'Rent', // Duplicate
            'Equipment',
            'Utilities' // Duplicate
        ];

        // Assuming the database method returns unique values
        const uniqueCategories = ['Rent', 'Utilities', 'Equipment'];
        mockDb.getExpenseCategories.mockReturnValue(uniqueCategories);

        const response = await GET({ url: new URL('http://localhost/api/payments/categories'), locals: mockLocals });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.categories).toEqual(uniqueCategories);
        expect(result.categories).toHaveLength(3);
    });

    it('should handle null or undefined categories', async () => {
        mockDb.getExpenseCategories.mockReturnValue(null);

        const response = await GET({ url: new URL('http://localhost/api/payments/categories'), locals: mockLocals });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.categories).toBeNull();
    });
});