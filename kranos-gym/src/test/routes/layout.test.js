import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte/svelte5';
import { renderComponent } from '../utils.js';
import Layout from '../../routes/+layout.svelte';

describe('Layout Component', () => {
	const mockData = {
		settings: {
			theme: 'light',
			accent_color: '#0066cc',
			favicon_url: '/favicon.ico',
			logo_url: '/logo.png'
		},
		user: {
			id: 1,
			username: 'testuser',
			role: 'admin',
			permissions: ['dashboard.view', 'members.view', 'plans.view']
		}
	};

	const mockChildren = '<div>Test Content</div>';

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render layout with navigation', () => {
		renderComponent(Layout, { 
			props: { 
				data: mockData,
				children: mockChildren 
			} 
		});
		
		expect(screen.getByText('Kranos Gym')).toBeInTheDocument();
		expect(screen.getByRole('navigation')).toBeInTheDocument();
	});

	it('should show navigation items based on permissions', () => {
		renderComponent(Layout, { 
			props: { 
				data: mockData,
				children: mockChildren 
			} 
		});
		
		// Should show permitted items
		expect(screen.getByText('Dashboard')).toBeInTheDocument();
		expect(screen.getByText('Members')).toBeInTheDocument();
		expect(screen.getByText('Plans')).toBeInTheDocument();
	});

	it('should not show navigation items without permissions', () => {
		const limitedData = {
			...mockData,
			user: {
				...mockData.user,
				permissions: ['dashboard.view']
			}
		};
		
		renderComponent(Layout, { 
			props: { 
				data: limitedData,
				children: mockChildren 
			} 
		});
		
		expect(screen.getByText('Dashboard')).toBeInTheDocument();
		expect(screen.queryByText('Members')).not.toBeInTheDocument();
		expect(screen.queryByText('Plans')).not.toBeInTheDocument();
	});

	it('should show user menu when logged in', () => {
		renderComponent(Layout, { 
			props: { 
				data: mockData,
				children: mockChildren 
			} 
		});
		
		expect(screen.getByText(mockData.user.username)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
	});

	it('should show login link when not logged in', () => {
		const noUserData = {
			...mockData,
			user: null
		};
		
		renderComponent(Layout, { 
			props: { 
				data: noUserData,
				children: mockChildren 
			} 
		});
		
		expect(screen.getByText('Login')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /user menu/i })).not.toBeInTheDocument();
	});

	it('should apply theme settings', () => {
		renderComponent(Layout, { 
			props: { 
				data: mockData,
				children: mockChildren 
			} 
		});
		
		const layoutElement = document.querySelector('.layout');
		expect(layoutElement).toBeInTheDocument();
		
		// Check CSS variables are set
		const style = document.documentElement.style;
		expect(style.getPropertyValue('--accent')).toBeTruthy();
	});

	it('should apply dark theme when set', () => {
		const darkThemeData = {
			...mockData,
			settings: {
				...mockData.settings,
				theme: 'dark'
			}
		};
		
		renderComponent(Layout, { 
			props: { 
				data: darkThemeData,
				children: mockChildren 
			} 
		});
		
		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});

	it('should show member-specific navigation', () => {
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
		
		renderComponent(Layout, { 
			props: { 
				data: memberData,
				children: mockChildren 
			} 
		});
		
		// Member should only see profile link
		expect(screen.getByText('My Profile')).toBeInTheDocument();
		expect(screen.queryByText('Members')).not.toBeInTheDocument();
	});

	it('should toggle mobile menu', async () => {
		renderComponent(Layout, { 
			props: { 
				data: mockData,
				children: mockChildren 
			} 
		});
		
		// Mobile menu should be hidden initially
		const nav = screen.getByRole('navigation');
		expect(nav.classList.contains('mobile-open')).toBe(false);
		
		// Click mobile menu button
		const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
		await fireEvent.click(mobileMenuButton);
		
		// Mobile menu should be visible
		expect(nav.classList.contains('mobile-open')).toBe(true);
	});

	it('should show toast container', () => {
		renderComponent(Layout, { 
			props: { 
				data: mockData,
				children: mockChildren 
			} 
		});
		
		expect(document.querySelector('.toast-container')).toBeInTheDocument();
	});

	it('should render children content', () => {
		render(Layout, { 
			props: { 
				data: mockData
			},
			context: new Map([['__SVELTE_SLOT_CONTENT__', mockChildren]])
		});
		
		expect(screen.getByText('Test Content')).toBeInTheDocument();
	});

	it('should handle user dropdown menu', async () => {
		renderComponent(Layout, { 
			props: { 
				data: mockData,
				children: mockChildren 
			} 
		});
		
		const userMenuButton = screen.getByRole('button', { name: /user menu/i });
		await fireEvent.click(userMenuButton);
		
		// Dropdown should show
		expect(screen.getByText('Change Password')).toBeInTheDocument();
		expect(screen.getByText('Logout')).toBeInTheDocument();
	});

	it('should show admin settings link for admin users', async () => {
		renderComponent(Layout, { 
			props: { 
				data: mockData,
				children: mockChildren 
			} 
		});
		
		const userMenuButton = screen.getByRole('button', { name: /user menu/i });
		await fireEvent.click(userMenuButton);
		
		expect(screen.getByText('Admin Settings')).toBeInTheDocument();
	});

	it('should not show admin settings for non-admin users', async () => {
		const trainerData = {
			...mockData,
			user: {
				...mockData.user,
				role: 'trainer'
			}
		};
		
		renderComponent(Layout, { 
			props: { 
				data: trainerData,
				children: mockChildren 
			} 
		});
		
		const userMenuButton = screen.getByRole('button', { name: /user menu/i });
		await fireEvent.click(userMenuButton);
		
		expect(screen.queryByText('Admin Settings')).not.toBeInTheDocument();
	});
});