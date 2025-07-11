import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte/svelte5';
import { renderComponent, mockFetch } from '../utils.js';
import Dashboard from '../../routes/+page.svelte';

describe('Dashboard Component', () => {
	const mockData = {
		user: {
			id: 1,
			username: 'testadmin',
			role: 'admin',
			permissions: ['dashboard.view']
		},
		members: [
			{ id: 1, name: 'John Doe', status: 'Active', join_date: '2024-01-15' },
			{ id: 2, name: 'Jane Smith', status: 'Active', join_date: '2024-02-01' },
			{ id: 3, name: 'New Member', status: 'New', join_date: new Date().toISOString().split('T')[0] },
			{ id: 4, name: 'Inactive Member', status: 'Inactive', join_date: '2023-01-01' }
		],
		groupMemberships: [
			{ 
				id: 1, 
				member_id: 1, 
				amount_paid: 2000, 
				purchase_date: new Date().toISOString().split('T')[0],
				end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
			},
			{ 
				id: 2, 
				member_id: 2, 
				amount_paid: 2500, 
				purchase_date: new Date().toISOString().split('T')[0],
				end_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
			}
		],
		ptMemberships: [
			{ 
				id: 1, 
				member_id: 1, 
				amount_paid: 6000, 
				purchase_date: new Date().toISOString().split('T')[0]
			}
		]
	};

	beforeEach(() => {
		mockFetch();
	});

	it('should render dashboard with admin view', () => {
		renderComponent(Dashboard, { props: { data: mockData } });
		
		expect(screen.getByText('Dashboard')).toBeInTheDocument();
		expect(screen.getByText(/Welcome to Kranos MMA Dashboard/)).toBeInTheDocument();
	});

	it('should calculate and display stats correctly', async () => {
		renderComponent(Dashboard, { props: { data: mockData } });
		
		await waitFor(() => {
			expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
		});

		// Check stats cards
		expect(screen.getByText('Total Members')).toBeInTheDocument();
		expect(screen.getByText('4')).toBeInTheDocument(); // Total members

		expect(screen.getByText('Active Members')).toBeInTheDocument();
		expect(screen.getByText('2')).toBeInTheDocument(); // Active members

		expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
		// Should show revenue from current month memberships
		const revenue = screen.getByText(/₹\s*10,500/); // 2000 + 2500 + 6000
		expect(revenue).toBeInTheDocument();

		expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
		expect(screen.getByText('1')).toBeInTheDocument(); // 1 membership expiring in 5 days
	});

	it('should show admin quick actions', () => {
		renderComponent(Dashboard, { props: { data: mockData } });
		
		expect(screen.getByText('Quick Actions')).toBeInTheDocument();
		expect(screen.getByText('Add New Member')).toBeInTheDocument();
		expect(screen.getByText('Create Membership')).toBeInTheDocument();
		expect(screen.getByText('View Reports')).toBeInTheDocument();
		expect(screen.getByText('Manage Users')).toBeInTheDocument();
	});

	it('should navigate on quick action click', async () => {
		const { mockGoto } = renderComponent(Dashboard, { props: { data: mockData } });
		
		const addMemberButton = screen.getByText('Add New Member');
		await fireEvent.click(addMemberButton);
		
		expect(mockGoto).toHaveBeenCalledWith('/members');
	});

	it('should show trainer view with limited actions', () => {
		const trainerData = {
			...mockData,
			user: {
				id: 2,
				username: 'trainer1',
				role: 'trainer',
				permissions: ['dashboard.view', 'members.view']
			}
		};
		
		renderComponent(Dashboard, { props: { data: trainerData } });
		
		expect(screen.getByText('Quick Actions')).toBeInTheDocument();
		expect(screen.getByText('View Members')).toBeInTheDocument();
		expect(screen.getByText('View Reports')).toBeInTheDocument();
		
		// Should not show admin-only actions
		expect(screen.queryByText('Add New Member')).not.toBeInTheDocument();
		expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
	});

	it('should show member view with profile access only', () => {
		const memberData = {
			...mockData,
			user: {
				id: 3,
				username: 'member1',
				role: 'member',
				member_id: 1,
				permissions: ['profile.view']
			}
		};
		
		renderComponent(Dashboard, { props: { data: memberData } });
		
		expect(screen.getByText('Welcome to Kranos MMA Dashboard')).toBeInTheDocument();
		expect(screen.getByText('Quick Actions')).toBeInTheDocument();
		expect(screen.getByText('View My Profile')).toBeInTheDocument();
		
		// Should not show other actions
		expect(screen.queryByText('View Members')).not.toBeInTheDocument();
		expect(screen.queryByText('View Reports')).not.toBeInTheDocument();
	});

	it('should show recent activities for admin', async () => {
		renderComponent(Dashboard, { props: { data: mockData } });
		
		await waitFor(() => {
			expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
		});
		
		expect(screen.getByText('Recent Activity')).toBeInTheDocument();
		// Should show recent memberships
		expect(screen.getByText(/New membership created/)).toBeInTheDocument();
	});

	it('should handle password modal for settings access', async () => {
		renderComponent(Dashboard, { props: { data: mockData } });
		
		const settingsButton = screen.getByText('Admin Settings');
		await fireEvent.click(settingsButton);
		
		// Should show password modal
		expect(screen.getByText('Admin Password Required')).toBeInTheDocument();
		expect(screen.getByLabelText('Password')).toBeInTheDocument();
	});

	it('should show loading state initially', () => {
		renderComponent(Dashboard, { props: { data: mockData } });
		
		// Component shows loading briefly on mount
		const dashboard = screen.getByText('Dashboard');
		expect(dashboard).toBeInTheDocument();
	});

	it('should handle unauthorized error from URL params', async () => {
		const { mockShowError } = renderComponent(Dashboard, { 
			props: { data: mockData },
			url: '/?error=unauthorized'
		});
		
		await waitFor(() => {
			expect(mockShowError).toHaveBeenCalledWith(
				'Access denied. You do not have permission to access that page.'
			);
		});
	});

	it('should display correct stats for empty data', () => {
		const emptyData = {
			...mockData,
			members: [],
			groupMemberships: [],
			ptMemberships: []
		};
		
		renderComponent(Dashboard, { props: { data: emptyData } });
		
		// All stats should be 0
		expect(screen.getByText('Total Members')).toBeInTheDocument();
		expect(screen.getAllByText('0')).toHaveLength(4); // All stats should be 0
	});
});