# Kranos Gym Management System - Comprehensive Codebase Analysis

## Project Overview

**Project Name**: The Blade Platform (formerly Kranos Gym)
**Type**: Multi-tenant SaaS gym management system
**Framework**: SvelteKit with Node.js backend
**Database**: PostgreSQL (migrated from SQLite)
**Authentication**: JWT-based with role-based access control

## Technology Stack

### Dependencies
- **Core**: SvelteKit 2.16.0, Svelte 5.0.0, Vite 6.2.6
- **Database**: PostgreSQL (pg 8.16.3)
- **Authentication**: bcrypt 6.0.0, jsonwebtoken 9.0.2
- **Utilities**: date-fns 4.1.0, xlsx 0.18.5, glob 11.0.3
- **Testing**: Vitest, Playwright, Testing Library
- **Environment**: dotenv 17.0.0

## Architecture Overview

### 1. Database Layer

#### Main Database Class: `TheBladePostgreSQL`
- **Location**: `/src/lib/db/postgres-database.js`
- **Features**:
  - Multi-tenant support with automatic query filtering
  - Connection pooling (20 connections)
  - Transaction support
  - Prepared statements for performance
  - 90+ methods covering all business operations

#### Key Database Components:
- **Config**: Database configuration and environment management
- **Tenant Support**: Row-level security and tenant isolation
- **Tournament Methods**: Mixin pattern for tournament functionality
- **Classes Database**: Extended class for educational features

#### Database Methods Categories:
1. **Member Management**: CRUD operations, status tracking, search
2. **Membership Plans**: Group class and personal training plans
3. **Memberships**: Creation, renewal, history tracking
4. **Financial**: Revenue reports, expenses, trainer payments
5. **Authentication**: User management, sessions, permissions
6. **Platform Statistics**: Multi-tenant analytics
7. **Tournament Operations**: 45+ specialized methods
8. **Class Management**: Scheduling, enrollments, substitutions

### 2. Authentication System

#### Core Components:
- **AuthenticationService**: Main authentication class
- **SuperUserAuthService**: Platform-level authentication
- **ExternalAuth**: Phone-based auth for tournament participants
- **JWT Utilities**: Token generation and verification

#### Security Features:
- JWT tokens (1hr access, 7day refresh)
- bcrypt password hashing (12 rounds)
- Account lockout (5 attempts, 15min)
- Session management with device tracking
- Comprehensive activity and security logging
- CSRF protection
- Input sanitization

#### Permission System:
- Role hierarchy: super_user → admin → trainer → member → external
- 32 granular permissions across 6 categories
- Database-backed permission checking
- Middleware for route protection

### 3. Multi-Tenant Architecture

#### Tenant Resolution:
- Subdomain-based (kranos.theblade.in)
- Custom domain support (premium feature)
- Super user override capability
- Development mode support

#### Tenant Components:
- **TenantMiddleware**: Request-level tenant resolution
- **TenantService**: Tenant data management with caching
- **TenantContext**: AsyncLocalStorage-based context

#### Features:
- Organization and location hierarchy
- Module-based feature access
- Subscription management
- Row-level data isolation

### 4. UI Components

#### Core Components:
- **Modal**: Reusable modal with size variants
- **Toast**: Notification system with store
- **MemberDetailsModal**: Member information display
- **PasswordModal**: Admin authentication dialog

