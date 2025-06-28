# Features Documentation

## Overview

Kranos Gym Management System provides comprehensive gym management across 5 core modules: Dashboard, Members, Plans, Memberships, Reporting, and Settings.

## 1. Dashboard (`/`)

### Real-Time Statistics
**Member Analytics**:
- Total members count (excluding deleted)
- Active members (with current valid memberships)
- New members (no memberships yet)
- Percentage calculations for each status

**Financial Metrics**:
- Monthly revenue (current month GC + PT combined)
- Revenue breakdown by membership type
- Real-time calculation on page load

**Membership Tracking**:
- Expiring memberships (next 30 days)
- Automatic renewal alerts
- Days until expiry calculations

### Quick Actions Grid
**Shortcuts**:
- Add New Member → `/members` with add form
- New Membership → `/memberships` 
- Manage Plans → `/plans`
- View Reports → `/reporting`

**Design**: 4-column responsive grid, mobile-friendly stacking

### Recent Activity Feed
**Activity Types**:
- Group Class membership purchases
- Personal Training session purchases
- Member registrations
- Plan creations

**Display**:
- Latest 5 activities with timestamps
- Smart time formatting ("2 days ago", "Today")
- Activity type icons and descriptions
- Member name and amount details

### Admin Access
**Security**: Discrete admin button (bottom-right corner)
**Authentication**: Password modal ('theadmin')
**Navigation**: Direct link to settings page on successful auth

## 2. Members (`/members`)

### Member Registry
**CRUD Operations**:
- Create: Name, phone (unique), email (optional), join date
- Read: Comprehensive member list with status badges
- Update: Edit all fields with business rule validation
- Delete: Soft delete preserving membership history

**Status Management**:
- **New**: No memberships (blue badge)
- **Active**: Current valid Group Class membership (green badge)
- **Inactive**: Expired or no active memberships (red badge)
- **Deleted**: Soft-deleted members (gray badge)

### Advanced Filtering
**Search**: Real-time across name, phone, email
**Date Filter**: Join date range (from/to dates)
**Status Filter**: All/Active/Inactive/New members
**Clear Filters**: One-click reset button

### Interactive Member Details
**Click-to-View**: Click any member row opens detailed modal
**History Modal Content**:
- Total amount paid across all memberships
- Renewal count and membership statistics
- Complete chronological membership history
- Combined GC and PT membership display
- Plan details, dates, amounts, types

### Form Validation
**Name**: Alphanumeric + spaces only (`/^[a-zA-Z0-9\s]+$/`)
**Phone**: Exactly 10 digits, unique constraint, edit restrictions
**Email**: Optional, valid format validation
**Business Rules**: Phone change blocked for members with membership history

## 3. Group Plans (`/plans`)

### Plan Management
**Two-Column Layout**:
- Left: Plans list with search filtering
- Right: Create/Edit form with real-time preview

**Plan Attributes**:
- Name: Custom plan identifier
- Duration: Days (positive integer)
- Default Amount: Optional pricing template
- Display Name: Auto-generated "{Name} - {Duration} days"
- Status: Active/Inactive/Deleted

### Auto-Generated Display Names
**Format**: Real-time preview as user types
**Uniqueness**: Validation across name+duration combinations
**Business Logic**: Used throughout system for plan identification

### Plan Lifecycle
**Creation**: Form validation with real-time error clearing
**Updates**: Edit existing plans with data preservation
**Deletion**: Soft delete maintaining membership relationships

## 4. Memberships (`/memberships`)

### Dual Membership System
**Toggle Interface**: Radio button switching between GC and PT modes
**Dynamic Forms**: Mode-specific fields and validation
**Separate Tables**: Independent display and management

### Group Class Memberships
**Member Selection**: Searchable dropdown with active members
**Plan Selection**: Dropdown with active plans
**Auto-Calculations**:
- End date: start_date + plan.duration_days
- Membership type: 'New' (first) or 'Renewal' (subsequent)
- Purchase date: Defaults to today

**Form Fields**:
- Member (required): Active members only
- Plan (required): Active plans only  
- Start Date (required): Date picker
- Amount Paid (required): Positive number

### Personal Training Memberships
**Session-Based Tracking**:
- Sessions Total: Positive integer input
- Sessions Remaining: Auto-set to sessions_total
- No expiration dates (session-based validity)

**Form Fields**:
- Member (required): Active members selection
- Sessions Total (required): Positive integer
- Amount Paid (required): Positive number
- Purchase Date: Defaults to today

### Membership Tables
**Group Class Table Columns**:
- Member Name, Phone
- Plan Name, Duration (separate columns)
- Start Date, End Date
- Amount, Type (New/Renewal)
- Status, Actions (Edit/Delete)

**Personal Training Table Columns**:
- Member Name, Phone
- Sessions Total
- Purchase Date, Amount
- Actions (Edit/Delete)

### Business Logic
**Status Updates**: Member status recalculated after all CRUD operations
**Type Determination**: Automatic New/Renewal based on member history
**Data Integrity**: Foreign key relationships and validation

## 5. Reporting (`/reporting`)

### Financial Reports
**Date Range Selection**:
- Default: Current month
- Custom: User-defined start/end dates
- Real-time calculation on date change

**Revenue Analysis**:
- Combined GC + PT revenue totals
- Breakdown by membership type
- Count and amount summaries
- Period comparison capabilities

### Upcoming Renewals
**Renewal Tracking**:
- 30-day lookahead for GC expirations
- Member contact information display
- Days until expiry calculations
- Priority sorting (closest expiry first)

