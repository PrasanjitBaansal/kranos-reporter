import Database from '../../lib/db/database.js';

export const load = async () => {
    const db = new Database();
    try {
        await db.connect();
        const members = await db.getMembers();
        return { members };
    } catch (error) {
        console.error('Members load error:', error);
        return { members: [] };
    } finally {
        await db.close();
    }
};

export const actions = {
    create: async ({ request }) => {
        const db = new Database();
        const data = await request.formData();
        const member = {
            name: data.get('name'),
            phone: data.get('phone'),
            email: data.get('email') || null,
            join_date: data.get('join_date') || new Date().toISOString().split('T')[0],
            status: data.get('status') || 'Inactive'
        };

        try {
            await db.connect();
            
            // Check for duplicate phone number
            const existingMember = await db.getMemberByPhone(member.phone);
            if (existingMember) {
                return { success: false, error: 'Phone number already exists. Please use a different phone number.' };
            }
            
            const result = await db.createMember(member);
            return { success: true, member: result };
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
        const member = {
            name: data.get('name'),
            phone: data.get('phone'),
            email: data.get('email') || null,
            join_date: data.get('join_date'),
            status: data.get('status') || 'Inactive'
        };

        try {
            await db.connect();
            
            // Check for duplicate phone number (excluding current member)
            const existingMember = await db.getMemberByPhone(member.phone);
            if (existingMember && existingMember.id !== id) {
                return { success: false, error: 'Phone number already exists. Please use a different phone number.' };
            }
            
            await db.updateMember(id, member);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            await db.close();
        }
    },

    delete: async ({ request }) => {
        const db = new Database();
        const data = await request.formData();
        const id = parseInt(data.get('id'));

        try {
            await db.connect();
            await db.deleteMember(id);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            await db.close();
        }
    }
};