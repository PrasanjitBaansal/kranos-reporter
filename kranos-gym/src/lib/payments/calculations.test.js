import { describe, it, expect, beforeEach } from 'vitest';
import {
    calculateTrainerPayment,
    calculateExpenseSummary,
    calculateCategoryBreakdown,
    calculateFinancialMetrics,
    validateExpense,
    filterExpensesByDateRange,
    calculatePendingPayments
} from './calculations.js';
import { PaymentFactory } from '../../test/factories/payment.factory.js';

describe('Payment Calculations', () => {
    beforeEach(() => {
        PaymentFactory.reset();
    });

    describe('calculateTrainerPayment', () => {
        it('should calculate fixed salary correctly', () => {
            const result = calculateTrainerPayment({
                rateType: 'fixed',
                fixedAmount: 25000,
                perSessionRate: null,
                sessions: null
            });
            expect(result).toBe(25000);
        });

        it('should calculate per-session payment correctly', () => {
            const result = calculateTrainerPayment({
                rateType: 'per-session',
                fixedAmount: null,
                perSessionRate: 500,
                sessions: 20
            });
            expect(result).toBe(10000);
        });

        it('should return 0 for invalid rate type', () => {
            const result = calculateTrainerPayment({
                rateType: 'invalid',
                fixedAmount: 25000,
                perSessionRate: 500,
                sessions: 10
            });
            expect(result).toBe(0);
        });

        it('should handle missing values gracefully', () => {
            expect(calculateTrainerPayment({ rateType: 'fixed', fixedAmount: null })).toBe(0);
            expect(calculateTrainerPayment({ rateType: 'per-session', perSessionRate: null, sessions: 10 })).toBe(0);
            expect(calculateTrainerPayment({ rateType: 'per-session', perSessionRate: 500, sessions: null })).toBe(0);
        });

        it('should handle edge cases', () => {
            expect(calculateTrainerPayment({ rateType: 'fixed', fixedAmount: 0 })).toBe(0);
            expect(calculateTrainerPayment({ rateType: 'per-session', perSessionRate: 0, sessions: 10 })).toBe(0);
            expect(calculateTrainerPayment({ rateType: 'per-session', perSessionRate: 500, sessions: 0 })).toBe(0);
        });
    });

    describe('calculateExpenseSummary', () => {
        it('should calculate summary for multiple expenses', () => {
            const expenses = [
                { amount: 1000 },
                { amount: 2000 },
                { amount: 3000 }
            ];
            const result = calculateExpenseSummary(expenses);
            expect(result).toEqual({
                total: 6000,
                count: 3,
                average: 2000
            });
        });

        it('should handle empty array', () => {
            const result = calculateExpenseSummary([]);
            expect(result).toEqual({
                total: 0,
                count: 0,
                average: 0
            });
        });

        it('should handle null/undefined input', () => {
            expect(calculateExpenseSummary(null)).toEqual({ total: 0, count: 0, average: 0 });
            expect(calculateExpenseSummary(undefined)).toEqual({ total: 0, count: 0, average: 0 });
        });

        it('should handle expenses with missing amounts', () => {
            const expenses = [
                { amount: 1000 },
                { amount: null },
                { amount: 2000 },
                { amount: undefined }
            ];
            const result = calculateExpenseSummary(expenses);
            expect(result).toEqual({
                total: 3000,
                count: 4,
                average: 750
            });
        });
    });

    describe('calculateCategoryBreakdown', () => {
        it('should group expenses by category', () => {
            const expenses = [
                { category: 'Rent', amount: 50000 },
                { category: 'Utilities', amount: 5000 },
                { category: 'Utilities', amount: 1500 },
                { category: 'Rent', amount: 50000 }
            ];
            const result = calculateCategoryBreakdown(expenses);
            
            expect(result.Rent.total).toBe(100000);
            expect(result.Rent.count).toBe(2);
            expect(result.Utilities.total).toBe(6500);
            expect(result.Utilities.count).toBe(2);
        });

        it('should handle expenses without category', () => {
            const expenses = [
                { amount: 1000 },
                { category: '', amount: 2000 },
                { category: null, amount: 3000 }
            ];
            const result = calculateCategoryBreakdown(expenses);
            
            expect(result.Other.total).toBe(6000);
            expect(result.Other.count).toBe(3);
        });

        it('should handle empty array', () => {
            const result = calculateCategoryBreakdown([]);
            expect(result).toEqual({});
        });

        it('should include expense items in breakdown', () => {
            const expenses = PaymentFactory.createBatch(3, { category: 'Equipment' });
            const result = calculateCategoryBreakdown(expenses);
            
            expect(result.Equipment.items).toHaveLength(3);
            expect(result.Equipment.items[0]).toEqual(expenses[0]);
        });
    });

    describe('calculateFinancialMetrics', () => {
        it('should calculate all metrics correctly', () => {
            const result = calculateFinancialMetrics(100000, 70000);
            expect(result).toEqual({
                totalIncome: 100000,
                totalExpenses: 70000,
                netProfit: 30000,
                profitMargin: 30,
                expenseRatio: 70
            });
        });

        it('should handle zero income', () => {
            const result = calculateFinancialMetrics(0, 50000);
            expect(result).toEqual({
                totalIncome: 0,
                totalExpenses: 50000,
                netProfit: -50000,
                profitMargin: 0,
                expenseRatio: 0
            });
        });

        it('should handle negative profit', () => {
            const result = calculateFinancialMetrics(50000, 70000);
            expect(result).toEqual({
                totalIncome: 50000,
                totalExpenses: 70000,
                netProfit: -20000,
                profitMargin: -40,
                expenseRatio: 140
            });
        });

        it('should round percentages to 2 decimal places', () => {
            const result = calculateFinancialMetrics(100000, 33333);
            expect(result.profitMargin).toBe(66.67);
            expect(result.expenseRatio).toBe(33.33);
        });
    });

    describe('validateExpense', () => {
        it('should validate valid expense', () => {
            const expense = {
                description: 'Electricity Bill',
                amount: 5000,
                category: 'Utilities',
                paymentDate: '2024-01-15',
                paymentMethod: 'Bank Transfer'
            };
            const result = validateExpense(expense);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should catch missing description', () => {
            const expense = {
                description: '',
                amount: 5000,
                category: 'Utilities',
                paymentDate: '2024-01-15',
                paymentMethod: 'Bank Transfer'
            };
            const result = validateExpense(expense);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Description is required');
        });

        it('should catch missing amount', () => {
            const expense = {
                description: 'Test',
                amount: null,
                category: 'Utilities',
                paymentDate: '2024-01-15',
                paymentMethod: 'Bank Transfer'
            };
            const result = validateExpense(expense);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Amount is required');
        });

        it('should catch negative amount', () => {
            const expense = {
                description: 'Test',
                amount: -1000,
                category: 'Utilities',
                paymentDate: '2024-01-15',
                paymentMethod: 'Bank Transfer'
            };
            const result = validateExpense(expense);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Amount cannot be negative');
        });

        it('should catch all validation errors', () => {
            const expense = {
                description: '',
                amount: -1000,
                category: '',
                paymentDate: null,
                paymentMethod: ''
            };
            const result = validateExpense(expense);
            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(5);
        });
    });

    describe('filterExpensesByDateRange', () => {
        const expenses = [
            { paymentDate: '2024-01-01', amount: 1000 },
            { paymentDate: '2024-01-15', amount: 2000 },
            { paymentDate: '2024-01-31', amount: 3000 },
            { paymentDate: '2024-02-15', amount: 4000 }
        ];

        it('should filter by start date only', () => {
            const result = filterExpensesByDateRange(expenses, '2024-01-15', null);
            expect(result).toHaveLength(3);
            expect(result[0].amount).toBe(2000);
        });

        it('should filter by end date only', () => {
            const result = filterExpensesByDateRange(expenses, null, '2024-01-31');
            expect(result).toHaveLength(3);
            expect(result[result.length - 1].amount).toBe(3000);
        });

        it('should filter by date range', () => {
            const result = filterExpensesByDateRange(expenses, '2024-01-15', '2024-01-31');
            expect(result).toHaveLength(2);
            expect(result[0].amount).toBe(2000);
            expect(result[1].amount).toBe(3000);
        });

        it('should return all expenses if no dates provided', () => {
            const result = filterExpensesByDateRange(expenses, null, null);
            expect(result).toHaveLength(4);
        });

        it('should handle expenses without payment date', () => {
            const mixedExpenses = [
                ...expenses,
                { amount: 5000 }
            ];
            const result = filterExpensesByDateRange(mixedExpenses, '2024-01-01', '2024-12-31');
            expect(result).toHaveLength(4);
        });

        it('should handle invalid input', () => {
            expect(filterExpensesByDateRange(null, '2024-01-01', '2024-12-31')).toEqual([]);
            expect(filterExpensesByDateRange(undefined, '2024-01-01', '2024-12-31')).toEqual([]);
        });
    });

    describe('calculatePendingPayments', () => {
        it('should calculate pending payments summary', () => {
            const expenses = [
                { status: 'Paid', amount: 1000 },
                { status: 'Pending', amount: 2000 },
                { status: 'Pending', amount: 3000 },
                { status: 'Cancelled', amount: 4000 }
            ];
            const result = calculatePendingPayments(expenses);
            
            expect(result.total).toBe(5000);
            expect(result.count).toBe(2);
            expect(result.items).toHaveLength(2);
            expect(result.items[0].amount).toBe(2000);
            expect(result.items[1].amount).toBe(3000);
        });

        it('should handle no pending payments', () => {
            const expenses = [
                { status: 'Paid', amount: 1000 },
                { status: 'Paid', amount: 2000 }
            ];
            const result = calculatePendingPayments(expenses);
            
            expect(result.total).toBe(0);
            expect(result.count).toBe(0);
            expect(result.items).toHaveLength(0);
        });

        it('should handle empty array', () => {
            const result = calculatePendingPayments([]);
            expect(result).toEqual({ total: 0, count: 0, items: [] });
        });

        it('should handle invalid input', () => {
            expect(calculatePendingPayments(null)).toEqual({ total: 0, count: 0, items: [] });
            expect(calculatePendingPayments(undefined)).toEqual({ total: 0, count: 0, items: [] });
        });

        it('should handle missing amounts', () => {
            const expenses = [
                { status: 'Pending', amount: 1000 },
                { status: 'Pending', amount: null },
                { status: 'Pending' }
            ];
            const result = calculatePendingPayments(expenses);
            
            expect(result.total).toBe(1000);
            expect(result.count).toBe(3);
        });
    });
});