# Kranos Gym Management System - Project Coordination

## 📁 PROJECT DIRECTORY
**Working Directory**: `/Users/prasanjit/Desktop/kranos-reporter/kranos-gym/`

## Cross-Module Business Rules

### Member Lifecycle Management
- **Status Calculation**: Automatically determined by active memberships across GC and PT modules
- **Soft Delete Strategy**: Uniform across all modules - preserve history, set status to 'Deleted'
- **Phone Number Uniqueness**: Enforced at database level, validated in UI components

### Data Relationships
- **Member-Membership Link**: Central to reporting, validation, and status calculations
- **Plan-Membership Integration**: Plans can be soft-deleted but preserve membership history
- **Cross-Module Validation**: Member selection must be consistent between GC and PT workflows

### Global Patterns
- **Validation Strategy**: Custom JavaScript only, no HTML5 validation, real-time error clearing
- **Response Format**: Consistent `{ success: boolean, data?: any, error?: string }` across all modules
- **Loading States**: Uniform loading indicators and disabled states during operations

## Module Documentation Links
- **Database**: `/src/lib/db/CLAUDE.md` - Schema, business logic, query patterns
- **Components**: `/src/lib/components/CLAUDE.md` - UI patterns, validation, modals
- **Routes**: `/src/routes/CLAUDE.md` - SvelteKit patterns, API contracts, page structure  
- **Stores**: `/src/lib/stores/CLAUDE.md` - State management, toast notifications

## Development Coordination
- **Form Enhancement**: All forms use SvelteKit's `use:enhance` with custom validation
- **Error Handling**: Toast notifications for success/error feedback across all modules
- **Database Connection**: Singleton pattern with proper cleanup in all server actions
- **Theme Integration**: CSS variables system supports dynamic theming across all components

## Troubleshooting Patterns

### Database Connection Issues
- **Symptom**: UI components show "no data" despite populated database
- **Root Cause**: API endpoints missing `await db.connect()` before database operations
- **Fix Pattern**: Proper connection lifecycle in each request handler (connect → query → close)
- **Verification**: Console logging for data flow tracking without manual inspection
- **Critical**: API endpoints need individual Database() instances, not global instances

### Data Migration Issues
- **File Path Problems**: Migration scripts may need relative path adjustments
- **Excel Structure**: Requires specific "GC" and "PT" sheet structure with proper columns
- **Post-Migration Verification**: Direct database queries to confirm data population
- **Path Resolution**: Ensure migration runs from correct working directory

### UI/Database Integration
- **Member Details Modal**: Critical integration point for membership history display
- **API Response Format**: Must match frontend expectations for data rendering
- **Frontend Error Handling**: Console logs for debugging without requiring manual checking
- **Data Flow**: Database → API → Frontend component state management

## Bulk Import System ✅

### CSV Bulk Membership Import
- **Route**: `/memberships/bulk-import` - Fully implemented bulk import system for group memberships
- **CSV Format**: `name,phone,email,plan_name,duration_days,start_date,amount_paid,purchase_date`
- **Date Format**: ✅ DD-MM-YYYY standardized throughout (template, validation, UI display)
- **Workflow**: Template Download → Upload CSV → Validate & Edit → Preview → Import → Success
- **Validation**: ✅ Real-time validation with editable table, reactive stats, current values display
- **Testing Status**: ✅ Fully tested and verified - complete workflow with proper error handling

### Data Processing Logic
- **Member Handling**: ✅ Create if phone doesn't exist, preserve existing data for updates
- **Plan Handling**: ✅ Create if name+duration combination doesn't exist, set default_amount from first occurrence
- **Membership Type**: ✅ Auto-determine 'New' vs 'Renewal' based on member history
- **End Date Calculation**: ✅ Auto-calculate by adding duration_days to start_date
- **Duplicate Prevention**: ✅ Validation prevents invalid imports, unique constraints prevent duplicates

### Implementation Details
- **Import Script**: `/src/lib/db/import-csv.js` - Standalone script using better-sqlite3
- **Server Actions**: `/src/routes/memberships/bulk-import/+page.server.js` - Web interface integration
- **UI Component**: `/src/routes/memberships/bulk-import/+page.svelte` - Complete 4-step workflow
- **Template**: ✅ CSV template with sample data and DD-MM-YYYY date format
- **Navigation**: Added to memberships page for Group Class memberships only
- **Error Handling**: ✅ Comprehensive validation with current values display under errors

### Complete Implementation & Fixes (2025-06-28)
- ✅ **Reactive Statement Issue**: Fixed validation table not appearing after CSV upload
- ✅ **Date Format Standardization**: Converted entire system to DD-MM-YYYY format consistency
- ✅ **Validation Table Display**: Changed date inputs from type="date" to type="text" for proper DD-MM-YYYY display
- ✅ **Current Values Display**: Added current field values under error messages for debugging without file reference
- ✅ **Reactive Stats Fix**: Fixed validation stats not updating by changing reactive variables to watch editableData
- ✅ **Import Button Logic**: Fixed "Preview Import" button appearing when all rows are valid
- ✅ **Preview Enhancement**: Added actual values under each stat (New Members, New Plans, New Memberships)
- ✅ **Import Process Fix**: Fixed "Confirm Import" button using hidden input field for proper form data submission
- ✅ **Count Synchronization**: Fixed membership count mismatch between server and client display
- ✅ **Comprehensive Error Handling**: Added complete error handling for import process with user feedback
- ✅ **Debug Logging**: Added comprehensive client and server-side logging for troubleshooting

### Production Ready Status ✅
- **Feature Complete**: All workflow steps fully functional (Template → Upload → Validate → Preview → Import → Success)
- **Error Handling**: Complete error handling with user-friendly messages and debugging capabilities
- **Data Validation**: Real-time validation with editable interface and current values display
- **Import Preview**: Enhanced preview with actual data showing what will be created
- **Testing**: Fully tested end-to-end workflow with edge cases handled

## Member Status Management Fix (2025-06-28) ✅

### Issue Resolution
- **Problem**: "New Only" filter on members page was not working - no members ever had 'New' status
- **Root Cause**: Database schema only allowed 'Active', 'Inactive', 'Deleted' statuses; business logic never assigned 'New' status
- **Solution**: Updated schema and business logic to properly handle 'New' status

### Technical Changes Applied
1. **Database Schema Update**: Added 'New' to CHECK constraint for members.status
2. **Status Logic Enhancement**: Modified `updateMemberStatus()` method in database.js:
   - **New Status Criteria**: No memberships AND joined within last 30 days
   - **Active Status**: Has active memberships (current date between start/end dates)
   - **Inactive Status**: All memberships expired OR no memberships + joined >30 days ago
3. **Default Status Change**: New members now default to 'New' status instead of 'Inactive'
4. **Schema Migration**: Successfully migrated existing database to support new status values

### Status Assignment Logic
```javascript
if (result.active_memberships > 0) {
    newStatus = 'Active';
} else if (result.total_memberships === 0 && result.days_since_join <= 30) {
    newStatus = 'New';
} else if (result.total_memberships === 0) {
    newStatus = 'Inactive';
} else {
    newStatus = 'Inactive'; // Has memberships but none active
}
```

### Verification Status ✅
- Database schema updated successfully
- All existing member statuses refreshed with new logic
- Test member created with 'New' status
- Filter functionality verified working

## Programming Principles
- Always strictly do what has been asked and nothing more
- Prefer editing existing files over creating new ones
- Update CHANGELOG.md after completing tasks