# Kranos Gym Management System

## Database Schema (SQLite)

### members table
- `id`: INTEGER, PRIMARY KEY, AUTOINCREMENT
- `name`: TEXT, NOT NULL
- `phone`: TEXT, NOT NULL, UNIQUE
- `email`: TEXT
- `join_date`: TEXT
- `status`: TEXT, NOT NULL (default: 'Active') CHECK (status IN ('Active', 'Inactive', 'Deleted'))

### group_plans table
- `id`: INTEGER, PRIMARY KEY, AUTOINCREMENT
- `name`: TEXT, NOT NULL
- `duration_days`: INTEGER, NOT NULL
- `default_amount`: REAL, NOT NULL
- `display_name`: TEXT, UNIQUE
- `status`: TEXT, NOT NULL (default: 'Active') CHECK (status IN ('Active', 'Inactive', 'Deleted'))

### group_class_memberships table
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

### pt_memberships table
- `id`: INTEGER, PRIMARY KEY, AUTOINCREMENT
- `member_id`: INTEGER, Foreign Key to `members.id`
- `purchase_date`: TEXT
- `amount_paid`: REAL
- `sessions_total`: INTEGER
- `sessions_remaining`: INTEGER

## Business Logic

### Member Status Management
- **Active Members**: Members with at least one active membership (current date between start_date and end_date)
- **Inactive Members**: Members whose latest membership has expired
- **Deleted Members**: Soft-deleted members (preserves membership history)
- Status is automatically calculated based on membership dates and updated when memberships change

### Member and Plan Management
- Create, update, delete members (unique phone numbers)
- Members are soft-deleted to preserve membership data
- Create and manage group class plans with auto-generated `display_name` (e.g., "MMA Focus - 90 days")
- Plans are soft-deleted to preserve membership history

### Membership Processing
- **Group Class**: Auto-calculate `end_date` by adding plan duration to start date
- Auto-categorize as 'New' or 'Renewal' based on member history
- Memberships can be soft-deleted to preserve history
- **PT**: Set `sessions_remaining` equal to `sessions_total` when purchased

### Reporting
- **Financial Report**: Aggregate income from both GC and PT memberships for date range
- **Upcoming Renewals**: Show GC memberships expiring in next 30 days

## Data Migration
Excel file has two tabs:
- **GC tab**: Columns include Member ID, Client Name, Phone, Plan Type, Plan Duration, Payment Date, Plan Start Date, Plan End Date, Amount, etc.
- **PT tab**: Columns include Member ID, Client Name, Phone, Session Count, Start Date, Amount Paid, etc.

## UI Structure (4 tabs)
1. **Members**: Two-column layout with member list and edit form
2. **Group Plans**: Two-column layout with plans list and edit form
3. **Memberships**: Radio button for GC/PT mode, two-column layouts
4. **Reporting**: Financial reports and renewal tracking

## Development Notes
**Important**: After completing any task or feature, update the CHANGELOG.md file with what was accomplished.

## Programming Principles
- Always strictly do what has been asked and nothing more. No need to add additional code if not asked for