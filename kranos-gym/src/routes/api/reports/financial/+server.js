import { json } from '@sveltejs/kit';
import Database from '$lib/db/database.js';
import { sanitizeHtml, sanitizeDate } from '$lib/security/sanitize.js';

export async function GET({ url }) {
	const db = new Database();
	try {
		// Get and validate date range parameters from query string
		let startDate = url.searchParams.get('startDate');
		let endDate = url.searchParams.get('endDate');
		
		// Validate date format (YYYY-MM-DD) if dates are provided
		const datePattern = /^\d{4}-\d{2}-\d{2}$/;
		if (startDate && !datePattern.test(startDate)) {
			return json({ 
				error: 'Invalid date format. Use YYYY-MM-DD.' 
			}, { status: 400 });
		}
		
		if (endDate && !datePattern.test(endDate)) {
			return json({ 
				error: 'Invalid date format. Use YYYY-MM-DD.' 
			}, { status: 400 });
		}
		
		// Ensure end date is not before start date if both provided
		if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
			return json({ 
				error: 'Start date must be before end date' 
			}, { status: 400 });
		}
		
		console.log(`API: Fetching financial report from ${startDate} to ${endDate}`);
		
		// Ensure database connection before querying
		db.connect();

		// Get financial summary data
		const reportData = db.getFinancialReport(startDate, endDate);
		
		// Get detailed transaction data for the same period
		const detailedTransactions = getDetailedTransactions(db, startDate, endDate);

		console.log(`API: Found ${reportData.length} summary records and ${detailedTransactions.length} detailed transactions`);

		// Process the aggregated data
		const gcData = reportData.find(r => r.type === 'Group Class') || { count: 0, total_amount: 0 };
		const ptData = reportData.find(r => r.type === 'Personal Training') || { count: 0, total_amount: 0 };

		const totalRevenue = (gcData.total_amount || 0) + (ptData.total_amount || 0);
		const totalTransactions = (gcData.count || 0) + (ptData.count || 0);
		const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

		// Calculate daily average
		const daysDiff = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));
		const dailyAverage = totalRevenue / daysDiff;

		const financialReport = {
			total_revenue: totalRevenue,
			gc_revenue: gcData.total_amount || 0,
			pt_revenue: ptData.total_amount || 0,
			total_transactions: totalTransactions,
			gc_transactions: gcData.count || 0,
			pt_transactions: ptData.count || 0,
			avg_transaction: avgTransaction,
			daily_average: dailyAverage,
			transactions: detailedTransactions
		};

		return json(financialReport);

	} catch (error) {
		console.error('API Error fetching financial report:', error);
		return json({ 
			error: 'Failed to generate financial report' 
		}, { status: 500 });
	} finally {
		try {
			db.close();
		} catch (closeError) {
			console.error('API Error closing database:', closeError);
		}
	}
}

// Helper function to get detailed transaction data
function getDetailedTransactions(db, startDate, endDate) {
	const stmt = db.prepare(`
		SELECT 
			gcm.purchase_date as date,
			m.name as member_name,
			'group_class' as type,
			gp.display_name as plan_or_sessions,
			gcm.amount_paid as amount
		FROM group_class_memberships gcm
		JOIN members m ON gcm.member_id = m.id
		JOIN group_plans gp ON gcm.plan_id = gp.id
		WHERE gcm.purchase_date BETWEEN ? AND ?
		AND gcm.status != ?
		
		UNION ALL
		
		SELECT 
			pt.purchase_date as date,
			m.name as member_name,
			'personal_training' as type,
			'PT Sessions (' || pt.sessions_total || ')' as plan_or_sessions,
			pt.amount_paid as amount
		FROM pt_memberships pt
		JOIN members m ON pt.member_id = m.id
		WHERE pt.purchase_date BETWEEN ? AND ?
		
		ORDER BY date DESC
	`);
	
	return stmt.all(startDate, endDate, 'Deleted', startDate, endDate);
}