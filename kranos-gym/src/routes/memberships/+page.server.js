import Database from '../../lib/db/database.js';

const db = new Database();

export const load = async () => {
    try {
        await db.connect();
        
        const [members, groupPlans, groupClassMemberships, ptMemberships] = await Promise.all([
            db.getMembers(true),
            db.getGroupPlans(true),
            db.getGroupClassMemberships(),
            db.getPTMemberships()
        ]);

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
                is_active: true
            };

            const result = await db.createGroupClassMembership(membership);
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
                is_active: data.get('is_active') !== 'false'
            };

            await db.updateGroupClassMembership(id, membership);
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

        try {
            await db.connect();
            await db.deleteGroupClassMembership(id);
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
        
        const membership = {
            member_id: parseInt(data.get('member_id')),
            purchase_date: data.get('purchase_date') || new Date().toISOString().split('T')[0],
            amount_paid: parseFloat(data.get('amount_paid')),
            sessions_total: sessions_total,
            sessions_remaining: sessions_total
        };

        try {
            await db.connect();
            const result = await db.createPTMembership(membership);
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
        
        const membership = {
            member_id: parseInt(data.get('member_id')),
            purchase_date: data.get('purchase_date'),
            amount_paid: parseFloat(data.get('amount_paid')),
            sessions_total: parseInt(data.get('sessions_total')),
            sessions_remaining: parseInt(data.get('sessions_remaining'))
        };

        try {
            await db.connect();
            await db.updatePTMembership(id, membership);
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

        try {
            await db.connect();
            await db.deletePTMembership(id);
            return { success: true, type: 'pt' };
        } catch (error) {
            return { success: false, error: error.message, type: 'pt' };
        } finally {
            await db.close();
        }
    }
};