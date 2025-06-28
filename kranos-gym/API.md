# API Documentation

## Overview

Kranos Gym Management System uses SvelteKit server actions for form handling and data operations. All endpoints follow RESTful conventions with consistent response patterns.

## Response Format

All server actions return standardized response objects:

```javascript
// Success Response
{
  success: true,
  data?: any,           // Optional data payload
  message?: string      // Optional success message
}

// Error Response  
{
  success: false,
  error: string         // Error message
}
```

## Load Functions

### Dashboard Load (`/`)
**File**: `src/routes/+page.server.js`
- Loads all entities for dashboard statistics
- Updates member statuses before loading
- **Returns**: `{ members, groupPlans, groupClassMemberships, ptMemberships }`

### Layout Load (`+layout.server.js`)
**File**: `src/routes/+layout.server.js`
- Loads global app settings for theming
- **Returns**: `{ appSettings: { accent_color, theme_mode, favicon_path, logo_type, logo_value } }`

### Members Load (`/members`)
**File**: `src/routes/members/+page.server.js`
- **Returns**: `{ members: Member[] }`

### Plans Load (`/plans`)  
**File**: `src/routes/plans/+page.server.js`
- **Returns**: `{ groupPlans: GroupPlan[] }`

### Memberships Load (`/memberships`)
**File**: `src/routes/memberships/+page.server.js`
- **Returns**: `{ members, groupPlans, groupClassMemberships, ptMemberships }`

### Reporting Load (`/reporting`)
**File**: `src/routes/reporting/+page.server.js`
- **Query Parameters**: `start_date`, `end_date`
- **Returns**: `{ financialReport, upcomingRenewals, dateRange }`

### Settings Load (`/settings`)
**File**: `src/routes/settings/+page.server.js`
- **Returns**: `{ settings: AppSettings }`

## Member Actions

### Create Member
**Endpoint**: `?/create` (Members page)
**Method**: POST
**Form Data**:
```
name: string (required)
phone: string (required, 10 digits, unique)
email?: string (optional, valid email)
join_date?: string (defaults to today)
```
**Validation**:
- Phone uniqueness check including deleted members
- Automatic status assignment to 'Inactive'
**Response**: `{ success: true, member: Member }`

### Update Member
**Endpoint**: `?/update` (Members page)
**Method**: POST
**Form Data**:
```
id: number (required)
name: string (required)
phone: string (required)
email?: string (optional)
join_date: string (required)
```
**Validation**:
- Phone change restricted if member has existing memberships
- Phone uniqueness check (excluding current member)
- Status preservation from existing member
**Response**: `{ success: true }`

### Delete Member
**Endpoint**: `?/delete` (Members page)
**Method**: POST
**Form Data**: `id: number`
**Response**: `{ success: true }`

## Group Plan Actions

### Create Group Plan
**Endpoint**: `?/create` (Plans page)
**Method**: POST
**Form Data**:
```
name: string (required)
duration_days: number (required)
default_amount?: number (optional)
display_name?: string (auto-generated if not provided)
status?: string (defaults to 'Active')
```
**Response**: `{ success: true, plan: GroupPlan }`

### Update Group Plan
**Endpoint**: `?/update` (Plans page)
**Method**: POST
**Form Data**: Same as create + `id: number`
**Response**: `{ success: true }`

## Group Class Membership Actions

### Create GC Membership
**Endpoint**: `?/createGC` (Memberships page)
**Method**: POST
**Form Data**:
```
member_id: number (required)
plan_id: number (required)
start_date: string (required, YYYY-MM-DD)
amount_paid: number (required)
purchase_date?: string (defaults to today)
```
**Business Logic**:
- Auto-calculates `end_date` (start_date + plan.duration_days)
- Auto-determines `membership_type` ('New' or 'Renewal' based on history)
- Updates member status after creation
**Response**: `{ success: true, membership: Membership, type: 'gc' }`

### Update GC Membership
**Endpoint**: `?/updateGC` (Memberships page)
**Method**: POST
**Form Data**: Same as create + `id: number` + `end_date`, `membership_type`, `status`
**Response**: `{ success: true, type: 'gc' }`

### Delete GC Membership
**Endpoint**: `?/deleteGC` (Memberships page)
**Method**: POST
**Form Data**: `id: number`
**Business Logic**: Updates member status after deletion
**Response**: `{ success: true, type: 'gc' }`

## Personal Training Membership Actions

### Create PT Membership
**Endpoint**: `?/createPT` (Memberships page)
**Method**: POST
**Form Data**:
```
member_id: number (required)
sessions_total: number (required, positive integer)
amount_paid: number (required)
purchase_date?: string (defaults to today)
```
**Business Logic**:
- Sets `sessions_remaining = sessions_total`
- Updates member status after creation
**Response**: `{ success: true, membership: PTMembership, type: 'pt' }`

