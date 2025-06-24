import Database from '../../lib/db/database.js';

export const load = async () => {
    const db = new Database();
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
        const db = new Database();
        const data = await request.formData();
        const defaultAmount = data.get('default_amount');
        const plan = {
            name: data.get('name'),
            duration_days: parseInt(data.get('duration_days')),
            default_amount: defaultAmount && defaultAmount.trim() !== '' ? parseFloat(defaultAmount) : null,
            display_name: data.get('display_name') || `${data.get('name')} - ${data.get('duration_days')} days`,
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

    update: async ({ request }) => {
        const db = new Database();
        const data = await request.formData();
        const id = parseInt(data.get('id'));
        const defaultAmount = data.get('default_amount');
        const plan = {
            name: data.get('name'),
            duration_days: parseInt(data.get('duration_days')),
            default_amount: defaultAmount && defaultAmount.trim() !== '' ? parseFloat(defaultAmount) : null,
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
    }
};