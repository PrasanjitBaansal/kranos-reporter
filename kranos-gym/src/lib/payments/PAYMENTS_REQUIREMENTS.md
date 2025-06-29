# Payments Management System - Requirements & Implementation Plan

## Overview
This document outlines the requirements and implementation plan for adding a comprehensive payments management system to Kranos Gym. The system will handle expense tracking while maintaining the existing income tracking through memberships.

## Business Requirements

### 1. Expense Management
- **Purpose**: Track all outgoing payments from the gym
- **Payment Types**:
  - Fixed monthly salaries for trainers/staff
  - Per-session payments for trainers
  - Marketing expenses (social media, outdoor advertising)
  - Operational expenses (utilities, equipment, maintenance)
  - Other miscellaneous expenses

### 2. Payment Schedule
- All payments for the previous month are processed on the 10th of the current month
- Need to track which payments are pending vs completed

### 3. Trainer Payment Structure
- **Fixed Salary**: Monthly fixed amount
- **Session-Based**: Per-session rate × number of sessions
- Trainers are linked to their member records in the system
- Need to store per-session rates for each trainer

### 4. Payment Methods
- Primary: Bank transfers
- Optional field for tracking payment method (not mandatory)

### 5. Categories
- Dynamic category system (not a fixed list)
- Categories include: Trainer Fees, Marketing, Staff Salaries, Utilities, Equipment, etc.
- Dropdown should show all unique previously-used categories
- Allow creation of new categories on the fly

## Technical Requirements

### 1. Database Schema

```sql
-- Expense tracking table
CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    recipient_name TEXT NOT NULL,
    recipient_member_id INTEGER,
    payment_type TEXT CHECK(payment_type IN ('fixed', 'session_based')),
    payment_method TEXT,
    payment_date DATE NOT NULL,
    payment_for_month TEXT, -- Format: YYYY-MM
    is_paid BOOLEAN DEFAULT 0,
    paid_on DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL,
    updated_by INTEGER,
    FOREIGN KEY (recipient_member_id) REFERENCES members(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Trainer rates for session-based payments
CREATE TABLE trainer_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trainer_member_id INTEGER NOT NULL,
    per_session_rate DECIMAL(10,2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL,
    FOREIGN KEY (trainer_member_id) REFERENCES members(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Trainer sessions tracking (for session-based payments)
CREATE TABLE trainer_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trainer_member_id INTEGER NOT NULL,
    session_date DATE NOT NULL,
    session_count INTEGER DEFAULT 1,
    session_month TEXT NOT NULL, -- Format: YYYY-MM
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL,
    FOREIGN KEY (trainer_member_id) REFERENCES members(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Expense categories (for tracking unique categories)
CREATE TABLE expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. UI/UX Implementation

#### Navigation Structure
- Add "Payments" to main navigation with icon '💳'
- Required permission: 'payments.view'
- Route: `/payments`

#### Page Layout (Following Members Pattern)
```
┌─────────────────────────────────────────────────────┐
│ Header: "Expense Management"    [+ Add Expense]      │
├─────────────────────────────────────────────────────┤
│ Metrics Cards:                                       │
│ - Total Expenses (Current Month)                     │
│ - Pending Payments                                   │
│ - Top Categories                                     │
│ - Trainer Payments Due                               │
├─────────────────────────────────────────────────────┤
│ Filters:                                             │
│ [Date Range] [Category ▼] [Payment Status ▼]        │
│ [Recipient Search]                                   │
├─────────────────────────────────────────────────────┤
│ Expenses Table:                                      │
│ Date | Category | Recipient | Amount | Status | [⋮]  │
│ ...                                                  │
└─────────────────────────────────────────────────────┘
```

#### Add/Edit Expense Modal
- Fields:
  - Category (dropdown with existing + "Add new")
  - Recipient Name (text)
  - Link to Member? (checkbox → member search)
  - Payment Type (fixed/session-based)
  - Amount (auto-calculated for session-based)
  - Description
  - Payment Date
  - Payment For Month
  - Payment Method (optional)
  - Status (Pending/Paid)

### 3. Implementation Patterns to Follow

#### Form Validation
```javascript
// Client-side validation
const validateExpense = (data) => {
    const errors = {};
    if (!data.amount || data.amount <= 0) {
        errors.amount = 'Amount must be greater than 0';
    }
    if (!data.category) {
        errors.category = 'Category is required';
    }
    if (!data.recipient_name) {
        errors.recipient_name = 'Recipient name is required';
    }
    // Add more validations...
    return errors;
};

