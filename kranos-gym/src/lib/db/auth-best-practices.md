# Kranos Gym Authentication System - Best Practices Guide

## Overview
This guide provides comprehensive best practices for implementing and maintaining the Kranos Gym authentication system using SQLite and better-sqlite3.

## 1. Database Security Best Practices

### Connection Security
```javascript
// Always use connection pooling
const pool = new DatabasePool();

// Enable foreign key constraints
db.pragma('foreign_keys = ON');

// Use WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Optimize cache size
db.pragma('cache_size = 1000');
```

### Prepared Statements
```javascript
// ALWAYS use prepared statements to prevent SQL injection
const stmt = this.prepare('SELECT * FROM users WHERE username = ?');
const user = stmt.get(username);

// NEVER concatenate user input directly
// BAD: `SELECT * FROM users WHERE username = '${username}'`
// GOOD: Use prepared statements with parameters
```

### Sensitive Data Handling
```javascript
// Never store plain text passwords
const { hash, salt } = await this.hashPassword(password);

// Use bcrypt with appropriate cost factor (12+ for production)
const BCRYPT_ROUNDS = 12;

// Always hash passwords on the server side
// Never trust client-side hashing
```

## 2. Authentication Best Practices

### Password Security
```javascript
// Implement strong password requirements
export function validatePasswordStrength(password) {
    const requirements = {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
    };
    
    // Check against common password lists
    // Implement breach checking (HaveIBeenPwned API)
    return validation;
}
```

### Session Management
```javascript
// Use secure session tokens
const sessionToken = crypto.randomBytes(32).toString('hex');

// Implement session expiration
const expiresAt = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour

// Regenerate session tokens on privilege changes
await this.regenerateSession(userId);

// Clean up expired sessions regularly
setInterval(async () => {
    await this.cleanupExpiredSessions();
}, 60 * 60 * 1000); // Every hour
```

### JWT Token Management
```javascript
// Use strong secrets (32+ characters)
const JWT_SECRET = process.env.JWT_SECRET || 'your-256-bit-secret';

// Implement token refresh
const refreshToken = jwt.sign(
    { type: 'refresh', userId: user.id },
    REFRESH_SECRET,
    { expiresIn: '7d' }
);

// Include essential claims only
const payload = {
    userId: user.id,
    role: user.role,
    sessionId: sessionId,
    jti: crypto.randomUUID() // For token blacklisting
};
```

## 3. Authorization Best Practices

### Role-Based Access Control (RBAC)
```javascript
// Define clear role hierarchy
const ROLES = {
    ADMIN: 'admin',     // Full system access
    TRAINER: 'trainer', // Member and plan management
    MEMBER: 'member'    // Limited self-service access
};

// Implement permission checking
async function checkPermission(userId, permission) {
    const userPermissions = await getUserPermissions(userId);
    return userPermissions.includes(permission);
}
```

### Middleware Implementation
```javascript
// Use middleware for consistent authorization
export const requirePermission = (permission) => async (event) => {
    const user = await authenticate(event.request);
    
    if (!user) {
        throw redirect(302, '/login');
    }
    
    if (!await hasPermission(user.id, permission)) {
        throw redirect(302, '/unauthorized');
    }
    
    event.locals.user = user;
};
```

## 4. Security Monitoring

### Activity Logging
```javascript
// Log all significant actions
await this.logActivity(userId, sessionId, 'login_success', 'user', userId, {
    success: true,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
    metadata: { loginMethod: 'password' }
});

// Log security events
await this.logSecurityEvent(userId, 'failed_login', 'medium', 
    'Invalid password attempt', {
        ipAddress: request.ip,
        attemptCount: user.failed_attempts + 1
    });
```

### Rate Limiting
```javascript
// Implement rate limiting for authentication endpoints
const rateLimit = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many login attempts'
};

// Use progressive delays for failed attempts
const delays = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff
```

### Account Lockout
```javascript
// Implement account lockout after failed attempts
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

if (user.failed_login_attempts >= MAX_FAILED_ATTEMPTS) {
    const lockUntil = new Date(Date.now() + LOCKOUT_DURATION);
    await this.lockAccount(userId, lockUntil);
}
```

## 5. Data Protection

### Input Validation
```javascript
// Validate all user inputs
export function validateUserInput(data) {
    const sanitized = {
        username: sanitizeInput(data.username),
        email: validateEmail(data.email),
        // ... other fields
    };
    
    return sanitized;
}

// Sanitize output to prevent XSS
export function sanitizeOutput(data) {
    return data.replace(/[<>'"&]/g, (char) => {
        const entities = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;'
        };
        return entities[char];
    });
}
```

### CSRF Protection
```javascript
// Generate CSRF tokens
const csrfToken = crypto.randomBytes(32).toString('hex');

// Validate CSRF tokens on state-changing requests
export function validateCSRF(request) {
    const token = request.headers.get('X-CSRF-Token');
    if (!token || !isValidCSRFToken(token)) {
        throw new Error('Invalid CSRF token');
    }
}
```

## 6. Performance Optimization

### Database Indexing
```sql
-- Create indexes for frequently queried columns
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_active ON user_sessions(user_id, is_active, expires_at);
CREATE INDEX idx_activity_user_date ON user_activity_log(user_id, created_at);
```

### Query Optimization
```javascript
// Use efficient queries with proper indexing
const activeUsers = this.prepare(`
    SELECT u.id, u.username, u.role, u.last_login_at
    FROM users u
    WHERE u.status = 'active'
    ORDER BY u.last_login_at DESC
    LIMIT 100