**Renewal Information**:
- Member name and phone
- Plan details and end date
- Time remaining calculations
- Direct member access for follow-up

### Export Capabilities
**File Formats**: Excel (.xlsx) and CSV options
**Dynamic Naming**: Timestamped filenames
**Client-Side Download**: Browser-handled file generation
**Data Coverage**: Complete report data export

## 6. Settings (`/settings`)

### Security & Access Control
**Password Protection**: Hard-coded 'theadmin' authentication
**Modal Authentication**: Secure password entry interface
**Session-Based**: No persistent login, per-session access
**Admin Detection**: Discrete access button on dashboard

### Theme Customization
**Accent Color System**:
- Color picker with live preview
- Dynamic CSS variable updates
- Automatic variant generation (dark, light)
- Real-time gradient and glow effects

**Theme Mode Toggle**:
- Dark/Light theme switching
- Complete CSS variable system updates
- Immediate application across entire app
- Persistent storage in database

### Branding Customization
**Favicon Management**:
- PNG upload (100KB limit)
- Real-time browser favicon updates
- Automatic old file cleanup
- Fallback to default on errors

**Logo System**:
- Emoji (🏋️) or custom image modes
- PNG upload (1MB limit)
- Navigation logo replacement
- Seamless mode switching

### File Management
**Upload Security**:
- Strict PNG validation
- File size limits (favicon: 100KB, logo: 1MB)
- Timestamped filenames prevent conflicts
- Automatic cleanup of replaced files

**Storage System**:
- `/static/uploads/` directory
- Public URL generation
- File existence validation
- Error handling and fallbacks

### Settings Persistence
**Database Storage**: Key-value pairs in app_settings table
**Global Loading**: Layout server loads settings for entire app
**Default Values**: Automatic initialization with current theme
**Reset Functionality**: One-click restore to defaults with file cleanup

## Business Rules & Workflows

### Member Lifecycle
```
Registration → New Status → First Membership → Active Status
                ↓
    Membership Expires → Inactive Status → Renewal → Active Status
                ↓
    Manual Deletion → Deleted Status (preserves history)
```

### Membership Workflow
```
1. Select Member (active only)
2. Choose Plan/Sessions
3. Set Start Date/Purchase Date
4. Enter Amount
5. Auto-calculate End Date (GC only)
6. Auto-determine Type (New/Renewal)
7. Update Member Status
```

### Status Calculation Logic
```javascript
// Member Status Priority
1. Deleted (manual) → 'Deleted'
2. No memberships → 'New' 
3. Current date within any GC membership → 'Active'
4. Has memberships but none current → 'Inactive'
```

### Data Validation Rules
**Phone Numbers**: 
- Exactly 10 digits
- Unique across all members (including deleted)
- Edit restriction for members with membership history

**Amounts**: 
- Positive numbers only
- Required for all paid memberships
- Currency display in Indian Rupees (₹)

**Dates**:
- ISO format (YYYY-MM-DD)
- End date auto-calculation for GC memberships
- Validation for logical date ranges

## UI/UX Features

### Modern Design System
**Dark Theme Focus**: Primary dark mode with orange accents
**Glassmorphism**: Translucent surfaces with backdrop blur
**Gradient Design**: Dynamic gradients with glow effects
**Smooth Animations**: Hover states, slide-ups, transitions

### Responsive Design
**Mobile-First**: Collapsible navigation and responsive grids
**Breakpoints**: Desktop (1200px), tablet (768px), mobile (480px)
**Touch-Friendly**: Appropriate spacing and button sizes
**Adaptive Layouts**: Content reorganization for smaller screens

### Interactive Elements
**Modal System**: Reusable components with backdrop handling
**Toast Notifications**: Auto-dismissing success/error messages
**Loading States**: Spinners and disabled states during operations
**Form Feedback**: Real-time validation with error clearing

### Accessibility Features
**Keyboard Navigation**: Full keyboard accessibility
**Screen Reader Support**: Proper ARIA labels and semantic HTML
**Focus Management**: Visible focus indicators
**Color Contrast**: Sufficient contrast ratios throughout

## Integration Features

### Excel Data Migration
**Import System**: Complete Excel file import with validation
**Data Processing**: Date conversion, deduplication, validation
**Business Logic**: Auto-calculation of join dates, membership types
**Error Handling**: Comprehensive validation with user feedback

### File Upload System
**Security**: Type validation, size limits, path sanitization
**Organization**: Structured upload directory with cleanup
**URL Management**: Public URL generation for uploaded assets
**Error Recovery**: Graceful fallbacks for missing files

### Search & Filter System
**Real-Time Search**: Instant filtering across all data tables
**Advanced Filters**: Date ranges, status filters, plan filters
**Clear Functions**: One-click filter reset capabilities
**Performance**: Optimized for large datasets

## Performance Optimizations

### Database Efficiency
**Connection Management**: Singleton pattern with proper cleanup
**Query Optimization**: Prepared statements and indexed queries
**Status Calculations**: Efficient member status update algorithms
**Join Queries**: Optimized relational data fetching

### Frontend Performance
**CSS Variables**: Efficient theme switching without recomputation
**Component Lazy Loading**: Dynamic imports where appropriate
**Asset Optimization**: Compressed images and optimized bundles
**Caching Strategy**: Browser caching for static assets

### User Experience
**Loading Indicators**: Immediate feedback for all operations
**Error Boundaries**: Graceful error handling and recovery
**Progressive Enhancement**: Core functionality without JavaScript
**Offline Considerations**: Local data persistence where possible