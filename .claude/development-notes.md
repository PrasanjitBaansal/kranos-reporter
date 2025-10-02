# Development Notes & Context

## Session History

### October 2, 2025 - Initial Assessment & Test Analysis

**Objectives:**
- Get application running
- Run test suite
- Identify issues

**Completed:**
1. ✅ Analyzed project structure
2. ✅ Reinstalled dependencies (SvelteKit issue)
3. ✅ Started dev server (port 5173)
4. ✅ Verified database (73 members, 98 GC memberships, 6 PT memberships)
5. ✅ Installed Playwright browsers
6. ✅ Ran full test suite (111 tests)
7. ✅ Analyzed test failures (93 failing)
8. ✅ Created documentation (CLAUDE.md, test-status.md, known-issues.md)

**Key Findings:**
- App runs successfully in browser
- Database properly populated
- Authentication working manually
- **Critical Issue:** Login navigation timeout in tests
- Tests use wrong element selectors
- Unknown password for test user `pjb`

**Background Processes:**
- Dev server: Running (port 5173)
- Shell ID: 5ecd6e

---

## Important Discoveries

### Database Structure
- Users auto-created from Excel import
- Email addresses in format: `baansalprasanjit@gmail.com` (pjb)
- Members have separate usernames (from phone numbers)
- 3 test users created with timestamp suffix: `admin_1752236015794`, etc.

### Authentication Flow
1. Client submits to `?/login` action
2. Server validates in [+page.server.js](../kranos-gym/src/routes/login/+page.server.js)
3. Bcrypt comparison against password_hash
4. JWT tokens created (access + refresh)
5. Cookies set (HTTP-only, secure in prod)
6. Session created in database
7. Activity logged
8. Returns `{success: true, user: {...}}`
9. Client calls `goto(redirectTo)` after 100ms setTimeout

### UI Structure

**Login Page:**
```
.login-container
  .login-card
    .login-header
      .login-logo
        .logo-icon (🏋️)
        h1.logo-text "Kranos Gym"
      .login-subtitle "Sign in to your account"
    form.login-form
      .form-group (username)
      .form-group (password)
      button.btn.btn-primary.login-btn
    .login-footer
```

**Error Display:**
- Input gets class `error` when invalid
- Error message in separate `.error-message` div
- Toast notifications for server errors

---

## Code Patterns

### SvelteKit Form Actions
```svelte
<!-- Client -->
<form method="POST" action="?/login" use:enhance={submitLogin}>

<script>
const submitLogin = () => {
  return async ({ formData, result, update }) => {
    if (result.type === 'success' && result.data.success) {
      goto(redirectTo);
    }
  };
};
</script>
```

```javascript
// Server
export const actions = {
  login: async ({ request, cookies }) => {
    // ... validation ...
    return { success: true, user: {...} };
  }
};
```

### Database Pattern
```javascript
import Database from '$lib/db/database.js';

const db = new Database();
try {
  db.connect();
  const user = db.getUserByUsername(username);
  // ... operations ...
} finally {
  db.close();
}
```

### JWT Pattern
```javascript
import { createAccessToken, createRefreshToken } from '$lib/security/jwt-utils.js';

const sessionId = crypto.randomBytes(32).toString('hex');
const { token: accessToken } = createAccessToken(user, sessionId);

cookies.set('access_token', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: 60 * 60 // 1 hour
});
```

---

## Testing Patterns

### Playwright Test Structure
```javascript
test('should successfully login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'testuser');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
  await expect(page.locator('.user-menu')).toBeVisible();
});
```

### Common Test Issues
1. **Navigation timeouts** - Tests don't wait for async redirects
2. **Selector brittleness** - Tests coupled to specific DOM structure
3. **Race conditions** - Server processing vs client expectations
4. **Missing fixtures** - No test data setup/teardown

---

## Technical Decisions

### Why SQLite?
- Simple setup (no server)
- Good for single-gym use case
- Fast for <10k records
- Easy to backup/migrate
- **Trade-off:** Not suitable for multi-gym or high concurrency

### Why JWT + Cookies?
- Stateless authentication
- Automatic CSRF protection (HTTP-only)
- Works with SvelteKit SSR
- Refresh token pattern for security
- **Trade-off:** Token size, can't revoke immediately

### Why better-sqlite3?
- Synchronous API (simpler)
- Faster than sqlite3
- Better error handling
- **Trade-off:** Node.js only (not edge deployments)

---

## Performance Notes

### Test Execution Times
- **Full suite:** ~5-7 minutes (111 tests, many timeout)
- **Dark theme tests:** Fast (<500ms each)
- **Auth workflow tests:** Slow (30s timeouts)
- **Integration tests:** Very slow (multiple 30s timeouts)

### App Performance
- **Cold start:** ~1-2 seconds
- **Hot reload:** <500ms
- **Database queries:** <10ms (logged with ⚡)
- **Page load:** Instant (SvelteKit hydration)

---

## Useful SQL Queries

