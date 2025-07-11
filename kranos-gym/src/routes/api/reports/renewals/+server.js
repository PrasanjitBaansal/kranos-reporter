import { json } from '@sveltejs/kit';
import Database from '$lib/db/database.js';
import { sanitizeHtml } from '$lib/security/sanitize.js';

export async function GET({ url }) {
	const db = new Database();
	try {
		// Get and validate days parameter from query string
		const daysParam = url.searchParams.get('days');
		let days = 30; // default
		
		if (daysParam) {
			const parsedDays = parseInt(daysParam, 10);
			if (!isNaN(parsedDays) && parsedDays > 0 && parsedDays <= 365) {
				days = parsedDays;
			}
		}
		
		console.log(`API: Fetching upcoming renewals for next ${days} days`);
		
		// Ensure database connection before querying
		db.connect();

		// Get upcoming renewals
		const renewals = db.getUpcomingRenewals(days) || [];

		// Sanitize output data to prevent XSS
		const sanitizedRenewals = renewals.map(renewal => ({
			...renewal,
			member_name: sanitizeHtml(renewal.member_name || ''),
			member_phone: sanitizeHtml(renewal.member_phone || ''),
			plan_name: sanitizeHtml(renewal.plan_name || '')
		}));

		console.log(`API: Found ${sanitizedRenewals.length} upcoming renewals`);

		return json({
			success: true,
			data: sanitizedRenewals,
			days: days
		});

	} catch (error) {
		console.error('API Error fetching upcoming renewals:', error);
		return json({ 
			success: false, 
			error: 'Failed to fetch upcoming renewals' 
		}, { status: 500 });
	} finally {
		try {
			db.close();
		} catch (closeError) {
			console.error('API Error closing database:', closeError);
		}
	}
}