// Test Data Factory for Members
export class MemberFactory {
    static #counter = 1;

    static create(overrides = {}) {
        const id = this.#counter++;
        const baseData = {
            id,
            name: `Test Member ${id}`,
            phone: `98765${String(id).padStart(5, '0')}`,
            email: `member${id}@test.com`,
            address: `Test Address ${id}`,
            joinDate: new Date().toISOString().split('T')[0],
            status: 'Active',
            notes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        return { ...baseData, ...overrides };
    }

    static createBatch(count, overrides = {}) {
        return Array.from({ length: count }, () => this.create(overrides));
    }

    static createNew(overrides = {}) {
        const joinDate = new Date();
        joinDate.setDate(joinDate.getDate() - 10); // 10 days ago
        return this.create({
            status: 'New',
            joinDate: joinDate.toISOString().split('T')[0],
            ...overrides
        });
    }

    static createInactive(overrides = {}) {
        const joinDate = new Date();
        joinDate.setMonth(joinDate.getMonth() - 6); // 6 months ago
        return this.create({
            status: 'Inactive',
            joinDate: joinDate.toISOString().split('T')[0],
            ...overrides
        });
    }

    static createWithMembership(membershipData = {}) {
        const member = this.create();
        const membership = {
            memberId: member.id,
            planId: 1,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            amount: 2000,
            paymentMode: 'Cash',
            type: 'New',
            ...membershipData
        };
        return { member, membership };
    }

    static reset() {
        this.#counter = 1;
    }
}

// Common test member scenarios
export const testMembers = {
    john: {
        name: 'John Doe',
        phone: '9876543210',
        email: 'john@example.com',
        address: '123 Main St',
        status: 'Active'
    },
    jane: {
        name: 'Jane Smith',
        phone: '9876543211',
        email: 'jane@example.com',
        address: '456 Oak Ave',
        status: 'Active'
    },
    inactive: {
        name: 'Inactive Member',
        phone: '9876543212',
        email: 'inactive@example.com',
        address: '789 Pine Rd',
        status: 'Inactive'
    },
    newMember: {
        name: 'New Member',
        phone: '9876543213',
        email: 'new@example.com',
        address: '321 Elm St',
        status: 'New',
        joinDate: new Date().toISOString().split('T')[0]
    }
};