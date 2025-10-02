-- Kranos Gym Management System Database Schema

CREATE TABLE members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    join_date TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Deleted', 'New'))
);

CREATE TABLE group_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    default_amount REAL,
    display_name TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Deleted'))
);

CREATE TABLE group_class_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    start_date TEXT,
    end_date TEXT,
    amount_paid REAL,
    purchase_date TEXT,
    membership_type TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Deleted')),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES group_plans(id) ON DELETE RESTRICT,
    UNIQUE (member_id, plan_id, start_date)
);

CREATE TABLE pt_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    purchase_date TEXT,
    amount_paid REAL,
    sessions_total INTEGER,
    sessions_remaining INTEGER,
    FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE TABLE app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- USERS TABLE - Core authentication table
-- ============================================================================
CREATE TABLE users (
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

-- ============================================================================
-- USER_SESSIONS TABLE - JWT session management
-- ============================================================================
CREATE TABLE user_sessions (
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

-- ============================================================================
-- USER_ACTIVITY_LOG TABLE - Track user actions
-- ============================================================================
CREATE TABLE user_activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);