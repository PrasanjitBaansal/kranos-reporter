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

## Database Connection Patterns

### Singleton Connection Management
```javascript
class Database {
    async connect() { /* lazy connection with race condition protection */ }
    async ensureConnection() { /* guaranteed connection availability */ }
    async close() { /* proper cleanup with error handling */ }
}
```

### Query Standards
- **Parameterized Queries**: Always use `?` placeholders to prevent SQL injection
- **Soft Delete Filtering**: Standard `WHERE status != 'Deleted'` in all queries
- **JOIN Patterns**: Descriptive aliases for readable complex queries

### Error Handling
- **Promise-based**: All database operations return promises
- **Consistent Error Format**: Technical errors logged, user-friendly messages returned
- **Connection Resilience**: Automatic reconnection on connection failures

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

### CSV Import System ✅
- **Import Script**: `/src/lib/db/import-csv.js` - Standalone Node.js script using better-sqlite3
- **CSV Format**: `name,phone,email,plan_name,duration_days,start_date,amount_paid,purchase_date`
- **Business Logic**: Auto-creates members/plans, calculates end dates, determines membership types
- **SQL Fix Applied**: Corrected double quotes to single quotes for string literals in WHERE clauses
- **Testing Status**: ✅ Verified working - successfully imported 5 test memberships with proper relationships

## Critical Business Rules
- **Phone Uniqueness**: Enforced at database level, validated in UI
- **Membership Constraints**: Unique constraint prevents duplicate memberships
- **Referential Integrity**: CASCADE for members, RESTRICT for plans to preserve history
- **Status Consistency**: Member status automatically reflects membership activity