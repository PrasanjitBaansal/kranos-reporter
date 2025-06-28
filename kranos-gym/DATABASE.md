# Database Documentation

## Overview

Kranos Gym Management System uses SQLite3 database with 5 core tables implementing a soft-delete pattern for data integrity and business rule automation.

## Database Schema

### 1. members
**Primary Table**: Core member registry

```sql
CREATE TABLE members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    join_date TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'New', 'Deleted'))
);
```

**Constraints**:
- `phone`: Unique across all members (including deleted)
- `status`: Enforced values via CHECK constraint
- `join_date`: ISO date format (YYYY-MM-DD)

**Indexes**: Automatic index on `phone` (UNIQUE constraint)

### 2. group_plans
**Plan Templates**: Group class plan definitions

```sql
CREATE TABLE group_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    default_amount REAL,
    display_name TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Deleted'))
);
```

**Business Rules**:
- `display_name`: Auto-generated as "{name} - {duration_days} days"
- `default_amount`: Optional, used for form pre-population
- `duration_days`: Used for automatic end_date calculation

**Constraints**:
- `display_name`: Unique across active plans
- Plan deletion restricted if referenced by memberships (ON DELETE RESTRICT)

### 3. group_class_memberships
**Core Memberships**: Time-based gym memberships

```sql
CREATE TABLE group_class_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    start_date TEXT,
    end_date TEXT,
    amount_paid REAL,
    purchase_date TEXT,
    membership_type TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Deleted')),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES group_plans(id) ON DELETE RESTRICT,
    UNIQUE (member_id, plan_id, start_date)
);
```

**Foreign Keys**:
- `member_id`: CASCADE delete (removes memberships when member deleted)
- `plan_id`: RESTRICT delete (prevents plan deletion if memberships exist)

**Constraints**:
- `UNIQUE(member_id, plan_id, start_date)`: Prevents duplicate memberships
- `membership_type`: Auto-determined ('New' | 'Renewal')
- `end_date`: Auto-calculated (start_date + plan.duration_days)

### 4. pt_memberships
**Session-Based**: Personal training memberships

```sql
CREATE TABLE pt_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    purchase_date TEXT,
    amount_paid REAL,
    sessions_total INTEGER,
    sessions_remaining INTEGER,
    FOREIGN KEY (member_id) REFERENCES members(id)
);
```

**Business Logic**:
- `sessions_remaining`: Initialized to equal `sessions_total`
- No end dates (session-based validity)
- No status field (always considered active until sessions exhausted)

### 5. app_settings
**Configuration**: Application-wide settings

```sql
CREATE TABLE app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Default Settings**:
```javascript
{
  accent_color: '#f39407',
  theme_mode: 'dark',
  favicon_path: '/favicon.png',
  logo_type: 'emoji',
  logo_value: '🏋️'
}
```

## Business Logic Implementation

### Member Status Management

Member status is automatically calculated based on membership activity:

```javascript
// Status Determination Logic
1. No memberships (GC + PT) = 'New'
2. Has memberships + current date between any GC start/end = 'Active'  
3. Has memberships + no current active GC = 'Inactive'
4. Manually deleted = 'Deleted'
```

**Status Update Triggers**:
- Member creation/update
- Membership creation/update/deletion
- Dashboard load (full status refresh)

**Implementation**:
```sql
-- Active Status Check
SELECT COUNT(*) as active_count
FROM group_class_memberships gcm
WHERE gcm.member_id = ? 
AND gcm.status = 'Active'
AND DATE('now') BETWEEN gcm.start_date AND gcm.end_date
```

### Membership Type Auto-Determination

```javascript
// New vs Renewal Logic
const previousMemberships = await getGroupClassMembershipsByMemberId(member_id);
const membershipType = previousMemberships.length > 0 ? 'Renewal' : 'New';
```

### End Date Calculation

```javascript
// Auto-calculation for Group Class memberships
const plan = await getGroupPlanById(plan_id);
const startDate = new Date(start_date);
const endDate = new Date(startDate);
endDate.setDate(startDate.getDate() + plan.duration_days);
```

## Soft Delete Pattern

All core entities use soft delete to preserve data integrity:

**Implementation**: Set `status = 'Deleted'` instead of removing records

**Benefits**:
- Preserves membership history
- Maintains referential integrity  
- Enables data recovery
- Supports audit trails

**Query Pattern**:
```sql
-- Exclude deleted records
WHERE status != 'Deleted'

