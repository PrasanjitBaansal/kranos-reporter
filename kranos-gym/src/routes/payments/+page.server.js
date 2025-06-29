// Context7-grounded: Payments Management Server Actions
import Database from '$lib/db/database.js';
import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
    // Context7-grounded: Permission check
    if (!locals.user) {
        throw redirect(302, '/login');
    }
    
    if (!locals.permissions.includes('payments.view')) {
        throw redirect(302, '/');
    }

    const db = new Database();
    try {
        db.connect();
        
        // Get current month for default filter
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        
        // Context7-grounded: Load expense data with current month filter
        const expenses = db.getExpenses({
            startDate: currentMonthStart,
            endDate: currentMonthEnd
        });
        
        // Get categories for dropdown
        const categories = db.getExpenseCategories();
        
        // Get payment summary for metrics
        const paymentSummary = db.getPaymentSummary(currentMonthStart, currentMonthEnd);
        
        // Get trainer rates for trainer payment section
        const trainerRates = db.getTrainerRates(true); // active only
        
        // Get members who can be trainers (for dropdown)
        const members = db.getMembers(true); // active only
        
        return {
            expenses,
            categories,
            paymentSummary,
            trainerRates,
            members,
            currentMonth: {
                start: currentMonthStart,
                end: currentMonthEnd
            }
        };
    } catch (error) {
        console.error('Payments page load error:', error);
        return {
            expenses: [],
            categories: [],
            paymentSummary: { total_expenses: 0, total_amount: 0, avg_amount: 0, categoryBreakdown: [] },
            trainerRates: [],
            members: [],
            currentMonth: {
                start: new Date().toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
            }
        };
    } finally {
        db.close();
    }
};

