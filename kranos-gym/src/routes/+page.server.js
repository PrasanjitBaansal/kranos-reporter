import Database from '../lib/db/database.js';

export const load = async () => {
    const db = new Database();
    try {
        await db.connect();
        
        // Update all member statuses to ensure they are current
        await db.updateAllMemberStatuses();
        
        // Run queries sequentially to avoid connection issues
        const members = await db.getMembers();
        const groupPlans = await db.getGroupPlans(true);
        const groupClassMemberships = await db.getGroupClassMemberships(true);
        const ptMemberships = await db.getPTMemberships();

        return {
            members,
            groupPlans,
            groupClassMemberships,
            ptMemberships
        };
    } catch (error) {
        console.error('Database load error:', error);
        return {
            members: [],
            groupPlans: [],
            groupClassMemberships: [],
            ptMemberships: []
        };
    } finally {
        try {
            await db.close();
        } catch (closeError) {
            console.error('Error closing database:', closeError);
        }
    }
};

export const actions = {
    // Member actions
    createMember: async ({ request }) => {
        const db = new Database();
        const data = await request.formData();
        const member = {
            name: data.get('name'),
            phone: data.get('phone'),
            email: data.get('email') || null,
            join_date: data.get('join_date') || new Date().toISOString().split('T')[0],
            status: data.get('status') || 'New'
        };

        try {
            await db.connect();
            const result = await db.createMember(member);
            
            // Update member status after creation based on any existing memberships
            await db.updateMemberStatus(result.id);
            
            return { success: true, member: result };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            await db.close();
        }
    },

    updateMember: async ({ request }) => {
        const db = new Database();
        const data = await request.formData();
        const id = data.get('id');
        const member = {
            name: data.get('name'),
            phone: data.get('phone'),
            email: data.get('email') || null,
            join_date: data.get('join_date'),
            status: data.get('status') || 'New'
        };

        try {
            await db.connect();
            await db.updateMember(id, member);
            
            // Update member status after edit based on their memberships
            await db.updateMemberStatus(id);
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            await db.close();
        }
    },

    deleteMember: async ({ request }) => {
        const db = new Database();
        const data = await request.formData();
        const id = data.get('id');

        try {
            await db.connect();
            await db.deleteMember(id);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            await db.close();
        }
    },

    // Group Plan actions
    createGroupPlan: async ({ request }) => {
        const db = new Database();
        const data = await request.formData();
        const plan = {
            name: data.get('name'),
            duration_days: parseInt(data.get('duration_days')),
            default_amount: parseFloat(data.get('default_amount')),
            display_name: data.get('display_name'),
            status: data.get('status') || 'Active'
        };

        try {
            await db.connect();
            const result = await db.createGroupPlan(plan);
            return { success: true, plan: result };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            await db.close();
        }
    },

    updateGroupPlan: async ({ request }) => {
        const db = new Database();
        const data = await request.formData();
        const id = data.get('id');
        const plan = {
            name: data.get('name'),
            duration_days: parseInt(data.get('duration_days')),
            default_amount: parseFloat(data.get('default_amount')),
            display_name: data.get('display_name'),
            status: data.get('status') || 'Active'
        };

        try {
            await db.connect();
            await db.updateGroupPlan(id, plan);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            await db.close();
        }
    },

    deleteGroupPlan: async ({ request }) => {
        const db = new Database();
        const data = await request.formData();
        const id = data.get('id');

        try {
            await db.connect();
            await db.deleteGroupPlan(id);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            await db.close();
        }
    },

    // Group Class Membership actions
    createGroupClassMembership: async ({ request }) => {
        const db = new Database();
        const data = await request.formData();
        const membership = {
            member_id: parseInt(data.get('member_id')),
            plan_id: parseInt(data.get('plan_id')),
            start_date: data.get('start_date'),
            end_date: data.get('end_date'),
            amount_paid: parseFloat(data.get('amount_paid')),
            purchase_date: data.get('purchase_date') || new Date().toISOString().split('T')[0],
            membership_type: data.get('membership_type') || 'New',
            status: data.get('status') || 'Active'
        };

        try {
            await db.connect();
            const result = await db.createGroupClassMembership(membership);
            return { success: true, membership: result };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            await db.close();
        }
    },

    updateGroupClassMembership: async ({ request }) => {
        const db = new Database();
        const data = await request.formData();
        const id = data.get('id');
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

        try {
            await db.connect();
            await db.updateGroupClassMembership(id, membership);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            await db.close();
        }
    },

    deleteGroupClassMembership: async ({ request }) => {
        const db = new Database();
        const data = await request.formData();
        const id = data.get('id');

        try {
            await db.connect();
            await db.deleteGroupClassMembership(id);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            await db.close();
        }
    },

    // PT Membership actions
    createPTMembership: async ({ request }) => {
        const db = new Database();
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
            return { success: true, membership: result };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            await db.close();
        }
    },

    updatePTMembership: async ({ request }) => {
        const db = new Database();
        const data = await request.formData();
        const id = data.get('id');
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
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            await db.close();
        }
    },

    deletePTMembership: async ({ request }) => {
        const db = new Database();
        const data = await request.formData();
        const id = data.get('id');

        try {
            await db.connect();
            await db.deletePTMembership(id);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            await db.close();
        }
    }
};