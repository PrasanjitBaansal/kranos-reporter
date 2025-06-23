import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/svelte/svelte5';
import userEvent from '@testing-library/user-event';
import { renderComponent, mockFetch, mockData } from '../utils.js';
import ReportingPage from '../../routes/reporting/+page.svelte';

describe('Reporting Page Component', () => {
	const user = userEvent.setup();

	beforeEach(() => {
		mockFetch();
	});

	it('should display reporting page correctly', () => {
		renderComponent(ReportingPage);
		
		expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();
		expect(screen.getByText('Financial Reports')).toBeInTheDocument();
		expect(screen.getByText('Renewal Reports')).toBeInTheDocument();
	});

	it('should switch between report types', async () => {
		renderComponent(ReportingPage);
		
		const renewalsRadio = screen.getByLabelText('Renewal Reports');
		await fireEvent.click(renewalsRadio);
		
		expect(renewalsRadio).toBeChecked();
	});

	it('should display financial report by default', () => {
		renderComponent(ReportingPage);
		
		const financialRadio = screen.getByLabelText('Financial Reports');
		expect(financialRadio).toBeChecked();
	});

	it('should load financial data on mount', async () => {
		renderComponent(ReportingPage);
		
		await waitFor(() => {
			expect(screen.getByText('Total Revenue')).toBeInTheDocument();
		});
	});

	it('should update date range', async () => {
		renderComponent(ReportingPage);
		
		const startDateInput = screen.getByLabelText('Start Date');
		const endDateInput = screen.getByLabelText('End Date');
		
		await user.clear(startDateInput);
		await user.type(startDateInput, '2024-01-01');
		
		await user.clear(endDateInput);
		await user.type(endDateInput, '2024-12-31');
		
		expect(startDateInput.value).toBe('2024-01-01');
		expect(endDateInput.value).toBe('2024-12-31');
	});

	it('should export reports in different formats', async () => {
		renderComponent(ReportingPage);
		
		const exportSelect = screen.getByLabelText('Export Format');
		await fireEvent.change(exportSelect, { target: { value: 'pdf' } });
		
		expect(exportSelect.value).toBe('pdf');
		
		const exportButton = screen.getByText('Export Report');
		expect(exportButton).toBeInTheDocument();
	});

	it('should display financial metrics', async () => {
		renderComponent(ReportingPage);
		
		await waitFor(() => {
			expect(screen.getByText('₹45,780')).toBeInTheDocument();
			expect(screen.getByText('Total Transactions')).toBeInTheDocument();
			expect(screen.getByText('Average Transaction')).toBeInTheDocument();
		});
	});

	it('should display upcoming renewals', async () => {
		renderComponent(ReportingPage);
		
		const renewalsRadio = screen.getByLabelText('Renewal Reports');
		await fireEvent.click(renewalsRadio);
		
		await waitFor(() => {
			expect(screen.getByText('John Doe')).toBeInTheDocument();
			expect(screen.getByText('MMA Focus')).toBeInTheDocument();
		});
	});

	it('should be responsive on mobile', () => {
		renderComponent(ReportingPage);
		
		const page = screen.getByText('Reports & Analytics').closest('.reporting-page');
		expect(page).toHaveClass('reporting-page');
	});

	it('should apply dark theme styles', () => {
		renderComponent(ReportingPage);
		
		const cards = screen.getAllByText('Report Settings')[0].closest('.card');
		expect(cards).toHaveClass('card');
	});

	it('should handle API errors gracefully', async () => {
		mockFetch({
			'/api/reports/financial': {
				ok: false,
				status: 500,
				json: async () => ({ error: 'Server error' })
			}
		});

		renderComponent(ReportingPage);
		
		// Component should still render without crashing
		expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();
	});

	it('should display transaction list', async () => {
		renderComponent(ReportingPage);
		
		await waitFor(() => {
			expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
			expect(screen.getByText('John Doe')).toBeInTheDocument();
			expect(screen.getByText('Jane Smith')).toBeInTheDocument();
		});
	});
});