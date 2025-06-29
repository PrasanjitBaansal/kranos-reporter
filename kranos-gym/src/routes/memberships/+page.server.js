import Database from '../../lib/db/database.js';

export const load = async () => {
    const db = new Database();
    try {
        await db.connect();
        
        // Since better-sqlite3 methods are synchronous, no need for Promise.all
        const members = db.getMembers(true);
        const groupPlans = db.getGroupPlans(true);
        const groupClassMemberships = db.getGroupClassMemberships();
        const ptMemberships = db.getPTMemberships();

        return {
            members,
            groupPlans,
            groupClassMemberships,
            ptMemberships
        };
    } catch (error) {
        console.error('Memberships load error:', error);
        return {
            members: [],
            groupPlans: [],
            groupClassMemberships: [],
            ptMemberships: []
        };
    } finally {
        await db.close();
    }
};

export const actions = {
    // Group Class Membership actions
    createGC: async ({ request }) => {
        const data = await request.formData();
        const db = new Database();
        
        try {
            await db.connect();
            
            // Get plan details to calculate end date
            const plan = await db.getGroupPlanById(parseInt(data.get('plan_id')));
            const startDate = new Date(data.get('start_date'));
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + plan.duration_days);
            
            // Check if member has previous memberships to determine type
            const previousMemberships = await db.getGroupClassMembershipsByMemberId(parseInt(data.get('member_id')));
            const membershipType = previousMemberships.length > 0 ? 'Renewal' : 'New';
            
            const membership = {
                member_id: parseInt(data.get('member_id')),
                plan_id: parseInt(data.get('plan_id')),
                start_date: data.get('start_date'),
                end_date: endDate.toISOString().split('T')[0],
                amount_paid: parseFloat(data.get('amount_paid')),
                purchase_date: data.get('purchase_date') || new Date().toISOString().split('T')[0],
                membership_type: membershipType,
                status: 'Active'
            };

            const result = await db.createGroupClassMembership(membership);
            
            // Update member status based on new membership
            await db.updateMemberStatus(membership.member_id);
            
            return { success: true, membership: result, type: 'gc' };
        } catch (error) {
            return { success: false, error: error.message, type: 'gc' };
        } finally {
            await db.close();
        }
    },

    updateGC: async ({ request }) => {
        const data = await request.formData();
        const id = parseInt(data.get('id'));
        const db = new Database();
        
        try {
            await db.connect();
            
            const membership = {
                member_id: parseInt(data.get('member_id')),
                plan_id: parseInt(data.get('plan_id')),
                start_date: data.get('start_date'),
                end_date: data.get('end_date'),
                amount_paid: parseFloat(data.get('amount_paid')),
                purchase_date: data.get('purchase_date'),
                membership_type: data.get('membership_type'),
                status: data.get('status') || 'Active'
            };

            await db.updateGroupClassMembership(id, membership);
            
            // Update member status based on updated membership
            await db.updateMemberStatus(membership.member_id);
            
            return { success: true, type: 'gc' };
        } catch (error) {
            return { success: false, error: error.message, type: 'gc' };
        } finally {
            await db.close();
        }
    },

    deleteGC: async ({ request }) => {
        const data = await request.formData();
        const id = parseInt(data.get('id'));
        const db = new Database();

        try {
            await db.connect();
            
            // Get membership details before deleting to update member status
            const membership = await db.getGroupClassMembershipById(id);
            const memberId = membership?.member_id;
            
            await db.deleteGroupClassMembership(id);
            
            // Update member status after deleting membership
            if (memberId) {
                await db.updateMemberStatus(memberId);
            }
            
            return { success: true, type: 'gc' };
        } catch (error) {
            return { success: false, error: error.message, type: 'gc' };
        } finally {
            await db.close();
        }
    },

    // PT Membership actions
    createPT: async ({ request }) => {
        const data = await request.formData();
        const sessions_total = parseInt(data.get('sessions_total'));
        const db = new Database();
        
        const membership = {
            member_id: parseInt(data.get('member_id')),
            purchase_date: data.get('purchase_date') || new Date().toISOString().split('T')[0],
            amount_paid: parseFloat(data.get('amount_paid')),
            sessions_total: sessions_total,
            sessions_remaining: sessions_total
        };

        try {
            await db.connect();
            const result = db.createPTMembership(membership);
            
            // Update member status after creating PT membership
            db.updateMemberStatus(membership.member_id);
            
            return { success: true, membership: result, type: 'pt' };
        } catch (error) {
            return { success: false, error: error.message, type: 'pt' };
        } finally {
            await db.close();
        }
    },

    updatePT: async ({ request }) => {
        const data = await request.formData();
        const id = parseInt(data.get('id'));
        const db = new Database();
        
        const membership = {
            member_id: parseInt(data.get('member_id')),
            purchase_date: data.get('purchase_date'),
            amount_paid: parseFloat(data.get('amount_paid')),
            sessions_total: parseInt(data.get('sessions_total')),
            sessions_remaining: parseInt(data.get('sessions_remaining'))
        };

        try {
            await db.connect();
            db.updatePTMembership(id, membership);
            
            // Update member status after updating PT membership
            db.updateMemberStatus(membership.member_id);
            
            return { success: true, type: 'pt' };
        } catch (error) {
            return { success: false, error: error.message, type: 'pt' };
        } finally {
            await db.close();
        }
    },

    deletePT: async ({ request }) => {
        const data = await request.formData();
        const id = parseInt(data.get('id'));
        const db = new Database();

        try {
            await db.connect();
            
            // Get membership details before deleting to update member status
            const membership = db.getPTMembershipById(id);
            const memberId = membership?.member_id;
            
            db.deletePTMembership(id);
            
            // Update member status after deleting PT membership
            if (memberId) {
                db.updateMemberStatus(memberId);
            }
            
            return { success: true, type: 'pt' };
        } catch (error) {
            return { success: false, error: error.message, type: 'pt' };
        } finally {
            await db.close();
        }
    },

    getMemberHistory: async ({ request }) => {
        console.log('🔄 getMemberHistory action called');
        
        const data = await request.formData();
        const memberId = parseInt(data.get('member_id'));
        
        console.log('📋 Received member_id:', data.get('member_id'), 'parsed as:', memberId);
        
        if (!memberId || isNaN(memberId)) {
            console.log('❌ Invalid member ID:', memberId);
            return {
                type: 'success',
                data: { success: false, error: 'Invalid member ID' }
            };
        }
        
        const db = new Database();

        try {
            await db.connect();
            const history = await db.getGroupClassMembershipsByMemberId(memberId);
            console.log(`getMemberHistory: Found ${history.length} memberships for member ${memberId}`);
            
            console.log('📤 Returning data:', { success: true, history });
            // Return in the format expected by SvelteKit form actions
            return {
                type: 'success',
                data: { success: true, history }
            };
        } catch (error) {
            console.error('getMemberHistory error:', error);
            return {
                type: 'success', 
                data: { success: false, error: error.message || 'Database connection failed' }
            };
        } finally {
            try {
                await db.close();
            } catch (closeError) {
                console.error('Error closing database:', closeError);
            }
        }
    }
};