`);

// Batch operations for better performance
const updateUsers = this.transaction((users) => {
    const stmt = this.prepare('UPDATE users SET last_login_at = ? WHERE id = ?');
    for (const user of users) {
        stmt.run(user.lastLogin, user.id);
    }
});
```

### Caching Strategy
```javascript
// Cache frequently accessed data
const permissionCache = new Map();

async function getCachedPermissions(userId) {
    const cacheKey = `permissions:${userId}`;
    
    if (permissionCache.has(cacheKey)) {
        return permissionCache.get(cacheKey);
    }
    
    const permissions = await getUserPermissions(userId);
    permissionCache.set(cacheKey, permissions);
    
    // Cache for 15 minutes
    setTimeout(() => {
        permissionCache.delete(cacheKey);
    }, 15 * 60 * 1000);
    
    return permissions;
}
```

## 7. Error Handling

### Secure Error Messages
```javascript
// Don't expose sensitive information in error messages
try {
    const user = await authenticateUser(username, password);
    return user;
} catch (error) {
    // Log detailed error for debugging
    console.error('Authentication error:', error);
    
    // Return generic error to user
    throw new Error('Invalid credentials');
}
```

### Graceful Degradation
```javascript
// Handle database connection failures
try {
    return await this.db.query(sql, params);
} catch (error) {
    if (error.code === 'SQLITE_BUSY') {
        // Retry with exponential backoff
        return await this.retryQuery(sql, params);
    }
    
    // Log error and return safe fallback
    console.error('Database error:', error);
    return null;
}
```

## 8. Environment Configuration

### Environment Variables
```bash
# .env file
JWT_SECRET=your-super-secret-256-bit-key-here
REFRESH_SECRET=your-refresh-token-secret-here
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=3600
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900
```

### Configuration Validation
```javascript
// Validate configuration on startup
function validateConfig() {
    const required = ['JWT_SECRET', 'REFRESH_SECRET'];
    
    for (const key of required) {
        if (!process.env[key]) {
            throw new Error(`Missing required environment variable: ${key}`);
        }
        
        if (process.env[key].length < 32) {
            throw new Error(`${key} must be at least 32 characters long`);
        }
    }
}
```

## 9. Testing Strategies

### Unit Testing
```javascript
// Test authentication logic
describe('Authentication Service', () => {
    test('should hash passwords securely', async () => {
        const password = 'testPassword123!';
        const { hash, salt } = await hashPassword(password);
        
        expect(hash).toBeDefined();
        expect(salt).toBeDefined();
        expect(hash).not.toBe(password);
    });
    
    test('should validate JWT tokens', () => {
        const token = generateJWT(testUser);
        const decoded = verifyJWT(token);
        
        expect(decoded.userId).toBe(testUser.id);
        expect(decoded.role).toBe(testUser.role);
    });
});
```

### Integration Testing
```javascript
// Test complete authentication flows
describe('Authentication Flow', () => {
    test('should login user successfully', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ username: 'testuser', password: 'testpass' });
        
        expect(response.status).toBe(200);
        expect(response.body.token).toBeDefined();
        expect(response.body.user.id).toBeDefined();
    });
});
```

## 10. Monitoring and Maintenance

### Health Checks
```javascript
// Database health check
async function checkDatabaseHealth() {
    try {
        await this.db.prepare('SELECT 1').get();
        return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
        return { status: 'unhealthy', error: error.message, timestamp: new Date() };
    }
}
```

### Metrics Collection
```javascript
// Track authentication metrics
const metrics = {
    loginAttempts: 0,
    failedLogins: 0,
    activeSessions: 0,
    lockedAccounts: 0
};

// Update metrics on events
function trackLoginAttempt(success) {
    metrics.loginAttempts++;
    if (!success) {
        metrics.failedLogins++;
    }
}
```

### Regular Maintenance
```javascript
// Scheduled maintenance tasks
async function performMaintenance() {
    // Clean up expired sessions
    await cleanupExpiredSessions();
    
    // Remove old activity logs (keep 90 days)
    await cleanupOldLogs(90);
    
    // Unlock accounts past lockout period
    await unlockExpiredAccounts();
    
    // Generate security report
    await generateSecurityReport();
}

// Run maintenance daily
setInterval(performMaintenance, 24 * 60 * 60 * 1000);
```

## 11. Deployment Considerations

### Production Checklist
- [ ] Strong JWT secrets configured
- [ ] HTTPS enabled for all endpoints
- [ ] Database file permissions secured (600)
- [ ] Rate limiting implemented
- [ ] Logging configured
- [ ] Monitoring alerts set up
- [ ] Backup strategy in place
- [ ] Security headers configured

### Security Headers
```javascript
// Configure security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});
```

## 12. Compliance and Legal

### GDPR Compliance
```javascript
// Data retention policies
async function enforceDataRetention() {
    // Remove user data after account deletion (30 days)
    await removeDeletedUserData(30);
    
    // Anonymize old activity logs (1 year)
    await anonymizeOldLogs(365);
}

// Right to be forgotten
async function deleteUserData(userId) {
    const transaction = this.transaction(() => {
        // Remove user record
        this.prepare('DELETE FROM users WHERE id = ?').run(userId);
        
        // Anonymize activity logs
        this.prepare('UPDATE user_activity_log SET user_id = NULL WHERE user_id = ?').run(userId);
        
        // Remove sessions
        this.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId);
    });
    
    transaction();
}
```

This comprehensive guide provides the foundation for implementing secure, scalable authentication in your Kranos Gym application using SQLite and better-sqlite3 patterns.