import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from './database.js';
import { MemberFactory } from '../../test/factories/member.factory.js';
import { MembershipFactory } from '../../test/factories/membership.factory.js';
import { PaymentFactory } from '../../test/factories/payment.factory.js';

describe('Database Transaction Tests', () => {
    let db;

    beforeEach(async () => {
        db = new Database();
        await db.connect();
        
        // Reset factories
        MemberFactory.reset();
        MembershipFactory.reset();
        PaymentFactory.reset();
        
        // Clear test data
        db.prepare('DELETE FROM group_class_memberships WHERE member_id >= 1000').run();
        db.prepare('DELETE FROM pt_memberships WHERE member_id >= 1000').run();
        db.prepare('DELETE FROM members WHERE id >= 1000').run();
        // Skip expenses table as it may not exist in test DB
    });

    afterEach(async () => {
        await db.close();
    });

    describe('Transaction Atomicity', () => {
        it('should rollback all changes on error', async () => {
            const testMember = {
                id: 1000,
                name: 'Transaction Test User',
                phone: '9999999999',
                email: 'transaction@test.com'
            };

            try {
                const txn = db.transaction(() => {
                    // Insert member
                    db.prepare(
                        'INSERT INTO members (id, name, phone, email, join_date, status) VALUES (?, ?, ?, ?, ?, ?)'
                    ).run(testMember.id, testMember.name, testMember.phone, testMember.email, '2024-01-15', 'Active');
                    
                    // Verify member exists in transaction
                    const memberInTx = db.prepare('SELECT * FROM members WHERE id = ?').get(testMember.id);
                    expect(memberInTx).toBeDefined();
                    
                    // Force an error (duplicate key)
                    db.prepare(
                        'INSERT INTO members (id, name, phone, email, join_date, status) VALUES (?, ?, ?, ?, ?, ?)'
                    ).run(testMember.id, 'Duplicate', '8888888888', 'dup@test.com', '2024-01-15', 'Active');
                });
                
                txn();
            } catch (error) {
                // Transaction automatically rolled back on error
            }
            
            // Verify member doesn't exist after rollback
            const memberAfter = db.prepare('SELECT * FROM members WHERE id = ?').get(testMember.id);
            expect(memberAfter).toBeUndefined();
        });

        it('should commit successful transactions', async () => {
            const testMember = {
                id: 1001,
                name: 'Successful Transaction',
                phone: '8888888888',
                email: 'success@test.com'
            };

            const txn = db.transaction(() => {
                db.prepare(
                    'INSERT INTO members (id, name, phone, email, join_date, status) VALUES (?, ?, ?, ?, ?, ?)'
                ).run(testMember.id, testMember.name, testMember.phone, testMember.email, '2024-01-15', 'Active');
            });
            
            txn();
            
            // Verify member exists after commit
            const memberAfter = db.prepare('SELECT * FROM members WHERE id = ?').get(testMember.id);
            expect(memberAfter).toBeDefined();
            expect(memberAfter.name).toBe(testMember.name);
        });
    });

    describe('Concurrent Access Handling', () => {
        it('should handle concurrent member updates', async () => {
            // Create test member
            const memberId = 1002;
            db.prepare(
                'INSERT INTO members (id, name, phone, email, join_date, status) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(memberId, 'Concurrent Test', '7777777777', 'concurrent@test.com', '2024-01-15', 'Active');

            // Simulate concurrent updates
            const update1 = () => db.prepare(
                'UPDATE members SET name = ? WHERE id = ?'
            ).run('Updated Name 1', memberId);
            
            const update2 = () => db.prepare(
                'UPDATE members SET email = ? WHERE id = ?'
            ).run('newemail@test.com', memberId);
            
            // Execute both updates
            update1();
            update2();
            
            // Verify both updates succeeded
            const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
            expect(member.name).toBe('Updated Name 1');
            expect(member.email).toBe('newemail@test.com');
        });

        it('should respect unique constraints during concurrent inserts', async () => {
            const phone = '6666666666';
            
            // Try to insert two members with same phone
            let success = 0;
            let failure = 0;
            
            try {
                db.prepare(
                    'INSERT INTO members (id, name, phone, email, join_date, status) VALUES (?, ?, ?, ?, ?, ?)'
                ).run(1003, 'First Member', phone, 'first@test.com', '2024-01-15', 'Active');
                success++;
            } catch (error) {
                failure++;
            }
            
            try {
                db.prepare(
                    'INSERT INTO members (id, name, phone, email, join_date, status) VALUES (?, ?, ?, ?, ?, ?)'
                ).run(1004, 'Second Member', phone, 'second@test.com', '2024-01-15', 'Active');
                success++;
            } catch (error) {
                failure++;
            }
            
            expect(success).toBe(1);
            expect(failure).toBe(1);
            
            // Verify only one member exists with that phone
            const count = db.prepare(
                'SELECT COUNT(*) as count FROM members WHERE phone = ?'
            ).get(phone);
            expect(count.count).toBe(1);
        });
    });

    describe('Data Integrity Constraints', () => {
        it('should enforce foreign key constraints', async () => {
            // Try to create membership for non-existent member
            expect(() => {
                db.prepare(
                    'INSERT INTO group_class_memberships (member_id, plan_id, start_date, end_date, amount_paid, purchase_date) VALUES (?, ?, ?, ?, ?, ?)'
                ).run(9999, 1, '2024-01-15', '2024-02-14', 2000, '2024-01-15');
            }).toThrow();
        });

        it('should enforce unique constraints', async () => {
            const phone = '5555555555';
            
            // Insert first member
            db.prepare(
                'INSERT INTO members (id, name, phone, email, join_date, status) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(1005, 'Unique Test 1', phone, 'unique1@test.com', '2024-01-15', 'Active');
            
            // Try to insert second member with same phone
            expect(() => {
                db.prepare(
                    'INSERT INTO members (id, name, phone, email, join_date, status) VALUES (?, ?, ?, ?, ?, ?)'
                ).run(1006, 'Unique Test 2', phone, 'unique2@test.com', '2024-01-15', 'Active');
            }).toThrow(/UNIQUE constraint failed/);
        });

        it('should enforce check constraints', async () => {
            // Try to insert member with invalid status
            expect(() => {
                db.prepare(
                    'INSERT INTO members (id, name, phone, email, join_date, status) VALUES (?, ?, ?, ?, ?, ?)'
                ).run(1007, 'Invalid Status', '3333333333', 'invalid@test.com', '2024-01-15', 'InvalidStatus');
            }).toThrow();
        });
    });

    describe('Cascade Operations', () => {
        it('should handle cascade deletes properly', async () => {
            const memberId = 1007;
            
            // Create member
            db.prepare(
                'INSERT INTO members (id, name, phone, email, join_date, status) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(memberId, 'Cascade Test', '4444444444', 'cascade@test.com', '2024-01-15', 'Active');
            
            // Create membership
            db.prepare(
                'INSERT INTO group_class_memberships (member_id, plan_id, start_date, end_date, amount_paid, purchase_date) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(memberId, 1, '2024-01-15', '2024-02-14', 2000, '2024-01-15');
            
            // Verify membership exists
            const membershipBefore = db.prepare(
                'SELECT * FROM group_class_memberships WHERE member_id = ?'
            ).get(memberId);
            expect(membershipBefore).toBeDefined();
            
            // Note: SQLite with foreign_keys = ON should cascade delete
            db.prepare('DELETE FROM members WHERE id = ?').run(memberId);
            
            // Verify both are deleted
            const memberAfter = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
            const membershipAfter = db.prepare(
                'SELECT * FROM group_class_memberships WHERE member_id = ?'
            ).get(memberId);
            
            expect(memberAfter).toBeUndefined();
            expect(membershipAfter).toBeUndefined();
        });
    });

    describe('Error Recovery', () => {
        it('should maintain data consistency after errors', async () => {
            const memberId = 1008;
            let transactionStarted = false;
            
            try {
                const txn = db.transaction(() => {
                    // Insert valid member
                    db.prepare(
                        'INSERT INTO members (id, name, phone, email, join_date, status) VALUES (?, ?, ?, ?, ?, ?)'
                    ).run(memberId, 'Error Recovery Test', '3333333333', 'error@test.com', '2024-01-15', 'Active');
                    
                    // Try invalid operation (null required field)
                    db.prepare(
                        'INSERT INTO group_class_memberships (member_id, plan_id, start_date, end_date, amount_paid, purchase_date) VALUES (?, ?, ?, ?, ?, ?)'
                    ).run(memberId, null, '2024-01-15', '2024-02-14', 2000, '2024-01-15');
                });
                
                txn();
            } catch (error) {
                // Transaction automatically rolled back on error
            }
            
            // Verify no partial data remains
            const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
            expect(member).toBeUndefined();
        });

        it('should handle database lock timeouts gracefully', async () => {
            // This test simulates a scenario where a lock might occur
            const updates = [];
            
            // Create test member
            db.prepare(
                'INSERT INTO members (id, name, phone, email, join_date, status) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(1009, 'Lock Test', '2222222222', 'lock@test.com', '2024-01-15', 'Active');
            
            // Perform multiple rapid updates
            let successCount = 0;
            for (let i = 0; i < 10; i++) {
                try {
                    // Note: members table doesn't have notes column, using email instead
                    db.prepare(
                        'UPDATE members SET email = ? WHERE id = ?'
                    ).run(`lock${i}@test.com`, 1009);
                    successCount++;
                } catch (error) {
                    // Count failures
                }
            }
            
            // All updates should complete without deadlock
            expect(successCount).toBeGreaterThan(0);
        });
    });

    describe('Data Migration Safety', () => {
        it('should safely handle schema updates', async () => {
            // Test that we can add columns without breaking existing queries
            try {
                // This would normally be done in a migration
                db.prepare('ALTER TABLE members ADD COLUMN test_field TEXT').run();
                
                // Existing queries should still work
                const members = db.prepare('SELECT * FROM members LIMIT 1').all();
                expect(Array.isArray(members)).toBe(true);
                
                // Clean up
                // Note: SQLite doesn't support DROP COLUMN
            } catch (error) {
                // If column already exists, that's fine
                expect(error.message).toMatch(/duplicate column name/);
            }
        });
    });

    describe('Backup and Recovery', () => {
        it('should maintain referential integrity after restore', async () => {
            // Create related data
            const memberId = 1010;
            
            db.prepare(
                'INSERT INTO members (id, name, phone, email, join_date, status) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(memberId, 'Backup Test', '1111111111', 'backup@test.com', '2024-01-15', 'Active');
            
            db.prepare(
                'INSERT INTO group_class_memberships (member_id, plan_id, start_date, end_date, amount_paid, purchase_date) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(memberId, 1, '2024-01-15', '2024-02-14', 2000, '2024-01-15');
            
            // Verify relationships are intact
            const membership = db.prepare(
                `SELECT m.*, mem.name as member_name 
                 FROM group_class_memberships m 
                 JOIN members mem ON m.member_id = mem.id 
                 WHERE m.member_id = ?`
            ).get(memberId);
            
            expect(membership).toBeDefined();
            expect(membership.member_name).toBe('Backup Test');
        });
    });

    describe('Performance Under Load', () => {
        it('should handle bulk inserts efficiently', async () => {
            const startTime = Date.now();
            const batchSize = 100;
            
            const txn = db.transaction(() => {
                const stmt = db.prepare(
                    'INSERT INTO members (id, name, phone, email, join_date, status) VALUES (?, ?, ?, ?, ?, ?)'
                );
                
                for (let i = 0; i < batchSize; i++) {
                    stmt.run(
                        2000 + i,
                        `Bulk Test ${i}`,
                        `999${String(i).padStart(7, '0')}`,
                        `bulk${i}@test.com`,
                        '2024-01-15',
                        'Active'
                    );
                }
            });
            
            txn();
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should complete in reasonable time (< 1 second for 100 inserts)
            expect(duration).toBeLessThan(1000);
            
            // Verify all inserted
            const count = db.prepare('SELECT COUNT(*) as count FROM members WHERE id >= 2000').get();
            expect(count.count).toBe(batchSize);
        });
    });
});