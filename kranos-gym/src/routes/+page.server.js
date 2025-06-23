import Database from '../lib/db/database.js';

const db = new Database();

export const load = async () => {
    try {
        await db.connect();
        
        const [members, groupPlans, groupClassMemberships, ptMemberships] = await Promise.all([
            db.getMembers(true),
            db.getGroupPlans(true), 
            db.getGroupClassMemberships(true),
            db.getPTMemberships()
        ]);

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
        await db.close();
    }
};

export const actions = {
    // Member actions
    createMember: async ({ request }) => {
        const data = await request.formData();
        const member = {
            name: data.get('name'),
            phone: data.get('phone'),
            email: data.get('email') || null,
            join_date: data.get('join_date') || new Date().toISOString().split('T')[0],
            is_active: data.get('is_active') === 'true'
        };

        try {
            await db.connect();
            const result = await db.createMember(member);
            return { success: true, member: result };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            await db.close();
        }
    },

    updateMember: async ({ request }) => {
        const data = await request.formData();
        const id = data.get('id');
        const member = {
            name: data.get('name'),
            phone: data.get('phone'),
            email: data.get('email') || null,
            join_date: data.get('join_date'),
            is_active: data.get('is_active') === 'true'
        };

        try {
            await db.connect();
            await db.updateMember(id, member);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            await db.close();
        }
    },

    deleteMember: async ({ request }) => {
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
        const data = await request.formData();
        const plan = {
            name: data.get('name'),
            duration_days: parseInt(data.get('duration_days')),
            default_amount: parseFloat(data.get('default_amount')),
            display_name: data.get('display_name'),
            is_active: data.get('is_active') === 'true'
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
        const data = await request.formData();
        const id = data.get('id');
        const plan = {
            name: data.get('name'),
            duration_days: parseInt(data.get('duration_days')),
            default_amount: parseFloat(data.get('default_amount')),
            display_name: data.get('display_name'),
            is_active: data.get('is_active') === 'true'
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
        const data = await request.formData();
        const membership = {
            member_id: parseInt(data.get('member_id')),
            plan_id: parseInt(data.get('plan_id')),
            start_date: data.get('start_date'),
            end_date: data.get('end_date'),
            amount_paid: parseFloat(data.get('amount_paid')),
            purchase_date: data.get('purchase_date') || new Date().toISOString().split('T')[0],
            membership_type: data.get('membership_type') || 'New',
            is_active: data.get('is_active') === 'true'
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
            is_active: data.get('is_active') === 'true'
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