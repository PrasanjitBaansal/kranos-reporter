// Context7-grounded: Enhanced Financial Reports with Expense Integration
import Database from '$lib/db/database.js';
import { json } from '@sveltejs/kit';

export async function GET({ url, locals }) {
    // Context7-grounded: Permission check
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!locals.permissions.includes('reports.view')) {
        return json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const startDate = url.searchParams.get('start');
    const endDate = url.searchParams.get('end');

    if (!startDate || !endDate) {
        return json({ 
            success: false, 
            error: 'Start date and end date are required' 
        }, { status: 400 });
    }

    const db = new Database();
    try {
        db.connect();
        
        // Context7-grounded: Get comprehensive financial report with expenses
        const financialData = db.getFinancialReportWithExpenses(startDate, endDate);
        
        // Get payment summary for the same period
        const paymentSummary = db.getPaymentSummary(startDate, endDate);
        
        // Calculate additional metrics
        const totalIncome = financialData.summary.totalIncome;
        const totalExpenses = financialData.summary.totalExpenses;
        const netProfit = financialData.summary.netProfit;
        const profitMargin = financialData.summary.profitMargin;
        
        // Return enhanced financial report
        return json({
            success: true,
            period: {
                start: startDate,
                end: endDate
            },
            income: {
                data: financialData.income,
                total: totalIncome
            },
            expenses: {
                data: financialData.expenses,
                total: totalExpenses,
                categoryBreakdown: paymentSummary.categoryBreakdown
            },
            summary: {
                totalIncome,
                totalExpenses,
                netProfit,
                profitMargin: parseFloat(profitMargin),
                expenseRatio: totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(2) : 0
            }
        });
    } catch (error) {
        console.error('Enhanced financial report API error:', error);
        return json({ 
            success: false, 
            error: 'Failed to generate financial report' 
        }, { status: 500 });
    } finally {
        db.close();
    }
}