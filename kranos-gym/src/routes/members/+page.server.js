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
            status: 'New' // New members start with 'New' status
        };

        try {
            await db.connect();
            
            // Check for duplicate phone number including deleted members
            const existingMember = await db.getMemberByPhone(member.phone);
            if (existingMember) {
                if (existingMember.status === 'Deleted') {
                    return { success: false, error: 'This phone number belongs to a deleted member and cannot be reused. Please contact admin if you need to restore this member.' };
                } else {
                    return { success: false, error: 'Phone number already exists. Please use a different phone number.' };
                }
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
            join_date: data.get('join_date')
            // Status is preserved from existing member
        };

        try {
            await db.connect();
            
            // Get current member data first
            const currentMember = await db.getMemberById(id);
            if (!currentMember) {
                return { success: false, error: 'Member not found.' };
            }

            // Check if phone number is being changed
            if (member.phone !== currentMember.phone) {
                // Check if member has existing memberships - if so, don't allow phone change
                const hasExistingMemberships = await db.hasExistingMemberships(id);
                if (hasExistingMemberships) {
                    return { success: false, error: 'Cannot change phone number for members with existing membership history.' };
                }

                // Check for duplicate phone number (excluding current member)
                const existingMember = await db.getMemberByPhone(member.phone);
                if (existingMember && existingMember.id !== id) {
                    if (existingMember.status === 'Deleted') {
                        return { success: false, error: 'This phone number belongs to a deleted member and cannot be reused.' };
                    } else {
                        return { success: false, error: 'Phone number already exists. Please use a different phone number.' };
                    }
                }
            }

            // Preserve existing status
            member.status = currentMember.status;
            
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