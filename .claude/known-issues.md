# Known Issues & Workarounds

## Critical Issues

### 1. Login Redirect Timeout ⚠️ BLOCKING

**Status:** 🔴 Critical - Blocks 60+ tests
**Discovered:** October 2, 2025
**Impact:** All authenticated workflow tests fail

**Symptoms:**
- After successful login, page stays at `/login?/login`
- Tests timeout waiting for navigation to `/`
- Server logs show "Login successful" but no redirect
- Browser shows login page stuck

**Root Cause:**
[src/routes/login/+page.svelte:75-79](../kranos-gym/src/routes/login/+page.svelte#L75-L79)
```javascript
setTimeout(() => {
    const redirectTo = $page.url.searchParams.get('redirect') || '/';
    goto(redirectTo);
}, 100);
```

The 100ms setTimeout causes race condition with test expectations.

**Proposed Fix:**
```javascript
// Option A: Immediate redirect
const redirectTo = $page.url.searchParams.get('redirect') || '/';
goto(redirectTo);

// Option B: Server-side redirect (better)
// In +page.server.js, after successful login:
throw redirect(302, '/');
```

**Workaround:**
For manual testing, wait 100ms after login submission.

**Files Affected:**
- tests/e2e/auth-workflow.spec.js
- tests/e2e/auth-workflow-fixed.spec.js
- tests/e2e/member-management.spec.js
- tests/e2e/membership-workflow.spec.js
- tests/e2e/payment-workflow.spec.js
- tests/e2e/complete-user-journey.spec.js
- tests/e2e/full-workflow-integration.spec.js

---

### 2. Unknown Test Password ⚠️ HIGH

**Status:** 🟡 High - Blocks 15+ tests
**Discovered:** October 2, 2025

**Symptoms:**
- Tests use password `'admin123'` for user `pjb`
- Login fails with "Invalid username or password"
- Password hash in DB: `$2b$12$xEc.cvx429P2EwxrbWPyEeMnqjQ7fivkbE0AMutJlKTKFHJpxh/V6`

**Root Cause:**
Password not documented, possibly set during manual DB setup.

**Proposed Fix:**
```javascript
// Add to migration script or create test fixture
import bcrypt from 'bcrypt';

const testUsers = [
  {
    username: 'testadmin',
    password: 'TestPassword123!', // Known password for testing
    role: 'admin',
    email: 'testadmin@kranosgym.test'
  },
  {
    username: 'testtrainer',
    password: 'TestPassword123!',
    role: 'trainer',
    email: 'testtrainer@kranosgym.test'
  },
  {
    username: 'testmember',
    password: 'TestPassword123!',
    role: 'member',
    email: 'testmember@kranosgym.test'
  }
];

for (const user of testUsers) {
  const hash = await bcrypt.hash(user.password, 12);
  db.insertUser({ ...user, password_hash: hash });
}
```

**Workaround:**
Reset `pjb` password via SQLite:
```bash
# Generate new hash for 'admin123'
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('admin123', 12).then(console.log)"

# Update database
sqlite3 kranos.db "UPDATE users SET password_hash='<generated_hash>' WHERE username='pjb';"
```

---

### 3. Element Selector Mismatches 🟡 MEDIUM

**Status:** 🟡 Medium - Blocks 20+ tests
**Discovered:** October 2, 2025

**Symptoms:**
- Tests fail with "element not found" errors
- Selectors don't match actual DOM structure

**Specific Mismatches:**

| Test Expects | Actual Element | File | Line |
|--------------|----------------|------|------|
| `.login-content h1` | `.logo-text` | login/+page.svelte | 115 |
| H1 text: "Login" | "Kranos Gym" | login/+page.svelte | 115 |
| `.toast-error` | Need to verify | - | - |
| `.user-menu` | Need to verify | +layout.svelte | - |
| `.dashboard-header h1` | Need to verify | +page.svelte | - |
| `.error` (with text) | `.error-message` | login/+page.svelte | 141 |

**Root Cause:**
Tests written before final UI implementation or UI changed after tests.

**Proposed Fix:**
1. Audit actual DOM in browser DevTools
2. Create selector reference document
3. Update all test files systematically

**Workaround:**
Run tests with `--headed` to see actual DOM:
```bash
npx playwright test --headed --project=chromium
```

---

## Medium Priority Issues

### 4. URL Query Parameters 🟢 LOW

**Status:** 🟢 Low - Affects 8 tests
**Discovered:** October 2, 2025

**Symptoms:**
- Tests expect URL `/login`
- Actual URL is `/login?/login`
- URL assertions fail

**Root Cause:**
SvelteKit form actions append `?/actionName` to URL.

From [login/+page.svelte:120](../kranos-gym/src/routes/login/+page.svelte#L120):
```svelte
<form method="POST" action="?/login" use:enhance={submitLogin}>
```

**Proposed Fix:**
Update tests to use regex patterns:
```javascript
// Instead of:
await expect(page).toHaveURL('/login');

// Use:
await expect(page).toHaveURL(/\/login/);
```

**Workaround:**
This is standard SvelteKit behavior, not a bug.

---

### 5. Error Message Display 🟢 LOW

**Status:** 🟢 Low - Affects 5 tests
**Discovered:** October 2, 2025

**Symptoms:**
- Tests expect error text in elements with class `.error`
- Actual errors in `.error-message` divs

**Actual Implementation:**
```svelte
{#if formErrors.username}
    <div class="error-message">
        <span class="error-icon">⚠️</span>
        {formErrors.username}
    </div>
{/if}
```

Input gets class `error` when invalid:
```svelte
<input class:error={formErrors.username} ... />
```

**Proposed Fix:**
Update tests:
```javascript
// Instead of:
await expect(page.locator('.error')).toContainText('Username is required');

// Use:
await expect(page.locator('.error-message')).toContainText('Username is required');
```

---

## Low Priority Issues

### 6. Missing Password Reset Feature

**Status:** 🔵 Feature Gap
**Impact:** 14 password reset tests failing

**Note:**
Tests exist for password reset functionality, but feature may not be fully implemented.

**Action Required:**
1. Verify if password reset routes exist
2. If not, mark tests as `.skip()` until feature implemented
3. Add to backlog

---

### 7. Toast Notification Implementation

**Status:** 🔵 Need Verification

**Tests expect:**
- `.toast-error` selector
- Toast messages for errors/success

**Need to verify:**
- Actual toast component structure
- Selector to use
- Timing of appearance/disappearance

**Location to check:**
- [src/lib/stores/toast.js](../kranos-gym/src/lib/stores/toast.js)
- [src/routes/+layout.svelte](../kranos-gym/src/routes/+layout.svelte) (toast container)

---

## Resolved Issues

*(None yet)*

---

## Issue Tracking

### How to Report New Issues

1. Add to this file under appropriate priority
2. Include:
   - Status emoji (🔴 Critical, 🟡 High, 🟢 Medium, 🔵 Low)
   - Discovery date
   - Symptoms
   - Root cause (if known)
   - Proposed fix
   - Workaround (if any)
   - Affected files/tests

### Issue Lifecycle

1. **Discovered** → Add to this file
2. **Analyzed** → Add root cause
3. **Fix Proposed** → Add solution
4. **Fix Implemented** → Mark as resolved
5. **Verified** → Move to "Resolved Issues"

---

**Last Updated:** October 2, 2025
**Critical Issues:** 2
**High Priority:** 1
**Medium Priority:** 2
**Low Priority:** 2
