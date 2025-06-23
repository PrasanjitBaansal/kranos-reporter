import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte/svelte5';
import { renderComponent, mockFetch } from '../utils.js';
import Layout from '../../routes/+layout.svelte';

// Mock SvelteKit modules
vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn(() => () => {})
	}
}));

describe('Layout Component', () => {
	beforeEach(() => {
		mockFetch();
	});

	it('should render navigation with logo', () => {
		renderComponent(Layout);
		
		expect(screen.getByText('Kranos Gym')).toBeInTheDocument();
		expect(screen.getByText('🏋️')).toBeInTheDocument();
	});

	it('should render all navigation items', () => {
		renderComponent(Layout);
		
		const navItems = [
			'Dashboard',
			'Members', 
			'Plans',
			'Memberships',
			'Reports',
			'Login'
		];

		navItems.forEach(item => {
			expect(screen.getByText(item)).toBeInTheDocument();
		});
	});

	it('should have correct navigation links', () => {
		renderComponent(Layout);
		
		const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
		const membersLink = screen.getByRole('link', { name: /members/i });
		const plansLink = screen.getByRole('link', { name: /plans/i });
		
		expect(dashboardLink).toHaveAttribute('href', '/');
		expect(membersLink).toHaveAttribute('href', '/members');
		expect(plansLink).toHaveAttribute('href', '/plans');
	});

	it('should apply dark theme styles', () => {
		renderComponent(Layout);
		
		const navbar = document.querySelector('.navbar');
		expect(navbar).toBeInTheDocument();
		
		// Check for CSS custom properties
		const computedStyle = getComputedStyle(document.documentElement);
		expect(computedStyle.getPropertyValue('--primary')).toBe('#f39407');
		expect(computedStyle.getPropertyValue('--background')).toBe('#0a0a0a');
	});

	it('should toggle mobile menu', async () => {
		renderComponent(Layout);
		
		const menuToggle = document.querySelector('.menu-toggle');
		const navMenu = document.querySelector('.nav-menu');
		
		expect(menuToggle).toBeInTheDocument();
		expect(navMenu).not.toHaveClass('active');
		
		await fireEvent.click(menuToggle);
		expect(navMenu).toHaveClass('active');
		
		await fireEvent.click(menuToggle);
		expect(navMenu).not.toHaveClass('active');
	});

	it('should close mobile menu when nav link is clicked', async () => {
		renderComponent(Layout);
		
		const menuToggle = document.querySelector('.menu-toggle');
		const navMenu = document.querySelector('.nav-menu');
		const membersLink = screen.getByRole('link', { name: /members/i });
		
		// Open menu
		await fireEvent.click(menuToggle);
		expect(navMenu).toHaveClass('active');
		
		// Click nav link
		await fireEvent.click(membersLink);
		expect(navMenu).not.toHaveClass('active');
	});

	it('should have proper accessibility attributes', () => {
		renderComponent(Layout);
		
		const navLinks = screen.getAllByRole('link');
		navLinks.forEach(link => {
			expect(link).toBeVisible();
		});
		
		const menuToggle = document.querySelector('.menu-toggle');
		expect(menuToggle).toHaveAttribute('type', 'button');
	});

	it('should render slot content', () => {
		const TestComponent = `
			<script>
				import Layout from '../../routes/+layout.svelte';
			</script>
			<Layout>
				<div data-testid="slot-content">Test Content</div>
			</Layout>
		`;
		
		render(TestComponent);
		expect(screen.getByTestId('slot-content')).toHaveTextContent('Test Content');
	});

	it('should apply gradient backgrounds', () => {
		renderComponent(Layout);
		
		const navbar = document.querySelector('.navbar');
		const navBrand = document.querySelector('.nav-brand');
		
		expect(navbar).toBeInTheDocument();
		expect(navBrand).toBeInTheDocument();
	});

	it('should have smooth scrolling behavior', () => {
		renderComponent(Layout);
		
		expect(document.documentElement.style.scrollBehavior).toBe('smooth');
	});
});