// Real-time error clearing
$: if (formData.amount > 0) formErrors.amount = '';
```

#### Server Actions Structure
```javascript
// Following existing pattern
export const actions = {
    create: async ({ request, locals }) => {
        // Permission check
        if (!locals.user.canManagePayments()) {
            return fail(403, { error: 'Unauthorized' });
        }
        
        // Validation and creation logic
        try {
            const data = await request.formData();
            // Process and validate
            db.createExpense(data);
            return { success: true };
        } catch (error) {
            return fail(400, { error: error.message });
        }
    },
    
    update: async ({ request, locals }) => {
        // Similar pattern
    },
    
    delete: async ({ request, locals }) => {
        // Soft delete pattern
    }
};
```

#### Database Methods
```javascript
// In database.js, following existing patterns
createExpense(data) {
    this.connect();
    const stmt = this.prepare(`
        INSERT INTO expenses (
            amount, category, description, recipient_name,
            recipient_member_id, payment_type, payment_method,
            payment_date, payment_for_month, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
        data.amount, data.category, data.description,
        data.recipient_name, data.recipient_member_id,
        data.payment_type, data.payment_method,
        data.payment_date, data.payment_for_month,
        data.created_by
    );
    
    return result.lastInsertRowid;
}

getExpensesByDateRange(startDate, endDate, filters = {}) {
    // Implementation following getMembers pattern
}

getExpenseMetrics(month) {
    // Aggregate queries for dashboard metrics
}
```

### 4. Integration Points

#### Financial Reports Update
- Modify `/reporting` to include expense data
- Add new report sections:
  - Income vs Expenses comparison
  - Category-wise expense breakdown
  - Trainer payment summary
  - Monthly P&L statement

#### Member Integration
- When selecting a trainer for payment, show:
  - Their current rate (if session-based)
  - Number of sessions in the selected month
  - Auto-calculate payment amount

#### Permission System
- Add new permissions:
  - `payments.view` - View expense records
  - `payments.create` - Create new expenses
  - `payments.update` - Edit existing expenses
  - `payments.delete` - Delete expenses
  - `payments.manage_rates` - Manage trainer rates

### 5. Special Features

#### Session-Based Payment Calculation
```javascript
// Auto-calculate payment for session-based trainers
$: if (formData.payment_type === 'session_based' && formData.recipient_member_id) {
    const rate = getTrainerRate(formData.recipient_member_id);
    const sessions = getTrainerSessions(formData.recipient_member_id, formData.payment_for_month);
    formData.amount = rate * sessions.length;
}
```

#### Pending Payments Dashboard
- Show all unpaid expenses for previous months
- Quick action to mark as paid
- Bulk payment marking functionality

#### Category Management
- Auto-complete dropdown with existing categories
- "Add new category" option in dropdown
- Track category usage frequency for smart sorting

### 6. Migration Strategy

1. **Phase 1**: Deploy database schema
2. **Phase 2**: Implement basic CRUD for expenses
3. **Phase 3**: Add trainer rates and session tracking
4. **Phase 4**: Integrate with financial reports
5. **Phase 5**: Add advanced features (bulk operations, recurring payments)

### 7. Testing Requirements

- Test payment calculation accuracy
- Verify permission-based access control
- Ensure data integrity with member linkages
- Validate date-based filtering
- Test category auto-complete functionality
- Verify financial report accuracy with new expense data

### 8. Future Enhancements (Not in MVP)

- Recurring payment templates
- Payment approval workflow
- Email notifications for pending payments
- Export payments to accounting software
- Payment receipt generation
- Budget tracking and alerts

## Success Criteria

1. ✅ All expense types can be tracked accurately
2. ✅ Trainer payments (fixed and session-based) are calculated correctly
3. ✅ Categories are dynamic and searchable
4. ✅ Integration with existing financial reports
5. ✅ Follows existing UI/UX patterns consistently
6. ✅ Maintains data integrity and audit trail
7. ✅ Permission-based access control implemented
8. ✅ All database operations follow existing patterns

## Notes

- Income tracking remains in membership purchases
- No journal-style entries in MVP (can be added later)
- Payment method field is optional
- All payments for a month are processed on the 10th of next month
- Soft delete pattern for maintaining audit trail