#### Design System:
- Dark theme with orange accent (#f39407)
- Glassmorphism effects
- Mobile-first responsive design
- Smooth animations and transitions
- Consistent spacing and typography

### 5. Route Structure

#### Page Routes:
- `/` - Dashboard with role-based content
- `/members` - Member management (admin only)
- `/memberships` - Membership CRUD
- `/plans` - Plan management
- `/reporting` - Financial and renewal reports
- `/payments` - Expense tracking
- `/profile` - Member portal
- `/admin/*` - Admin-only features
- `/tournaments/*` - Tournament management
- `/trainer/*` - Trainer-specific features

#### API Routes:
- `/api/members/*` - Member data endpoints
- `/api/reports/*` - Reporting endpoints
- `/api/tournaments/*` - Tournament operations
- `/api/payments/*` - Financial data
- `/api/users/*` - User management

#### Server-Side Features:
- Load functions with caching
- Form actions with validation
- Multi-tenant data isolation
- Consistent error handling

### 6. Business Modules

#### Member Management:
- Complete CRUD operations
- Status tracking (New, Active, Inactive, Deleted)
- Phone number uniqueness
- Soft delete pattern
- Membership history tracking

#### Membership System:
- Group Class (GC) memberships
- Personal Training (PT) memberships
- Plan-based access control
- Renewal tracking
- Bulk import via CSV

#### Financial Management:
- Revenue tracking by type
- Expense management
- Trainer payment tracking
- P&L reporting
- Category-based analytics

#### Class Management:
- Class types and scheduling
- Recurrence patterns
- Trainer assignments
- Enrollment tracking
- Substitution requests
- Gym closure handling

#### Tournament System:
- Tournament lifecycle management
- Event and division creation
- Registration (internal/external)
- Digital waivers
- Document uploads
- Check-in system
- Bracket generation
- Match scoring
- Activity logging

### 7. Utility Systems

#### Caching:
- In-memory Map-based cache
- TTL support (default 5 minutes)
- Database query caching
- Performance monitoring

#### Date Handling:
- DD/MM/YYYY display format
- YYYY-MM-DD database format
- Comprehensive parsing and validation
- Relative time calculations

#### Toast Notifications:
- Svelte store-based
- Multiple toast types
- Auto-dismissal
- Animation support

### 8. Development Tools

#### Scripts:
- `start.js` - Development server with auto-migration
- Migration scripts for database updates
- Test suites with Vitest and Playwright

#### Configuration:
- Vite for build tooling
- SvelteKit adapter-auto
- Environment-based configuration
- Docker support for services

## Key Architectural Patterns

### 1. Database Connection Pattern
```javascript
const db = new TheBladePostgreSQL(organizationId);
await db.connect();
try {
    // operations
} finally {
    await db.close();
}
```

### 2. Server Action Pattern
```javascript
export const actions = {
    actionName: async ({ request, locals }) => {
        // Validation
        // Database operation
        // Return { success, error? }
    }
};
```

### 3. Multi-Tenant Query Pattern
```javascript
const query = `SELECT * FROM table WHERE tenant_id = $1`;
const result = await db.query(query, [organizationId]);
```

### 4. Caching Pattern
```javascript
const data = await cachedQuery(db, 'queryName', async () => {
    return await db.someExpensiveQuery();
}, 300000); // 5 minutes
```

## Module Statistics

- **Total JavaScript Files**: 200+
- **Database Methods**: 135+
- **API Endpoints**: 35+
- **UI Components**: 50+
- **Route Pages**: 40+
- **Test Files**: 20+

## Business Logic Highlights

1. **Member Lifecycle**: Automatic status calculation based on membership activity
2. **Plan Access Control**: Members can only access classes their plans allow
3. **Multi-Location Support**: Premium feature for managing multiple gym locations
4. **Tournament Registration**: Dual support for members and external participants
5. **Financial Tracking**: Complete P&L with revenue and expense management
6. **Activity Logging**: Comprehensive audit trail for compliance

## Security Considerations

1. **Authentication**: Enterprise-grade JWT implementation
2. **Authorization**: Fine-grained permission system
3. **Data Isolation**: Tenant-based row-level security
4. **Input Validation**: Comprehensive sanitization
5. **Session Management**: Secure cookie handling
6. **Audit Logging**: Security event tracking

## Performance Optimizations

1. **Connection Pooling**: PostgreSQL with 20 connections
2. **Query Caching**: 5-minute TTL for expensive queries
3. **Prepared Statements**: Reusable query plans
4. **Parallel Loading**: Promise.all for concurrent operations
5. **Lazy Loading**: On-demand data fetching
6. **Index Optimization**: Strategic database indexing

## Migration from SQLite

The system was successfully migrated from SQLite to PostgreSQL with:
- Zero-downtime migration scripts
- Data validation and rollback support
- API compatibility maintained
- Performance improvements achieved

## Production Readiness

- **Multi-tenant**: Full tenant isolation and management
- **Scalable**: PostgreSQL with connection pooling
- **Secure**: Enterprise authentication and authorization
- **Monitored**: Performance logging and metrics
- **Tested**: Unit and E2E test coverage
- **Documented**: Comprehensive technical documentation