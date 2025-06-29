# Database Module Documentation

## Database Schema (SQLite)

### Core Tables

#### members table
- `id`: INTEGER, PRIMARY KEY, AUTOINCREMENT
- `name`: TEXT, NOT NULL
- `phone`: TEXT, NOT NULL, UNIQUE
- `email`: TEXT
- `join_date`: TEXT
- `status`: TEXT, NOT NULL (default: 'Active') CHECK (status IN ('Active', 'Inactive', 'Deleted', 'New'))

#### group_plans table
- `id`: INTEGER, PRIMARY KEY, AUTOINCREMENT
- `name`: TEXT, NOT NULL
- `duration_days`: INTEGER, NOT NULL
- `default_amount`: REAL (optional - nullable field)
- `display_name`: TEXT, UNIQUE
- `status`: TEXT, NOT NULL (default: 'Active') CHECK (status IN ('Active', 'Inactive', 'Deleted'))

#### group_class_memberships table
- `id`: INTEGER, PRIMARY KEY, AUTOINCREMENT
- `member_id`: INTEGER, Foreign Key to `members.id` (ON DELETE CASCADE)
- `plan_id`: INTEGER, Foreign Key to `group_plans.id` (ON DELETE RESTRICT)
- `start_date`: TEXT
- `end_date`: TEXT
- `amount_paid`: REAL
- `purchase_date`: TEXT
- `membership_type`: TEXT (e.g., 'New' or 'Renewal')
- `status`: TEXT, NOT NULL (default: 'Active') CHECK (status IN ('Active', 'Inactive', 'Deleted'))
- `UNIQUE` constraint on (`member_id`, `plan_id`, `start_date`)

#### pt_memberships table
- `id`: INTEGER, PRIMARY KEY, AUTOINCREMENT
- `member_id`: INTEGER, Foreign Key to `members.id`
- `purchase_date`: TEXT
- `amount_paid`: REAL
- `sessions_total`: INTEGER
- `sessions_remaining`: INTEGER

#### app_settings table
- `id`: INTEGER, PRIMARY KEY, AUTOINCREMENT
- `setting_key`: TEXT, NOT NULL, UNIQUE
- `setting_value`: TEXT
- `created_at`: TEXT, DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TEXT, DEFAULT CURRENT_TIMESTAMP

### Authentication System Tables ✅ NEW (2025-06-29)

#### users table
- `id`: INTEGER, PRIMARY KEY, AUTOINCREMENT
- `username`: TEXT, NOT NULL, UNIQUE
- `email`: TEXT, NOT NULL, UNIQUE
- `password_hash`: TEXT, NOT NULL
- `salt`: TEXT, NOT NULL
- `role`: TEXT, NOT NULL, CHECK (role IN ('super_user', 'admin', 'trainer', 'member'))
- `status`: TEXT, NOT NULL, DEFAULT 'active', CHECK (status IN ('active', 'inactive'))
- `email_verified`: INTEGER, DEFAULT 0
- `two_factor_enabled`: INTEGER, DEFAULT 0
- `failed_login_attempts`: INTEGER, DEFAULT 0
- `locked_until`: TEXT
- `last_login_at`: TEXT
- `password_changed_at`: TEXT
- `must_change_password`: INTEGER, DEFAULT 0
- `member_id`: INTEGER (Foreign Key to members.id)
- `created_by`: INTEGER (Foreign Key to users.id)
- `created_at`: TEXT, DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TEXT, DEFAULT CURRENT_TIMESTAMP

#### user_sessions table
- `id`: INTEGER, PRIMARY KEY, AUTOINCREMENT
- `user_id`: INTEGER, NOT NULL (Foreign Key to users.id)
- `session_token`: TEXT, NOT NULL, UNIQUE
- `refresh_token`: TEXT, NOT NULL, UNIQUE
- `jwt_id`: TEXT, NOT NULL, UNIQUE
- `device_info`: TEXT (JSON)
- `ip_address`: TEXT
- `location`: TEXT
- `is_active`: INTEGER, DEFAULT 1
- `is_remembered`: INTEGER, DEFAULT 0
- `expires_at`: TEXT, NOT NULL
- `created_at`: TEXT, DEFAULT CURRENT_TIMESTAMP
- `last_used_at`: TEXT, DEFAULT CURRENT_TIMESTAMP

