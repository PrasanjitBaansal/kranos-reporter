import { json } from '@sveltejs/kit';
import Database from '$lib/db/database.js';

export async function GET({ params, url }) {
	const db = new Database();
	try {
		const memberId = parseInt(params.id);
		
		if (isNaN(memberId)) {
			return json({ error: 'Invalid member ID' }, { status: 400 });
		}

		console.log(`API: Fetching memberships for member ID: ${memberId}`);
		
		// Ensure database connection before querying
		db.connect();

		// Get member details first
		const member = db.getMemberById(memberId);
		if (!member) {
			return json({ error: 'Member not found' }, { status: 404 });
		}

		// Check if specific type is requested
		const type = url.searchParams.get('type');
		
		let groupMemberships = [];
		let ptMemberships = [];
		
		if (!type || type === 'group') {
			groupMemberships = db.getGroupClassMembershipsByMemberId(memberId);
		}
		
		if (!type || type === 'pt') {
			ptMemberships = db.getPTMembershipsByMemberId(memberId);
		}

		console.log(`API: Found ${groupMemberships.length} GC and ${ptMemberships.length} PT memberships`);

		const response = {
			member: member,
			groupMemberships: groupMemberships,
			ptMemberships: ptMemberships
		};

		return json(response);

	} catch (error) {
		console.error('API Error fetching member memberships:', error);
		return json({ error: 'Failed to fetch member memberships' }, { status: 500 });
	} finally {
		try {
			db.close();
		} catch (closeError) {
			console.error('API Error closing database:', closeError);
		}
	}
}