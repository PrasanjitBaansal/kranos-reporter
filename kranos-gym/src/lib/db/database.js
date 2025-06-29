import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = path.join(__dirname, '../../../kranos.db');

// Context7-grounded: Connection pool for better performance
class DatabasePool {
    constructor() {
        this.connections = [];
        this.available = [];
        this.maxConnections = 5;
        this.prepared = new Map(); // Prepared statement cache
    }

    getConnection() {
        if (this.available.length > 0) {
            return this.available.pop();
        }
        
        if (this.connections.length < this.maxConnections) {
            const db = new Database(DB_PATH);
            // Context7-grounded: Optimize SQLite settings
            db.pragma('journal_mode = WAL');
            db.pragma('synchronous = NORMAL');
            db.pragma('cache_size = 1000');
            db.pragma('foreign_keys = ON');
            this.connections.push(db);
            return db;
        }
        
        throw new Error('Connection pool exhausted');
    }

    releaseConnection(db) {
        this.available.push(db);
    }

    closeAll() {
        this.connections.forEach(db => db.close());
        this.connections = [];
        this.available = [];
        this.prepared.clear();
    }
}

// Global connection pool instance
const pool = new DatabasePool();

// Context7-grounded: Modern Database class with better-sqlite3
class KranosSQLite {
    constructor() {
        this.db = null;
        this.statements = new Map(); // Local prepared statement cache
    }

    connect() {
        if (!this.db) {
            this.db = pool.getConnection();
        }
        return this.db;
    }

    close() {
        if (this.db) {
            pool.releaseConnection(this.db);
            this.db = null;
            this.statements.clear();
        }
    }

    // Context7-grounded: Prepared statement caching
    prepare(sql) {
        if (!this.statements.has(sql)) {
            this.statements.set(sql, this.db.prepare(sql));
        }
        return this.statements.get(sql);
    }

    // Context7-grounded: Transaction support
    transaction(callback) {
        if (!this.db) this.connect();
        const transaction = this.db.transaction(callback);
        return transaction;
    }

    // Context7-grounded: Members CRUD Operations with prepared statements
    getMembers(activeOnly = false) {
        this.connect();
        
        if (activeOnly) {
            // Get members with active memberships (current date between start_date and end_date)
            const stmt = this.prepare(`
                SELECT DISTINCT m.*
                FROM members m
                WHERE m.status != 'Deleted'
                AND EXISTS(
                    SELECT 1 FROM group_class_memberships gcm 
                    WHERE gcm.member_id = m.id 
                    AND gcm.status = 'Active'
                    AND DATE('now') BETWEEN gcm.start_date AND gcm.end_date
                )
                ORDER BY m.name`);
            
            return stmt.all();
        } else {
            const stmt = this.prepare('SELECT * FROM members WHERE status != ? ORDER BY name');
            return stmt.all('Deleted');
        }
    }

    getMemberById(id) {
        this.connect();
        const stmt = this.prepare('SELECT * FROM members WHERE id = ?');
        return stmt.get(id);
    }

    getMemberByPhone(phone) {
        this.connect();
        const stmt = this.prepare('SELECT * FROM members WHERE phone = ?');
        return stmt.get(phone);
    }

    hasExistingMemberships(memberId) {
        this.connect();
        const stmt = this.prepare(`
            SELECT 
                (SELECT COUNT(*) FROM group_class_memberships WHERE member_id = ?) +
                (SELECT COUNT(*) FROM pt_memberships WHERE member_id = ?) as total_memberships
        `);
        
        const result = stmt.get(memberId, memberId);
        return result.total_memberships > 0;
    }

    createMember(member) {
        this.connect();
        const { name, phone, email, join_date, status = 'New' } = member;
        const stmt = this.prepare('INSERT INTO members (name, phone, email, join_date, status) VALUES (?, ?, ?, ?, ?)');
        
        const result = stmt.run(name, phone, email, join_date, status);
        return { id: result.lastInsertRowid, ...member };
    }

    updateMember(id, member) {
        this.connect();
        const { name, phone, email, join_date, status } = member;
        const stmt = this.prepare('UPDATE members SET name = ?, phone = ?, email = ?, join_date = ?, status = ? WHERE id = ?');
        
        const result = stmt.run(name, phone, email, join_date, status, id);
        return { changes: result.changes };
    }

