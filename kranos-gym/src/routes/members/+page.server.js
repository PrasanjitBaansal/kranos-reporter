import Database from '../../lib/db/database.js';

export const load = async ({ locals }) => {
    const db = new Database();
    try {
        // Context7-grounded: Use synchronous connection
        db.connect();
        const members = db.getMembers();
        
        // Pass user role for UI permissions
        const userRole = locals.user?.role || 'guest';
        const canManageMembers = userRole === 'admin'; // Only admins can create/edit/delete
        
        return { 
            members,
            userRole,
            canManageMembers
        };
    } catch (error) {
        console.error('Members load error:', error);
        return { 
            members: [],
            userRole: 'guest',
            canManageMembers: false
        };
    } finally {
        // Context7-grounded: Synchronous connection cleanup
        db.close();
    }
};

export const actions = {
    create: async ({ request, locals }) => {
        // Context7-grounded: Check admin permissions for member creation
        if (!locals.user || locals.user.role !== 'admin') {
            return { success: false, error: 'Only administrators can create members.' };
        }
        
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
            // Context7-grounded: Use synchronous connection
            db.connect();
            
            // Check for duplicate phone number including deleted members
            const existingMember = db.getMemberByPhone(member.phone);
            if (existingMember) {
                if (existingMember.status === 'Deleted') {
                    return { success: false, error: 'This phone number belongs to a deleted member and cannot be reused. Please contact admin if you need to restore this member.' };
                } else {
                    return { success: false, error: 'Phone number already exists. Please use a different phone number.' };
                }
            }
            
            const result = db.createMember(member);
            
            // Auto-create user account for the member
            try {
                const bcrypt = await import('bcrypt');
                
                // Use phone number as username
                const username = member.phone;
                
                // Check if user already exists with this phone
                const existingUser = db.getUserByUsername(username);
                if (existingUser) {
                    console.log(`User account already exists for phone ${username}`);
                } else {
                    // Generate temporary password (member123)
                    const tempPassword = 'member123';
                    const passwordHash = await bcrypt.hash(tempPassword, 12);
                    
                    // Create user account
                    const userStmt = db.db.prepare(`
                        INSERT INTO users (
                            username, email, password_hash, salt, role, full_name,
                            is_active, is_verified, created_date, last_password_change,
                            member_id, phone_number
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?)
                    `);
                    
                    const userResult = userStmt.run(
                        username,
                        member.email || `${username}@kranosgym.com`,
                        passwordHash,
                        'salt',
                        'member',
                        member.name,
                        1,
                        1,
                        result.id,
                        member.phone
                    );
                    
                    console.log(`Auto-created user account: username=${username} (phone) for member ${member.name}`);
                    
                    // Log the user creation activity
                    db.logActivity({
                        user_id: locals.user.id,
                        username: locals.user.username,
                        action: 'auto_create_user',
                        resource_type: 'user',
                        resource_id: userResult.lastInsertRowid,
                        details: {
                            member_id: result.id,
                            username: username,
                            member_name: member.name,
                            login_method: 'phone_number'
                        }
                    });
                }
                
            } catch (userError) {
                console.error('Failed to auto-create user account:', userError);
                // Don't fail the member creation if user creation fails
            }
            
            return { success: true, member: result };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            db.close();
        }
    },

    update: async ({ request, locals }) => {
        // Context7-grounded: Check admin permissions for member updates
        if (!locals.user || locals.user.role !== 'admin') {
            return { success: false, error: 'Only administrators can update members.' };
        }
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
            // Context7-grounded: Use synchronous connection
            db.connect();
            
            // OPTIMIZATION: Batch all validation queries to reduce database roundtrips
            const phoneChanged = member.phone !== undefined;
            
            // Context7-grounded: Use synchronous database calls
            const currentMember = db.getMemberById(id);
            const duplicatePhoneCheck = phoneChanged ? db.getMemberByPhone(member.phone) : null;
            const membershipCheck = phoneChanged ? db.hasExistingMemberships(id) : null;
            
            if (!currentMember) {
                return { success: false, error: 'Member not found.' };
            }

            // OPTIMIZATION: Only validate phone if it's actually being changed
            if (phoneChanged && member.phone !== currentMember.phone) {
                // Check membership history constraint
                if (membershipCheck) {
                    return { success: false, error: 'Cannot change phone number for members with existing membership history.' };
                }

                // Check for duplicate phone number (more efficient validation)
                if (duplicatePhoneCheck && duplicatePhoneCheck.id !== id) {
                    if (duplicatePhoneCheck.status === 'Deleted') {
                        return { success: false, error: 'This phone number belongs to a deleted member and cannot be reused.' };
                    } else {
                        return { success: false, error: 'Phone number already exists. Please use a different phone number.' };
                    }
                }
            }

            // Preserve existing status
            member.status = currentMember.status;
            
            // OPTIMIZATION: Update member data
            db.updateMember(id, member);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            db.close();
        }
    },

    delete: async ({ request, locals }) => {
        // Context7-grounded: Check admin permissions for member deletion
        if (!locals.user || locals.user.role !== 'admin') {
            return { success: false, error: 'Only administrators can delete members.' };
        }
        const db = new Database();
        const data = await request.formData();
        const id = parseInt(data.get('id'));

        try {
            // Context7-grounded: Use synchronous connection
            db.connect();
            
            // First, deactivate the user account if exists
            const member = db.getMemberById(id);
            if (member) {
                // Find user account linked to this member
                const userStmt = db.db.prepare('SELECT id FROM users WHERE member_id = ?');
                const user = userStmt.get(id);
                
                if (user) {
                    // Deactivate the user account
                    const updateUserStmt = db.db.prepare('UPDATE users SET is_active = 0 WHERE id = ?');
                    updateUserStmt.run(user.id);
                    console.log(`Deactivated user account for member ID ${id}`);
                }
            }
            
            // Then soft delete the member
            db.deleteMember(id);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            db.close();
        }
    }
};