-- Include only active records  
WHERE status = 'Active'
```

## Data Migration System

### Excel Import Process

**File Location**: `static/data/`
**Supported Format**: Excel (.xlsx) with separate GC and PT sheets

**Migration Features**:
- Clean slate: Deletes existing data before import
- Date conversion: Excel serial numbers → ISO dates
- Data validation: Comprehensive error checking
- Deduplication: Removes duplicate memberships
- Business logic: Auto-calculates join dates, membership types

**Excel Date Conversion**:
```javascript
function excelDateToString(serial) {
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
    const date = new Date(excelEpoch.getTime() + (serial * 24 * 60 * 60 * 1000));
    return date.toISOString().split('T')[0];
}
```

**Member Join Date Logic**:
```javascript
// Earliest membership date becomes member join_date
SELECT MIN(start_date) as earliest_membership
FROM group_class_memberships 
WHERE member_id = ?
```

## Database Connection Management

### Connection Pattern
```javascript
class Database {
    async connect() {
        // Singleton pattern with connection state management
        // Prevents multiple simultaneous connections
    }

    async ensureConnection() {
        // Lazy connection establishment
        // Reconnects if connection dropped
    }

    async close() {
        // Proper cleanup and connection termination
    }
}
```

### Query Patterns

**Parameterized Queries**: SQL injection prevention
```javascript
db.get('SELECT * FROM members WHERE id = ?', [id])
```

**JOIN Queries**: Related data fetching
```sql
SELECT gcm.*, m.name as member_name, gp.display_name as plan_name
FROM group_class_memberships gcm
JOIN members m ON gcm.member_id = m.id
JOIN group_plans gp ON gcm.plan_id = gp.id
```

**Aggregate Functions**: Business reporting
```sql
SELECT 
    COUNT(*) as count,
    SUM(amount_paid) as total_amount
FROM group_class_memberships 
WHERE purchase_date BETWEEN ? AND ?
```

## Performance Considerations

### Indexes
- Primary keys: Automatic clustered indexes
- Foreign keys: Query optimization for JOINs
- Unique constraints: Fast duplicate checking

### Query Optimization
- Status filtering: Exclude deleted records efficiently
- Date range queries: Indexed date comparisons
- Member lookups: Phone number unique constraint

### Connection Efficiency
- Single connection per request
- Proper connection cleanup
- Prepared statement reuse

## Data Validation

### Input Validation
- Phone numbers: Exactly 10 digits
- Email: Valid format (optional)
- Dates: ISO format (YYYY-MM-DD)
- Amounts: Positive numbers
- Sessions: Positive integers

### Business Rule Validation
- Phone uniqueness (including deleted members)
- Plan duration constraints
- Membership date logic
- File upload limits (settings)

### Constraint Enforcement
- Foreign key constraints
- CHECK constraints for status values
- UNIQUE constraints for business rules
- NOT NULL constraints for required fields

## Backup and Recovery

### Database File
**Location**: `kranos.db` (project root)
**Format**: SQLite3 binary format

### Migration Recovery
```javascript
// Clean slate migration
if (existsSync('kranos.db')) {
    unlinkSync('kranos.db');
}
// Rebuild from Excel data
```

### Data Export
- Financial reports: Excel/CSV export
- Membership data: Complete export capability
- Settings backup: JSON format

## Schema Evolution

### Version Management
- Schema defined in `schema.sql`
- Migration scripts for updates
- Default settings initialization
- Data validation on import

### Adding New Fields
1. Update `schema.sql`
2. Add migration logic
3. Update database class methods
4. Update validation rules
5. Update API documentation

## Query Examples

### Active Members
```sql
SELECT DISTINCT m.*
FROM members m
WHERE m.status != 'Deleted'
AND EXISTS(
    SELECT 1 FROM group_class_memberships gcm 
    WHERE gcm.member_id = m.id 
    AND gcm.status = 'Active'
    AND DATE('now') BETWEEN gcm.start_date AND gcm.end_date
)
```

### Revenue Report
```sql
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
```

### Upcoming Renewals
```sql
SELECT 
    m.name,
    m.phone,
    gcm.end_date,
    gp.display_name as plan_name,
    (julianday(gcm.end_date) - julianday('now')) as days_remaining
FROM group_class_memberships gcm
JOIN members m ON gcm.member_id = m.id
JOIN group_plans gp ON gcm.plan_id = gp.id
WHERE gcm.status = 'Active'
AND julianday(gcm.end_date) - julianday('now') BETWEEN 0 AND ?
ORDER BY days_remaining ASC
```

### Member History
```sql
-- Combined GC and PT membership history
SELECT 'Group Class' as type, gcm.*, gp.display_name as plan_name
FROM group_class_memberships gcm
JOIN group_plans gp ON gcm.plan_id = gp.id
WHERE gcm.member_id = ?
UNION ALL
SELECT 'Personal Training' as type, pt.*, 
       'PT Sessions (' || pt.sessions_total || ')' as plan_name
FROM pt_memberships pt
WHERE pt.member_id = ?
ORDER BY start_date DESC, purchase_date DESC
```