    deleteMember(id) {
        this.connect();
        // Context7-grounded: Soft delete with prepared statement
        const stmt = this.prepare('UPDATE members SET status = ? WHERE id = ?');
        const result = stmt.run('Deleted', id);
        return { changes: result.changes };
    }

    // Context7-grounded: Group Plans with prepared statements
    getGroupPlans(activeOnly = false) {
        this.connect();
        
        if (activeOnly) {
            const stmt = this.prepare('SELECT * FROM group_plans WHERE status = ? ORDER BY name');
            return stmt.all('Active');
        } else {
            const stmt = this.prepare('SELECT * FROM group_plans WHERE status != ? ORDER BY name');
            return stmt.all('Deleted');
        }
    }

    getGroupPlanById(id) {
        this.connect();
        const stmt = this.prepare('SELECT * FROM group_plans WHERE id = ?');
        return stmt.get(id);
    }

    getGroupPlanByNameAndDuration(name, duration_days) {
        this.connect();
        const stmt = this.prepare('SELECT * FROM group_plans WHERE name = ? AND duration_days = ? AND status != ?');
        return stmt.get(name, duration_days, 'Deleted');
    }

    createGroupPlan(plan) {
        this.connect();
        const { name, duration_days, default_amount, display_name, status = 'Active' } = plan;
        const stmt = this.prepare('INSERT INTO group_plans (name, duration_days, default_amount, display_name, status) VALUES (?, ?, ?, ?, ?)');
        const result = stmt.run(name, duration_days, default_amount, display_name, status);
        return { id: result.lastInsertRowid, ...plan };
    }

    updateGroupPlan(id, plan) {
        this.connect();
        const { name, duration_days, default_amount, display_name, status } = plan;
        const stmt = this.prepare('UPDATE group_plans SET name = ?, duration_days = ?, default_amount = ?, display_name = ?, status = ? WHERE id = ?');
        const result = stmt.run(name, duration_days, default_amount, display_name, status, id);
        return { changes: result.changes };
    }

    deleteGroupPlan(id) {
        this.connect();
        // Context7-grounded: Soft delete with prepared statement
        const stmt = this.prepare('UPDATE group_plans SET status = ? WHERE id = ?');
        const result = stmt.run('Deleted', id);
        return { changes: result.changes };
    }

    // Context7-grounded: Group Class Memberships with optimized queries
    getGroupClassMemberships(activeOnly = false) {
        this.connect();
        
        if (activeOnly) {
            // Context7-grounded: Optimized active membership query with current date parameter
            const stmt = this.prepare(`
                SELECT gcm.*, m.name as member_name, m.phone as member_phone, 
                       gp.display_name as plan_name, gp.name as plan_base_name, gp.duration_days
                FROM group_class_memberships gcm
                JOIN members m ON gcm.member_id = m.id
                JOIN group_plans gp ON gcm.plan_id = gp.id
                WHERE gcm.status = 'Active' AND ? BETWEEN gcm.start_date AND gcm.end_date
                ORDER BY gcm.start_date DESC`);
            
            const today = new Date().toISOString().split('T')[0];
            return stmt.all(today);
        } else {
            const stmt = this.prepare(`
                SELECT gcm.*, m.name as member_name, m.phone as member_phone, 
                       gp.display_name as plan_name, gp.name as plan_base_name, gp.duration_days
                FROM group_class_memberships gcm
                JOIN members m ON gcm.member_id = m.id
                JOIN group_plans gp ON gcm.plan_id = gp.id
                WHERE gcm.status != ?
                ORDER BY gcm.start_date DESC`);
            
            return stmt.all('Deleted');
        }
    }

    getGroupClassMembershipById(id) {
        this.connect();
        const stmt = this.prepare(`
            SELECT gcm.*, m.name as member_name, m.phone as member_phone, gp.display_name as plan_name
            FROM group_class_memberships gcm
            JOIN members m ON gcm.member_id = m.id
            JOIN group_plans gp ON gcm.plan_id = gp.id
            WHERE gcm.id = ?
        `);
        return stmt.get(id);
    }

