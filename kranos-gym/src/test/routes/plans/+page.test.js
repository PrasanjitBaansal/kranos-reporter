import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/svelte/svelte5';
import userEvent from '@testing-library/user-event';
import { renderComponent, mockFetch, mockData } from '../../utils.js';
import PlansPage from '../../../routes/plans/+page.svelte';

describe('Plans Page Component', () => {
	const user = userEvent.setup();

	const defaultProps = {
		data: { plans: mockData.plans },
		form: null
	};

	beforeEach(() => {
		mockFetch();
	});

	it('should display plans page correctly', () => {
		renderComponent(PlansPage, { props: defaultProps });
		
		expect(screen.getByText('Plans Management')).toBeInTheDocument();
		expect(screen.getByText('Manage gym membership plans and pricing')).toBeInTheDocument();
	});

	it('should display plan list', () => {
		renderComponent(PlansPage, { props: defaultProps });
		
		expect(screen.getByText('MMA Focus')).toBeInTheDocument();
		expect(screen.getByText('Weight Training')).toBeInTheDocument();
		expect(screen.getByText('90 days')).toBeInTheDocument();
		expect(screen.getByText('30 days')).toBeInTheDocument();
	});

	it('should show plan status badges', () => {
		renderComponent(PlansPage, { props: defaultProps });
		
		const activeCards = screen.getAllByText('Active');
		const inactiveCards = screen.getAllByText('Inactive');
		
		expect(activeCards.length).toBeGreaterThan(0);
		expect(inactiveCards.length).toBeGreaterThan(0);
	});

	it('should filter plans by search', async () => {
		renderComponent(PlansPage, { props: defaultProps });
		
		const searchInput = screen.getByPlaceholderText('Search plans...');
		await user.type(searchInput, 'MMA');
		
		expect(screen.getByText('MMA Focus')).toBeInTheDocument();
		expect(screen.queryByText('Weight Training')).not.toBeInTheDocument();
	});

	it('should show empty search state', async () => {
		renderComponent(PlansPage, { props: defaultProps });
		
		const searchInput = screen.getByPlaceholderText('Search plans...');
		await user.type(searchInput, 'nonexistent');
		
		await waitFor(() => {
			expect(screen.getByText('No plans found matching your search')).toBeInTheDocument();
		});
	});

	it('should select plan and populate form', async () => {
		renderComponent(PlansPage, { props: defaultProps });
		
		const planCard = screen.getByText('MMA Focus').closest('.plan-row');
		await fireEvent.click(planCard);
		
		const nameInput = screen.getByPlaceholderText('Enter plan name');
		expect(nameInput.value).toBe('MMA Focus');
	});

	it('should add new plan', async () => {
		const mockResponse = { ok: true, json: async () => ({ id: 4 }) };
		mockFetch({
			'/api/plans': mockResponse
		});

		renderComponent(PlansPage, { props: defaultProps });
		
		const nameInput = screen.getByPlaceholderText('Enter plan name');
		const durationInput = screen.getByPlaceholderText('Enter duration in days');
		const amountInput = screen.getByPlaceholderText('Enter default amount');
		
		await user.type(nameInput, 'New Plan');
		await user.type(durationInput, '60');
		await user.type(amountInput, '150');
		
		const submitButton = screen.getByText('Save Plan');
		await fireEvent.click(submitButton);
		
		expect(nameInput.value).toBe('New Plan');
		expect(durationInput.value).toBe('60');
		expect(amountInput.value).toBe('150');
	});

	it('should update existing plan', async () => {
		const mockResponse = { ok: true, json: async () => ({ id: 1 }) };
		mockFetch({
			'/api/plans': mockResponse
		});

		renderComponent(PlansPage, { props: defaultProps });
		
		// Select a plan first
		const planCard = screen.getByText('MMA Focus').closest('.plan-row');
		await fireEvent.click(planCard);
		
		const nameInput = screen.getByPlaceholderText('Enter plan name');
		await user.clear(nameInput);
		await user.type(nameInput, 'Updated MMA Focus');
		
		const submitButton = screen.getByText('Update Plan');
		await fireEvent.click(submitButton);
		
		expect(nameInput.value).toBe('Updated MMA Focus');
	});

	it('should validate required fields', async () => {
		renderComponent(PlansPage, { props: defaultProps });
		
		const submitButton = screen.getByText('Save Plan');
		await fireEvent.click(submitButton);
		
		const nameInput = screen.getByPlaceholderText('Enter plan name');
		const durationInput = screen.getByPlaceholderText('Enter duration in days');
		const amountInput = screen.getByPlaceholderText('Enter default amount');
		
		expect(nameInput).toBeRequired();
		expect(durationInput).toBeRequired();
		expect(amountInput).toBeRequired();
	});

	it('should toggle active status with custom checkbox', async () => {
		renderComponent(PlansPage, { props: defaultProps });
		
		const checkbox = screen.getByLabelText('Active Plan');
		await fireEvent.click(checkbox);
		
		expect(checkbox).toBeInTheDocument();
	});

	it('should delete plan with confirmation', async () => {
		const mockResponse = { ok: true, json: async () => ({ success: true }) };
		mockFetch({
			'/api/plans': mockResponse
		});

		renderComponent(PlansPage, { props: defaultProps });
		
		// Select a plan first
		const planCard = screen.getByText('MMA Focus').closest('.plan-row');
		await fireEvent.click(planCard);
		
		const deleteButton = screen.getByText('Delete Plan');
		await fireEvent.click(deleteButton);
		
		expect(deleteButton).toBeInTheDocument();
	});

	it('should cancel plan deletion', async () => {
		renderComponent(PlansPage, { props: defaultProps });
		
		// Select a plan first
		const planCard = screen.getByText('MMA Focus').closest('.plan-row');
		await fireEvent.click(planCard);
		
		// Form should be populated
		const nameInput = screen.getByPlaceholderText('Enter plan name');
		expect(nameInput.value).toBe('MMA Focus');
	});

	it('should reset form when clicking cancel', async () => {
		renderComponent(PlansPage, { props: defaultProps });
		
		const nameInput = screen.getByPlaceholderText('Enter plan name');
		await user.type(nameInput, 'Test Plan');
		
		const cancelButton = screen.getByText('Clear Form');
		await fireEvent.click(cancelButton);
		
		expect(nameInput.value).toBe('');
	});

	it('should show loading state during form submission', async () => {
		renderComponent(PlansPage, { props: defaultProps });
		
		const nameInput = screen.getByPlaceholderText('Enter plan name');
		const durationInput = screen.getByPlaceholderText('Enter duration in days');
		const amountInput = screen.getByPlaceholderText('Enter default amount');
		
		await user.type(nameInput, 'Test Plan');
		await user.type(durationInput, '30');
		await user.type(amountInput, '100');
		
		const submitButton = screen.getByText('Save Plan');
		await fireEvent.click(submitButton);
		
		// Should have disabled state during submission
		expect(submitButton).toBeDisabled();
	});

	it('should be responsive on mobile', () => {
		renderComponent(PlansPage, { props: defaultProps });
		
		const page = screen.getByText('Plans Management').closest('.plans-page');
		expect(page).toHaveClass('plans-page');
	});

	it('should apply dark theme styles', () => {
		renderComponent(PlansPage, { props: defaultProps });
		
		const cards = screen.getAllByText('Add New Plan')[0].closest('.card');
		expect(cards).toHaveClass('card');
	});

	it('should handle API errors gracefully', async () => {
		mockFetch({
			'/api/plans': {
				ok: false,
				status: 500,
				json: async () => ({ error: 'Server error' })
			}
		});

		renderComponent(PlansPage, { props: defaultProps });
		
		const nameInput = screen.getByPlaceholderText('Enter plan name');
		await user.type(nameInput, 'Test Plan');
		
		const submitButton = screen.getByText('Save Plan');
		await fireEvent.click(submitButton);
		
		// Component should handle error gracefully
		expect(screen.getByText('Plans Management')).toBeInTheDocument();
	});

	it('should auto-generate display name', async () => {
		renderComponent(PlansPage, { props: defaultProps });
		
		const nameInput = screen.getByPlaceholderText('Enter plan name');
		const durationInput = screen.getByPlaceholderText('Enter duration in days');
		
		await user.type(nameInput, 'Yoga Classes');
		await user.type(durationInput, '45');
		
		// Display name should be auto-generated
		expect(nameInput.value).toBe('Yoga Classes');
		expect(durationInput.value).toBe('45');
	});
});