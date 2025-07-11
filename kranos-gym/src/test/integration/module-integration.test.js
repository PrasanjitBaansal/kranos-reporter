import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from '../../lib/db/database.js';
import AuthenticationService from '../../lib/security/auth-service.js';
import { showSuccess, showError } from '../../lib/stores/toast.js';
import { writable } from 'svelte/store';

vi.mock('../../lib/stores/toast.js', () => ({
    showSuccess: vi.fn(),
    showError: vi.fn()
}));

describe.skip('Module Integration Tests', () => {
    let db;
    let authService;
    
    beforeEach(() => {
        db = new Database();
        authService = new AuthenticationService();
        vi.clearAllMocks();
    });
    
    afterEach(() => {
        // Clean up connections
        if (db) {
            db.close();
        }
    });
    
    describe('Auth → Database → UI Flow', () => {
        it('should handle complete login flow with database and UI updates', async () => {
            // Setup test user
            db.connect();
            const testUser = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'Test123!',
                role: 'trainer'
            };
            
            // Create user
            const { hash } = await authService.hashPassword(testUser.password);
            const userId = db.createUser({
                ...testUser,
                password_hash: hash,
                salt: 'test-salt',
                full_name: 'Test User',
                status: 'Active',
                failed_login_attempts: 0
            });
            
            // Test login
            const loginResult = await authService.login(testUser.username, testUser.password, {
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            });
            
            expect(loginResult).toHaveProperty('token');
            expect(loginResult).toHaveProperty('refreshToken');
            expect(loginResult.user.username).toBe(testUser.username);
            
            // Verify session was created in database
            const sessions = db.getUserSessions(userId);
            expect(sessions.length).toBeGreaterThan(0);
            
            // Cleanup
            db.deleteUser(userId);
        });
        
        it('should handle failed login with proper error propagation', async () => {
            db.connect();
            try {
                await authService.login('nonexistent', 'wrongpass', {
                    ipAddress: '127.0.0.1',
                    userAgent: 'test-agent'
                });
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).toContain('Invalid credentials');
            }
        });
    });
    
    describe('Member → Membership → Payment Flow', () => {
        it('should create member, add membership, and calculate payment correctly', () => {
            db.connect();
            
            // Create member with unique phone number
            const uniquePhone = '99' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
            const memberId = db.createMember({
                name: 'Test Member',
                phone: uniquePhone,
                email: 'member@test.com',
                join_date: '2025-07-01'
            });
            
            // Create plan
            const planId = db.createGroupPlan({
                name: 'Test Plan',
                duration_days: 30,
                default_amount: 1000
            });
            
            // Create membership
            const membershipData = {
                member_id: memberId,
                plan_id: planId,
                start_date: '2025-07-01',
                amount_paid: 1000,
                purchase_date: '2025-07-01'
            };
            
            const membershipId = db.createGroupClassMembership(membershipData);
            
            // Verify membership created
            const membership = db.getGroupClassMembershipById(membershipId);
            expect(membership).toBeDefined();
            expect(membership.end_date).toBe('2025-07-31');
            expect(membership.membership_type).toBe('New');
            
            // Verify member status updated
            const member = db.getMemberById(memberId);
            expect(member.status).toBe('Active');
            
            // Test financial report includes this payment
            const report = db.getFinancialReport('2025-07-01', '2025-07-31');
            expect(report.total_revenue).toBe(1000);
            expect(report.gc_revenue).toBe(1000);
            
            // Cleanup
            db.deleteGroupClassMembership(membershipId);
            db.deleteGroupPlan(planId);
            db.deleteMember(memberId);
        });
        
        it('should handle membership renewal flow correctly', () => {
            db.connect();
            
            // Create member with unique phone number
            const uniquePhone = '88' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
            const memberId = db.createMember({
                name: 'Renewal Test',
                phone: uniquePhone,
                email: 'renewal@test.com',
                join_date: '2025-06-01'
            });
            
            const planId = db.createGroupPlan({
                name: 'Monthly Plan',
                duration_days: 30,
                default_amount: 1000
            });
            
            // First membership
            const firstMembership = db.createGroupClassMembership({
                member_id: memberId,
                plan_id: planId,
                start_date: '2025-06-01',
                amount_paid: 1000,
                purchase_date: '2025-06-01'
            });
            
            // Renewal membership
            const renewalMembership = db.createGroupClassMembership({
                member_id: memberId,
                plan_id: planId,
                start_date: '2025-07-01',
                amount_paid: 900,
                purchase_date: '2025-06-28'
            });
            
            // Verify renewal detected
            const renewal = db.getGroupClassMembershipById(renewalMembership);
            expect(renewal.membership_type).toBe('Renewal');
            
            // Verify upcoming renewals report
            const upcomingRenewals = db.getUpcomingRenewals(35);
            const hasRenewal = upcomingRenewals.some(r => r.member_id === memberId);
            expect(hasRenewal).toBe(true);
            
            // Cleanup
            db.deleteGroupClassMembership(firstMembership);
            db.deleteGroupClassMembership(renewalMembership);
            db.deleteGroupPlan(planId);
            db.deleteMember(memberId);
        });
    });
    
    describe('Expense → Financial Report Integration', () => {
        it('should integrate expenses into financial reports correctly', () => {
            db.connect();
            
            // Create some income data with unique phone
            const uniquePhone = '77' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
            const memberId = db.createMember({
                name: 'Income Test',
                phone: uniquePhone,
                email: 'income@test.com',
                join_date: '2025-07-01'
            });
            
            const planId = db.createGroupPlan({
                name: 'Income Plan',
                duration_days: 30,
                default_amount: 2000
            });
            
            db.createGroupClassMembership({
                member_id: memberId,
                plan_id: planId,
                start_date: '2025-07-01',
                amount_paid: 2000,
                purchase_date: '2025-07-01'
            });
            
            // Create expense
            const expenseId = db.createExpense({
                amount: 500,
                category: 'Rent',
                description: 'Monthly rent',
                payment_date: '2025-07-01',
                recipient: 'Landlord'
            });
            
            // Get enhanced financial report
            const report = db.getFinancialReportWithExpenses('2025-07-01', '2025-07-31');
            
            expect(report.summary.totalIncome).toBe(2000);
            expect(report.summary.totalExpenses).toBe(500);
            expect(report.summary.netProfit).toBe(1500);
            expect(report.summary.profitMargin).toBe(75);
            
            // Cleanup
            db.deleteExpense(expenseId);
            db.deleteGroupPlan(planId);
            db.deleteMember(memberId);
        });
    });
    
    describe('User Permissions → Route Access Integration', () => {
        it('should enforce role-based access correctly', () => {
            db.connect();
            
            // Create users with different roles
            const adminUser = db.createUser({
                username: 'admin_' + Date.now(),
                email: 'admin@test.com',
                password_hash: 'hash',
                salt: 'salt',
                role: 'admin',
                full_name: 'Admin User',
                status: 'Active',
                failed_login_attempts: 0
            });
            
            const trainerUser = db.createUser({
                username: 'trainer_' + Date.now(),
                email: 'trainer@test.com',
                password_hash: 'hash',
                salt: 'salt',
                role: 'trainer',
                full_name: 'Trainer User',
                status: 'Active',
                failed_login_attempts: 0
            });
            
            const memberUser = db.createUser({
                username: 'member_' + Date.now(),
                email: 'member@test.com',
                password_hash: 'hash',
                salt: 'salt',
                role: 'member',
                full_name: 'Member User',
                status: 'Active',
                failed_login_attempts: 0
            });
            
            // Test permissions
            expect(db.hasPermission('admin', 'users.create')).toBe(true);
            expect(db.hasPermission('trainer', 'users.create')).toBe(false);
            expect(db.hasPermission('member', 'members.view')).toBe(false);
            expect(db.hasPermission('member', 'profile.view')).toBe(true);
            
            // Cleanup
            db.deleteUser(adminUser);
            db.deleteUser(trainerUser);
            db.deleteUser(memberUser);
        });
    });
    
    describe('Bulk Import → Member/Plan/Membership Integration', () => {
        it('should handle bulk import with all data relationships', () => {
            db.connect();
            
            const importData = [
                {
                    name: 'Bulk Test 1',
                    phone: '11' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
                    email: 'bulk1@test.com',
                    plan_name: 'Bulk Plan',
                    duration_days: 30,
                    start_date: '2025-07-01',
                    amount_paid: 1500,
                    purchase_date: '2025-07-01'
                },
                {
                    name: 'Bulk Test 2',
                    phone: '22' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
                    email: 'bulk2@test.com',
                    plan_name: 'Bulk Plan',
                    duration_days: 30,
                    start_date: '2025-07-01',
                    amount_paid: 1500,
                    purchase_date: '2025-07-01'
                }
            ];
            
            const results = [];
            const createdMembers = [];
            const createdPlans = [];
            const createdMemberships = [];
            
            // Simulate bulk import process
            importData.forEach(row => {
                // Check/create member
                let member = db.getMemberByPhone(row.phone);
                if (!member) {
                    const memberId = db.createMember({
                        name: row.name,
                        phone: row.phone,
                        email: row.email,
                        join_date: row.purchase_date
                    });
                    member = db.getMemberById(memberId);
                    createdMembers.push(memberId);
                }
                
                // Check/create plan
                let plan = db.getGroupPlanByNameAndDuration(row.plan_name, row.duration_days);
                if (!plan) {
                    const planId = db.createGroupPlan({
                        name: row.plan_name,
                        duration_days: row.duration_days,
                        default_amount: row.amount_paid
                    });
                    plan = db.getGroupPlanById(planId);
                    createdPlans.push(planId);
                }
                
                // Create membership
                const membershipId = db.createGroupClassMembership({
                    member_id: member.id,
                    plan_id: plan.id,
                    start_date: row.start_date,
                    amount_paid: row.amount_paid,
                    purchase_date: row.purchase_date
                });
                createdMemberships.push(membershipId);
                
                results.push({
                    success: true,
                    member_id: member.id,
                    plan_id: plan.id,
                    membership_id: membershipId
                });
            });
            
            // Verify results
            expect(results.length).toBe(2);
            expect(createdMembers.length).toBe(2);
            expect(createdPlans.length).toBe(1); // Same plan for both
            expect(createdMemberships.length).toBe(2);
            
            // Verify member statuses
            createdMembers.forEach(memberId => {
                const member = db.getMemberById(memberId);
                expect(member.status).toBe('Active');
            });
            
            // Cleanup
            createdMemberships.forEach(id => db.deleteGroupClassMembership(id));
            createdPlans.forEach(id => db.deleteGroupPlan(id));
            createdMembers.forEach(id => db.deleteMember(id));
        });
    });
    
    describe('Settings → Theme → UI Integration', () => {
        it('should apply settings changes across the application', () => {
            db.connect();
            
            // Get current settings
            const currentTheme = db.getSetting('theme_color');
            const currentMode = db.getSetting('dark_mode');
            
            // Update settings
            db.updateSetting('theme_color', '#ff6b6b');
            db.updateSetting('dark_mode', 'true');
            
            // Verify settings updated
            const newTheme = db.getSetting('theme_color');
            const newMode = db.getSetting('dark_mode');
            
            expect(newTheme).toBe('#ff6b6b');
            expect(newMode).toBe('true');
            
            // Restore original settings
            if (currentTheme) db.updateSetting('theme_color', currentTheme);
            if (currentMode) db.updateSetting('dark_mode', currentMode);
        });
    });
});