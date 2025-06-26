import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte/svelte5';
import { tick } from 'svelte';
import { renderComponent, mockFetch, mockData } from './utils.js';

// Let's test the date formatting function directly
describe('Dashboard Data Processing Debug', () => {
	function formatTimestamp(dateStr) {
		const date = new Date(dateStr);
		const now = new Date();
		const diffTime = now - date;
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
		
		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return '1 day ago';
		if (diffDays < 7) return `${diffDays} days ago`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
		return `${Math.floor(diffDays / 30)} months ago`;
	}

	it('should test date formatting with mock data', () => {
		const gcm = mockData.groupMemberships[0];
		console.log('Mock GC membership:', gcm);
		console.log('Purchase date:', gcm.purchase_date);
		console.log('Formatted timestamp:', formatTimestamp(gcm.purchase_date));
		
		expect(gcm.purchase_date).toBeDefined();
	});

	it('should test data processing', () => {
		const data = {
			members: mockData.members,
			groupClassMemberships: mockData.groupMemberships,
			ptMemberships: mockData.ptMemberships
		};
		
		console.log('Data processing test:');
		console.log('Members count:', data.members.length);
		console.log('Active members:', data.members.filter(m => m.status === 'Active').length);
		console.log('GC memberships:', data.groupClassMemberships.length);
		console.log('PT memberships:', data.ptMemberships.length);
		
		// Test the monthly revenue calculation
		const now = new Date();
		const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
		console.log('Current month string:', currentMonth);
		
		const monthlyGCRevenue = data.groupClassMemberships
			.filter(gcm => gcm.purchase_date && gcm.purchase_date.startsWith(currentMonth))
			.reduce((sum, gcm) => sum + (gcm.amount_paid || 0), 0);
		console.log('Monthly GC revenue:', monthlyGCRevenue);
		
		expect(data.members.length).toBeGreaterThan(0);
	});
});