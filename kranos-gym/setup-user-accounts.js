#!/usr/bin/env node

/**
 * Setup User Accounts Script
 * Creates admin, trainer, and member accounts for Kranos Gym
 */

import Database from './src/lib/db/database.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function setupUserAccounts() {
    const db = new Database();
    
    try {
        db.connect();
        console.log('Connected to database...');
        
        // Start transaction
        db.db.exec('BEGIN TRANSACTION');
        
        // 1. Delete existing demo_admin account
        console.log('\n1. Removing demo_admin account...');
        const deleteStmt = db.db.prepare('DELETE FROM users WHERE username = ?');
        const deleteResult = deleteStmt.run('demo_admin');
        console.log(`✓ Deleted ${deleteResult.changes} demo account(s)`);
        
        // 2. Create admin account for Prasanjit
        console.log('\n2. Creating admin account for Prasanjit...');
        const adminPassword = 'admin123'; // You should change this after first login
        const adminSalt = await bcrypt.genSalt(SALT_ROUNDS);
        const adminHash = await bcrypt.hash(adminPassword, adminSalt);
        
        const createAdmin = db.db.prepare(`
            INSERT INTO users (
                username, email, password_hash, salt, role, full_name,
                is_active, is_verified, created_date, last_password_change
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);
        
        const adminResult = createAdmin.run(
            'pjb',
            'baansalprasanjit@gmail.com',
            adminHash,
            adminSalt,
            'admin',
            'Prasanjit',
            1,
            1
        );
        console.log(`✓ Created admin account: username=pjb, id=${adminResult.lastInsertRowid}`);
        
        // 3. Create trainer account for Niranjan
        console.log('\n3. Creating trainer account for Niranjan...');
        const trainerPassword = 'trainer123'; // You should change this after first login
        const trainerSalt = await bcrypt.genSalt(SALT_ROUNDS);
        const trainerHash = await bcrypt.hash(trainerPassword, trainerSalt);
        
        const createTrainer = db.db.prepare(`
            INSERT INTO users (
                username, email, password_hash, salt, role, full_name,
                is_active, is_verified, created_date, last_password_change
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);
        
        // Generate email for Niranjan since it wasn't provided
        const trainerEmail = `niranjan@kranosgym.com`;
        
        const trainerResult = createTrainer.run(
            'niranjan',
            trainerEmail,
            trainerHash,
            trainerSalt,
            'trainer',
            'Niranjan',
            1,
            1
        );
        console.log(`✓ Created trainer account: username=niranjan, id=${trainerResult.lastInsertRowid}`);
        
        // 4. Get all existing members from the database
        console.log('\n4. Creating member accounts for all existing members...');
        const membersStmt = db.db.prepare(`
            SELECT id, name, phone, email 
            FROM members 
            WHERE status != 'Deleted'
            ORDER BY name
        `);
        const members = membersStmt.all();
        console.log(`Found ${members.length} active members`);
        
        // Create user account for each member
        const createMemberUser = db.db.prepare(`
            INSERT INTO users (
                username, email, password_hash, salt, role, full_name,
                is_active, is_verified, created_date, last_password_change,
                member_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
        `);
        
        let memberCount = 0;
        const defaultMemberPassword = 'member123'; // All members get the same default password
        
        for (const member of members) {
            try {
                // Generate username from name (lowercase, remove spaces, handle duplicates)
                let baseUsername = member.name.toLowerCase()
                    .replace(/\s+/g, '')
                    .replace(/[^a-z0-9]/g, '');
                
                // Check if username exists and add number if needed
                let username = baseUsername;
                let counter = 1;
                const checkUsername = db.db.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?');
                
                while (checkUsername.get(username).count > 0) {
                    username = `${baseUsername}${counter}`;
                    counter++;
                }
                
                // Generate member-specific password hash
                const memberSalt = await bcrypt.genSalt(SALT_ROUNDS);
                const memberHash = await bcrypt.hash(defaultMemberPassword, memberSalt);
                
                // Use existing email or generate one
                const memberEmail = member.email || `${username}@kranosgym.com`;
                
                const result = createMemberUser.run(
                    username,
                    memberEmail,
                    memberHash,
                    memberSalt,
                    'member',
                    member.name,
                    1,
                    1,
                    member.id
                );
                
                memberCount++;
                console.log(`✓ Created member account: ${member.name} (username=${username}, id=${result.lastInsertRowid})`);
            } catch (error) {
                console.error(`✗ Failed to create account for ${member.name}: ${error.message}`);
            }
        }
        
        console.log(`\n✓ Created ${memberCount} member accounts`);
        
        // 5. Update phone numbers for Prasanjit and Niranjan in members table if they exist
        console.log('\n5. Updating phone numbers in members table...');
        
        // Check if Prasanjit exists as a member
        const prasanjitMember = db.db.prepare('SELECT id FROM members WHERE phone = ?').get('9818411929');
        if (prasanjitMember) {
            const updatePrasanjit = db.db.prepare('UPDATE users SET member_id = ? WHERE username = ?');
            updatePrasanjit.run(prasanjitMember.id, 'pjb');
            console.log('✓ Linked Prasanjit user account to member record');
        } else {
            console.log('ℹ Prasanjit does not exist as a member (phone: 9818411929)');
        }
        
        // Check if Niranjan exists as a member
        const niranjanMember = db.db.prepare('SELECT id FROM members WHERE phone = ?').get('6901337473');
        if (niranjanMember) {
            const updateNiranjan = db.db.prepare('UPDATE users SET member_id = ? WHERE username = ?');
            updateNiranjan.run(niranjanMember.id, 'niranjan');
            console.log('✓ Linked Niranjan user account to member record');
        } else {
            console.log('ℹ Niranjan does not exist as a member (phone: 6901337473)');
        }
        
        // Commit transaction
        db.db.exec('COMMIT');
        console.log('\n✓ All user accounts created successfully!');
        
        // Summary
        console.log('\n=== ACCOUNT SUMMARY ===');
        console.log('Admin Account:');
        console.log('  Username: pjb');
        console.log('  Password: admin123');
        console.log('  Email: baansalprasanjit@gmail.com');
        console.log('\nTrainer Account:');
        console.log('  Username: niranjan');
        console.log('  Password: trainer123');
        console.log(`  Email: ${trainerEmail}`);
        console.log('\nMember Accounts:');
        console.log(`  Created: ${memberCount} accounts`);
        console.log('  Default Password: member123');
        console.log('\n⚠️  IMPORTANT: All users should change their passwords after first login!');
        
    } catch (error) {
        console.error('Error setting up user accounts:', error);
        // Rollback transaction on error
        try {
            db.db.exec('ROLLBACK');
        } catch (rollbackError) {
            console.error('Rollback error:', rollbackError);
        }
        process.exit(1);
    } finally {
        db.close();
    }
}

// Run the setup
setupUserAccounts().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});