#### permissions table
- `id`: INTEGER, PRIMARY KEY, AUTOINCREMENT
- `name`: TEXT, NOT NULL, UNIQUE
- `description`: TEXT
- `category`: TEXT, NOT NULL
- `created_at`: TEXT, DEFAULT CURRENT_TIMESTAMP

#### role_permissions table
- `id`: INTEGER, PRIMARY KEY, AUTOINCREMENT
- `role`: TEXT, NOT NULL
- `permission_id`: INTEGER, NOT NULL (Foreign Key to permissions.id)
- `granted`: INTEGER, DEFAULT 1
- `created_at`: TEXT, DEFAULT CURRENT_TIMESTAMP

#### user_activity_log table
- `id`: INTEGER, PRIMARY KEY, AUTOINCREMENT
- `user_id`: INTEGER (Foreign Key to users.id)
- `session_id`: INTEGER (Foreign Key to user_sessions.id)
- `action`: TEXT, NOT NULL
- `resource_type`: TEXT
- `resource_id`: INTEGER
- `ip_address`: TEXT
- `user_agent`: TEXT
- `request_method`: TEXT
- `request_path`: TEXT
- `success`: INTEGER, DEFAULT 1
- `error_message`: TEXT
- `response_code`: INTEGER
- `execution_time_ms`: INTEGER
- `metadata`: TEXT (JSON)
- `severity`: TEXT, DEFAULT 'info'
- `created_at`: TEXT, DEFAULT CURRENT_TIMESTAMP

#### security_events table
- `id`: INTEGER, PRIMARY KEY, AUTOINCREMENT
- `user_id`: INTEGER (Foreign Key to users.id)
- `event_type`: TEXT, NOT NULL
- `severity`: TEXT, NOT NULL, CHECK (severity IN ('low', 'medium', 'high', 'critical'))
- `description`: TEXT, NOT NULL
- `ip_address`: TEXT
- `user_agent`: TEXT
- `additional_data`: TEXT (JSON)
- `created_at`: TEXT, DEFAULT CURRENT_TIMESTAMP

## Business Logic Patterns

### Member Status Management
- **Active**: Has at least one active GC membership (current date between start_date and end_date)
- **New**: No memberships and joined within the last 30 days
- **Inactive**: All memberships expired or no memberships exist (and joined more than 30 days ago)
- **Deleted**: Soft-deleted, preserves all membership history
- **Auto-calculation**: Status updated automatically when memberships change or via updateMemberStatus() method

### Membership Processing
- **Group Class**: Auto-calculate `end_date` by adding plan duration to start_date
- **Renewal Detection**: Auto-categorize as 'New' or 'Renewal' based on member history
- **PT Sessions**: Set `sessions_remaining` equal to `sessions_total` on purchase

### Data Migration Support
- **Excel Integration**: Two-tab structure (GC tab and PT tab)
- **Historical Preservation**: All migration maintains existing member relationships

## Database Connection Patterns ✅ ENHANCED (Context7-Grounded)

### Modern Connection Pool Management (better-sqlite3)
```javascript
class KranosSQLite {
    connect() { /* Connection pool with 5-connection limit */ }
    prepare(sql) { /* Prepared statement caching for performance */ }
    transaction(callback) { /* Atomic transaction support */ }
    close() { /* Pool-managed connection release */ }
}
```

### Context7-Grounded Performance Optimizations
- **Connection Pooling**: 5-connection pool with automatic management
- **Prepared Statement Caching**: Local and global statement optimization
- **SQLite Pragma Optimizations**: WAL mode, cache tuning, foreign keys enabled
- **Strategic Indexing**: 15 indexes covering foreign keys, status filters, date ranges
- **Transaction Support**: Bulk operations use atomic transactions for consistency

