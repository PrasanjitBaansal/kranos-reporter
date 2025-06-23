import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte/svelte5';
import { tick } from 'svelte';
import { renderComponent, mockFetch, mockData } from './utils.js';
import Dashboard from '../routes/+page.svelte';

describe('Dashboard Debug', () => {
	beforeEach(() => {
		mockFetch();
	});

	it('should debug onMount completion', async () => {
		const originalConsoleError = console.error;
		const consoleErrorSpy = vi.fn();
		console.error = consoleErrorSpy;

		renderComponent(Dashboard);
		
		// Wait for multiple tick cycles
		await tick();
		await tick();
		await new Promise(resolve => setTimeout(resolve, 100));
		
		console.log('Console errors:', consoleErrorSpy.mock.calls);
		console.log('Loading element:', screen.queryByText('Loading dashboard...'));
		console.log('Stats element:', screen.queryByText('Total Members'));
		
		console.error = originalConsoleError;
		
		expect(screen.getByText('Dashboard')).toBeInTheDocument();
	});
});