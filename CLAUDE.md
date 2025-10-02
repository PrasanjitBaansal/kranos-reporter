# Kranos Gym Management System - Claude Context

## Project Overview

**Kranos Gym** is a comprehensive gym management system built with SvelteKit, SQLite, and JWT authentication. It manages members, memberships (Group Class and Personal Training), payments, and user accounts with role-based access control.

**Location:** `/Users/prasanjit/Desktop/kranos-reporter/kranos-gym`

## Tech Stack

- **Frontend:** SvelteKit 5, Svelte 5
- **Backend:** SvelteKit API routes (server-side)
- **Database:** SQLite (better-sqlite3)
- **Authentication:** JWT (jsonwebtoken) with bcrypt
- **Testing:** Vitest (unit), Playwright (e2e)
- **Dev Server:** Vite 6

## Quick Start

```bash
cd /Users/prasanjit/Desktop/kranos-reporter/kranos-gym

# Install dependencies
npm install

# Start development server (port 5173)
npm start
# or
npm run dev

# Run tests
npm test                 # Unit tests (Vitest)
npm run test:e2e        # E2E tests (Playwright)
npm run test:all        # All tests
```

## Project Structure

```
kranos-gym/
├── src/
│   ├── lib/
│   │   ├── auth/              # Authentication logic
│   │   ├── components/        # Svelte components
│   │   ├── db/               # Database (schema, migrations, utilities)
│   │   ├── memberships/      # Membership calculations
│   │   ├── payments/         # Payment processing
│   │   ├── security/         # JWT, RBAC, validation
│   │   └── stores/           # Svelte stores (toast, etc.)
│   ├── routes/               # SvelteKit routes
│   │   ├── api/             # API endpoints
│   │   ├── login/           # Login page
│   │   ├── members/         # Member management
│   │   ├── memberships/     # Membership management
│   │   ├── payments/        # Payment management
│   │   ├── plans/           # Plan configuration
│   │   ├── users/           # User management
│   │   └── +layout.svelte   # Main layout with nav
│   └── hooks.server.js      # Request hooks (auth middleware)
├── static/
│   └── data/
│       └── Kranos MMA Members.xlsx  # Import data source
├── tests/e2e/               # Playwright tests
├── scripts/
│   └── start.js            # Custom start script
├── kranos.db               # SQLite database
├── playwright.config.js    # Playwright configuration
├── svelte.config.js        # SvelteKit configuration
└── vite.config.js          # Vite configuration
```

## Database

**Location:** `kranos-gym/kranos.db`

### Key Tables

- **users** - User accounts (admin, trainer, member roles)
- **members** - Gym members (73 records)
- **group_plans** - Membership plan templates
- **group_class_memberships** - GC memberships (98 records)
- **pt_memberships** - Personal training memberships (6 records)
- **user_sessions** - Active sessions
- **user_activity_log** - Audit trail
- **app_settings** - Application configuration

### Default Users

- **pjb** (admin) - Password: admin123, Email: baansalprasanjit@gmail.com
- **niranjan** (trainer) - Password: trainer123, Email: niranjan@kranosgym.com
- **74 member accounts** - Default password: member123 (usernames generated from names)

### Database Migration

The database is initialized from [static/data/Kranos MMA Members.xlsx](kranos-gym/static/data/Kranos MMA Members.xlsx) by [src/lib/db/migrate.js](kranos-gym/src/lib/db/migrate.js).

Run manually:
```bash
# Step 1: Run migration (creates tables, imports members/memberships)
node src/lib/db/migrate.js

# Step 2: Create user accounts (admin, trainer, members)
node setup-user-accounts.js
```

**Important:** Migration script performs a clean slate operation (deletes existing database). User accounts must be created separately using the setup script.

## Authentication & Authorization

### Authentication Flow

1. User submits credentials at [/login](kranos-gym/src/routes/login/+page.svelte)
2. Server validates via [login/+page.server.js](kranos-gym/src/routes/login/+page.server.js)
3. JWT tokens created (access + refresh)
4. Tokens stored in HTTP-only cookies
5. [hooks.server.js](kranos-gym/src/hooks.server.js) validates on each request
6. User object added to `locals.user`

### Roles

- **admin** - Full access to all features
- **trainer** - Access to members, memberships, limited settings
- **member** - Personal dashboard only

### JWT Implementation

- **Access Token:** 1 hour expiry
- **Refresh Token:** 7 days expiry
- **Session Tracking:** Database-backed sessions
- **Security:** HTTP-only, secure cookies (production)

