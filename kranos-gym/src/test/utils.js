import { render } from '@testing-library/svelte/svelte5';
import { vi } from 'vitest';

/**
 * Custom render function that provides common testing utilities
 */
export function renderComponent(Component, options = {}) {
	const { props = {}, ...renderOptions } = options;
	
	// Default data structure for components that expect data from server load
	const defaultData = {
		members: mockData.members,
		groupPlans: mockData.plans,
		groupClassMemberships: mockData.groupMemberships,
		ptMemberships: mockData.ptMemberships
	};
	
	
	// Merge provided props with defaults
	const mergedProps = {
		data: defaultData,
		form: null,
		...props
	};
	
	// Mock localStorage for authentication
	const mockLocalStorage = {
		getItem: vi.fn().mockReturnValue(authenticated ? 'mock-session-token' : null),
		setItem: vi.fn(),
		removeItem: vi.fn()
	};
	
	Object.defineProperty(window, 'localStorage', {
		value: mockLocalStorage,
		writable: true
	});
	
	// Mock SvelteKit stores
	const mockStores = {
		page: {
			url: new URL('http://localhost:5173/'),
			params: {},
			route: { id: null },
			status: 200,
			error: null,
			data: defaultData,
			form: null
		},
		navigating: null,
		updated: false
	};
	
	const result = render(Component, {
		props: mergedProps,
		context: new Map([
			['stores', mockStores],
			['loadingState', loadingState]
		]),
		...renderOptions
	});
	
	return {
		...result,
		mockStores,
		mockLocalStorage,
		loadingState
	};
}

/**
 * Mock fetch with common responses
 */
export function mockFetch(responses = {}) {
	const defaultResponses = {
		'/api/members': { json: async () => mockData.members, ok: true, status: 200 },
		'/api/plans': { json: async () => mockData.plans, ok: true, status: 200 },
		'/api/memberships/group-class': { json: async () => mockData.groupMemberships, ok: true, status: 200 },
		'/api/memberships/personal-training': { json: async () => mockData.ptMemberships, ok: true, status: 200 },
		'/api/reports/financial': { json: async () => mockData.financialReport, ok: true, status: 200 },
		'/api/reports/renewals': { json: async () => mockData.renewals, ok: true, status: 200 },
		'/api/auth/check': { json: async () => ({}), ok: false, status: 401 },
		'/api/auth/login': { json: async () => ({ success: true, sessionToken: 'mock-token' }), ok: true, status: 200 },
		'/api/auth/validate': { json: async () => ({ valid: true }), ok: true, status: 200 }
	};
	
	const allResponses = { ...defaultResponses, ...responses };
	
	global.fetch = vi.fn((url, options = {}) => {
		const method = options.method || 'GET';
		const key = `${method} ${url}`;
		const response = allResponses[url] || allResponses[key];
		
		if (response) {
			return Promise.resolve(response);
		}
		
		// Default response for unmatched URLs
		return Promise.resolve({
			ok: false,
			status: 404,
			json: async () => ({ error: 'Not Found' }),
			text: async () => 'Not Found'
		});
	});
}

/**
 * Mock database data
 */
export const mockData = {
	members: [
		{
			id: 1,
			name: 'John Doe',
			phone: '555-0001',
			email: 'john@example.com',
			join_date: '2024-01-15',
			is_active: true
		},
		{
			id: 2,
			name: 'Jane Smith',
			phone: '555-0002',
			email: 'jane@example.com',
			join_date: '2024-02-01',
			is_active: true
		},
		{
			id: 3,
			name: 'Mike Johnson',
			phone: '555-0003',
			email: 'mike@example.com',
			join_date: '2024-01-01',
			is_active: false
		}
	],
	
	plans: [
		{
			id: 1,
			name: 'MMA Focus',
			duration_days: 90,
			default_amount: 120.00,
			display_name: 'MMA Focus - 90 days',
			is_active: true
		},
		{
			id: 2,
			name: 'Weight Training',
			duration_days: 30,
			default_amount: 80.00,
			display_name: 'Weight Training - 30 days',
			is_active: true
		},
		{
			id: 3,
			name: 'Cardio Blast',
			duration_days: 60,
			default_amount: 100.00,
			display_name: 'Cardio Blast - 60 days',
			is_active: false
		}
	],
	
	groupMemberships: [
		{
			id: 1,
			member_id: 1,
			plan_id: 1,
			member_name: 'John Doe',
			plan_name: 'MMA Focus',
			start_date: '2025-06-01',
			end_date: '2025-08-30',
			amount_paid: 120.00,
			purchase_date: '2025-06-01',
			membership_type: 'New',
			is_active: true
		},
		{
			id: 2,
			member_id: 2,
			plan_id: 2,
			member_name: 'Jane Smith',
			plan_name: 'Weight Training',
			start_date: '2025-06-15',
			end_date: '2025-07-15',
			amount_paid: 80.00,
			purchase_date: '2025-06-15',
			membership_type: 'Renewal',
			is_active: true
		}
	],
	
	ptMemberships: [
		{
			id: 1,
			member_id: 1,
			member_name: 'John Doe',
			purchase_date: '2025-06-01',
			amount_paid: 200.00,
			sessions_total: 10,
			sessions_remaining: 7
		}
	],
	
	financialReport: {
		total_revenue: 45780,
		gc_revenue: 35000,
		pt_revenue: 10780,
		total_transactions: 156,
		gc_transactions: 120,
		pt_transactions: 36,
		avg_transaction: 293.46,
		daily_average: 1526.00,
		transactions: [
			{
				date: '2025-06-20',
				member_name: 'John Doe',
				type: 'group_class',
				plan_or_sessions: 'MMA Focus - 90 days',
				amount: 120.00
			},
			{
				date: '2025-06-19',
				member_name: 'Jane Smith',
				type: 'personal_training',
				plan_or_sessions: '10 sessions',
				amount: 200.00
			}
		]
	},
	
	renewals: [
		{
			id: 1,
			member_name: 'John Doe',
			plan_name: 'MMA Focus',
			start_date: '2025-06-01',
			end_date: '2025-06-25'
		},
		{
			id: 2,
			member_name: 'Jane Smith',
			plan_name: 'Weight Training',
			start_date: '2025-06-15',
			end_date: '2025-07-01'
		}
	]
};

