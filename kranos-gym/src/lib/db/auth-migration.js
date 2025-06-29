/**
 * Authentication Database Migration Script
 * Kranos Gym Management System
 * 
 * Safely migrates existing database to support user authentication
 * Using better-sqlite3 with transaction support
 */

import Database from 'better-sqlite3';
import { readFileSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database paths
const DB_PATH = join(__dirname, '../../../kranos.db');
const BACKUP_PATH = join(__dirname, '../../../kranos.db.backup');
const SCHEMA_PATH = join(__dirname, 'auth-schema-fixed.sql');
const PERMISSIONS_PATH = join(__dirname, 'auth-permissions-data.sql');

class AuthMigration {
    constructor() {
        this.db = null;
    }

    /**
     * Connect to database
     */
    connect() {
        if (!existsSync(DB_PATH)) {
            throw new Error(`Database not found at ${DB_PATH}`);
        }

        this.db = new Database(DB_PATH);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
        
        console.log('✅ Connected to database');
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('✅ Database connection closed');
        }
    }

    /**
     * Create backup of existing database
     */
    createBackup() {
        try {
            copyFileSync(DB_PATH, BACKUP_PATH);
            console.log(`✅ Backup created: ${BACKUP_PATH}`);
        } catch (error) {
            throw new Error(`Failed to create backup: ${error.message}`);
        }
    }

    /**
     * Check if authentication tables already exist
     */
    checkExistingTables() {
        const tables = this.db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name IN ('users', 'permissions', 'role_permissions', 'user_sessions')
        `).all();

        if (tables.length > 0) {
            console.log('⚠️  Authentication tables already exist:', tables.map(t => t.name));
            return true;
        }
        return false;
    }

    /**
     * Verify existing database structure
     */
    verifyExistingStructure() {
        const requiredTables = ['members', 'group_plans', 'group_class_memberships'];
        const existingTables = this.db.prepare(`
            SELECT name FROM sqlite_master WHERE type='table'
        `).all().map(row => row.name);

        for (const table of requiredTables) {
            if (!existingTables.includes(table)) {
                throw new Error(`Required table '${table}' not found in database`);
            }
        }

        console.log('✅ Verified existing database structure');
    }

    /**
     * Execute SQL schema file
     */
    executeSchemaFile(filePath) {
        try {
            const sql = readFileSync(filePath, 'utf8');
            
            // Execute the entire SQL file as one statement
            console.log('Executing complete schema file...');
            this.db.exec(sql);
            console.log(`✅ Schema executed successfully from ${filePath}`);
        } catch (error) {
            throw new Error(`Failed to execute ${filePath}: ${error.message}`);
        }
    }

    /**
     * Validate migration success
     */
    validateMigration() {
        try {
            // Check all required tables exist
            const requiredTables = [
                'users', 'permissions', 'role_permissions', 
                'user_sessions', 'user_activity_log', 'security_events'
            ];

            for (const table of requiredTables) {
                const result = this.db.prepare(`
                    SELECT name FROM sqlite_master WHERE type='table' AND name = ?
                `).get(table);

                if (!result) {
                    throw new Error(`Table '${table}' was not created`);
                }
            }

            // Check permissions data
            const permissionCount = this.db.prepare(`
                SELECT COUNT(*) as count FROM permissions
            `).get().count;

            if (permissionCount === 0) {
                throw new Error('No permissions were inserted');
            }

            // Check role mappings
            const roleMappingCount = this.db.prepare(`
                SELECT COUNT(*) as count FROM role_permissions
            `).get().count;

            if (roleMappingCount === 0) {
                throw new Error('No role permissions were inserted');
            }

            console.log('✅ Migration validation passed');
            console.log(`   - ${permissionCount} permissions created`);
            console.log(`   - ${roleMappingCount} role mappings created`);

        } catch (error) {
            throw new Error(`Migration validation failed: ${error.message}`);
        }
    }

    /**
     * Run complete migration
     */
    async migrate() {
        try {
            console.log('🚀 Starting authentication database migration...');
            
            // Step 1: Connect and verify
            this.connect();
            this.verifyExistingStructure();

            // Step 2: Create backup
            this.createBackup();

            // Step 3: Check for existing auth tables
            if (this.checkExistingTables()) {
                console.log('⚠️  Authentication tables already exist. Use --force to override.');
                return;
            }

            // Step 4: Execute migration in transaction
            const transaction = this.db.transaction(() => {
                // Execute schema
                this.executeSchemaFile(SCHEMA_PATH);
                
                // Insert permissions data
                this.executeSchemaFile(PERMISSIONS_PATH);
            });

            transaction();

            // Step 5: Validate migration
            this.validateMigration();

            console.log('🎉 Authentication migration completed successfully!');
            console.log('');
            console.log('Next steps:');
            console.log('1. Install required dependencies: npm install bcrypt jsonwebtoken');
            console.log('2. Set up environment variables in .env');
            console.log('3. Configure authentication middleware');

        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            console.log('💡 Backup available at:', BACKUP_PATH);
            throw error;
        } finally {
            this.close();
        }
    }

    /**
     * Rollback migration (restore from backup)
     */
    async rollback() {
        try {
            console.log('🔄 Rolling back authentication migration...');

            if (!existsSync(BACKUP_PATH)) {
                throw new Error('No backup file found');
            }

            copyFileSync(BACKUP_PATH, DB_PATH);
            console.log('✅ Database restored from backup');

        } catch (error) {
            console.error('❌ Rollback failed:', error.message);
            throw error;
        }
    }

    /**
     * Force migration (drops existing auth tables first)
     */
    async forceMigrate() {
        try {
            console.log('⚠️  Force migration: dropping existing authentication tables...');
            
            this.connect();
            this.createBackup();

            // Drop authentication tables in correct order (respecting foreign keys)
            const dropTables = [
                'DROP VIEW IF EXISTS user_permissions',
                'DROP VIEW IF EXISTS recent_security_events', 
                'DROP VIEW IF EXISTS active_sessions',
                'DROP VIEW IF EXISTS active_users',
                'DROP TABLE IF EXISTS security_events',
                'DROP TABLE IF EXISTS user_activity_log',
                'DROP TABLE IF EXISTS user_sessions',
                'DROP TABLE IF EXISTS role_permissions',
                'DROP TABLE IF EXISTS permissions',
                'DROP TABLE IF EXISTS users'
            ];

            const transaction = this.db.transaction(() => {
                for (const sql of dropTables) {
                    this.db.exec(sql);
                }
            });

            transaction();

            console.log('✅ Existing authentication tables dropped');

            // Close and reopen to clear any cached data
            this.close();
            
            // Now run normal migration
            await this.migrate();

        } catch (error) {
            console.error('❌ Force migration failed:', error.message);
            throw error;
        }
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const migration = new AuthMigration();

    try {
        switch (command) {
            case 'migrate':
                await migration.migrate();
                break;
                
            case 'rollback':
                await migration.rollback();
                break;
                
            case 'force':
                await migration.forceMigrate();
                break;
                
            default:
                console.log('Usage:');
                console.log('  node auth-migration.js migrate   - Run authentication migration');
                console.log('  node auth-migration.js rollback  - Restore database from backup');  
                console.log('  node auth-migration.js force     - Force migration (drops existing tables)');
                process.exit(1);
        }
    } catch (error) {
        console.error('Migration error:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default AuthMigration;