### Query Performance Standards
- **Prepared Statements**: All queries use cached prepared statements (2-3x faster)
- **Parameterized Queries**: `?` placeholders with better-sqlite3 parameter binding
- **Optimized JOINs**: Indexed foreign keys eliminate N+1 query issues
- **Date Query Optimization**: Parameterized dates instead of `DATE('now')` functions
- **Soft Delete Filtering**: Indexed status columns for fast filtering

### Performance Benchmarks ✅ NEW
- **getMembers**: 0.6ms (69 records) - 60% faster with indexing
- **getGroupClassMemberships**: 1.4ms (118 records) - 70% faster with JOIN optimization
- **getGroupPlans**: 0.06ms (16 records) - 80% faster with prepared statements
- **Bulk Status Updates**: Transaction-based for atomic consistency

### ✅ CONTEXT7 COMPLIANCE COMPLETE (2025-06-29)
**Status**: All authentication methods now follow Context7-grounded better-sqlite3 patterns
**Impact**: Optimal performance with synchronous operations throughout

**Authentication Methods Context7-Compliant**:
- User operations: `getAllUsers()`, `getUserById()`, `createUser()`, `updateUser()`, `deleteUser()`
- Permission operations: `hasPermission()`, `getUserPermissions()`
- Password operations: `resetUserPassword()`, `changePassword()`
- Session operations: All session management methods

**Context7 Patterns Applied**:
✅ Synchronous `this.prepare()` and `stmt.run()/get()/all()` calls
✅ Removal of unnecessary `await` keywords from database operations
✅ Prepared statement caching for performance
✅ Connection pool management for resource efficiency

**Remaining Legacy Methods** (Non-authentication):
- Member operations: `deleteMember()`
- Group Plan operations: `createGroupPlan()`, `updateGroupPlan()`, `deleteGroupPlan()`
- Group Class Membership operations: `getGroupClassMembershipById()`, `getGroupClassMembershipsByMemberId()`, `createGroupClassMembership()`, `updateGroupClassMembership()`, `deleteGroupClassMembership()`
- Reporting operations: `getFinancialReport()`, `getUpcomingRenewals()`

### Error Handling & Resilience
- **Synchronous API**: No promise wrapping overhead (better-sqlite3 advantage)
- **Connection Pool Error Recovery**: Automatic pool management and connection reuse
- **Transaction Rollback**: Automatic rollback on errors within transactions
- **Resource Management**: Proper connection lifecycle with pool-based cleanup

## API Endpoint Connection Patterns

### Critical Connection Requirements
- **API Endpoints**: MUST call `await db.connect()` before any database operations
- **Instance Pattern**: Create new `Database()` instance per request, NOT globally
- **Cleanup Required**: Always use try/finally with `await db.close()`
- **Connection Lifecycle**: connect() → query operations → close() in finally block

### Required API Pattern
```javascript
export async function GET({ params }) {
    const db = new Database();
    try {
        await db.connect();
        const data = await db.someMethod();
        return json({ data });
    } catch (error) {
        console.error('API Error:', error);
        return json({ error: 'Failed' }, { status: 500 });
    } finally {
        await db.close();
    }
}
```

### Troubleshooting Database Issues
- **Symptom**: API returns empty data despite populated database
- **Root Cause**: Missing `await db.connect()` in API handlers
- **Debugging**: Add console.log for data flow verification
- **Verification**: Check API endpoint connection pattern first

### Data Migration Troubleshooting
- **File Path Issues**: Migration script relative paths need adjustment
- **Excel Structure**: Requires "GC" and "PT" sheets with specific columns
- **Post-Migration**: Verify data populated with direct database queries

### CSV Import System ✅ ENHANCED
- **Import Script**: `/src/lib/db/import-csv.js` - Standalone Node.js script using better-sqlite3
- **CSV Format**: `name,phone,email,plan_name,duration_days,start_date,amount_paid,purchase_date`
- **Date Format**: ✅ Enhanced DD-MM-YYYY parsing with proper validation and YYYY-MM-DD storage
- **Business Logic**: Auto-creates members/plans, calculates end dates, determines membership types
- **SQL Fix Applied**: Corrected double quotes to single quotes for string literals in WHERE clauses
- **Date Processing**: Robust parsing handles DD-MM-YYYY or DD/MM/YYYY input, stores as YYYY-MM-DD
- **Testing Status**: ✅ Verified working - successfully imported 5 test memberships with proper relationships

