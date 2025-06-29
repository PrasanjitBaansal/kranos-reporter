-- Payments Management System Database Schema
-- Context7-grounded: Following established Kranos patterns with better-sqlite3 optimization

-- Core expense tracking table
CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL,
    description TEXT,
    payment_date TEXT NOT NULL,
    payment_method TEXT DEFAULT 'Bank Transfer',
    recipient TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Paid' CHECK (status IN ('Paid', 'Pending', 'Cancelled')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Trainer payment configuration table
CREATE TABLE trainer_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trainer_id INTEGER NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('fixed', 'session')),
    monthly_salary REAL CHECK (monthly_salary > 0),
    per_session_rate REAL CHECK (per_session_rate > 0),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Deleted')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trainer_id) REFERENCES members(id) ON DELETE CASCADE,
    UNIQUE (trainer_id, status),
    -- Ensure either monthly_salary OR per_session_rate is set based on payment_type
    CHECK (
        (payment_type = 'fixed' AND monthly_salary > 0 AND per_session_rate IS NULL) OR
        (payment_type = 'session' AND per_session_rate > 0 AND monthly_salary IS NULL)
    )
);

-- Session-based payment tracking table
CREATE TABLE trainer_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trainer_id INTEGER NOT NULL,
    session_date TEXT NOT NULL,
    session_count INTEGER NOT NULL CHECK (session_count > 0),
    amount_per_session REAL NOT NULL CHECK (amount_per_session > 0),
    total_amount REAL GENERATED ALWAYS AS (session_count * amount_per_session) STORED,
    status TEXT NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Confirmed', 'Pending', 'Paid', 'Cancelled')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trainer_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Context7-grounded: Performance optimization indexes
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_payment_date ON expenses(payment_date);
CREATE INDEX idx_expenses_recipient ON expenses(recipient);
CREATE INDEX idx_expenses_status ON expenses(status);

CREATE INDEX idx_trainer_rates_trainer_id ON trainer_rates(trainer_id);
CREATE INDEX idx_trainer_rates_status ON trainer_rates(status);
CREATE INDEX idx_trainer_rates_payment_type ON trainer_rates(payment_type);

CREATE INDEX idx_trainer_sessions_trainer_id ON trainer_sessions(trainer_id);
CREATE INDEX idx_trainer_sessions_date ON trainer_sessions(session_date);
CREATE INDEX idx_trainer_sessions_status ON trainer_sessions(status);

-- Context7-grounded: Composite indexes for common query patterns
CREATE INDEX idx_expenses_category_date ON expenses(category, payment_date);
CREATE INDEX idx_trainer_sessions_trainer_date ON trainer_sessions(trainer_id, session_date);

-- Add payments permissions to existing auth system
INSERT INTO permissions (name, description, category) VALUES
('payments.view', 'View payments and expenses', 'Payments'),
('payments.create', 'Create new payments and expenses', 'Payments'),
('payments.edit', 'Edit existing payments and expenses', 'Payments'),
('payments.delete', 'Delete payments and expenses', 'Payments');

-- Grant payments permissions to admin and super_user roles
INSERT INTO role_permissions (role, permission_id, granted) 
SELECT 'admin', id, 1 FROM permissions WHERE name LIKE 'payments.%';

INSERT INTO role_permissions (role, permission_id, granted) 
SELECT 'super_user', id, 1 FROM permissions WHERE name LIKE 'payments.%';

-- Grant view permission to trainer role for their own payment tracking
INSERT INTO role_permissions (role, permission_id, granted) 
SELECT 'trainer', id, 1 FROM permissions WHERE name = 'payments.view';