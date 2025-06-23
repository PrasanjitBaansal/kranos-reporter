import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte/svelte5';
import userEvent from '@testing-library/user-event';
import { renderComponent, mockFetch } from './utils.js';

// Import components for form testing
import MembersPage from '../routes/members/+page.svelte';
import PlansPage from '../routes/plans/+page.svelte';
import LoginPage from '../routes/login/+page.svelte';

describe('Form Validation and Submission Tests', () => {
	const user = userEvent.setup();

	// Default props for page components
	const defaultMembersProps = {
		data: { members: [] },
		form: null
	};

	const defaultPlansProps = {
		data: { plans: [] },
		form: null
	};

	const defaultLoginProps = {
		form: null
	};

	beforeEach(() => {
		mockFetch();
	});

	describe('Members Form Validation', () => {
		it('should prevent submission with empty required fields', async () => {
			renderComponent(MembersPage, {
				props: {
					data: { members: [] },
					form: null
				}
			});
			
			const submitButton = screen.getByText('Save Member');
			await fireEvent.click(submitButton);
			
			// Form should not submit (no API call made)
			expect(fetch).not.toHaveBeenCalledWith('/api/members', expect.objectContaining({
				method: 'POST'
			}));
		});

		it('should validate email format', async () => {
			renderComponent(MembersPage, { props: defaultMembersProps });
			
			const emailInput = screen.getByPlaceholderText('Enter email address');
			expect(emailInput).toHaveAttribute('type', 'email');
			
			// HTML5 validation will handle invalid email formats
			await user.type(emailInput, 'invalid-email');
			
			// Browser validation would prevent submission
			expect(emailInput.validity.valid).toBe(false);
		});

		it('should accept valid email format', async () => {
			renderComponent(MembersPage, { props: defaultMembersProps });
			
			const emailInput = screen.getByPlaceholderText('Enter email address');
			await user.type(emailInput, 'valid@email.com');
			
			expect(emailInput.validity.valid).toBe(true);
		});

		it('should validate phone number input', async () => {
			renderComponent(MembersPage, { props: defaultMembersProps });
			
			const phoneInput = screen.getByPlaceholderText('Enter phone number');
			await user.type(phoneInput, '555-0001');
			
			expect(phoneInput.value).toBe('555-0001');
		});

		it('should handle date input correctly', async () => {
			renderComponent(MembersPage, { props: defaultMembersProps });
			
			const dateInput = screen.getByLabelText('Join Date');
			expect(dateInput).toHaveAttribute('type', 'date');
			
			await user.clear(dateInput);
			await user.type(dateInput, '2024-06-22');
			expect(dateInput.value).toBe('2024-06-22');
		});

		it('should submit form with all required fields filled', async () => {
			mockFetch({
				'/api/members': {
					ok: true,
					json: async () => ({ id: 1 })
				}
			});

			renderComponent(MembersPage, { props: defaultMembersProps });
			
			// Click "Add Member" button to show the form
			const addButton = screen.getByTestId('add-member-button');
			await fireEvent.click(addButton);
			
			// Wait for form to appear and fill it
			await waitFor(() => {
				expect(screen.getByPlaceholderText('Enter member name')).toBeInTheDocument();
			});
			
			await user.type(screen.getByPlaceholderText('Enter member name'), 'John Doe');
			await user.type(screen.getByPlaceholderText('Enter phone number'), '555-0001');
			await user.type(screen.getByPlaceholderText('Enter email address'), 'john@example.com');
			
			const submitButton = screen.getByText('Save Member');
			await fireEvent.click(submitButton);
			
			expect(fetch).toHaveBeenCalledWith('/api/members', expect.objectContaining({
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: expect.stringContaining('John Doe')
			}));
		});

		it('should handle form submission errors', async () => {
			mockFetch({
				'/api/members': {
					ok: false,
					status: 400,
					text: async () => 'Validation error'
				}
			});

			renderComponent(MembersPage, { props: defaultMembersProps });
			
			await user.type(screen.getByPlaceholderText('Enter member name'), 'John Doe');
			await user.type(screen.getByPlaceholderText('Enter phone number'), '555-0001');
			
			// Mock alert
			global.alert = vi.fn();
			
			const submitButton = screen.getByText('Save Member');
			await fireEvent.click(submitButton);
			
			await waitFor(() => {
				expect(global.alert).toHaveBeenCalledWith(
					expect.stringContaining('Error saving member')
				);
			});
		});

		it('should disable form during submission', async () => {
			// Mock slow response
			mockFetch({
				'/api/members': new Promise(resolve => 
					setTimeout(() => resolve({ ok: true, json: async () => ({ id: 1 }) }), 1000)
				)
			});

			renderComponent(MembersPage, { props: defaultMembersProps });
			
			await user.type(screen.getByPlaceholderText('Enter member name'), 'John Doe');
			await user.type(screen.getByPlaceholderText('Enter phone number'), '555-0001');
			
			const submitButton = screen.getByText('Save Member');
			await fireEvent.click(submitButton);
			
			// Check for loading state
			await waitFor(() => {
				expect(screen.getByText('Saving...')).toBeInTheDocument();
				expect(submitButton).toBeDisabled();
			});
		});
	});

	describe('Plans Form Validation', () => {
		it('should validate numeric inputs', async () => {
			renderComponent(PlansPage, { props: defaultPlansProps });
			
			const durationInput = screen.getByPlaceholderText('e.g., 30, 90, 365');
			const amountInput = screen.getByPlaceholderText('0.00');
			
			expect(durationInput).toHaveAttribute('type', 'number');
			expect(durationInput).toHaveAttribute('min', '1');
			expect(amountInput).toHaveAttribute('type', 'number');
			expect(amountInput).toHaveAttribute('min', '0');
			expect(amountInput).toHaveAttribute('step', '0.01');
		});

		it('should enforce minimum values', async () => {
			renderComponent(PlansPage, { props: defaultPlansProps });
			
			const durationInput = screen.getByPlaceholderText('e.g., 30, 90, 365');
			const amountInput = screen.getByPlaceholderText('0.00');
			
			await user.type(durationInput, '0');
			await user.type(amountInput, '-10');
			
			// HTML5 validation should prevent invalid values
			expect(durationInput.validity.valid).toBe(false);
			expect(amountInput.validity.valid).toBe(false);
		});

		it('should auto-generate display name', async () => {
			renderComponent(PlansPage, { props: defaultPlansProps });
			
			const nameInput = screen.getByPlaceholderText('e.g., MMA Focus, Weight Training');
			const durationInput = screen.getByPlaceholderText('e.g., 30, 90, 365');
			const displayNameInput = screen.getByPlaceholderText('Auto-generated from name and duration');
			
			await user.type(nameInput, 'Test Plan');
			await user.type(durationInput, '30');
			
			await waitFor(() => {
				expect(displayNameInput.value).toBe('Test Plan - 30 days');
			});
		});

		it('should submit valid plan data', async () => {
			mockFetch({
				'/api/plans': {
					ok: true,
					json: async () => ({ id: 1 })
				}
			});

			renderComponent(PlansPage, { props: defaultPlansProps });
			
			await user.type(screen.getByPlaceholderText('e.g., MMA Focus, Weight Training'), 'New Plan');
			await user.type(screen.getByPlaceholderText('e.g., 30, 90, 365'), '60');
			await user.type(screen.getByPlaceholderText('0.00'), '99.99');
			
			const submitButton = screen.getByText('Add Plan');
			await fireEvent.click(submitButton);
			
			expect(fetch).toHaveBeenCalledWith('/api/plans', expect.objectContaining({
				method: 'POST',
				body: expect.stringContaining('New Plan')
			}));
		});
	});

	describe('Login Form Validation', () => {
		it('should validate required fields', async () => {
			renderComponent(LoginPage, { props: defaultLoginProps });
			
			const submitButton = screen.getByRole('button', { name: /sign in/i });
			await fireEvent.click(submitButton);
			
			await waitFor(() => {
				expect(screen.getByText('Please enter both username and password')).toBeInTheDocument();
			});
		});

		it('should validate empty username', async () => {
			renderComponent(LoginPage, { props: defaultLoginProps });
			
			await user.type(screen.getByLabelText('Password'), 'password123');
			
			const submitButton = screen.getByRole('button', { name: /sign in/i });
			await fireEvent.click(submitButton);
			
			await waitFor(() => {
				expect(screen.getByText('Please enter both username and password')).toBeInTheDocument();
			});
		});

		it('should validate empty password', async () => {
			renderComponent(LoginPage, { props: defaultLoginProps });
			
			await user.type(screen.getByLabelText('Username'), 'admin');
			
			const submitButton = screen.getByRole('button', { name: /sign in/i });
			await fireEvent.click(submitButton);
			
			await waitFor(() => {
				expect(screen.getByText('Please enter both username and password')).toBeInTheDocument();
			});
		});

		it('should submit with valid credentials', async () => {
			mockFetch({
				'/api/auth/login': {
					ok: true,
					json: async () => ({ success: true })
				}
			});

			// Mock navigation
			const mockGoto = vi.fn();
			vi.doMock('$app/navigation', () => ({
				goto: mockGoto
			}));

			renderComponent(LoginPage, { props: defaultLoginProps });
			
			await user.type(screen.getByLabelText('Username'), 'admin');
			await user.type(screen.getByLabelText('Password'), 'password123');
			
			const submitButton = screen.getByRole('button', { name: /sign in/i });
			await fireEvent.click(submitButton);
			
			expect(fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({
					username: 'admin',
					password: 'password123'
				})
			}));
		});

		it('should handle login errors', async () => {
			mockFetch({
				'/api/auth/login': {
					ok: false,
					status: 401,
					json: async () => ({ message: 'Invalid credentials' }),
					text: async () => 'Invalid credentials'
				}
			});

			renderComponent(LoginPage, { props: defaultLoginProps });
			
			await user.type(screen.getByLabelText('Username'), 'admin');
			await user.type(screen.getByLabelText('Password'), 'wrongpassword');
			
			const submitButton = screen.getByRole('button', { name: /sign in/i });
			await fireEvent.click(submitButton);
			
			await waitFor(() => {
				expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
			});
		});

		it('should toggle password visibility', async () => {
			renderComponent(LoginPage, { props: defaultLoginProps });
			
			const passwordInput = screen.getByLabelText('Password');
			const toggleButton = document.querySelector('.password-toggle');
			
			expect(passwordInput).toHaveAttribute('type', 'password');
			
			await fireEvent.click(toggleButton);
			expect(passwordInput).toHaveAttribute('type', 'text');
			
			await fireEvent.click(toggleButton);
			expect(passwordInput).toHaveAttribute('type', 'password');
		});
	});

	describe('Form Accessibility', () => {
		it('should have proper labels for form controls', () => {
			renderComponent(MembersPage, { props: defaultMembersProps });
			
			expect(screen.getByLabelText('Name *')).toBeInTheDocument();
			expect(screen.getByLabelText('Phone *')).toBeInTheDocument();
			expect(screen.getByLabelText('Email')).toBeInTheDocument();
			expect(screen.getByLabelText('Join Date')).toBeInTheDocument();
		});

		it('should mark required fields appropriately', () => {
			renderComponent(MembersPage, { props: defaultMembersProps });
			
			const nameInput = screen.getByLabelText('Name *');
			const phoneInput = screen.getByLabelText('Phone *');
			const emailInput = screen.getByLabelText('Email');
			
			expect(nameInput).toHaveAttribute('required');
			expect(phoneInput).toHaveAttribute('required');
			expect(emailInput).not.toHaveAttribute('required');
		});

		it('should have proper input types for semantic meaning', () => {
			renderComponent(MembersPage, { props: defaultMembersProps });
			
			expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
			expect(screen.getByLabelText('Join Date')).toHaveAttribute('type', 'date');
			
			renderComponent(PlansPage, { props: defaultPlansProps });
			
			const durationInput = screen.getByLabelText('Duration (Days) *');
			const amountInput = screen.getByLabelText('Default Amount *');
			
			expect(durationInput).toHaveAttribute('type', 'number');
			expect(amountInput).toHaveAttribute('type', 'number');
		});

		it('should provide helpful placeholder text', () => {
			renderComponent(MembersPage, { props: defaultMembersProps });
			
			expect(screen.getByPlaceholderText('Enter member name')).toBeInTheDocument();
			expect(screen.getByPlaceholderText('Enter phone number')).toBeInTheDocument();
			expect(screen.getByPlaceholderText('Enter email address')).toBeInTheDocument();
		});
	});

	describe('Form State Management', () => {
		it('should reset form after successful submission', async () => {
			mockFetch({
				'/api/members': {
					ok: true,
					json: async () => ({ id: 1 })
				}
			});

			renderComponent(MembersPage, { props: defaultMembersProps });
			
			const nameInput = screen.getByPlaceholderText('Enter member name');
			const phoneInput = screen.getByPlaceholderText('Enter phone number');
			
			await user.type(nameInput, 'John Doe');
			await user.type(phoneInput, '555-0001');
			
			const submitButton = screen.getByText('Save Member');
			await fireEvent.click(submitButton);
			
			await waitFor(() => {
				expect(nameInput.value).toBe('');
				expect(phoneInput.value).toBe('');
			});
		});

		it('should preserve form data when validation fails', async () => {
			renderComponent(MembersPage, { props: defaultMembersProps });
			
			const nameInput = screen.getByPlaceholderText('Enter member name');
			await user.type(nameInput, 'John Doe');
			
			// Try to submit without required phone
			const submitButton = screen.getByText('Save Member');
			await fireEvent.click(submitButton);
			
			// Form data should still be there
			expect(nameInput.value).toBe('John Doe');
		});

		it('should clear form when cancel is clicked', async () => {
			renderComponent(MembersPage, { props: defaultMembersProps });
			
			const nameInput = screen.getByPlaceholderText('Enter member name');
			await user.type(nameInput, 'Test Name');
			
			const cancelButton = screen.getByText('Cancel');
			await fireEvent.click(cancelButton);
			
			expect(nameInput.value).toBe('');
		});
	});
});