// Test Data Factory for Payments/Expenses
export class PaymentFactory {
    static #counter = 1;

    static create(overrides = {}) {
        const id = this.#counter++;
        const baseData = {
            id,
            description: `Test Expense ${id}`,
            amount: 1000,
            category: 'Utilities',
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'Bank Transfer',
            payeeName: `Payee ${id}`,
            status: 'Paid',
            notes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        return { ...baseData, ...overrides };
    }

    static createPending(overrides = {}) {
        return this.create({
            status: 'Pending',
            ...overrides
        });
    }

    static createTrainerPayment(overrides = {}) {
        return this.create({
            category: 'Trainer Fees',
            description: 'Trainer Monthly Salary',
            amount: 25000,
            ...overrides
        });
    }

    static createUtilityBill(overrides = {}) {
        return this.create({
            category: 'Utilities',
            description: 'Electricity Bill',
            amount: 5000,
            ...overrides
        });
    }

    static createEquipmentPurchase(overrides = {}) {
        return this.create({
            category: 'Equipment',
            description: 'Dumbbells Set',
            amount: 15000,
            ...overrides
        });
    }

    static createBatch(count, overrides = {}) {
        return Array.from({ length: count }, () => this.create(overrides));
    }

    static createMonthlyExpenses() {
        return [
            this.createUtilityBill({ description: 'Electricity Bill', amount: 5000 }),
            this.createUtilityBill({ description: 'Water Bill', amount: 1500 }),
            this.create({ category: 'Rent', description: 'Monthly Rent', amount: 50000 }),
            this.createTrainerPayment({ payeeName: 'John Trainer', amount: 25000 }),
            this.createTrainerPayment({ payeeName: 'Jane Trainer', amount: 30000 }),
            this.create({ category: 'Maintenance', description: 'AC Service', amount: 2000 }),
            this.create({ category: 'Supplies', description: 'Cleaning Supplies', amount: 3000 })
        ];
    }

    static reset() {
        this.#counter = 1;
    }
}

// Test data for trainer rates
export class TrainerRateFactory {
    static #counter = 1;

    static create(overrides = {}) {
        const id = this.#counter++;
        const baseData = {
            id,
            trainerName: `Trainer ${id}`,
            rateType: 'fixed',
            fixedAmount: 25000,
            perSessionRate: null,
            effectiveDate: new Date().toISOString().split('T')[0],
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        return { ...baseData, ...overrides };
    }

    static createPerSession(overrides = {}) {
        return this.create({
            rateType: 'per-session',
            fixedAmount: null,
            perSessionRate: 500,
            ...overrides
        });
    }

    static reset() {
        this.#counter = 1;
    }
}

// Common test payment scenarios
export const testPayments = {
    rent: {
        category: 'Rent',
        description: 'Monthly Rent',
        amount: 50000,
        status: 'Paid'
    },
    electricity: {
        category: 'Utilities',
        description: 'Electricity Bill',
        amount: 5000,
        status: 'Paid'
    },
    trainerSalary: {
        category: 'Trainer Fees',
        description: 'Monthly Trainer Salary',
        amount: 25000,
        status: 'Pending'
    },
    equipment: {
        category: 'Equipment',
        description: 'New Treadmill',
        amount: 75000,
        status: 'Paid'
    }
};

// Payment categories for testing
export const paymentCategories = [
    'Rent',
    'Utilities',
    'Trainer Fees',
    'Equipment',
    'Maintenance',
    'Supplies',
    'Marketing',
    'Other'
];