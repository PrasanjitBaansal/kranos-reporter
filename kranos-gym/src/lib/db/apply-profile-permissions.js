#!/usr/bin/env node

// Context7-grounded: Apply profile permissions for member portal
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = path.join(__dirname, '../../../kranos.db');

// Context7-grounded: Better-sqlite3 synchronous operations
function applyProfilePermissions() {
    console.log('🔧 Applying profile permissions for member portal...');
    
    const db = new Database(DB_PATH);
    
    try {
        // Context7-grounded: Read SQL file and execute
        const sqlFile = path.join(__dirname, 'profile-permissions.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');
        
        // Context7-grounded: Execute specific statements manually for better control
        console.log('📄 Adding profile.view permission...');
        
        try {
            db.exec(`INSERT OR IGNORE INTO permissions (name, description, category) VALUES ('profile.view', 'View own profile and membership details', 'profile')`);
            console.log('✅ Profile permission added');
        } catch (error) {
            console.log(`⚠️  Profile permission already exists: ${error.message}`);
        }
        
        try {
            const profilePermId = db.prepare('SELECT id FROM permissions WHERE name = ?').get('profile.view')?.id;
            if (profilePermId) {
                db.exec(`INSERT OR IGNORE INTO role_permissions (role, permission_id) VALUES ('member', ${profilePermId})`);
                console.log('✅ Profile permission assigned to member role');
            }
        } catch (error) {
            console.log(`⚠️  Role permission already exists: ${error.message}`);
        }
        
        // Remove broad members.view from member role
        try {
            const membersViewId = db.prepare('SELECT id FROM permissions WHERE name = ?').get('members.view')?.id;
            if (membersViewId) {
                db.exec(`DELETE FROM role_permissions WHERE role = 'member' AND permission_id = ${membersViewId}`);
                console.log('✅ Removed broad members.view from member role');
            }
        } catch (error) {
            console.log(`⚠️  Error removing members.view: ${error.message}`);
        }
        
        // Remove create/edit permissions from trainer role
        try {
            const createPermId = db.prepare('SELECT id FROM permissions WHERE name = ?').get('members.create')?.id;
            const editPermId = db.prepare('SELECT id FROM permissions WHERE name = ?').get('members.edit')?.id;
            
            if (createPermId) {
                db.exec(`DELETE FROM role_permissions WHERE role = 'trainer' AND permission_id = ${createPermId}`);
                console.log('✅ Removed members.create from trainer role');
            }
            if (editPermId) {
                db.exec(`DELETE FROM role_permissions WHERE role = 'trainer' AND permission_id = ${editPermId}`);
                console.log('✅ Removed members.edit from trainer role');
            }
        } catch (error) {
            console.log(`⚠️  Error updating trainer permissions: ${error.message}`);
        }
        
        // Verify permissions were added
        const profilePermission = db.prepare('SELECT * FROM permissions WHERE name = ?').get('profile.view');
        if (profilePermission) {
            console.log('✅ Profile permission added successfully');
        }
        
        // Verify member role permissions
        const memberPermissions = db.prepare(`
            SELECT p.name 
            FROM role_permissions rp 
            JOIN permissions p ON rp.permission_id = p.id 
            WHERE rp.role = 'member'
        `).all();
        
        console.log('📋 Member role permissions:', memberPermissions.map(p => p.name));
        
        // Verify trainer role permissions
        const trainerPermissions = db.prepare(`
            SELECT p.name 
            FROM role_permissions rp 
            JOIN permissions p ON rp.permission_id = p.id 
            WHERE rp.role = 'trainer'
        `).all();
        
        console.log('📋 Trainer role permissions:', trainerPermissions.map(p => p.name));
        
        console.log('🎉 Profile permissions applied successfully!');
        
    } catch (error) {
        console.error('❌ Error applying profile permissions:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

// Run the migration
applyProfilePermissions();