See [src/lib/security/jwt-utils.js](kranos-gym/src/lib/security/jwt-utils.js)

## Current Status

### ✅ Working

- Development server running on port 5173
- Database populated with **74 members**, **91 GC memberships**, **16 PT memberships**, **11 group plans**
- Authentication system functional with complete user tables
- User accounts created: **pjb/admin123** (admin), **niranjan/trainer123** (trainer), 74 member accounts (member123)
- Login page loads correctly
- Toast notifications system
- Dark theme with neon orange accent
- Role-based navigation
- Complete database schema with auth tables (users, user_sessions, user_activity_log)

### ✅ Recent Fixes (Oct 2, 2025)

1. **Database Schema Completed**
   - Added auth tables (users, user_sessions, user_activity_log) to schema.sql
   - Migration now creates complete database structure
   - Fixed duplicate membership handling with `INSERT OR IGNORE`

2. **Clean Database Migration**
   - Re-ran migration with clean data from Excel
   - All user accounts created successfully
   - Verified pjb/admin123 credentials work correctly

3. **Git Cleanup**
   - Removed all .md documentation files from kranos-gym/
   - Added consolidated CLAUDE.md at project root
   - Committed and pushed all changes

### ⚠️ Known Issues

#### Critical: Test Failures (93/111 failing)

**Root Causes Identified:**

