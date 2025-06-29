import Database from '../../lib/db/database.js';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
    // Ensure user is authenticated and is a member
    if (!locals.user) {
        throw redirect(302, '/login');
    }

    // Only members should access this route (admins/trainers have other dashboards)
    if (locals.user.role !== 'member') {
        throw redirect(302, '/');
    }

    const db = new Database();
    try {
        // Context7-grounded: Use synchronous connection
        db.connect();
        
        // Get user details to find linked member
        const user = db.getUserById(locals.user.id);
        if (!user || !user.member_id) {
            throw redirect(302, '/?error=profile_not_found');
        }

        // Get member details
        const member = db.getMemberById(user.member_id);
        if (!member) {
            throw redirect(302, '/?error=member_not_found');
        }

        // Context7-grounded: Use synchronous database methods
        const groupMemberships = db.getGroupClassMembershipsByMemberId(user.member_id);
        const ptMemberships = db.getPTMembershipsByMemberId(user.member_id);

        // Get upcoming renewals (next 30 days)
        const allRenewals = db.getUpcomingRenewals(30);
        const memberRenewals = allRenewals.filter(renewal => renewal.member_id === user.member_id);

        // Calculate current status
        const today = new Date().toISOString().split('T')[0];
        const activeMemberships = groupMemberships.filter(membership => 
            membership.status === 'Active' && 
            today >= membership.start_date && 
            today <= membership.end_date
        );

        return {
            member,
            groupMemberships,
            ptMemberships,
            memberRenewals,
            activeMemberships: activeMemberships.length,
            isActive: activeMemberships.length > 0
        };
    } catch (error) {
        console.error('Profile load error:', error);
        if (error?.status === 302) {
            throw error; // Re-throw redirects
        }
        return {
            member: null,
            groupMemberships: [],
            ptMemberships: [],
            memberRenewals: [],
            activeMemberships: 0,
            isActive: false,
            error: 'Failed to load profile data'
        };
    } finally {
        // Context7-grounded: Synchronous connection cleanup
        db.close();
    }
};