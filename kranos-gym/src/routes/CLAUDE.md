# Routes Module Documentation

## SvelteKit Page Structure

### Page Organization
1. **Dashboard** (`/`) - Overview with quick stats and admin access
2. **Members** (`/members`) - Member management with interactive features
3. **Plans** (`/plans`) - Group plan creation and management
4. **Memberships** (`/memberships`) - GC and PT membership processing
5. **Bulk Import** (`/memberships/bulk-import`) - CSV bulk membership import with validation
6. **Reporting** (`/reporting`) - Financial reports and renewal tracking
7. **Settings** (`/settings`) - Password-protected admin customization

### Page Architecture Pattern
```javascript
// +page.server.js
export const load = async () => {
    const db = new Database();
    try {
        await db.connect();
        const data = await db.getData();
        return { data };
    } catch (error) {
        console.error('Load error:', error);
        return { data: [] };
    } finally {
        await db.close();
    }
};

export const actions = {
    create: async ({ request }) => {
        // Server action implementation
        return { success: true, data };
    }
};
```

## Server Action Patterns

### Response Format Standards
```javascript
// Success responses
{ success: true, data?: any, member?: object, plan?: object, message?: string }

// Error responses  
{ success: false, error: string }

// File upload responses
{ success: true, message: string, file_path?: string }
```

### Database Connection Pattern
```javascript
const db = new Database();
try {
    await db.connect();
    const result = await db.operation();
    return { success: true, data: result };
} catch (error) {
    console.error('Database error:', error.message);
    return { success: false, error: 'User-friendly message' };
} finally {
    await db.close();
}
```

## Form Enhancement Patterns

### Standard Form Enhancement
```svelte
<script>
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import { showSuccess, showError } from '$lib/stores/toast.js';
    
    const submitForm = () => {
        return async ({ formData, result }) => {
            // Client-side validation
            const errors = validateForm(formData);
            if (Object.keys(errors).length > 0) {
                formErrors = errors;
                return;
            }
            
            isLoading = true;
            formErrors = {};
            
            // Handle server response
            if (result.type === 'success') {
                if (result.data?.success === false) {
                    // Server validation failed
                    handleServerErrors(result.data.error);
                } else {
                    // Success
                    showSuccess('Operation completed successfully!');
                    closeModal();
                    await invalidateAll();
                }
            } else {
                showError('An error occurred. Please try again.');
            }
            
            isLoading = false;
        };
    };
</script>

<form method="POST" action="?/create" use:enhance={submitForm} novalidate>
    <!-- Form content -->
</form>
```

## API Endpoint Patterns

### Member Membership History API
- **Endpoint**: `/api/members/[id]/memberships`
- **Method**: GET
- **Response**: Combined GC and PT membership history
- **Sorting**: Latest first by start_date/purchase_date

```javascript
// API response format
{
    memberships: [
        {
            ...membership,
            type: 'Group Class' | 'Personal Training',
            plan_name: string
        }
    ]
}
```

## API Endpoint Troubleshooting

### Member History API (`/api/members/[id]/memberships`)
- **Critical Issue**: Requires proper database connection pattern
- **Symptom**: Returns empty memberships array despite populated database
- **Root Cause**: Missing `await db.connect()` before database queries
- **Solution**: Implement proper connection lifecycle (connect → query → close)
- **Debugging**: Console logs for data flow verification without manual checking

### Common API Issues
- **Database Connection**: API endpoints need individual database instances
- **Error Handling**: Catch connection errors and return appropriate HTTP status
- **Cleanup**: Always close database connections in finally blocks
- **Debugging Strategy**: Console logging for backend verification while maintaining frontend focus

## Page-Specific Patterns

### Members Page Features
- **Interactive Rows**: Clickable member rows open detailed history modal
- **Filtering System**: Join date range, status filter (All/Active/Inactive/New), search functionality
- **Member Details Modal**: Complete membership history with renewal count
- **Status Management**: Four-tier status system (Active/New/Inactive/Deleted) with automatic calculation
- **New Filter Fix**: ✅ "New Only" filter now works properly with enhanced status logic

### Plans Page Features
- **Real-time Display Name**: Auto-generated from name + duration
- **Uniqueness Validation**: Prevents duplicate display names
- **Live Preview**: Shows generated display name as user types

### Memberships Page Features
- **Mode Toggle**: Radio buttons for GC vs PT membership types
- **Dynamic Forms**: Different validation and fields per membership type
- **Member Selection**: Filtered to active members only
- **Auto-calculations**: End dates, renewal detection

### Bulk Import Page Features ✅ PRODUCTION READY
- **CSV Template**: ✅ Download template with sample data and DD-MM-YYYY date format
- **File Upload**: ✅ CSV upload with comprehensive validation and error highlighting
- **Data Editing**: ✅ Editable table with real-time validation and reactive statistics
- **Error Display**: ✅ Current field values shown under error messages for easy debugging
- **Import Preview**: ✅ Enhanced preview showing actual values under each stat (New Members, New Plans, New Memberships)
- **Date Format**: ✅ DD-MM-YYYY standardized throughout entire workflow
- **Reactive UI**: ✅ Stats update in real-time, import button appears when all valid
- **Form Submission**: ✅ Proper form data handling using hidden input fields
- **Error Handling**: ✅ Complete error handling with user feedback and debug logging
- **Workflow**: ✅ Template → Upload → Validate/Edit → Preview → Import → Success
- **Testing Status**: ✅ Fully tested end-to-end with all edge cases and production-ready

### Key Technical Patterns Established
- **Reactive Variables**: Always watch `editableData` for validation stats, not source data
- **Form Data Handling**: Use hidden input fields for complex data in SvelteKit forms, not `formData.set()`
- **Date Format Consistency**: DD-MM-YYYY format throughout (template, validation, display, conversion)
- **Error Debugging**: Display current field values under error messages for user convenience
- **Import Preview**: Show actual data samples under stat counts for better user understanding

### Reporting Page Features
- **Date Range Selection**: Flexible financial reporting periods
- **Renewal Tracking**: Upcoming renewals in next 30 days
- **Export Capabilities**: Financial data aggregation

### Settings Page Features
- **Password Protection**: Hard-coded 'theadmin' password
- **File Upload**: Favicon and logo with size/type validation
- **Theme Management**: Accent color and dark/light mode
- **Real-time Preview**: Changes applied immediately

## Layout and Navigation

### Global Layout Features
- **Settings Loading**: App settings loaded in layout.server.js
- **Theme Application**: Dynamic CSS variables from settings
- **Navigation Structure**: Consistent across all pages
- **Toast Integration**: Global toast notification system

### Error Handling Standards
- **Server Errors**: Logged with technical details, user-friendly messages shown
- **Validation Errors**: Real-time clearing, specific field targeting
- **Network Errors**: Generic error messages with retry suggestions
- **File Upload**: Specific validation for size, type, and processing errors