1. **Login Navigation Problem**
   - After successful login, tests expect redirect to `/`
   - App stays at `/login?/login` instead of redirecting
   - Likely timing issue with `setTimeout` in [login/+page.svelte:75-79](kranos-gym/src/routes/login/+page.svelte#L75-L79)

2. **Element Selector Mismatches**
   - Tests expect `.login-content h1` → Actual: `.logo-text`
   - Tests expect `.dashboard-header h1` → Need to verify
   - Tests expect `.user-menu` → Need to verify nav structure

3. **Text Expectations Wrong**
   - H1 shows "Kranos Gym" not "Login" or "Kranos Gym Management"

4. **URL Query Parameters**
   - SvelteKit form action `?/login` appends to URL
   - Tests fail URL assertions like `expect(page).toHaveURL('/login')`

### Test Breakdown

- **Passing (18):**
  - Login page loads
  - Database checks
  - Dark theme rendering (partial)
  - Some validation tests

- **Failing (93):**
  - Authentication workflows
  - Member management
  - Membership workflows
  - Payment workflows
  - Password reset
  - Full integration tests

## Key Files Reference

### Authentication
- [src/routes/login/+page.svelte](kranos-gym/src/routes/login/+page.svelte) - Login UI
- [src/routes/login/+page.server.js](kranos-gym/src/routes/login/+page.server.js) - Login logic
- [src/hooks.server.js](kranos-gym/src/hooks.server.js) - Auth middleware
- [src/lib/security/jwt-utils.js](kranos-gym/src/lib/security/jwt-utils.js) - JWT creation/validation

### Database
- [src/lib/db/schema.sql](kranos-gym/src/lib/db/schema.sql) - Database schema
- [src/lib/db/database.js](kranos-gym/src/lib/db/database.js) - DB wrapper class
- [src/lib/db/migrate.js](kranos-gym/src/lib/db/migrate.js) - Migration script

### Testing
- [tests/e2e/auth-workflow-fixed.spec.js](kranos-gym/tests/e2e/auth-workflow-fixed.spec.js) - Auth tests (failing)
- [playwright.config.js](kranos-gym/playwright.config.js) - Playwright config

### Configuration
- [package.json](kranos-gym/package.json) - Dependencies & scripts
- [svelte.config.js](kranos-gym/svelte.config.js) - SvelteKit config
- [vite.config.js](kranos-gym/vite.config.js) - Vite config

## Development Workflow

### Running the App

```bash
# Development mode (auto-restart)
npm run dev

# Or use the custom start script (handles DB migration)
npm start
```

Server runs at: http://localhost:5173

### Testing Strategy

```bash
# Unit tests (watch mode)
npm run test:watch

# Unit tests (single run)
npm test

# E2E tests (all browsers)
npm run test:e2e

# E2E tests (headed mode - see browser)
npm run test:e2e:headed

# E2E tests (UI mode - interactive)
npm run test:e2e:ui

# All tests
npm run test:all
```

### Database Management

```bash
# Query database
sqlite3 kranos.db "SELECT * FROM users;"

# Reset and re-import
rm kranos.db kranos.db-shm kranos.db-wal
node src/lib/db/migrate.js
```

## Next Steps to Fix Tests

### Immediate Actions Needed

1. **Determine Correct Password**
   - Check how users are created in migration
   - Or add a known test user with known password
   - Update tests to use correct credentials

2. **Fix Login Redirect**
   - Option A: Remove `setTimeout` in login page (instant redirect)
   - Option B: Update tests to wait for async navigation
   - Option C: Use SvelteKit's native redirect on server

3. **Update Test Selectors**
   - Change `.login-content h1` → `.logo-text`
   - Find and update `.dashboard-header`, `.user-menu` selectors
   - Update H1 text expectations

4. **Fix URL Assertions**
   - Account for `?/login` query param
   - Use regex: `/\/login/` instead of exact match
   - Or configure SvelteKit to not use action query params

### Recommended Approach

**Priority 1:** Create a test user with known password
```javascript
// Add to migration or setup
const testPasswordHash = await bcrypt.hash('TestPassword123!', 12);
db.insertUser({
  username: 'testadmin',
  password_hash: testPasswordHash,
  role: 'admin',
  email: 'test@example.com'
});
```

**Priority 2:** Fix login redirect (remove setTimeout, use immediate goto)

**Priority 3:** Update all test selectors to match actual DOM

**Priority 4:** Run tests incrementally to verify fixes

## Useful Commands

```bash
# Check running processes on port 5173
lsof -ti :5173

# Kill process on port 5173
kill -9 $(lsof -ti :5173)

# View database schema
sqlite3 kranos.db ".schema"

# List all tables
sqlite3 kranos.db ".tables"

# Count records
sqlite3 kranos.db "SELECT COUNT(*) FROM members;"

# Check user roles
sqlite3 kranos.db "SELECT username, role FROM users;"

# View recent activity
sqlite3 kranos.db "SELECT * FROM user_activity_log ORDER BY created_at DESC LIMIT 10;"
```

## Troubleshooting

### App won't start
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database issues
```bash
# Recreate from Excel
rm kranos.db kranos.db-shm kranos.db-wal
node src/lib/db/migrate.js
```

### Tests timing out
```bash
# Install Playwright browsers
npx playwright install chromium

# Run specific test
npx playwright test tests/e2e/basic.spec.js --headed
```

### Port already in use
```bash
# Find and kill
lsof -ti :5173 | xargs kill -9

# Or use different port
PORT=3000 npm run dev
```

## Architecture Notes

### SvelteKit Routing
- **File-based routing** in `src/routes/`
- **+page.svelte** = UI component
- **+page.server.js** = Server-side logic, form actions
- **+layout.svelte** = Shared layout
- **+layout.server.js** = Shared server logic

### Form Actions
Forms use SvelteKit's form actions pattern:
```svelte
<form method="POST" action="?/login" use:enhance={submitLogin}>
```

The `?/login` creates a named action handled in `+page.server.js`:
```javascript
export const actions = {
  login: async ({ request, cookies }) => { ... }
};
```

### State Management
- **Svelte stores** for client-side state
- **Toast notifications** via [src/lib/stores/toast.js](kranos-gym/src/lib/stores/toast.js)
- **Session data** via `locals.user` (server-side)

### Styling
- **CSS variables** for theming
- **Dark theme** with neon orange (#f39407) accent
- **Glassmorphism** effects
- **Gradient cards** and backgrounds

## Session Summary (Oct 2, 2025)

### Completed Tasks
1. ✅ Removed all .md documentation files from project
2. ✅ Created consolidated CLAUDE.md at project root
3. ✅ Fixed schema.sql to include auth tables (users, user_sessions, user_activity_log)
4. ✅ Fixed migration script duplicate handling with INSERT OR IGNORE
5. ✅ Performed clean database migration from Excel
6. ✅ Created all user accounts (1 admin, 1 trainer, 74 members)
7. ✅ Verified pjb/admin123 credentials work
8. ✅ Committed and pushed all changes to git

### Database State
- **74 members** (from Excel import)
- **91 GC memberships** (1 duplicate auto-skipped)
- **16 PT memberships**
- **11 group plans**
- **76 user accounts** (pjb, niranjan, 74 members)

### Next Steps
- Fix failing tests (93/111 failing)
  - Priority 1: Fix login redirect
  - Priority 2: Update test selectors
  - Priority 3: Fix URL assertions
  - Priority 4: Run tests incrementally

---

**Last Updated:** October 2, 2025
**Project Path:** `/Users/prasanjit/Desktop/kranos-reporter/kranos-gym`
**Dev Server:** http://localhost:5173
**Current Branch:** main
**Status:** Database clean ✅ | Tests need fixing ⚠️
