// Test Data Factory for Memberships
export class MembershipFactory {
    static #counter = 1;

    static create(overrides = {}) {
        const id = this.#counter++;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1); // 1 month by default

        const baseData = {
            id,
            memberId: 1,
            membershipType: 'GC', // Group Class by default
            planId: 1,
            planName: '1 Month',
            trainerName: null,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            amount: 2000,
            registrationFee: 0,
            totalAmount: 2000,
            paymentMode: 'Cash',
            type: 'New',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        return { ...baseData, ...overrides };
    }

    static createActive(overrides = {}) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 15); // Started 15 days ago
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 15); // Ends in 15 days

        return this.create({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            ...overrides
        });
    }

    static createExpired(overrides = {}) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 2); // Started 2 months ago
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() - 1); // Ended 1 month ago

        return this.create({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            ...overrides
        });
    }

    static createExpiringSoon(daysUntilExpiry = 7, overrides = {}) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1); // Started 1 month ago
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + daysUntilExpiry);

        return this.create({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            ...overrides
        });
    }

    static createPersonalTraining(overrides = {}) {
        return this.create({
            membershipType: 'PT',
            planName: '10 Sessions',
            trainerName: 'John Trainer',
            amount: 5000,
            totalAmount: 5000,
            sessions: 10,
            sessionsUsed: 0,
            ...overrides
        });
    }

    static createRenewal(previousMembershipEndDate, overrides = {}) {
        const startDate = new Date(previousMembershipEndDate);
        startDate.setDate(startDate.getDate() + 1); // Next day after previous
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);

        return this.create({
            type: 'Renewal',
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            ...overrides
        });
    }

    static createBatch(count, overrides = {}) {
        return Array.from({ length: count }, () => this.create(overrides));
    }

    static reset() {
        this.#counter = 1;
    }
}

// Common test membership scenarios
export const testMemberships = {
    activeMonthly: {
        membershipType: 'GC',
        planName: '1 Month',
        amount: 2000,
        type: 'New'
    },
    activeQuarterly: {
        membershipType: 'GC',
        planName: '3 Months',
        amount: 5500,
        type: 'New'
    },
    personalTraining: {
        membershipType: 'PT',
        planName: '10 Sessions',
        trainerName: 'John Trainer',
        amount: 5000,
        sessions: 10,
        sessionsUsed: 3
    },
    expired: {
        membershipType: 'GC',
        planName: '1 Month',
        amount: 2000,
        type: 'Renewal'
    }
};