```sql
-- Check user roles
SELECT username, role, email, created_at
FROM users
ORDER BY role, username;

-- Find active sessions
SELECT u.username, s.created_at, s.expires_at, s.ip_address
FROM user_sessions s
JOIN users u ON s.user_id = u.id
WHERE s.expires_at > datetime('now')
ORDER BY s.created_at DESC;

-- Recent activity
SELECT
  u.username,
  ual.action,
  ual.resource_type,
  ual.created_at,
  ual.ip_address
FROM user_activity_log ual
JOIN users u ON ual.user_id = u.id
ORDER BY ual.created_at DESC
LIMIT 20;

-- Membership stats
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active,
  SUM(CASE WHEN status = 'Expired' THEN 1 ELSE 0 END) as expired
FROM group_class_memberships;

-- Revenue by month
SELECT
  strftime('%Y-%m', purchase_date) as month,
  COUNT(*) as memberships,
  SUM(amount_paid) as revenue
FROM group_class_memberships
GROUP BY month
ORDER BY month DESC;
```

---

## Environment Variables

Currently none configured, but may need:

```bash
# .env (not created yet)
NODE_ENV=development
DATABASE_PATH=./kranos.db
JWT_SECRET=<should-be-set>
JWT_REFRESH_SECRET=<should-be-set>
SESSION_SECRET=<should-be-set>

# Production
NODE_ENV=production
DATABASE_PATH=/var/lib/kranos/kranos.db
JWT_SECRET=<from-env>
```

**Note:** Currently using default/development values.

---

## Security Considerations

### Current Implementation
- ✅ Password hashing (bcrypt, rounds=12)
- ✅ HTTP-only cookies
- ✅ Session tracking
- ✅ Activity logging
- ✅ Failed login attempts tracking
- ✅ Account lockout (5 attempts, 15 min)
- ✅ JWT expiration

### Potential Improvements
- ⚠️ No rate limiting on login endpoint
- ⚠️ No CSRF tokens (relying on SameSite cookies)
- ⚠️ JWT secrets should be in environment variables
- ⚠️ No password complexity requirements enforced
- ⚠️ No 2FA option
- ⚠️ Session management could be improved (no "logout all devices")

---

## Browser Compatibility

**Tested:**
- Chrome (via Playwright)
- Dev server works on macOS

**Not Tested:**
- Firefox
- Safari
- Mobile browsers
- Edge
- Older browsers

**Requirements:**
- JavaScript enabled
- Cookies enabled
- Modern browser (ES6+)

---

## Deployment Notes

**Not Yet Configured:**
- No Dockerfile (despite commit message mentioning Docker)
- No CI/CD pipeline
- No production build tested
- No deployment guide

**Production Checklist:**
- [ ] Set environment variables
- [ ] Configure adapter (@sveltejs/adapter-node installed)
- [ ] Build: `npm run build`
- [ ] Test build: `npm run preview`
- [ ] Database backup strategy
- [ ] Log rotation
- [ ] Monitoring
- [ ] Error tracking
- [ ] SSL/TLS certificates

---

## Future Enhancements

From test files, these features are tested but may not be implemented:
- [ ] Password reset flow
- [ ] Email notifications
- [ ] Bulk import workflows
- [ ] CSV export
- [ ] Payment tracking
- [ ] Expense management
- [ ] Dashboard analytics
- [ ] Mobile-responsive design (partially implemented)

---

## Learning Resources

### SvelteKit
- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [Form Actions](https://kit.svelte.dev/docs/form-actions)
- [Hooks](https://kit.svelte.dev/docs/hooks)

### Testing
- [Playwright Docs](https://playwright.dev)
- [Vitest Docs](https://vitest.dev)

### Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)

---

## Questions to Answer

1. **What is the actual password for `pjb`?**
   - Check migration script
   - Check setup script
   - Ask project owner

2. **Should tests be fixed or app be fixed?**
   - App works in browser
   - Tests might be outdated
   - Likely fix tests + some app issues

3. **Is password reset implemented?**
   - Tests exist for it
   - Need to check routes

4. **What's the toast implementation?**
   - Need to verify actual selectors
   - Check +layout.svelte

5. **Dashboard structure?**
   - Need to audit actual DOM
   - Update test selectors accordingly

---

## Quick Reference

### Important Files
- **Auth:** src/routes/login/+page.{svelte,server.js}
- **DB:** src/lib/db/{database.js,schema.sql,migrate.js}
- **Security:** src/lib/security/jwt-utils.js
- **Middleware:** src/hooks.server.js
- **Layout:** src/routes/+layout.svelte

### Key Commands
```bash
# Dev
npm run dev

# Tests
npm test                    # Vitest
npx playwright test --ui    # Playwright UI

# Database
sqlite3 kranos.db
node src/lib/db/migrate.js

# Debug
lsof -ti :5173  # Check port
```

### Test User
- Username: `pjb`
- Role: `admin`
- Email: `baansalprasanjit@gmail.com`
- Password: `???` (UNKNOWN - needs investigation)

---

**Maintained by:** Claude
**Last Updated:** October 2, 2025
**Next Session:** Focus on fixing critical test issues