### Update PT Membership
**Endpoint**: `?/updatePT` (Memberships page)
**Method**: POST
**Form Data**: Same as create + `id: number` + `sessions_remaining`
**Response**: `{ success: true, type: 'pt' }`

### Delete PT Membership
**Endpoint**: `?/deletePT` (Memberships page)
**Method**: POST
**Form Data**: `id: number`
**Response**: `{ success: true, type: 'pt' }`

## Settings Actions

### Update Accent Color
**Endpoint**: `?/updateAccentColor` (Settings page)
**Method**: POST
**Form Data**: `color: string` (hex format #RRGGBB)
**Validation**: Validates hex color format
**Response**: `{ success: true, message: string }`

### Update Theme
**Endpoint**: `?/updateTheme` (Settings page)
**Method**: POST
**Form Data**: `theme: string` ('dark' | 'light')
**Response**: `{ success: true, message: string }`

### Upload Favicon
**Endpoint**: `?/uploadFavicon` (Settings page)
**Method**: POST
**Form Data**: `favicon: File` (PNG, max 100KB)
**Business Logic**:
- Validates PNG format and size limit
- Creates timestamped filename
- Deletes old favicon if custom
- Updates database with new path
**Response**: `{ success: true, message: string, favicon_path: string }`

### Upload Logo
**Endpoint**: `?/uploadLogo` (Settings page)
**Method**: POST
**Form Data**: `logo: File` (PNG, max 1MB)
**Business Logic**:
- Validates PNG format and size limit
- Creates timestamped filename
- Deletes old logo if custom
- Updates logo_type to 'image' and logo_value to file path
**Response**: `{ success: true, message: string, logo_type: string, logo_value: string }`

### Reset to Defaults
**Endpoint**: `?/resetToDefaults` (Settings page)
**Method**: POST
**Form Data**: None
**Business Logic**:
- Resets all settings to defaults
- Cleans up uploaded files
**Response**: `{ success: true, message: string }`

## Reporting Actions

### Generate Report
**Endpoint**: `?/generateReport` (Reporting page)
**Method**: POST
**Form Data**:
```
start_date: string (YYYY-MM-DD)
end_date: string (YYYY-MM-DD)
```
**Response**: `{ success: true, report: FinancialReport[], dateRange: DateRange }`

## Member History Actions

### Get Member History
**Endpoint**: `?/getMemberHistory` (Memberships page)
**Method**: POST
**Form Data**: `member_id: number`
**Response**: `{ success: true, history: Membership[] }`

## REST API Endpoints

### Member Memberships
**Endpoint**: `/api/members/[id]/memberships`
**Method**: GET
**URL Parameters**: `id: number` (member ID)
**Response**:
```json
{
  "memberships": [
    {
      "id": number,
      "type": "Group Class" | "Personal Training",
      "plan_name": string,
      "start_date": string,
      "end_date": string | null,
      "amount_paid": number,
      "membership_type": string,
      "status": string
    }
  ]
}
```
**Business Logic**:
- Combines GC and PT memberships
- Sorts by date (latest first)
- Formats PT memberships with plan_name as "PT Sessions (X)"

## Error Handling

All endpoints implement consistent error handling:
- Database connection errors
- Validation errors
- File upload errors (settings)
- Data constraint violations
- Business logic validation

### Common Error Responses

```javascript
// Validation Error
{ success: false, error: "Phone number already exists" }

// Database Error
{ success: false, error: "Database connection failed" }

// File Upload Error  
{ success: false, error: "File must be smaller than 1MB" }

// Business Logic Error
{ success: false, error: "Cannot change phone for members with history" }
```

## Data Types

### Member
```typescript
{
  id: number
  name: string
  phone: string
  email: string | null
  join_date: string
  status: 'Active' | 'Inactive' | 'New' | 'Deleted'
}
```

### GroupPlan
```typescript
{
  id: number
  name: string
  duration_days: number
  default_amount: number | null
  display_name: string
  status: 'Active' | 'Inactive' | 'Deleted'
}
```

### GroupClassMembership
```typescript
{
  id: number
  member_id: number
  plan_id: number
  start_date: string
  end_date: string
  amount_paid: number
  purchase_date: string
  membership_type: 'New' | 'Renewal'
  status: 'Active' | 'Inactive' | 'Deleted'
}
```

### PTMembership
```typescript
{
  id: number
  member_id: number
  purchase_date: string
  amount_paid: number
  sessions_total: number
  sessions_remaining: number
}
```

### AppSettings
```typescript
{
  accent_color: string
  theme_mode: 'dark' | 'light'
  favicon_path: string
  logo_type: 'emoji' | 'image'
  logo_value: string
}
```