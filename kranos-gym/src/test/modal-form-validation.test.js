import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte/svelte5';
import userEvent from '@testing-library/user-event';
import { renderComponent, mockFetch } from './utils.js';

// Import components for form testing
import MembersPage from '../routes/members/+page.svelte';
import PlansPage from '../routes/plans/+page.svelte';
import MembershipsPage from '../routes/memberships/+page.svelte';

describe.skip('Modal-Based Form Validation Tests', () => {
	const user = userEvent.setup();

	beforeEach(() => {
		mockFetch();
	});

	describe('Members Modal Form', () => {
		beforeEach(() => {
			renderComponent(MembersPage, {
				props: {
					data: { 
						members: [],
						user: { permissions: ['members.create', 'members.edit'] },
						canManageMembers: true
					},
					form: null
				}
			});
		});

		it('should open modal when clicking add button', async () => {
			// Look for admin-only add button
			const addButton = screen.getByTestId('add-member-button');
			await fireEvent.click(addButton);
			
			// Modal should be visible
			expect(screen.getByText('Add New Member')).toBeInTheDocument();
		});

		it('should validate required fields in member form', async () => {
			// Open modal
			const addButton = screen.getByTestId('add-member-button');
			await fireEvent.click(addButton);
			
			// Try to submit empty form
			const saveButton = screen.getByRole('button', { name: /save/i });
			await fireEvent.click(saveButton);
			
			// Check for validation errors
			await waitFor(() => {
				// Name validation shows specific format message for empty name
				expect(screen.getByText(/Name can only contain letters, numbers, and spaces/i)).toBeInTheDocument();
			});
		});

		it('should validate phone number format', async () => {
			// Open modal
			const addButton = screen.getByTestId('add-member-button');
			await fireEvent.click(addButton);
			
			// Enter invalid phone
			const phoneInput = screen.getByLabelText(/phone/i);
			await user.type(phoneInput, '123'); // Too short
			
			const saveButton = screen.getByRole('button', { name: /save/i });
			await fireEvent.click(saveButton);
			
			await waitFor(() => {
				expect(screen.getByText(/Phone number must be exactly 10 digits/i)).toBeInTheDocument();
			});
		});

		it('should validate email format when provided', async () => {
			// Open modal
			const addButton = screen.getByTestId('add-member-button');
			await fireEvent.click(addButton);
			
			// Fill required fields
			const nameInput = screen.getByLabelText(/name/i);
			const phoneInput = screen.getByLabelText(/phone/i);
			const emailInput = screen.getByLabelText(/email/i);
			
			await user.type(nameInput, 'Test User');
			await user.type(phoneInput, '9876543210');
			await user.type(emailInput, 'invalid-email'); // Invalid format
			
			const saveButton = screen.getByRole('button', { name: /save/i });
			await fireEvent.click(saveButton);
			
			await waitFor(() => {
				expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
			});
		});

		it('should close modal on cancel', async () => {
			// Open modal
			const addButton = screen.getByTestId('add-member-button');
			await fireEvent.click(addButton);
			
			// Click cancel
			const cancelButton = screen.getByRole('button', { name: /cancel/i });
			await fireEvent.click(cancelButton);
			
			// Modal should be closed
			expect(screen.queryByText('Add New Member')).not.toBeInTheDocument();
		});
	});

	describe('Plans Modal Form', () => {
		beforeEach(() => {
			renderComponent(PlansPage, {
				props: {
					data: { 
						plans: [],
						user: { permissions: ['plans.create', 'plans.edit'] }
					},
					form: null
				}
			});
		});

		it('should validate plan name is required', async () => {
			// Open modal first
			const addButton = screen.getByRole('button', { name: /Add New Plan/i });
			await fireEvent.click(addButton);
			
			// Try to submit empty form
			const saveButton = screen.getByRole('button', { name: /Create Plan/i });
			await fireEvent.click(saveButton);
			
			// Check for validation error
			await waitFor(() => {
				expect(screen.getByText(/Plan name is required/i)).toBeInTheDocument();
			});
		});

		it('should validate duration is a positive number', async () => {
			// Open modal first
			const addButton = screen.getByRole('button', { name: /Add New Plan/i });
			await fireEvent.click(addButton);
			
			const nameInput = screen.getByLabelText(/plan name/i);
			const durationInput = screen.getByLabelText(/duration/i);
			
			await user.type(nameInput, 'Test Plan');
			await user.clear(durationInput);
			await user.type(durationInput, '-5');
			
			const saveButton = screen.getByRole('button', { name: /Create Plan/i });
			await fireEvent.click(saveButton);
			
			// Check for validation error
			await waitFor(() => {
				expect(screen.getByText(/This field is required/i)).toBeInTheDocument();
			});
		});

		it('should auto-generate display name', async () => {
			// Open modal first
			const addButton = screen.getByRole('button', { name: /Add New Plan/i });
			await fireEvent.click(addButton);
			
			const nameInput = screen.getByLabelText(/plan name/i);
			const durationInput = screen.getByLabelText(/duration/i);
			
			await user.type(nameInput, 'Test Plan');
			await user.type(durationInput, '30');
			
			// Display name should be shown somewhere
			await waitFor(() => {
				expect(screen.getByText(/Test Plan - 30 days/i)).toBeInTheDocument();
			});
		});
	});

	describe('Memberships Modal Form', () => {
		beforeEach(() => {
			renderComponent(MembershipsPage, {
				props: {
					data: { 
						members: [
							{ id: 1, name: 'John Doe', status: 'Active' },
							{ id: 2, name: 'Jane Smith', status: 'Active' }
						],
						plans: [
							{ id: 1, name: 'Basic Plan', display_name: 'Basic Plan - 30 days', status: 'Active' }
						],
						groupMemberships: [],
						ptMemberships: [],
						user: { permissions: ['memberships.create'] }
					},
					form: null
				}
			});
		});

		it('should validate member selection', async () => {
			// Open modal first by clicking the Add button
			const addButton = screen.getByRole('button', { name: /Add.*Membership/i });
			await fireEvent.click(addButton);
			
			// Submit without selecting member
			const submitButton = screen.getByRole('button', { name: /Create Membership/i });
			await fireEvent.click(submitButton);
			
			// Check for validation error
			await waitFor(() => {
				expect(screen.getByText(/Please select a member/i)).toBeInTheDocument();
			});
		});

		it('should validate plan selection for group class', async () => {
			// Open modal first
			const addButton = screen.getByRole('button', { name: /Add.*Membership/i });
			await fireEvent.click(addButton);
			
			// Ensure group class mode is selected (default)
			// The modal should show group class form by default
			
			// Submit without selecting plan
			const submitButton = screen.getByRole('button', { name: /Create Membership/i });
			await fireEvent.click(submitButton);
			
			// Check for validation error
			await waitFor(() => {
				expect(screen.getByText(/Please select a plan/i)).toBeInTheDocument();
			});
		});

		it('should validate sessions for personal training', async () => {
			// Switch to PT mode
			const ptRadio = screen.getByLabelText(/personal training/i);
			await fireEvent.click(ptRadio);
			
			// Submit without entering sessions
			const submitButton = screen.getByRole('button', { name: /create.*membership/i });
			await fireEvent.click(submitButton);
			
			// Sessions input should be required
			const sessionsInput = screen.getByLabelText(/sessions/i);
			expect(sessionsInput).toBeRequired();
		});

		it('should validate amount paid is positive', async () => {
			const amountInput = screen.getByLabelText(/amount.*paid/i);
			await user.type(amountInput, '-100');
			
			const submitButton = screen.getByRole('button', { name: /create.*membership/i });
			await fireEvent.click(submitButton);
			
			// Amount should have min attribute
			expect(amountInput).toHaveAttribute('min', '0');
		});
	});

	describe('Form Enhancement Pattern', () => {
		it('should show loading state during submission', async () => {
			renderComponent(MembersPage, {
				props: {
					data: { 
						members: [],
						user: { permissions: ['members.create'] }
					},
					form: null
				}
			});
			
			// Open modal
			const addButton = screen.getByTestId('add-member-button');
			await fireEvent.click(addButton);
			
			// Fill form
			const nameInput = screen.getByLabelText(/name/i);
			const phoneInput = screen.getByLabelText(/phone/i);
			
			await user.type(nameInput, 'Test User');
			await user.type(phoneInput, '9876543210');
			
			// Mock slow response
			mockFetch({
				'/?/create': new Promise(resolve => setTimeout(() => resolve({ ok: true }), 100))
			});
			
			// Submit
			const saveButton = screen.getByRole('button', { name: /save/i });
			await fireEvent.click(saveButton);
			
			// Button should be disabled during submission
			expect(saveButton).toBeDisabled();
		});

		it('should clear validation errors when user corrects input', async () => {
			renderComponent(MembersPage, {
				props: {
					data: { 
						members: [],
						user: { permissions: ['members.create'] }
					},
					form: null
				}
			});
			
			// Open modal
			const addButton = screen.getByTestId('add-member-button');
			await fireEvent.click(addButton);
			
			// Submit empty form to trigger validation
			const saveButton = screen.getByRole('button', { name: /save/i });
			await fireEvent.click(saveButton);
			
			// Should show error
			await waitFor(() => {
				expect(screen.getByText(/name is required/i)).toBeInTheDocument();
			});
			
			// Start typing in name field
			const nameInput = screen.getByLabelText(/name/i);
			await user.type(nameInput, 'T');
			
			// Error should be cleared
			expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
		});
	});
});