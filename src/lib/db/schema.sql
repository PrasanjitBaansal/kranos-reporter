-- Kranos Gym Management System Database Schema

CREATE TABLE members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    join_date TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1
);

CREATE TABLE group_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    default_amount REAL NOT NULL,
    display_name TEXT UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT 1
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
    is_active BOOLEAN NOT NULL DEFAULT 1,
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