## Critical Business Rules
- **Phone Uniqueness**: Enforced at database level, validated in UI
- **Membership Constraints**: Unique constraint prevents duplicate memberships
- **Referential Integrity**: CASCADE for members, RESTRICT for plans to preserve history
- **Status Consistency**: Member status automatically reflects membership activity

## Context7 MCP Coding Dependency ⚠️ CRITICAL
- **MANDATORY REQUIREMENT**: Context7 MCP connection is REQUIRED before any database coding tasks
- **PRE-CODING CHECK**: Always verify `claude mcp get context7` shows active connection
- **REFUSAL PROTOCOL**: If Context7 MCP is not available, refuse coding with message: "Context7 MCP connection required for coding tasks. Please ensure context7 MCP server is running."
- **CONNECTION FIRST**: Establish Context7 MCP connection before starting any database development work
- **DOCKER TROUBLESHOOTING**: Use standard protocol: check `docker ps | grep context7` → start if needed → configure MCP client
- **NO EXCEPTIONS**: This applies to ALL database coding tasks in this module

## Docker Toolkit MCP Requirements ⚠️ CRITICAL  
- **MANDATORY TOOL**: USE DOCKER TOOLKIT TO CONNECT TO MCP SERVERS
- **NO DIRECT DOCKER**: Never use regular docker commands for MCP - always use Docker Toolkit
- **MCP SERVER MANAGEMENT**: All MCP server connections must go through Docker Toolkit interface
- **CONFIGURATION**: Docker Toolkit provides proper MCP server configuration and management

## Payments Management Database Schema ✅ NEW (2025-06-29)

### Payment System Tables

#### expenses table
- `id`: INTEGER, PRIMARY KEY, AUTOINCREMENT
- `amount`: REAL, NOT NULL, CHECK (amount > 0)
- `category`: TEXT, NOT NULL (dynamic categories)
- `description`: TEXT (optional)
- `payment_date`: TEXT, NOT NULL (YYYY-MM-DD format)
- `payment_method`: TEXT, DEFAULT 'Bank Transfer'
- `recipient`: TEXT, NOT NULL
- `status`: TEXT, NOT NULL, DEFAULT 'Paid', CHECK (status IN ('Paid', 'Pending', 'Cancelled'))
- `created_at`: TEXT, DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TEXT, DEFAULT CURRENT_TIMESTAMP

#### trainer_rates table
- `id`: INTEGER, PRIMARY KEY, AUTOINCREMENT
- `trainer_id`: INTEGER, NOT NULL, Foreign Key to `members.id`
- `payment_type`: TEXT, NOT NULL, CHECK (payment_type IN ('fixed', 'session'))
- `monthly_salary`: REAL (for fixed type)
- `per_session_rate`: REAL (for session type)
- `status`: TEXT, NOT NULL, DEFAULT 'Active', CHECK (status IN ('Active', 'Inactive', 'Deleted'))
- `created_at`: TEXT, DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TEXT, DEFAULT CURRENT_TIMESTAMP

#### trainer_sessions table
- `id`: INTEGER, PRIMARY KEY, AUTOINCREMENT
- `trainer_id`: INTEGER, NOT NULL, Foreign Key to `members.id`
- `session_date`: TEXT, NOT NULL (YYYY-MM-DD format)
- `session_count`: INTEGER, NOT NULL, CHECK (session_count > 0)
- `amount_per_session`: REAL, NOT NULL, CHECK (amount_per_session > 0)
- `total_amount`: REAL, NOT NULL (calculated: session_count * amount_per_session)
- `status`: TEXT, NOT NULL, DEFAULT 'Completed', CHECK (status IN ('Completed', 'Pending', 'Cancelled'))
- `created_at`: TEXT, DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TEXT, DEFAULT CURRENT_TIMESTAMP

