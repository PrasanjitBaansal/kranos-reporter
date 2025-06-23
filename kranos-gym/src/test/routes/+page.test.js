import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte/svelte5';
import { tick } from 'svelte';
import { renderComponent, mockFetch, mockData, waitForSvelteUpdate } from '../utils.js';
import Dashboard from '../../routes/+page.svelte';

describe('Dashboard Component', () => {
	beforeEach(() => {
		mockFetch({
			'/api/dashboard/stats': {
				json: async () => ({
					totalMembers: 156,
					activeMembers: 142,
					monthlyRevenue: 45780,
					expiringSoon: 8
				}),
				ok: true
			}
		});
	});

	it('should render dashboard title and subtitle', () => {
		renderComponent(Dashboard);
		
		expect(screen.getByText('Dashboard')).toBeInTheDocument();
		expect(screen.getByText(/Welcome back! Here's what's happening/)).toBeInTheDocument();
	});

	it('should show loading state initially', () => {
		renderComponent(Dashboard);
		
		expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
		expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
	});

	it('should debug data structure', () => {
		const { mockStores } = renderComponent(Dashboard);
		console.log('Mock data structure:', mockStores.page.data);
		expect(screen.getByText('Dashboard')).toBeInTheDocument();
	});

	it('should display stats cards after loading', async () => {
		renderComponent(Dashboard);
		
		// Wait for component to finish loading
		await waitForSvelteUpdate();
		await waitFor(() => {
			expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
		});
		
		await waitFor(() => {
			expect(screen.getByText('Total Members')).toBeInTheDocument();
			expect(screen.getByText('Active Members')).toBeInTheDocument();
			expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
			expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
		});
	});

	it('should display correct stat values', async () => {
		renderComponent(Dashboard);
		
		await waitFor(() => {
			expect(screen.getByText('156')).toBeInTheDocument(); // Total Members
			expect(screen.getByText('142')).toBeInTheDocument(); // Active Members
			expect(screen.getByText('₹45,780.00')).toBeInTheDocument(); // Monthly Revenue
			expect(screen.getByText('8')).toBeInTheDocument(); // Expiring Soon
		});
	});

	it('should show recent activity section', async () => {
		renderComponent(Dashboard);
		
		await waitFor(() => {
			expect(screen.getByText('Recent Activity')).toBeInTheDocument();
			expect(screen.getByText('John Doe joined the gym')).toBeInTheDocument();
			expect(screen.getByText('Sarah Smith renewed membership')).toBeInTheDocument();
		});
	});

	it('should display quick actions', async () => {
		renderComponent(Dashboard);
		
		await waitFor(() => {
			expect(screen.getByText('Quick Actions')).toBeInTheDocument();
			expect(screen.getByText('Add Member')).toBeInTheDocument();
			expect(screen.getByText('New Membership')).toBeInTheDocument();
			expect(screen.getByText('Manage Plans')).toBeInTheDocument();
			expect(screen.getByText('View Reports')).toBeInTheDocument();
		});
	});

	it('should have correct quick action links', async () => {
		renderComponent(Dashboard);
		
		await waitFor(() => {
			const addMemberLink = screen.getByRole('link', { name: /add member/i });
			const membershipLink = screen.getByRole('link', { name: /new membership/i });
			const plansLink = screen.getByRole('link', { name: /manage plans/i });
			const reportsLink = screen.getByRole('link', { name: /view reports/i });
			
			expect(addMemberLink).toHaveAttribute('href', '/members');
			expect(membershipLink).toHaveAttribute('href', '/memberships');
			expect(plansLink).toHaveAttribute('href', '/plans');
			expect(reportsLink).toHaveAttribute('href', '/reporting');
		});
	});

	it('should display help section', async () => {
		renderComponent(Dashboard);
		
		await waitFor(() => {
			expect(screen.getByText('Need Help?')).toBeInTheDocument();
			expect(screen.getByText(/Check out our documentation/)).toBeInTheDocument();
			expect(screen.getByText('Documentation')).toBeInTheDocument();
			expect(screen.getByText('Contact Support')).toBeInTheDocument();
		});
	});

	it('should calculate active member percentage correctly', async () => {
		renderComponent(Dashboard);
		
		await waitFor(() => {
			// 142/156 * 100 = 91% (rounded)
			expect(screen.getByText('91% active')).toBeInTheDocument();
		});
	});

	it('should format currency correctly', async () => {
		renderComponent(Dashboard);
		
		await waitFor(() => {
			expect(screen.getByText('₹45,780.00')).toBeInTheDocument();
		});
	});

	it('should show trend indicators', async () => {
		renderComponent(Dashboard);
		
		await waitFor(() => {
			expect(screen.getByText('+12 this month')).toBeInTheDocument();
			expect(screen.getByText('+8.5% from last month')).toBeInTheDocument();
		});
	});

	it('should apply dark theme styling', () => {
		renderComponent(Dashboard);
		
		const dashboard = document.querySelector('.dashboard');
		expect(dashboard).toBeInTheDocument();
		
		const statCards = document.querySelectorAll('.stat-card');
		expect(statCards.length).toBeGreaterThan(0);
	});

	it('should have animation classes', () => {
		renderComponent(Dashboard);
		
		const animatedElements = document.querySelectorAll('.animate-slide-up');
		expect(animatedElements.length).toBeGreaterThan(0);
	});

	it('should display icons in activity items', async () => {
		renderComponent(Dashboard);
		
		await waitFor(() => {
			const activityIcons = document.querySelectorAll('.activity-icon');
			expect(activityIcons.length).toBeGreaterThan(0);
		});
	});

	it('should handle API errors gracefully', async () => {
		mockFetch({
			'/api/dashboard/stats': {
				ok: false,
				status: 500
			}
		});
		
		renderComponent(Dashboard);
		
		// Should still render with default/empty state
		expect(screen.getByText('Dashboard')).toBeInTheDocument();
	});

	it('should be responsive', () => {
		renderComponent(Dashboard);
		
		const statsGrid = document.querySelector('.stats-grid');
		expect(statsGrid).toBeInTheDocument();
		
		// Check for responsive classes or grid properties
		const computedStyle = getComputedStyle(statsGrid);
		expect(computedStyle.display).toBe('grid');
	});
});