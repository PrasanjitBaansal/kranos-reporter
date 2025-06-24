# Kranos Gym Management System

## 📁 PROJECT DIRECTORY
**Working Directory**: `/Users/prasanjit/Desktop/kranos-reporter/kranos-gym/`

---

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

### app_settings table
- `id`: INTEGER, PRIMARY KEY, AUTOINCREMENT
- `setting_key`: TEXT, NOT NULL, UNIQUE
- `setting_value`: TEXT
- `created_at`: TEXT, DEFAULT CURRENT_TIMESTAMP
- `updated_at`: TEXT, DEFAULT CURRENT_TIMESTAMP

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

## Form Validation Architecture

### Validation Strategy
- **NO HTML5 validation** - All forms use `novalidate` attribute to prevent browser validation
- **Custom JavaScript validation only** - Consistent validation experience across all forms
- **Real-time error clearing** - Validation errors disappear when user corrects input
- **Client-side validation** - Runs before form submission via SvelteKit's `use:enhance`

### Validation Rules by Form

#### **Members Page** (`/src/routes/members/+page.svelte`)
- **Name**: Required, alphanumeric + spaces only, using regex `/^[a-zA-Z0-9\s]+$/`
- **Phone**: Required, exactly 10 digits, using regex `/^\d{10}$/` (when not editing)
- **Email**: Optional, valid email format using regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- **Join Date**: Required, any valid date

#### **Plans Page** (`/src/routes/plans/+page.svelte`)
- **Plan Name**: Required, non-empty string after trimming
- **Duration**: Required, positive integer using `Number.isInteger(Number(value))`
- **Default Amount**: Optional, positive number if provided

#### **Memberships Page** (`/src/routes/memberships/+page.svelte`)
**Group Class Memberships:**
- **Member Selection**: Required, must select from active members
- **Plan Selection**: Required, must select from active plans
- **Start Date**: Required, valid date
- **Amount Paid**: Required, positive number

**Personal Training Memberships:**
- **Member Selection**: Required, must select from active members
- **Sessions Total**: Required, positive integer
- **Amount Paid**: Required, positive number

### Validation Implementation Pattern
```javascript
function validateForm(formData) {
    const errors = {};
    // Validation logic here
    return errors;
}

const submitForm = () => {
    return async ({ formData, result }) => {
        const errors = validateForm(formData);
        if (Object.keys(errors).length > 0) {
            formErrors = errors;
            return;
        }
        // Proceed with form submission
    };
};
```

### Error Display
- Error messages appear below input fields as `<span class="error-message">`
- Input fields get `class:error={formErrors.fieldName}` for styling
- Errors clear automatically when user starts typing valid input

## UI Structure (5 sections)
1. **Members**: 
   - Single-column layout with member list and filters
   - **Interactive Features**: Clickable member rows open detailed membership history modal
   - **Filtering**: Join date range filter, status filter (Active/Inactive), and search
   - **Member Details Modal**: Shows renewal count, complete membership history with plan details
   - **Edit/Add Modal**: Form-based member creation and editing with custom JS validation
2. **Group Plans**: Two-column layout with plans list and edit form, custom JS validation
3. **Memberships**: Radio button for GC/PT mode, two-column layouts, custom JS validation for both types
4. **Reporting**: Financial reports and renewal tracking
5. **Settings**: Password-protected admin settings page with app customization options

## App Settings System

### Access Control
- **Password Protection**: Settings page protected with hard-coded password 'theadmin'
- **Admin Button**: Discrete admin button on dashboard bottom-right
- **Modal Authentication**: Password entry modal with validation and security feedback

### Settings Features
1. **Accent Color Customization**
   - Color picker with live preview
   - Dynamic CSS variable updates (--primary, --primary-dark, --primary-light)
   - Real-time gradient generation

2. **Theme Mode Toggle**
   - Dark/Light theme switching
   - Dynamic CSS variable updates for backgrounds, text, and borders
   - Theme persistence in database and real-time application

3. **Favicon Upload**
   - PNG file upload with 100KB size limit
   - File validation (type and size)
   - Automatic favicon replacement and old file cleanup
   - Real-time preview in browser tab

4. **Logo Upload**
   - PNG file upload with 1MB size limit
   - Replaces emoji logo (🏋️) with custom image
   - Navigation logo updates dynamically
   - Automatic file cleanup when replacing

### File Management
- **Upload Directory**: `/static/uploads/` for user-uploaded files
- **Timestamped Filenames**: Prevents conflicts with format `favicon-{timestamp}.png`
- **Automatic Cleanup**: Old files deleted when replaced
- **Fallback Handling**: Graceful fallback to defaults if files missing

### Settings Storage
- **Database Persistence**: All settings stored in `app_settings` table
- **Global Loading**: Settings loaded in layout server and applied across app
- **Default Values**: Automatic initialization with current app theme/colors
- **Reset Functionality**: One-click restore to defaults with file cleanup

### Security Measures
- **File Validation**: Strict PNG-only validation with size limits
- **Path Sanitization**: Secure file handling to prevent directory traversal
- **Error Handling**: Comprehensive validation with user-friendly error messages

## Development Notes
**Important**: After completing any task or feature, update the CHANGELOG.md file with what was accomplished.

## Programming Principles
- Always strictly do what has been asked and nothing more. No need to add additional code if not asked for