import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import PaymentsPage from './+page.svelte';
import { mockFetch, renderComponent } from '../../test/utils.js';
import { PaymentFactory, TrainerRateFactory, paymentCategories } from '../../test/factories/payment.factory.js';

describe('Payments Page Component', () => {
    let user;
    let mockExpenses;
    let mockTrainerRates;
    let mockCategories;
    let defaultData;

    beforeEach(() => {
        user = userEvent.setup();
        PaymentFactory.reset();
        TrainerRateFactory.reset();
        
        // Setup mock data
        mockExpenses = PaymentFactory.createMonthlyExpenses();
        mockTrainerRates = [
            TrainerRateFactory.create({ trainerName: 'John Trainer' }),
            TrainerRateFactory.createPerSession({ trainerName: 'Jane Trainer' })
        ];
        mockCategories = paymentCategories;

        // Default data structure that all tests will use
        defaultData = {
            expenses: [],
            trainerRates: [],
            summary: {
                totalAmount: 0,
                totalCount: 0,
                averageAmount: 0,
                categoryBreakdown: {}
            },
            dateRange: { startDate: null, endDate: null },
            currentMonth: {
                start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
            },
            categories: mockCategories,
            members: [],
            paymentSummary: {}
        };

        // Setup global fetch mock
        mockFetch({
            '/api/payments/categories': {
                json: async () => mockCategories,
                ok: true
            }
        });
    });

    describe('Page Rendering', () => {
        it('should render page with title and tabs', () => {
            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData,
                        expenses: mockExpenses,
                        trainerRates: mockTrainerRates,
                        summary: {
                            totalAmount: 116500,
                            totalCount: 7,
                            averageAmount: 16642.86,
                            categoryBreakdown: {}
                        }
                    }
                }
            });

            expect(screen.getByText('Payments Management')).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /expense tracking/i })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /trainer payments/i })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /payment summary/i })).toBeInTheDocument();
        });

        it('should display expense list correctly', () => {
            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData,
                        expenses: mockExpenses,
                        trainerRates: [],
                        summary: {},
                        dateRange: {}
                    }
                }
            });

            // Check if expenses are displayed
            expect(screen.getByText('Electricity Bill')).toBeInTheDocument();
            expect(screen.getByText('Monthly Rent')).toBeInTheDocument();
            expect(screen.getByText('₹50,000')).toBeInTheDocument(); // Rent amount
        });

        it('should display correct status badges', () => {
            const expensesWithStatus = [
                PaymentFactory.create({ status: 'Paid', description: 'Paid Expense' }),
                PaymentFactory.createPending({ description: 'Pending Expense' })
            ];

            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData,
                        expenses: expensesWithStatus,
                        trainerRates: [],
                        summary: {},
                        dateRange: {}
                    }
                }
            });

            const paidBadge = screen.getByText('Paid');
            const pendingBadge = screen.getByText('Pending');

            expect(paidBadge).toHaveClass('bg-green-100', 'text-green-800');
            expect(pendingBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
        });
    });

    describe('Expense Form Handling', () => {
        it('should show add expense form when clicking add button', async () => {
            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData,
                        expenses: [],
                        trainerRates: [],
                        summary: {},
                        dateRange: {}
                    }
                }
            });

            const addButton = screen.getByRole('button', { name: /add expense/i });
            await user.click(addButton);

            expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/payment date/i)).toBeInTheDocument();
        });

        it('should validate required fields', async () => {
            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData,
                        expenses: [],
                        trainerRates: [],
                        summary: {},
                        dateRange: {}
                    }
                }
            });

            await user.click(screen.getByRole('button', { name: /add expense/i }));
            
            // Try to submit empty form
            const form = screen.getByRole('form');
            const submitButton = within(form).getByRole('button', { name: /save expense/i });
            
            fireEvent.submit(form);

            // Check HTML5 validation
            const descriptionInput = screen.getByLabelText(/description/i);
            expect(descriptionInput).toBeRequired();
            expect(descriptionInput.validity.valid).toBe(false);
        });

        it('should create new expense successfully', async () => {
            let formData;

            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData
                    },
                    form: {
                        create: {
                            success: true,
                            data: PaymentFactory.create()
                        }
                    }
                }
            });

            // Mock form submission
            const originalFetch = global.fetch;
            global.fetch = vi.fn((url, options) => {
                if (url.includes('/payments') && options.method === 'POST') {
                    formData = options.body;
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({ success: true })
                    });
                }
                return originalFetch(url, options);
            });

            await user.click(screen.getByRole('button', { name: /add expense/i }));

            // Fill form
            await user.type(screen.getByLabelText(/description/i), 'Test Expense');
            await user.type(screen.getByLabelText(/amount/i), '5000');
            await user.selectOptions(screen.getByLabelText(/category/i), 'Utilities');
            await user.type(screen.getByLabelText(/payment date/i), '2024-01-15');
            await user.selectOptions(screen.getByLabelText(/payment method/i), 'Bank Transfer');

            // Submit form
            const form = screen.getByRole('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    expect.stringContaining('/payments'),
                    expect.objectContaining({ method: 'POST' })
                );
            });

            global.fetch = originalFetch;
        });

        it('should handle edit mode correctly', async () => {
            const expense = PaymentFactory.create({
                description: 'Edit Test',
                amount: 3000,
                category: 'Equipment'
            });

            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData,
                        expenses: [expense],
                        trainerRates: [],
                        summary: {},
                        dateRange: {}
                    }
                }
            });

            // Click edit button
            const editButton = screen.getByRole('button', { name: /edit/i });
            await user.click(editButton);

            // Check if form is populated
            expect(screen.getByDisplayValue('Edit Test')).toBeInTheDocument();
            expect(screen.getByDisplayValue('3000')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Equipment')).toBeInTheDocument();
        });

        it('should handle delete expense', async () => {
            const expense = PaymentFactory.create({ description: 'Delete Test' });
            
            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData,
                        expenses: [expense],
                        trainerRates: [],
                        summary: {},
                        dateRange: {}
                    }
                }
            });

            // Mock window.confirm
            vi.spyOn(window, 'confirm').mockReturnValue(true);

            const deleteButton = screen.getByRole('button', { name: /delete/i });
            await user.click(deleteButton);

            expect(window.confirm).toHaveBeenCalledWith(
                'Are you sure you want to delete this expense?'
            );
        });
    });

    describe('Trainer Payments Tab', () => {
        it('should display trainer rates correctly', async () => {
            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData,
                        expenses: [],
                        trainerRates: mockTrainerRates,
                        summary: {},
                        dateRange: {}
                    }
                }
            });

            // Switch to trainer payments tab
            await user.click(screen.getByRole('tab', { name: /trainer payments/i }));

            expect(screen.getByText('John Trainer')).toBeInTheDocument();
            expect(screen.getByText('Fixed Salary')).toBeInTheDocument();
            expect(screen.getByText('₹25,000/month')).toBeInTheDocument();

            expect(screen.getByText('Jane Trainer')).toBeInTheDocument();
            expect(screen.getByText('Per Session')).toBeInTheDocument();
            expect(screen.getByText('₹500/session')).toBeInTheDocument();
        });

        it('should show trainer rate form', async () => {
            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData,
                        expenses: [],
                        trainerRates: [],
                        summary: {},
                        dateRange: {}
                    }
                }
            });

            await user.click(screen.getByRole('tab', { name: /trainer payments/i }));
            await user.click(screen.getByRole('button', { name: /configure trainer rate/i }));

            expect(screen.getByLabelText(/trainer name/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/rate type/i)).toBeInTheDocument();
        });

        it('should toggle between fixed and per-session rate fields', async () => {
            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData,
                        expenses: [],
                        trainerRates: [],
                        summary: {},
                        dateRange: {}
                    }
                }
            });

            await user.click(screen.getByRole('tab', { name: /trainer payments/i }));
            await user.click(screen.getByRole('button', { name: /configure trainer rate/i }));

            const rateTypeSelect = screen.getByLabelText(/rate type/i);
            
            // Default is fixed
            expect(screen.getByLabelText(/fixed monthly amount/i)).toBeInTheDocument();

            // Switch to per-session
            await user.selectOptions(rateTypeSelect, 'per-session');
            expect(screen.getByLabelText(/rate per session/i)).toBeInTheDocument();
        });
    });

    describe('Payment Summary Tab', () => {
        it('should display payment summary correctly', async () => {
            const summary = {
                totalAmount: 116500,
                totalCount: 7,
                averageAmount: 16642.86,
                categoryBreakdown: {
                    Rent: { total: 50000, count: 1 },
                    Utilities: { total: 6500, count: 2 },
                    'Trainer Fees': { total: 55000, count: 2 }
                }
            };

            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData,
                        expenses: [],
                        trainerRates: [],
                        summary,
                        dateRange: {}
                    }
                }
            });

            await user.click(screen.getByRole('tab', { name: /payment summary/i }));

            expect(screen.getByText('₹1,16,500')).toBeInTheDocument(); // Total amount
            expect(screen.getByText('7')).toBeInTheDocument(); // Total count
            expect(screen.getByText('₹16,642.86')).toBeInTheDocument(); // Average

            // Category breakdown
            expect(screen.getByText('Rent')).toBeInTheDocument();
            expect(screen.getByText('₹50,000')).toBeInTheDocument();
        });

        it('should handle date range filtering', async () => {
            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData,
                        expenses: mockExpenses,
                        trainerRates: [],
                        summary: {},
                        dateRange: { startDate: null, endDate: null }
                    }
                }
            });

            await user.click(screen.getByRole('tab', { name: /payment summary/i }));

            const startDateInput = screen.getByLabelText(/start date/i);
            const endDateInput = screen.getByLabelText(/end date/i);

            await user.type(startDateInput, '2024-01-01');
            await user.type(endDateInput, '2024-01-31');

            const applyButton = screen.getByRole('button', { name: /apply filter/i });
            expect(applyButton).toBeInTheDocument();
        });
    });

    describe('Search and Filter', () => {
        it('should filter expenses by search term', async () => {
            const expenses = [
                PaymentFactory.create({ description: 'Electricity Bill' }),
                PaymentFactory.create({ description: 'Water Bill' }),
                PaymentFactory.create({ description: 'Monthly Rent' })
            ];

            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData,
                        expenses,
                        trainerRates: [],
                        summary: {},
                        dateRange: {}
                    }
                }
            });

            const searchInput = screen.getByPlaceholderText(/search expenses/i);
            await user.type(searchInput, 'Bill');

            // Should show both bills but not rent
            expect(screen.getByText('Electricity Bill')).toBeInTheDocument();
            expect(screen.getByText('Water Bill')).toBeInTheDocument();
            expect(screen.queryByText('Monthly Rent')).not.toBeInTheDocument();
        });

        it('should filter by category', async () => {
            const expenses = [
                PaymentFactory.create({ category: 'Utilities', description: 'Electric' }),
                PaymentFactory.create({ category: 'Rent', description: 'Monthly Rent' }),
                PaymentFactory.create({ category: 'Utilities', description: 'Water' })
            ];

            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData,
                        expenses,
                        trainerRates: [],
                        summary: {},
                        dateRange: {}
                    }
                }
            });

            const categoryFilter = screen.getByLabelText(/filter by category/i);
            await user.selectOptions(categoryFilter, 'Utilities');

            expect(screen.getByText('Electric')).toBeInTheDocument();
            expect(screen.getByText('Water')).toBeInTheDocument();
            expect(screen.queryByText('Monthly Rent')).not.toBeInTheDocument();
        });

        it('should filter by status', async () => {
            const expenses = [
                PaymentFactory.create({ status: 'Paid', description: 'Paid Expense' }),
                PaymentFactory.createPending({ description: 'Pending Expense' })
            ];

            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData,
                        expenses,
                        trainerRates: [],
                        summary: {},
                        dateRange: {}
                    }
                }
            });

            const statusFilter = screen.getByLabelText(/filter by status/i);
            await user.selectOptions(statusFilter, 'Pending');

            expect(screen.getByText('Pending Expense')).toBeInTheDocument();
            expect(screen.queryByText('Paid Expense')).not.toBeInTheDocument();
        });
    });

    describe('Dark Theme', () => {
        it('should apply dark theme classes', () => {
            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData,
                        expenses: mockExpenses,
                        trainerRates: [],
                        summary: {},
                        dateRange: {}
                    }
                }
            });

            // Set dark theme
            document.documentElement.classList.add('dark');

            const pageContainer = screen.getByTestId('payments-page');
            expect(pageContainer).toHaveClass('dark:bg-gray-800');
        });
    });

    describe('Loading States', () => {
        it('should show loading state when fetching categories', async () => {
            // Mock slow response
            mockFetch({
                '/api/payments/categories': {
                    json: async () => {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        return mockCategories;
                    },
                    ok: true
                }
            });

            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData,
                        expenses: [],
                        trainerRates: [],
                        summary: {},
                        dateRange: {}
                    }
                }
            });

            await user.click(screen.getByRole('button', { name: /add expense/i }));

            // Should show loading state initially
            expect(screen.getByText(/loading categories/i)).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        it('should display error message on form submission failure', async () => {
            renderComponent(PaymentsPage, {
                props: {
                    data: {
                        ...defaultData,
                        expenses: [],
                        trainerRates: [],
                        summary: {},
                        dateRange: {}
                    },
                    form: {
                        create: {
                            success: false,
                            error: 'Failed to create expense'
                        }
                    }
                }
            });

            expect(screen.getByText('Failed to create expense')).toBeInTheDocument();
        });
    });
});