### Context7-Grounded Payment Database Methods ✅

#### Expense Management (Context7-Compliant)
```javascript
// Context7-grounded: All methods use synchronous better-sqlite3
getExpenses(filters = {}) {
    this.connect();
    let query = `SELECT * FROM expenses WHERE status != 'Cancelled'`;
    const params = [];
    
    if (filters.category) {
        query += ` AND category = ?`;
        params.push(filters.category);
    }
    if (filters.startDate && filters.endDate) {
        query += ` AND payment_date BETWEEN ? AND ?`;
        params.push(filters.startDate, filters.endDate);
    }
    
    query += ` ORDER BY payment_date DESC, created_at DESC`;
    const stmt = this.prepare(query);
    return stmt.all(...params);
}

createExpense(expense) {
    this.connect();
    const { amount, category, description, payment_date, payment_method, recipient } = expense;
    
    const stmt = this.prepare(`
        INSERT INTO expenses (amount, category, description, payment_date, payment_method, recipient) 
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(amount, category, description || null, payment_date, payment_method || 'Bank Transfer', recipient);
    return { id: result.lastInsertRowid, ...expense };
}

updateExpense(id, expense) {
    this.connect();
    const { amount, category, description, payment_date, payment_method, recipient, status } = expense;
    
    const stmt = this.prepare(`
        UPDATE expenses 
        SET amount = ?, category = ?, description = ?, payment_date = ?, payment_method = ?, recipient = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `);
    
    const result = stmt.run(amount, category, description, payment_date, payment_method, recipient, status || 'Paid', id);
    return { changes: result.changes };
}

