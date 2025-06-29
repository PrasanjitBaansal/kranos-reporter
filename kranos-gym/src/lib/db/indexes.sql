-- Context7-grounded: SQLite Indexing Strategy for Kranos Gym

-- Foreign Key Indexes (Critical for JOIN performance)
CREATE INDEX IF NOT EXISTS idx_gcm_member_id ON group_class_memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_gcm_plan_id ON group_class_memberships(plan_id);
CREATE INDEX IF NOT EXISTS idx_pt_member_id ON pt_memberships(member_id);

-- Status Filtering Indexes (Frequent WHERE conditions)
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_gcm_status ON group_class_memberships(status);
CREATE INDEX IF NOT EXISTS idx_gp_status ON group_plans(status);

-- Date Range Indexes (For membership queries and reporting)
CREATE INDEX IF NOT EXISTS idx_gcm_dates ON group_class_memberships(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_gcm_purchase_date ON group_class_memberships(purchase_date);
CREATE INDEX IF NOT EXISTS idx_pt_purchase_date ON pt_memberships(purchase_date);
CREATE INDEX IF NOT EXISTS idx_members_join_date ON members(join_date);

-- Compound Indexes (Multi-column queries)
CREATE INDEX IF NOT EXISTS idx_gcm_member_status ON group_class_memberships(member_id, status);
CREATE INDEX IF NOT EXISTS idx_gcm_active_dates ON group_class_memberships(status, start_date, end_date);

-- Unique Constraint Optimization
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_gp_display_name ON group_plans(display_name);

-- Reporting Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_gcm_reporting ON group_class_memberships(purchase_date, amount_paid, status);
CREATE INDEX IF NOT EXISTS idx_pt_reporting ON pt_memberships(purchase_date, amount_paid);