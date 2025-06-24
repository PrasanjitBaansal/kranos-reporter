import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = path.join(__dirname, '../../../kranos.db');

class Database {
    constructor() {
        this.db = null;
        this.connecting = false;
    }

    async connect() {
        if (this.db) {
            return this.db;
        }

        if (this.connecting) {
            // Wait for existing connection attempt
            while (this.connecting) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            return this.db;
        }

        this.connecting = true;
        
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                this.connecting = false;
                if (err) {
                    this.db = null;
                    reject(err);
                } else {
                    resolve(this.db);
                }
            });
        });
    }

    async close() {
        if (!this.db) {
            return;
        }

        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    this.db = null;
                    resolve();
                }
            });
        });
    }

    async ensureConnection() {
        if (!this.db) {
            await this.connect();
        }
        return this.db;
    }

    // Members CRUD Operations
    async getMembers(activeOnly = false) {
        await this.ensureConnection();
        
        if (activeOnly) {
            // Get members with active memberships (current date between start_date and end_date)
            const query = `
                SELECT DISTINCT m.*
                FROM members m
                WHERE m.status != 'Deleted'
                AND EXISTS(
                    SELECT 1 FROM group_class_memberships gcm 
                    WHERE gcm.member_id = m.id 
                    AND gcm.status = 'Active'
                    AND DATE('now') BETWEEN gcm.start_date AND gcm.end_date
                )
                ORDER BY m.name`;
            
            return new Promise((resolve, reject) => {
                this.db.all(query, [], (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });
        } else {
            const query = 'SELECT * FROM members WHERE status != \'Deleted\' ORDER BY name';
            
            return new Promise((resolve, reject) => {
                this.db.all(query, [], (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });
        }
    }

    async getMemberById(id) {
        await this.ensureConnection();
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM members WHERE id = ?', [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async getMemberByPhone(phone) {
        await this.ensureConnection();
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM members WHERE phone = ?', [phone], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async hasExistingMemberships(memberId) {
        await this.ensureConnection();
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    (SELECT COUNT(*) FROM group_class_memberships WHERE member_id = ?) +
                    (SELECT COUNT(*) FROM pt_memberships WHERE member_id = ?) as total_memberships
            `;
            
            this.db.get(query, [memberId, memberId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.total_memberships > 0);
                }
            });
        });
    }

    async createMember(member) {
        await this.ensureConnection();
        const { name, phone, email, join_date, status = 'Inactive' } = member;
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO members (name, phone, email, join_date, status) VALUES (?, ?, ?, ?, ?)',
                [name, phone, email, join_date, status],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, ...member });
                    }
                }
            );
        });
    }

    async updateMember(id, member) {
        await this.ensureConnection();
        const { name, phone, email, join_date, status } = member;
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE members SET name = ?, phone = ?, email = ?, join_date = ?, status = ? WHERE id = ?',
                [name, phone, email, join_date, status, id],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ changes: this.changes });
                    }
                }
            );
        });
    }

    async deleteMember(id) {
        await this.ensureConnection();
        // Soft delete: set status to 'Deleted' instead of removing the record
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE members SET status = \'Deleted\' WHERE id = ?', [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // Group Plans CRUD Operations
    async getGroupPlans(activeOnly = false) {
        await this.ensureConnection();
        const query = activeOnly ? 
            'SELECT * FROM group_plans WHERE status = \'Active\' ORDER BY name' :
            'SELECT * FROM group_plans WHERE status != \'Deleted\' ORDER BY name';
        
        return new Promise((resolve, reject) => {
            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getGroupPlanById(id) {
        await this.ensureConnection();
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM group_plans WHERE id = ?', [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async createGroupPlan(plan) {
        await this.ensureConnection();
        const { name, duration_days, default_amount, display_name, status = 'Active' } = plan;
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO group_plans (name, duration_days, default_amount, display_name, status) VALUES (?, ?, ?, ?, ?)',
                [name, duration_days, default_amount, display_name, status],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, ...plan });
                    }
                }
            );
        });
    }

    async updateGroupPlan(id, plan) {
        await this.ensureConnection();
        const { name, duration_days, default_amount, display_name, status } = plan;
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE group_plans SET name = ?, duration_days = ?, default_amount = ?, display_name = ?, status = ? WHERE id = ?',
                [name, duration_days, default_amount, display_name, status, id],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ changes: this.changes });
                    }
                }
            );
        });
    }

    async deleteGroupPlan(id) {
        await this.ensureConnection();
        // Soft delete: set status to 'Deleted' instead of removing the record
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE group_plans SET status = \'Deleted\' WHERE id = ?', [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // Group Class Memberships CRUD Operations
    async getGroupClassMemberships(activeOnly = false) {
        await this.ensureConnection();
        const query = activeOnly ? 
            `SELECT gcm.*, m.name as member_name, m.phone as member_phone, gp.display_name as plan_name
             FROM group_class_memberships gcm
             JOIN members m ON gcm.member_id = m.id
             JOIN group_plans gp ON gcm.plan_id = gp.id
             WHERE gcm.status = 'Active' AND DATE('now') BETWEEN gcm.start_date AND gcm.end_date
             ORDER BY gcm.start_date DESC` :
            `SELECT gcm.*, m.name as member_name, m.phone as member_phone, gp.display_name as plan_name
             FROM group_class_memberships gcm
             JOIN members m ON gcm.member_id = m.id
             JOIN group_plans gp ON gcm.plan_id = gp.id
             WHERE gcm.status != 'Deleted'
             ORDER BY gcm.start_date DESC`;
        
        return new Promise((resolve, reject) => {
            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getGroupClassMembershipById(id) {
        await this.ensureConnection();
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT gcm.*, m.name as member_name, m.phone as member_phone, gp.display_name as plan_name
                 FROM group_class_memberships gcm
                 JOIN members m ON gcm.member_id = m.id
                 JOIN group_plans gp ON gcm.plan_id = gp.id
                 WHERE gcm.id = ?`,
                [id],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    async getGroupClassMembershipsByMemberId(memberId) {
        await this.ensureConnection();
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT gcm.*, gp.display_name as plan_name
                 FROM group_class_memberships gcm
                 JOIN group_plans gp ON gcm.plan_id = gp.id
                 WHERE gcm.member_id = ?
                 ORDER BY gcm.start_date DESC`,
                [memberId],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }

    async createGroupClassMembership(membership) {
        await this.ensureConnection();
        const { member_id, plan_id, start_date, end_date, amount_paid, purchase_date, membership_type, status = 'Active' } = membership;
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO group_class_memberships (member_id, plan_id, start_date, end_date, amount_paid, purchase_date, membership_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [member_id, plan_id, start_date, end_date, amount_paid, purchase_date, membership_type, status],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, ...membership });
                    }
                }
            );
        });
    }

    async updateGroupClassMembership(id, membership) {
        await this.ensureConnection();
        const { member_id, plan_id, start_date, end_date, amount_paid, purchase_date, membership_type, status } = membership;
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE group_class_memberships SET member_id = ?, plan_id = ?, start_date = ?, end_date = ?, amount_paid = ?, purchase_date = ?, membership_type = ?, status = ? WHERE id = ?',
                [member_id, plan_id, start_date, end_date, amount_paid, purchase_date, membership_type, status, id],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ changes: this.changes });
                    }
                }
            );
        });
    }

    async deleteGroupClassMembership(id) {
        await this.ensureConnection();
        // Soft delete: set status to 'Deleted' instead of removing the record
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE group_class_memberships SET status = \'Deleted\' WHERE id = ?', [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // PT Memberships CRUD Operations
    async getPTMemberships() {
        await this.ensureConnection();
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT ptm.*, m.name as member_name, m.phone as member_phone
                 FROM pt_memberships ptm
                 JOIN members m ON ptm.member_id = m.id
                 ORDER BY ptm.purchase_date DESC`,
                [],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }

    async getPTMembershipById(id) {
        await this.ensureConnection();
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT ptm.*, m.name as member_name, m.phone as member_phone
                 FROM pt_memberships ptm
                 JOIN members m ON ptm.member_id = m.id
                 WHERE ptm.id = ?`,
                [id],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    async getPTMembershipsByMemberId(memberId) {
        await this.ensureConnection();
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM pt_memberships WHERE member_id = ? ORDER BY purchase_date DESC',
                [memberId],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }

    async createPTMembership(membership) {
        await this.ensureConnection();
        const { member_id, purchase_date, amount_paid, sessions_total, sessions_remaining } = membership;
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO pt_memberships (member_id, purchase_date, amount_paid, sessions_total, sessions_remaining) VALUES (?, ?, ?, ?, ?)',
                [member_id, purchase_date, amount_paid, sessions_total, sessions_remaining],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, ...membership });
                    }
                }
            );
        });
    }

    async updatePTMembership(id, membership) {
        await this.ensureConnection();
        const { member_id, purchase_date, amount_paid, sessions_total, sessions_remaining } = membership;
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE pt_memberships SET member_id = ?, purchase_date = ?, amount_paid = ?, sessions_total = ?, sessions_remaining = ? WHERE id = ?',
                [member_id, purchase_date, amount_paid, sessions_total, sessions_remaining, id],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ changes: this.changes });
                    }
                }
            );
        });
    }

    async deletePTMembership(id) {
        await this.ensureConnection();
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM pt_memberships WHERE id = ?', [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // Member Status Management
    async updateMemberStatus(memberId) {
        await this.ensureConnection();
        
        return new Promise((resolve, reject) => {
            // Check if member has any active memberships (current date between start_date and end_date)
            const checkQuery = `
                SELECT COUNT(*) as active_count
                FROM group_class_memberships gcm
                WHERE gcm.member_id = ? 
                AND gcm.status = 'Active'
                AND DATE('now') BETWEEN gcm.start_date AND gcm.end_date
            `;
            
            this.db.get(checkQuery, [memberId], (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const newStatus = result.active_count > 0 ? 'Active' : 'Inactive';
                
                // Update member status
                this.db.run(
                    'UPDATE members SET status = ? WHERE id = ? AND status != \'Deleted\'',
                    [newStatus, memberId],
                    function(updateErr) {
                        if (updateErr) {
                            reject(updateErr);
                        } else {
                            resolve({ memberId, status: newStatus, changes: this.changes });
                        }
                    }
                );
            });
        });
    }

    async updateAllMemberStatuses() {
        await this.ensureConnection();
        
        return new Promise((resolve, reject) => {
            // Get all non-deleted members
            this.db.all('SELECT id FROM members WHERE status != \'Deleted\'', [], async (err, members) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                try {
                    const updates = [];
                    for (const member of members) {
                        const result = await this.updateMemberStatus(member.id);
                        updates.push(result);
                    }
                    resolve(updates);
                } catch (updateError) {
                    reject(updateError);
                }
            });
        });
    }

    // Reporting Functions
    async getFinancialReport(startDate, endDate) {
        await this.ensureConnection();
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    'Group Class' as type,
                    COUNT(*) as count,
                    SUM(amount_paid) as total_amount
                FROM group_class_memberships 
                WHERE purchase_date BETWEEN ? AND ?
                UNION ALL
                SELECT 
                    'Personal Training' as type,
                    COUNT(*) as count,
                    SUM(amount_paid) as total_amount
                FROM pt_memberships 
                WHERE purchase_date BETWEEN ? AND ?
            `;
            
            this.db.all(query, [startDate, endDate, startDate, endDate], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getUpcomingRenewals(daysAhead = 30) {
        await this.ensureConnection();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);
        const futureDateStr = futureDate.toISOString().split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];

        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT gcm.*, m.name as member_name, m.phone as member_phone, gp.display_name as plan_name
                 FROM group_class_memberships gcm
                 JOIN members m ON gcm.member_id = m.id
                 JOIN group_plans gp ON gcm.plan_id = gp.id
                 WHERE gcm.end_date BETWEEN ? AND ? AND gcm.status = 'Active'
                 ORDER BY gcm.end_date ASC`,
                [todayStr, futureDateStr],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }
}

export default Database;