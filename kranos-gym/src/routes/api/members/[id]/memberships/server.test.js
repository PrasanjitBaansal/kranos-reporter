import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './+server.js';
import Database from '$lib/db/database.js';

// Mock database
vi.mock('$lib/db/database.js', () => {
    return {
        default: vi.fn()
    };
});

describe('GET /api/members/[id]/memberships', () => {
    let mockDb;
    let mockParams;
    let mockUrl;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Create mock database instance with all required methods
        mockDb = {
            connect: vi.fn(),
            close: vi.fn(),
            getMemberById: vi.fn(),
            getGroupClassMembershipsByMemberId: vi.fn(),
            getPTMembershipsByMemberId: vi.fn()
        };
        
        // Make Database constructor return our mock
        Database.mockReturnValue(mockDb);
        
        mockParams = { id: '1' };
        mockUrl = new URL('http://localhost/api/members/1/memberships');
    });

    it('should return all memberships for a member', async () => {
        const mockMember = {
            id: 1,
            name: 'John Doe',
            phone: '9876543210',
            email: 'john@example.com',
            status: 'Active'
        };

        const mockGroupMemberships = [
            {
                id: 1,
                member_id: 1,
                plan_name: 'MMA Focus',
                start_date: '2024-01-01',
                end_date: '2024-01-31',
                amount_paid: 2000,
                status: 'Active'
            }
        ];

        const mockPTMemberships = [
            {
                id: 1,
                member_id: 1,
                sessions_total: 12,
                sessions_remaining: 8,
                amount_paid: 6000,
                purchase_date: '2024-01-15'
            }
        ];

        mockDb.getMemberById.mockReturnValue(mockMember);
        mockDb.getGroupClassMembershipsByMemberId.mockReturnValue(mockGroupMemberships);
        mockDb.getPTMembershipsByMemberId.mockReturnValue(mockPTMemberships);

        const response = await GET({ params: mockParams, url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({
            member: mockMember,
            groupMemberships: mockGroupMemberships,
            ptMemberships: mockPTMemberships
        });

        expect(mockDb.getMemberById).toHaveBeenCalledWith(1);
        expect(mockDb.getGroupClassMembershipsByMemberId).toHaveBeenCalledWith(1);
        expect(mockDb.getPTMembershipsByMemberId).toHaveBeenCalledWith(1);
    });

    it('should return 404 for non-existent member', async () => {
        mockDb.getMemberById.mockReturnValue(null);

        const response = await GET({ params: mockParams, url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(404);
        expect(result.error).toBe('Member not found');
    });

    it('should handle invalid member ID', async () => {
        mockParams = { id: 'invalid' };

        const response = await GET({ params: mockParams, url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Invalid member ID');
    });

    it('should return empty arrays when member has no memberships', async () => {
        const mockMember = {
            id: 1,
            name: 'John Doe',
            phone: '9876543210',
            status: 'New'
        };

        mockDb.getMemberById.mockReturnValue(mockMember);
        mockDb.getGroupClassMembershipsByMemberId.mockReturnValue([]);
        mockDb.getPTMembershipsByMemberId.mockReturnValue([]);

        const response = await GET({ params: mockParams, url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.groupMemberships).toEqual([]);
        expect(result.ptMemberships).toEqual([]);
    });

    it('should filter by type when query parameter provided', async () => {
        mockUrl = new URL('http://localhost/api/members/1/memberships?type=group');
        
        const mockMember = { id: 1, name: 'John Doe' };
        const mockGroupMemberships = [{ id: 1, plan_name: 'MMA Focus' }];

        mockDb.getMemberById.mockReturnValue(mockMember);
        mockDb.getGroupClassMembershipsByMemberId.mockReturnValue(mockGroupMemberships);

        const response = await GET({ params: mockParams, url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.groupMemberships).toBeDefined();
        expect(result.groupMemberships).toEqual(mockGroupMemberships);
        expect(result.ptMemberships).toEqual([]); // API returns empty array, not undefined
        expect(mockDb.getPTMembershipsByMemberId).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
        mockDb.getMemberById.mockImplementation(() => {
            throw new Error('Database connection failed');
        });

        const response = await GET({ params: mockParams, url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Failed to fetch member memberships');
    });

    it('should close database connection even on error', async () => {
        mockDb.getMemberById.mockImplementation(() => {
            throw new Error('Database error');
        });

        await GET({ params: mockParams, url: mockUrl });

        expect(mockDb.close).toHaveBeenCalled();
    });

    it('should include membership status calculations', async () => {
        const mockMember = { id: 1, name: 'John Doe' };
        const today = new Date().toISOString().split('T')[0];
        
        const mockGroupMemberships = [
            {
                id: 1,
                start_date: '2024-01-01',
                end_date: '2024-12-31',
                status: 'Active'
            },
            {
                id: 2,
                start_date: '2023-01-01',
                end_date: '2023-12-31',
                status: 'Expired'
            }
        ];

        mockDb.getMemberById.mockReturnValue(mockMember);
        mockDb.getGroupClassMembershipsByMemberId.mockReturnValue(mockGroupMemberships);
        mockDb.getPTMembershipsByMemberId.mockReturnValue([]);

        const response = await GET({ params: mockParams, url: mockUrl });
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.groupMemberships).toHaveLength(2);
        expect(result.groupMemberships[0].status).toBe('Active');
        expect(result.groupMemberships[1].status).toBe('Expired');
    });
});