    getGroupClassMembershipsByMemberId(memberId) {
        this.connect();
        const stmt = this.prepare(`
            SELECT gcm.*, gp.display_name as plan_name, gp.name as plan_base_name, gp.duration_days
            FROM group_class_memberships gcm
            JOIN group_plans gp ON gcm.plan_id = gp.id
            WHERE gcm.member_id = ? AND gcm.status != ?
            ORDER BY gcm.start_date DESC
        `);
        return stmt.all(memberId, 'Deleted');
    }

    createGroupClassMembership(membership) {
        this.connect();
        const { member_id, plan_id, start_date, end_date, amount_paid, purchase_date, membership_type, status = 'Active' } = membership;
        const stmt = this.prepare('INSERT INTO group_class_memberships (member_id, plan_id, start_date, end_date, amount_paid, purchase_date, membership_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        const result = stmt.run(member_id, plan_id, start_date, end_date, amount_paid, purchase_date, membership_type, status);
        return { id: result.lastInsertRowid, ...membership };
    }

    updateGroupClassMembership(id, membership) {
        this.connect();
        const { member_id, plan_id, start_date, end_date, amount_paid, purchase_date, membership_type, status } = membership;
        const stmt = this.prepare('UPDATE group_class_memberships SET member_id = ?, plan_id = ?, start_date = ?, end_date = ?, amount_paid = ?, purchase_date = ?, membership_type = ?, status = ? WHERE id = ?');
        const result = stmt.run(member_id, plan_id, start_date, end_date, amount_paid, purchase_date, membership_type, status, id);
        return { changes: result.changes };
    }

    deleteGroupClassMembership(id) {
        this.connect();
        // Context7-grounded: Soft delete with prepared statement
        const stmt = this.prepare('UPDATE group_class_memberships SET status = ? WHERE id = ?');
        const result = stmt.run('Deleted', id);
        return { changes: result.changes };
    }

    // PT Memberships CRUD Operations
    getPTMemberships() {
        this.connect();
        const stmt = this.prepare(`
            SELECT ptm.*, m.name as member_name, m.phone as member_phone
            FROM pt_memberships ptm
            JOIN members m ON ptm.member_id = m.id
            ORDER BY ptm.purchase_date DESC
        `);
        return stmt.all();
    }

    getPTMembershipById(id) {
        this.connect();
        const stmt = this.prepare(`
            SELECT ptm.*, m.name as member_name, m.phone as member_phone
            FROM pt_memberships ptm
            JOIN members m ON ptm.member_id = m.id
            WHERE ptm.id = ?
        `);
        return stmt.get(id);
    }

    getPTMembershipsByMemberId(memberId) {
        this.connect();
        const stmt = this.prepare(`
            SELECT * FROM pt_memberships 
            WHERE member_id = ? 
            ORDER BY purchase_date DESC
        `);
        return stmt.all(memberId);
    }

    createPTMembership(membership) {
        this.connect();
        const { member_id, purchase_date, amount_paid, sessions_total, sessions_remaining } = membership;
        const stmt = this.prepare(`
            INSERT INTO pt_memberships (member_id, purchase_date, amount_paid, sessions_total, sessions_remaining) 
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(member_id, purchase_date, amount_paid, sessions_total, sessions_remaining);
        return { id: result.lastInsertRowid, ...membership };
    }

    updatePTMembership(id, membership) {
        this.connect();
        const { member_id, purchase_date, amount_paid, sessions_total, sessions_remaining } = membership;
        const stmt = this.prepare(`
            UPDATE pt_memberships 
            SET member_id = ?, purchase_date = ?, amount_paid = ?, sessions_total = ?, sessions_remaining = ? 
            WHERE id = ?
        `);
        const result = stmt.run(member_id, purchase_date, amount_paid, sessions_total, sessions_remaining, id);
        return { changes: result.changes };
    }

    deletePTMembership(id) {
        this.connect();
        const stmt = this.prepare('DELETE FROM pt_memberships WHERE id = ?');
        const result = stmt.run(id);
        return { changes: result.changes };
    }

    // Context7-grounded: Optimized member status management
    updateMemberStatus(memberId) {
        this.connect();
        
        // Context7-grounded: Single optimized query with current date parameter
        const memberQuery = this.prepare(`
            SELECT 
                m.id,
                m.join_date,
                COUNT(gcm.id) as total_memberships,
                COUNT(CASE WHEN gcm.status = 'Active' AND ? BETWEEN gcm.start_date AND gcm.end_date THEN 1 END) as active_memberships,
                JULIANDAY(?) - JULIANDAY(m.join_date) as days_since_join
            FROM members m
            LEFT JOIN group_class_memberships gcm ON m.id = gcm.member_id
            WHERE m.id = ? AND m.status != 'Deleted'
            GROUP BY m.id, m.join_date
        `);
        
        const today = new Date().toISOString().split('T')[0];
        const result = memberQuery.get(today, today, memberId);
        
        if (!result) {
            throw new Error('Member not found');
        }
        
        let newStatus;
        
        // Determine status based on membership activity and join date
        if (result.active_memberships > 0) {
            newStatus = 'Active';
        } else if (result.total_memberships === 0 && result.days_since_join <= 30) {
            newStatus = 'New';
        } else if (result.total_memberships === 0) {
            newStatus = 'Inactive';
        } else {
            newStatus = 'Inactive';
        }
        
        // Update member status
        const updateStmt = this.prepare('UPDATE members SET status = ? WHERE id = ? AND status != ?');
        const updateResult = updateStmt.run(newStatus, memberId, 'Deleted');
        
        return { memberId, status: newStatus, changes: updateResult.changes };
    }

    // Context7-grounded: Bulk status update with transaction for performance
    updateAllMemberStatuses() {
        this.connect();
        
        // Context7-grounded: Use transaction for bulk operations
        const updateAll = this.transaction(() => {
            const getMembersStmt = this.prepare('SELECT id FROM members WHERE status != ?');
            const members = getMembersStmt.all('Deleted');
            
            const updates = [];
            for (const member of members) {
                const result = this.updateMemberStatus(member.id);
                updates.push(result);
            }
            
            return updates;
        });
        
        return updateAll();
    }

    // Context7-grounded: Authentication Methods
    getUserById(id) {
        this.connect();
        const stmt = this.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1');
        return stmt.get(id);
    }

    getUserByUsername(username) {
        this.connect();
        const stmt = this.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1');
        return stmt.get(username);
    }

    getUserByEmail(email) {
        this.connect();
        const stmt = this.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1');
        return stmt.get(email);
    }

    createUser(userData) {
        this.connect();
        const { username, email, password_hash, salt, role = 'member', full_name, member_id = null } = userData;
        const stmt = this.prepare(`
            INSERT INTO users (username, email, password_hash, salt, role, full_name, member_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(username, email, password_hash, salt, role, full_name, member_id);
        return { id: result.lastInsertRowid, ...userData };
    }

    updateUser(id, userData) {
        this.connect();
        const fields = Object.keys(userData).filter(key => key !== 'id');
        const values = fields.map(field => userData[field]);
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        
        const stmt = this.prepare(`UPDATE users SET ${setClause}, updated_at = ? WHERE id = ?`);
        values.push(new Date().toISOString(), id);
        const result = stmt.run(...values);
        return { changes: result.changes };
    }

    // Session Management
    createSession(sessionData) {
        this.connect();
        const { user_id, session_token, refresh_token, device_info, ip_address, user_agent, expires_at } = sessionData;
        const stmt = this.prepare(`
            INSERT INTO user_sessions (user_id, session_token, refresh_token, device_info, ip_address, user_agent, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(user_id, session_token, refresh_token, device_info, ip_address, user_agent, expires_at);
        return { id: result.lastInsertRowid, ...sessionData };
    }

    getSessionByToken(token) {
        this.connect();
        const stmt = this.prepare(`
            SELECT s.*, u.username, u.email, u.role, u.is_active as user_active
            FROM user_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.is_active = 1 AND s.expires_at > ?
        `);
        return stmt.get(token, new Date().toISOString());
    }

    updateSession(id, data) {
        this.connect();
        const fields = Object.keys(data);
        const values = fields.map(field => data[field]);
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        
        const stmt = this.prepare(`UPDATE user_sessions SET ${setClause} WHERE id = ?`);
        values.push(id);
        const result = stmt.run(...values);
        return { changes: result.changes };
    }

    deactivateSession(token) {
        this.connect();
        const stmt = this.prepare('UPDATE user_sessions SET is_active = 0 WHERE session_token = ?');
        const result = stmt.run(token);
        return { changes: result.changes };
    }

    cleanupExpiredSessions() {
        this.connect();
        const stmt = this.prepare('DELETE FROM user_sessions WHERE expires_at < ? OR is_active = 0');
        const result = stmt.run(new Date().toISOString());
        return { deleted: result.changes };
    }

    // Permission Management
    getUserPermissions(userId) {
        this.connect();
        const stmt = this.prepare(`
            SELECT p.name, p.description, p.category
            FROM users u
            JOIN role_permissions rp ON u.role = rp.role
            JOIN permissions p ON rp.permission_id = p.id
            WHERE u.id = ?
            ORDER BY p.category, p.name
        `);
        return stmt.all(userId);
    }

    hasPermission(userId, permissionName) {
        this.connect();
        const stmt = this.prepare(`
            SELECT COUNT(*) as count
            FROM users u
            JOIN role_permissions rp ON u.role = rp.role
            JOIN permissions p ON rp.permission_id = p.id
            WHERE u.id = ? AND p.name = ?
        `);
        const result = stmt.get(userId, permissionName);
        return result.count > 0;
    }

    // Admin Detection Methods for First-Time Setup
    countUsersByRole(role) {
        this.connect();
        const stmt = this.prepare('SELECT COUNT(*) as count FROM users WHERE role = ? AND is_active = 1');
        const result = stmt.get(role);
        return result.count;
    }

    hasAdminUser() {
        return this.countUsersByRole('admin') > 0;
    }

    isFirstTimeSetup() {
        this.connect();
        const stmt = this.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
        const result = stmt.get();
        return result.count === 0;
    }

    getAllUsers(options = {}) {
        this.connect();
        const { includeInactive = false, role = null } = options;
        
        let query = `
            SELECT id, username, email, role, is_active, email_verified, 
                   failed_login_attempts, last_login_at, created_at, updated_at
            FROM users
            WHERE 1=1
        `;
        
        const params = [];
        
        if (!includeInactive) {
            query += ` AND is_active = ?`;
            params.push(1);
        }
        
        if (role) {
            query += ` AND role = ?`;
            params.push(role);
        }
        
        query += ` ORDER BY created_at DESC`;
        
        const stmt = this.prepare(query);
        return stmt.all(...params);
    }

    // Activity Logging
    logActivity(activityData) {
        this.connect();
        const {
            user_id, username, action, resource_type, resource_id,
            ip_address, user_agent, details = null
        } = activityData;

        const stmt = this.prepare(`
            INSERT INTO user_activity_log (
                user_id, username, action, resource_type, resource_id,
                ip_address, user_agent, details
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            user_id, username, action, resource_type, resource_id,
            ip_address, user_agent, details ? JSON.stringify(details) : null
        );
        return { id: result.lastInsertRowid };
    }

    logSecurityEvent(eventData) {
        this.connect();
        const {
            user_id, username, event_type, severity = 'info',
            ip_address, user_agent, details = null
        } = eventData;

        const stmt = this.prepare(`
            INSERT INTO security_events (
                user_id, username, event_type, severity,
                ip_address, user_agent, details
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            user_id, username, event_type, severity,
            ip_address, user_agent, details ? JSON.stringify(details) : null
        );
        return { id: result.lastInsertRowid };
    }

    // Reporting Functions
    getFinancialReport(startDate, endDate) {
        this.connect();
        const stmt = this.prepare(`
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
        `);
        return stmt.all(startDate, endDate, startDate, endDate);
    }

    getUpcomingRenewals(daysAhead = 30) {
        this.connect();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);
        const futureDateStr = futureDate.toISOString().split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];

        const stmt = this.prepare(`
            SELECT gcm.*, m.name as member_name, m.phone as member_phone, gp.display_name as plan_name
            FROM group_class_memberships gcm
            JOIN members m ON gcm.member_id = m.id
            JOIN group_plans gp ON gcm.plan_id = gp.id
            WHERE gcm.end_date BETWEEN ? AND ? AND gcm.status = ?
            ORDER BY gcm.end_date ASC
        `);
        return stmt.all(todayStr, futureDateStr, 'Active');
    }
}

export default KranosSQLite;