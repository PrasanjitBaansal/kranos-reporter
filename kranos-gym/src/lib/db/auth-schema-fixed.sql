-- Authentication System Database Schema - FIXED VERSION
-- Kranos Gym Management System
-- Compatible with existing SQLite database using better-sqlite3

-- ============================================================================
-- STEP 1: CREATE ALL TABLES FIRST
-- ============================================================================

-- USERS TABLE - Core authentication table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'trainer', 'member')),
    full_name TEXT NOT NULL,
    profile_image TEXT,
    
    -- Account status and security
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    must_change_password BOOLEAN DEFAULT FALSE,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TEXT,
    
    -- Timestamps
    created_date TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_date TEXT DEFAULT CURRENT_TIMESTAMP,
    last_login TEXT,
    last_password_change TEXT DEFAULT CURRENT_TIMESTAMP,
    
    -- Optional link to existing members table
    member_id INTEGER,
    
    -- Two-factor authentication (future)
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret TEXT,
    
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
);

-- PERMISSIONS TABLE - Granular permission system
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    created_date TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ROLE_PERMISSIONS TABLE - Maps roles to permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'trainer', 'member')),
    permission_id INTEGER NOT NULL,
    granted_date TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role, permission_id)
);

-- USER_SESSIONS TABLE - JWT session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE NOT NULL,
    
    -- Session metadata
    device_info TEXT,
    ip_address TEXT,
    user_agent TEXT,
    
    -- Timestamps
    created_date TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
    
    -- Session status
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TEXT,
    revoked_reason TEXT,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- USER_ACTIVITY_LOG TABLE - Track user actions
CREATE TABLE IF NOT EXISTS user_activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT, -- JSON string for additional data
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- SECURITY_EVENTS TABLE - Track security-related events
CREATE TABLE IF NOT EXISTS security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL, -- login_success, login_failed, password_changed, etc.
    user_id INTEGER,
    username TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT, -- JSON string for additional data
    severity TEXT DEFAULT 'info' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- STEP 2: CREATE INDEXES
-- ============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_member_id ON users(member_id);

-- Sessions table indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON user_activity_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_action ON user_activity_log(action);

-- Security events indexes
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);

-- ============================================================================
-- STEP 3: CREATE VIEWS
-- ============================================================================

-- Active users with role information
CREATE VIEW IF NOT EXISTS active_users AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.full_name,
    u.role,
    u.profile_image,
    u.last_login,
    u.created_date,
    m.name as member_name,
    m.phone as member_phone
FROM users u
LEFT JOIN members m ON u.member_id = m.id
WHERE u.is_active = TRUE;

-- Current active sessions
CREATE VIEW IF NOT EXISTS active_sessions AS
SELECT 
    s.id,
    s.user_id,
    u.username,
    u.full_name,
    s.device_info,
    s.ip_address,
    s.created_date,
    s.expires_at,
    s.last_activity
FROM user_sessions s
JOIN users u ON s.user_id = u.id
WHERE s.is_active = TRUE 
AND s.expires_at > CURRENT_TIMESTAMP;

-- Recent security events
CREATE VIEW IF NOT EXISTS recent_security_events AS
SELECT 
    se.id,
    se.event_type,
    se.username,
    se.ip_address,
    se.severity,
    se.timestamp,
    u.full_name,
    u.role
FROM security_events se
LEFT JOIN users u ON se.user_id = u.id
ORDER BY se.timestamp DESC
LIMIT 100;

-- User permissions view
CREATE VIEW IF NOT EXISTS user_permissions AS
SELECT 
    u.id as user_id,
    u.username,
    u.role,
    p.name as permission,
    p.description as permission_description,
    p.category as permission_category
FROM users u
JOIN role_permissions rp ON u.role = rp.role
JOIN permissions p ON rp.permission_id = p.id
WHERE u.is_active = TRUE;

-- ============================================================================
-- STEP 4: CREATE TRIGGERS (LAST - after all tables exist)
-- ============================================================================

-- Update timestamp trigger for users
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_date = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Log user creation
CREATE TRIGGER IF NOT EXISTS log_user_creation
AFTER INSERT ON users
BEGIN
    INSERT INTO user_activity_log (user_id, username, action, details)
    VALUES (NEW.id, NEW.username, 'user_created', 
            '{"role":"' || NEW.role || '","email":"' || NEW.email || '"}');
    
    INSERT INTO security_events (event_type, user_id, username, severity, details)
    VALUES ('user_created', NEW.id, NEW.username, 'low',
            '{"role":"' || NEW.role || '","created_by":"system"}');
END;

-- Log password changes
CREATE TRIGGER IF NOT EXISTS log_password_change
AFTER UPDATE OF password_hash ON users
WHEN OLD.password_hash != NEW.password_hash
BEGIN
    UPDATE users SET last_password_change = CURRENT_TIMESTAMP WHERE id = NEW.id;
    
    INSERT INTO security_events (event_type, user_id, username, severity, details)
    VALUES ('password_changed', NEW.id, NEW.username, 'medium',
            '{"changed_at":"' || CURRENT_TIMESTAMP || '"}');
END;

-- Clean up expired sessions
CREATE TRIGGER IF NOT EXISTS cleanup_expired_sessions
AFTER INSERT ON user_sessions
BEGIN
    UPDATE user_sessions 
    SET is_active = FALSE, revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'expired'
    WHERE expires_at < CURRENT_TIMESTAMP AND is_active = TRUE;
END;