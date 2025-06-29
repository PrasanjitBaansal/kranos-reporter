import { json } from '@sveltejs/kit';
import Database from '$lib/db/database.js';

export async function GET({ params }) {
	const db = new Database();
	try {
		const memberId = parseInt(params.id);
		
		if (isNaN(memberId)) {
			return json({ error: 'Invalid member ID' }, { status: 400 });
		}

		console.log(`API: Fetching memberships for member ID: ${memberId}`);
		
		// Ensure database connection before querying
		await db.connect();

		// Get both group class and PT memberships for the member (synchronous calls)
		const gcMemberships = db.getGroupClassMembershipsByMemberId(memberId);
		const ptMemberships = db.getPTMembershipsByMemberId(memberId);

		console.log(`API: Found ${gcMemberships.length} GC and ${ptMemberships.length} PT memberships`);

		// Combine and format memberships
		const allMemberships = [
			...gcMemberships.map(membership => ({
				...membership,
				type: 'Group Class',
				plan_name: membership.plan_name || 'Group Class Plan'
			})),
			...ptMemberships.map(membership => ({
				...membership,
				type: 'Personal Training',
				plan_name: `PT Sessions (${membership.sessions_total})`,
				start_date: membership.purchase_date,
				end_date: null, // PT memberships don't have end dates
				membership_type: 'New', // PT memberships are always considered new
				status: 'Active' // PT memberships are active until sessions are used
			}))
		];

		// Sort by start_date/purchase_date (latest first)
		allMemberships.sort((a, b) => {
			const dateA = new Date(a.start_date || a.purchase_date);
			const dateB = new Date(b.start_date || b.purchase_date);
			return dateB - dateA;
		});

		console.log(`API: Returning ${allMemberships.length} total memberships`);

		return json({
			memberships: allMemberships
		});

	} catch (error) {
		console.error('API Error fetching member memberships:', error);
		return json({ error: 'Failed to fetch membership history' }, { status: 500 });
	} finally {
		try {
			await db.close();
		} catch (closeError) {
			console.error('API Error closing database:', closeError);
		}
	}
}