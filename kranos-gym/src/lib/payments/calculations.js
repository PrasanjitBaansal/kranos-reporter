// Payment calculation utilities

/**
 * Calculate trainer payment based on rate type
 * @param {Object} options - Payment calculation options
 * @param {string} options.rateType - 'fixed' or 'per-session'
 * @param {number} options.fixedAmount - Fixed monthly amount (for fixed type)
 * @param {number} options.perSessionRate - Rate per session (for per-session type)
 * @param {number} options.sessions - Number of sessions (for per-session type)
 * @returns {number} Total payment amount
 */
export function calculateTrainerPayment({ rateType, fixedAmount, perSessionRate, sessions }) {
    if (rateType === 'fixed') {
        return fixedAmount || 0;
    } else if (rateType === 'per-session') {
        return (perSessionRate || 0) * (sessions || 0);
    }
    return 0;
}

/**
 * Calculate total expenses from an array of expenses
 * @param {Array} expenses - Array of expense objects
 * @returns {Object} Summary with total, count, and average
 */
export function calculateExpenseSummary(expenses) {
    if (!Array.isArray(expenses) || expenses.length === 0) {
        return { total: 0, count: 0, average: 0 };
    }

    const total = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const count = expenses.length;
    const average = count > 0 ? total / count : 0;

    return { total, count, average };
}

/**
 * Calculate expense breakdown by category
 * @param {Array} expenses - Array of expense objects
 * @returns {Object} Category-wise breakdown
 */
export function calculateCategoryBreakdown(expenses) {
    if (!Array.isArray(expenses)) {
        return {};
    }

    return expenses.reduce((breakdown, expense) => {
        const category = expense.category || 'Other';
        if (!breakdown[category]) {
            breakdown[category] = { total: 0, count: 0, items: [] };
        }
        breakdown[category].total += expense.amount || 0;
        breakdown[category].count += 1;
        breakdown[category].items.push(expense);
        return breakdown;
    }, {});
}

/**
 * Calculate financial metrics
 * @param {number} totalIncome - Total income amount
 * @param {number} totalExpenses - Total expenses amount
 * @returns {Object} Financial metrics
 */
export function calculateFinancialMetrics(totalIncome, totalExpenses) {
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

    return {
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin: Math.round(profitMargin * 100) / 100, // Round to 2 decimals
        expenseRatio: Math.round(expenseRatio * 100) / 100
    };
}

/**
 * Validate expense data
 * @param {Object} expense - Expense object to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateExpense(expense) {
    const errors = [];

    if (!expense.description || expense.description.trim() === '') {
        errors.push('Description is required');
    }

    if (expense.amount === undefined || expense.amount === null) {
        errors.push('Amount is required');
    } else if (expense.amount < 0) {
        errors.push('Amount cannot be negative');
    }

    if (!expense.category || expense.category.trim() === '') {
        errors.push('Category is required');
    }

    if (!expense.paymentDate) {
        errors.push('Payment date is required');
    }

    if (!expense.paymentMethod || expense.paymentMethod.trim() === '') {
        errors.push('Payment method is required');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Filter expenses by date range
 * @param {Array} expenses - Array of expense objects
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} Filtered expenses
 */
export function filterExpensesByDateRange(expenses, startDate, endDate) {
    if (!Array.isArray(expenses)) {
        return [];
    }

    return expenses.filter(expense => {
        const paymentDate = expense.paymentDate;
        if (!paymentDate) return false;

        if (startDate && paymentDate < startDate) return false;
        if (endDate && paymentDate > endDate) return false;

        return true;
    });
}

/**
 * Calculate pending payments
 * @param {Array} expenses - Array of expense objects
 * @returns {Object} Pending payment summary
 */
export function calculatePendingPayments(expenses) {
    if (!Array.isArray(expenses)) {
        return { total: 0, count: 0, items: [] };
    }

    const pendingExpenses = expenses.filter(expense => expense.status === 'Pending');
    const total = pendingExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

    return {
        total,
        count: pendingExpenses.length,
        items: pendingExpenses
    };
}