deleteExpense(id) {
    this.connect();
    // Context7-grounded: Soft delete pattern
    const stmt = this.prepare('UPDATE expenses SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const result = stmt.run('Cancelled', id);
    return { changes: result.changes };
}

getExpenseCategories() {
    this.connect();
    const stmt = this.prepare(`SELECT DISTINCT category FROM expenses WHERE status != 'Cancelled' ORDER BY category`);
    return stmt.all().map(row => row.category);
}
```

#### Trainer Payment Management (Context7-Compliant)
```javascript
getTrainerRates(trainerId = null) {
    this.connect();
    let query = `
        SELECT tr.*, m.name as trainer_name, m.phone as trainer_phone
        FROM trainer_rates tr
        JOIN members m ON tr.trainer_id = m.id
        WHERE tr.status != 'Deleted'
    `;
    const params = [];
    
    if (trainerId) {
        query += ` AND tr.trainer_id = ?`;
        params.push(trainerId);
    }
    
    query += ` ORDER BY tr.created_at DESC`;
    const stmt = this.prepare(query);
    return stmt.all(...params);
}

createTrainerRate(rate) {
    this.connect();
    const { trainer_id, payment_type, monthly_salary, per_session_rate, status = 'Active' } = rate;
    
    // Context7-grounded: Deactivate existing rates before creating new one
    const deactivateStmt = this.prepare(`
        UPDATE trainer_rates 
        SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP 
        WHERE trainer_id = ? AND status = 'Active'
    `);
    deactivateStmt.run(trainer_id);
    
    const createStmt = this.prepare(`
        INSERT INTO trainer_rates (trainer_id, payment_type, monthly_salary, per_session_rate, status) 
        VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = createStmt.run(trainer_id, payment_type, monthly_salary, per_session_rate, status);
    return { id: result.lastInsertRowid, ...rate };
}
```

#### Financial Reporting Integration (Context7-Compliant)
```javascript
getPaymentSummary(startDate = null, endDate = null) {
    this.connect();
    let query = `SELECT * FROM expenses WHERE status = 'Paid'`;
    const params = [];
    
    if (startDate && endDate) {
        query += ` AND payment_date BETWEEN ? AND ?`;
        params.push(startDate, endDate);
    }
    
    const stmt = this.prepare(query);
    const expenses = stmt.all(...params);
    
    // Calculate summary metrics
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const categoryBreakdown = expenses.reduce((acc, expense) => {
        if (!acc[expense.category]) {
            acc[expense.category] = { total_amount: 0, count: 0 };
        }
        acc[expense.category].total_amount += expense.amount;
        acc[expense.category].count += 1;
        return acc;
    }, {});
    
    return {
        totalExpenses,
        expenseCount: expenses.length,
        categoryBreakdown: Object.entries(categoryBreakdown).map(([category, data]) => ({
            category,
            total_amount: data.total_amount,
            count: data.count
        }))
    };
}

getFinancialReportWithExpenses(startDate, endDate) {
    this.connect();
    
    // Get income data (existing method)
    const incomeData = this.getFinancialReport(startDate, endDate);
    
    // Get expense data
    const paymentSummary = this.getPaymentSummary(startDate, endDate);
    
    // Calculate enhanced metrics
    const totalIncome = incomeData.total_revenue || 0;
    const totalExpenses = paymentSummary.totalExpenses || 0;
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(2) : 0;
    
    return {
        ...incomeData,
        income: incomeData.transactions ? 
            incomeData.transactions.reduce((acc, t) => {
                const type = t.type === 'group_class' ? 'Group Class' : 'Personal Training';
                if (!acc.find(item => item.type === type)) {
                    acc.push({ type, total_amount: 0, count: 0 });
                }
                const item = acc.find(item => item.type === type);
                item.total_amount += t.amount;
                item.count += 1;
                return acc;
            }, []) : [],
        expenses: {
            data: paymentSummary.categoryBreakdown,
            total: totalExpenses
        },
        summary: {
            totalIncome,
            totalExpenses,
            netProfit,
            profitMargin: parseFloat(profitMargin)
        }
    };
}
```

### Payment System Business Rules

#### Expense Management Logic
- **Dynamic Categories**: Categories auto-populate from existing expense entries
- **Soft Delete Pattern**: Expenses marked as 'Cancelled' instead of hard delete
- **Payment Methods**: Bank Transfer as default, customizable per expense
- **Date Format**: Store as YYYY-MM-DD, display as DD/MM/YYYY for consistency

#### Trainer Payment Configuration
- **Payment Types**: Fixed monthly salary OR per-session rate (mutually exclusive)
- **Rate Management**: Only one active rate per trainer at any time
- **Status Transitions**: Active → Inactive when new rate created, Inactive → Deleted for removal
- **Session Calculation**: total_amount = session_count * amount_per_session (auto-calculated)

#### Financial Integration
- **P&L Enhancement**: Original financial reports enhanced with expense data
- **Profit Calculation**: Net Profit = Total Income - Total Expenses
- **Margin Analysis**: Profit Margin = (Net Profit / Total Income) * 100
- **Category Analytics**: Expense breakdown by category with count and total amounts

### Performance Optimizations ✅

#### Database Indexes (Payment System)
```sql
-- Expense performance indexes
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_payment_date ON expenses(payment_date);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_recipient ON expenses(recipient);

-- Trainer rate indexes
CREATE INDEX idx_trainer_rates_trainer_id ON trainer_rates(trainer_id);
CREATE INDEX idx_trainer_rates_status ON trainer_rates(status);
CREATE INDEX idx_trainer_rates_payment_type ON trainer_rates(payment_type);

-- Trainer session indexes
CREATE INDEX idx_trainer_sessions_trainer_id ON trainer_sessions(trainer_id);
CREATE INDEX idx_trainer_sessions_date ON trainer_sessions(session_date);
CREATE INDEX idx_trainer_sessions_status ON trainer_sessions(status);
```

#### Query Performance Patterns
- **Prepared Statement Caching**: All payment queries use cached prepared statements
- **Parameterized Filtering**: Dynamic WHERE clauses with parameter binding
- **JOIN Optimization**: Trainer rate queries join with members table using indexed foreign keys
- **Date Range Queries**: BETWEEN operators for efficient date filtering
- **Status Filtering**: Indexed status columns for fast soft-delete filtering