export const actions = {
    // Context7-grounded: Create expense action
    createExpense: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { error: 'Unauthorized' });
        }
        
        if (!locals.permissions.includes('payments.create')) {
            return fail(403, { error: 'Insufficient permissions' });
        }

        const formData = await request.formData();
        const expense = {
            amount: parseFloat(formData.get('amount')),
            category: formData.get('category')?.trim(),
            description: formData.get('description')?.trim(),
            payment_date: formData.get('payment_date'),
            payment_method: formData.get('payment_method') || 'Bank Transfer',
            recipient: formData.get('recipient')?.trim()
        };

        // Context7-grounded: Validation
        const errors = {};
        if (!expense.amount || expense.amount <= 0) {
            errors.amount = 'Amount must be greater than 0';
        }
        if (!expense.category) {
            errors.category = 'Category is required';
        }
        if (!expense.recipient) {
            errors.recipient = 'Recipient is required';
        }
        if (!expense.payment_date) {
            errors.payment_date = 'Payment date is required';
        }

        if (Object.keys(errors).length > 0) {
            return fail(400, { errors, expense });
        }

        const db = new Database();
        try {
            db.connect();
            const result = db.createExpense(expense);
            
            // Context7-grounded: Activity logging
            db.logActivity({
                user_id: locals.user.id,
                username: locals.user.username,
                action: 'create',
                resource_type: 'expense',
                resource_id: result.id,
                ip_address: locals.clientIP,
                user_agent: locals.userAgent
            });
            
            return { success: true, expense: result };
        } catch (error) {
            console.error('Create expense error:', error);
            return fail(500, { error: 'Failed to create expense' });
        } finally {
            db.close();
        }
    },

    // Context7-grounded: Update expense action
    updateExpense: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { error: 'Unauthorized' });
        }
        
        if (!locals.permissions.includes('payments.edit')) {
            return fail(403, { error: 'Insufficient permissions' });
        }

        const formData = await request.formData();
        const id = parseInt(formData.get('id'));
        const expense = {
            amount: parseFloat(formData.get('amount')),
            category: formData.get('category')?.trim(),
            description: formData.get('description')?.trim(),
            payment_date: formData.get('payment_date'),
            payment_method: formData.get('payment_method') || 'Bank Transfer',
            recipient: formData.get('recipient')?.trim(),
            status: formData.get('status') || 'Paid'
        };

        // Context7-grounded: Validation
        const errors = {};
        if (!id || isNaN(id)) {
            return fail(400, { error: 'Invalid expense ID' });
        }
        if (!expense.amount || expense.amount <= 0) {
            errors.amount = 'Amount must be greater than 0';
        }
        if (!expense.category) {
            errors.category = 'Category is required';
        }
        if (!expense.recipient) {
            errors.recipient = 'Recipient is required';
        }
        if (!expense.payment_date) {
            errors.payment_date = 'Payment date is required';
        }

        if (Object.keys(errors).length > 0) {
            return fail(400, { errors, expense: { id, ...expense } });
        }

        const db = new Database();
        try {
            db.connect();
            const result = db.updateExpense(id, expense);
            
            if (result.changes === 0) {
                return fail(404, { error: 'Expense not found' });
            }
            
            // Context7-grounded: Activity logging
            db.logActivity({
                user_id: locals.user.id,
                username: locals.user.username,
                action: 'update',
                resource_type: 'expense',
                resource_id: id,
                ip_address: locals.clientIP,
                user_agent: locals.userAgent
            });
            
            return { success: true, expense: { id, ...expense } };
        } catch (error) {
            console.error('Update expense error:', error);
            return fail(500, { error: 'Failed to update expense' });
        } finally {
            db.close();
        }
    },

    // Context7-grounded: Delete expense action
    deleteExpense: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { error: 'Unauthorized' });
        }
        
        if (!locals.permissions.includes('payments.delete')) {
            return fail(403, { error: 'Insufficient permissions' });
        }

        const formData = await request.formData();
        const id = parseInt(formData.get('id'));

        if (!id || isNaN(id)) {
            return fail(400, { error: 'Invalid expense ID' });
        }

        const db = new Database();
        try {
            db.connect();
            const result = db.deleteExpense(id);
            
            if (result.changes === 0) {
                return fail(404, { error: 'Expense not found' });
            }
            
            // Context7-grounded: Activity logging
            db.logActivity({
                user_id: locals.user.id,
                username: locals.user.username,
                action: 'delete',
                resource_type: 'expense',
                resource_id: id,
                ip_address: locals.clientIP,
                user_agent: locals.userAgent
            });
            
            return { success: true };
        } catch (error) {
            console.error('Delete expense error:', error);
            return fail(500, { error: 'Failed to delete expense' });
        } finally {
            db.close();
        }
    },

    // Context7-grounded: Create trainer rate action
    createTrainerRate: async ({ request, locals }) => {
        if (!locals.user) {
            return fail(401, { error: 'Unauthorized' });
        }
        
        if (!locals.permissions.includes('payments.create')) {
            return fail(403, { error: 'Insufficient permissions' });
        }

        const formData = await request.formData();
        const rate = {
            trainer_id: parseInt(formData.get('trainer_id')),
            payment_type: formData.get('payment_type'),
            monthly_salary: formData.get('monthly_salary') ? parseFloat(formData.get('monthly_salary')) : null,
            per_session_rate: formData.get('per_session_rate') ? parseFloat(formData.get('per_session_rate')) : null
        };

        // Context7-grounded: Validation
        const errors = {};
        if (!rate.trainer_id || isNaN(rate.trainer_id)) {
            errors.trainer_id = 'Please select a trainer';
        }
        if (!rate.payment_type || !['fixed', 'session'].includes(rate.payment_type)) {
            errors.payment_type = 'Please select a valid payment type';
        }
        if (rate.payment_type === 'fixed' && (!rate.monthly_salary || rate.monthly_salary <= 0)) {
            errors.monthly_salary = 'Monthly salary must be greater than 0';
        }
        if (rate.payment_type === 'session' && (!rate.per_session_rate || rate.per_session_rate <= 0)) {
            errors.per_session_rate = 'Per session rate must be greater than 0';
        }

        if (Object.keys(errors).length > 0) {
            return fail(400, { errors, rate });
        }

        const db = new Database();
        try {
            db.connect();
            const result = db.createTrainerRate(rate);
            
            // Context7-grounded: Activity logging
            db.logActivity({
                user_id: locals.user.id,
                username: locals.user.username,
                action: 'create',
                resource_type: 'trainer_rate',
                resource_id: result.id,
                ip_address: locals.clientIP,
                user_agent: locals.userAgent
            });
            
            return { success: true, trainerRate: result };
        } catch (error) {
            console.error('Create trainer rate error:', error);
            return fail(500, { error: 'Failed to create trainer rate' });
        } finally {
            db.close();
        }
    }
};