import { json } from '@sveltejs/kit';
import Database from '$lib/db/database.js';

const db = new Database();

export async function GET({ params }) {
	try {
		const memberId = parseInt(params.id);
		
		if (isNaN(memberId)) {
			return json({ error: 'Invalid member ID' }, { status: 400 });
		}

		// Get both group class and PT memberships for the member
		const [gcMemberships, ptMemberships] = await Promise.all([
			db.getGroupClassMembershipsByMemberId(memberId),
			db.getPTMembershipsByMemberId(memberId)
		]);

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

		return json({
			memberships: allMemberships
		});

	} catch (error) {
		console.error('Error fetching member memberships:', error);
		return json({ error: 'Failed to fetch membership history' }, { status: 500 });
	}
}