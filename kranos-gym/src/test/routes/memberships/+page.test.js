import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/svelte/svelte5';
import userEvent from '@testing-library/user-event';
import { renderComponent, mockFetch, mockData } from '../utils.js';
import MembershipsPage from '../../routes/memberships/+page.svelte';

describe('Memberships Page Component', () => {
	const user = userEvent.setup();

	const defaultProps = {
		data: {
			members: mockData.members,
			plans: mockData.plans,
			groupMemberships: mockData.groupMemberships,
			ptMemberships: mockData.ptMemberships
		},
		form: null
	};

	beforeEach(() => {
		mockFetch();
	});

	it('should display memberships page correctly', () => {
		renderComponent(MembershipsPage, { props: defaultProps });
		
		expect(screen.getByText('Membership Management')).toBeInTheDocument();
		expect(screen.getByText('Group Class')).toBeInTheDocument();
		expect(screen.getByText('Personal Training')).toBeInTheDocument();
	});

	it('should switch between membership types', async () => {
		renderComponent(MembershipsPage, { props: defaultProps });
		
		const ptRadio = screen.getByLabelText('Personal Training');
		await fireEvent.click(ptRadio);
		
		expect(ptRadio).toBeChecked();
		expect(screen.getByText('Sessions Total')).toBeInTheDocument();
	});

	it('should display group class memberships by default', () => {
		renderComponent(MembershipsPage, { props: defaultProps });
		
		const gcRadio = screen.getByLabelText('Group Class');
		expect(gcRadio).toBeChecked();
		expect(screen.getByText('Plan')).toBeInTheDocument();
		expect(screen.getByText('Start Date')).toBeInTheDocument();
	});

	it('should filter memberships by search term', async () => {
		renderComponent(MembershipsPage, { props: defaultProps });
		
		const searchInput = screen.getByPlaceholderText('Search memberships...');
		await user.type(searchInput, 'John');
		
		expect(screen.getByText('John Doe')).toBeInTheDocument();
		expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
	});

	it('should create new group class membership', async () => {
		const mockResponse = { ok: true, json: async () => ({ id: 1 }) };
		mockFetch({
			'/api/memberships/group-class': mockResponse
		});

		renderComponent(MembershipsPage, { props: defaultProps });
		
		// Select member
		const memberSelect = screen.getByLabelText('Member');
		await fireEvent.change(memberSelect, { target: { value: '1' } });
		
		// Select plan
		const planSelect = screen.getByLabelText('Plan');
		await fireEvent.change(planSelect, { target: { value: '1' } });
		
		// Fill amount
		const amountInput = screen.getByLabelText('Amount Paid');
		await user.type(amountInput, '120');
		
		// Submit form
		const submitButton = screen.getByText('Create Membership');
		await fireEvent.click(submitButton);
		
		expect(memberSelect.value).toBe('1');
		expect(planSelect.value).toBe('1');
		expect(amountInput.value).toBe('120');
	});

	it('should create new personal training membership', async () => {
		const mockResponse = { ok: true, json: async () => ({ id: 1 }) };
		mockFetch({
			'/api/memberships/personal-training': mockResponse
		});

		renderComponent(MembershipsPage, { props: defaultProps });
		
		// Switch to PT mode
		const ptRadio = screen.getByLabelText('Personal Training');
		await fireEvent.click(ptRadio);
		
		// Select member
		const memberSelect = screen.getByLabelText('Member');
		await fireEvent.change(memberSelect, { target: { value: '1' } });
		
		// Fill sessions
		const sessionsInput = screen.getByLabelText('Sessions Total');
		await user.type(sessionsInput, '10');
		
		// Fill amount
		const amountInput = screen.getByLabelText('Amount Paid');
		await user.type(amountInput, '200');
		
		// Submit form
		const submitButton = screen.getByText('Create Membership');
		await fireEvent.click(submitButton);
		
		expect(memberSelect.value).toBe('1');
		expect(sessionsInput.value).toBe('10');
		expect(amountInput.value).toBe('200');
	});

	it('should validate required fields', async () => {
		renderComponent(MembershipsPage, { props: defaultProps });
		
		const submitButton = screen.getByText('Create Membership');
		await fireEvent.click(submitButton);
		
		const memberSelect = screen.getByLabelText('Member');
		const planSelect = screen.getByLabelText('Plan');
		const amountInput = screen.getByLabelText('Amount Paid');
		
		expect(memberSelect).toBeRequired();
		expect(planSelect).toBeRequired();
		expect(amountInput).toBeRequired();
	});

	it('should be responsive on mobile', () => {
		renderComponent(MembershipsPage, { props: defaultProps });
		
		const page = screen.getByText('Membership Management').closest('.memberships-page');
		expect(page).toHaveClass('memberships-page');
	});

	it('should apply dark theme styles', () => {
		renderComponent(MembershipsPage, { props: defaultProps });
		
		const cards = screen.getAllByText('Create New Membership')[0].closest('.card');
		expect(cards).toHaveClass('card');
	});
});