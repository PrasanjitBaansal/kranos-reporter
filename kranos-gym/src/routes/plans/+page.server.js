import Database from '../../lib/db/database.js';

const db = new Database();

export const load = async () => {
    try {
        await db.connect();
        const groupPlans = await db.getGroupPlans();
        return { groupPlans };
    } catch (error) {
        console.error('Group plans load error:', error);
        return { groupPlans: [] };
    } finally {
        await db.close();
    }
};

export const actions = {
    create: async ({ request }) => {
        const data = await request.formData();
        const plan = {
            name: data.get('name'),
            duration_days: parseInt(data.get('duration_days')),
            default_amount: parseFloat(data.get('default_amount')),
            display_name: data.get('display_name') || `${data.get('name')} - ${data.get('duration_days')} days`,
            is_active: data.get('is_active') !== 'false'
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

    update: async ({ request }) => {
        const data = await request.formData();
        const id = parseInt(data.get('id'));
        const plan = {
            name: data.get('name'),
            duration_days: parseInt(data.get('duration_days')),
            default_amount: parseFloat(data.get('default_amount')),
            display_name: data.get('display_name'),
            is_active: data.get('is_active') !== 'false'
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

    delete: async ({ request }) => {
        const data = await request.formData();
        const id = parseInt(data.get('id'));

        try {
            await db.connect();
            await db.deleteGroupPlan(id);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            await db.close();
        }
    }
};