/**
 * Wait for async operations to complete
 */
export function waitFor(ms = 0) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for Svelte component to finish mounting and all reactivity
 */
export async function waitForSvelteUpdate() {
	const { tick } = await import('svelte');
	await tick();
	// Give extra time for async operations in onMount
	await new Promise(resolve => setTimeout(resolve, 10));
}

/**
 * Mock onMount lifecycle to control when it completes
 */
export function mockOnMount(mockImplementation = null) {
	const onMountFn = vi.fn();
	
	if (mockImplementation) {
		onMountFn.mockImplementation(mockImplementation);
	} else {
		// Default implementation that resolves immediately
		onMountFn.mockImplementation((callback) => {
			if (typeof callback === 'function') {
				const result = callback();
				// If callback returns a promise, return it
				if (result && typeof result.then === 'function') {
					return result;
				}
			}
			return Promise.resolve();
		});
	}
	
	return onMountFn;
}

/**
 * Enhanced render function with onMount control
 */
export function renderComponentWithMount(Component, options = {}) {
	const { 
		props = {}, 
		authenticated = true, 
		isLoading = false,
		onMountBehavior = 'immediate',
		...renderOptions 
	} = options;
	
	// Mock onMount based on behavior
	let onMountResolver;
	const onMountPromise = new Promise(resolve => {
		onMountResolver = resolve;
	});
	
	const mockOnMountFn = mockOnMount((callback) => {
		if (onMountBehavior === 'immediate') {
			// Execute callback immediately
			const result = callback();
			if (result && typeof result.then === 'function') {
				return result.then(() => {
					onMountResolver();
					return result;
				});
			}
			onMountResolver();
			return Promise.resolve();
		} else if (onMountBehavior === 'manual') {
			// Don't execute callback until manually triggered
			return onMountPromise.then(() => {
				const result = callback();
				if (result && typeof result.then === 'function') {
					return result;
				}
				return Promise.resolve();
			});
		}
	});
	
	// Mock svelte's onMount
	vi.doMock('svelte', async (importOriginal) => {
		const actual = await importOriginal();
		return {
			...actual,
			onMount: mockOnMountFn
		};
	});
	
	const renderResult = renderComponent(Component, {
		props,
		authenticated,
		isLoading,
		...renderOptions
	});
	
	return {
		...renderResult,
		triggerOnMount: () => onMountResolver(),
		onMountPromise
	};
}

/**
 * Create a mock store
 */
export function createMockStore(initialValue) {
	let value = initialValue;
	const subscribers = new Set();
	
	return {
		subscribe: (fn) => {
			subscribers.add(fn);
			fn(value);
			return () => subscribers.delete(fn);
		},
		set: (newValue) => {
			value = newValue;
			subscribers.forEach(fn => fn(value));
		},
		update: (fn) => {
			value = fn(value);
			subscribers.forEach(fn => fn(value));
		}
	};
}

/**
 * Test theme utilities
 */
export function getThemeVariables() {
	const root = document.documentElement;
	const computedStyle = getComputedStyle(root);
	
	return {
		primary: computedStyle.getPropertyValue('--primary').trim(),
		background: computedStyle.getPropertyValue('--background').trim(),
		surface: computedStyle.getPropertyValue('--surface').trim(),
		text: computedStyle.getPropertyValue('--text').trim()
	};
}

export function hasThemeClass(element, expectedTheme = 'dark') {
	const computedStyle = getComputedStyle(element);
	const backgroundColor = computedStyle.backgroundColor;
	
	// Check if background color suggests dark theme
	if (expectedTheme === 'dark') {
		return backgroundColor.includes('10, 10, 10') || // #0a0a0a
			   backgroundColor.includes('26, 26, 26') ||  // #1a1a1a
			   backgroundColor.includes('42, 42, 42');    // #2a2a2a
	}
	
	return false;
}

/**
 * Mock navigation functions
 */
export function mockNavigation() {
	const goto = vi.fn();
	const invalidate = vi.fn();
	const invalidateAll = vi.fn();
	const preloadData = vi.fn();
	const preloadCode = vi.fn();
	const beforeNavigate = vi.fn();
	const afterNavigate = vi.fn();
	
	return {
		goto,
		invalidate,
		invalidateAll,
		preloadData,
		preloadCode,
		beforeNavigate,
		afterNavigate
	};
}

// Mock SvelteKit modules globally
vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	preloadData: vi.fn(),
	preloadCode: vi.fn(),
	beforeNavigate: vi.fn(),
	afterNavigate: vi.fn()
}));

vi.mock('$app/forms', () => ({
	enhance: vi.fn(() => ({
		destroy: vi.fn()
	}))
}));