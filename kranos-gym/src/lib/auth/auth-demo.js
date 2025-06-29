/**
 * Authentication System Demo
 * Demonstrates the working authentication system components
 */

import KranosSQLite from '../db/database.js';
import { createTokenSet, verifyAccessToken } from '../security/jwt-utils.js';
import bcrypt from 'bcrypt';

/**
 * Demo: Complete authentication workflow
 */
async function demonstrateAuthentication() {
    console.log('🔐 Authentication System Demo');
    console.log('=============================\n');

    const db = new KranosSQLite();
    
    try {
        // Step 1: Create a demo user
        console.log('📝 Step 1: Creating demo user...');
        
        const password = 'DemoPassword123!';
        const salt = await bcrypt.genSalt(12);
        const password_hash = await bcrypt.hash(password, salt);
        
        const userData = {
            username: 'demo_admin',
            email: 'demo@kranosgym.com',
            password_hash,
            salt,
            role: 'admin',
            full_name: 'Demo Administrator'
        };
        
        // Clean up any existing demo user first
        db.connect();
        const existingUser = db.getUserByUsername('demo_admin');
        if (existingUser) {
            console.log('   - Demo user already exists, skipping creation');
        } else {
            const newUser = db.createUser(userData);
            console.log(`   ✅ Created user: ${newUser.username} (ID: ${newUser.id})`);
        }
        
        // Step 2: Authenticate user (login simulation)
        console.log('\n🔑 Step 2: User authentication...');
        
        const user = db.getUserByUsername('demo_admin');
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (isValidPassword) {
            console.log('   ✅ Password verification successful');
            
            // Step 3: Generate JWT tokens
            console.log('\n🎫 Step 3: Generating JWT tokens...');
            
            const sessionId = 'demo-session-' + Date.now();
            const tokens = createTokenSet(user, sessionId);
            
            console.log('   ✅ Access token generated (expires in 1 hour)');
            console.log('   ✅ Refresh token generated (expires in 7 days)');
            console.log(`   🆔 Session ID: ${sessionId}`);
            
            // Step 4: Create session in database
            console.log('\n💾 Step 4: Creating user session...');
            
            const sessionData = {
                user_id: user.id,
                session_token: tokens.accessToken,
                refresh_token: tokens.refreshToken,
                device_info: 'Demo Browser',
                ip_address: '127.0.0.1',
                user_agent: 'Auth Demo Script',
                expires_at: tokens.accessExpiresAt
            };
            
            const session = db.createSession(sessionData);
            console.log(`   ✅ Session created (ID: ${session.id})`);
            
            // Step 5: Verify token
            console.log('\n🔍 Step 5: Verifying access token...');
            
            const decoded = verifyAccessToken(tokens.accessToken);
            console.log(`   ✅ Token valid for user: ${decoded.username}`);
            console.log(`   👤 User role: ${decoded.role}`);
            console.log(`   📧 Email: ${decoded.email}`);
            
            // Step 6: Check permissions
            console.log('\n🛡️ Step 6: Checking user permissions...');
            
            const hasReportsPermission = db.hasPermission(user.id, 'reports.view');
            const hasUsersPermission = db.hasPermission(user.id, 'users.create');
            
            console.log(`   📊 Reports access: ${hasReportsPermission ? '✅ Granted' : '❌ Denied'}`);
            console.log(`   👥 User management: ${hasUsersPermission ? '✅ Granted' : '❌ Denied'}`);
            
            // Step 7: Log activity
            console.log('\n📝 Step 7: Logging user activity...');
            
            const activityData = {
                user_id: user.id,
                username: user.username,
                action: 'login_demo',
                resource_type: 'authentication',
                resource_id: session.id.toString(),
                ip_address: '127.0.0.1',
                user_agent: 'Auth Demo Script',
                details: { demo: true, timestamp: new Date().toISOString() }
            };
            
            const activity = db.logActivity(activityData);
            console.log(`   ✅ Activity logged (ID: ${activity.id})`);
            
            // Step 8: Session validation
            console.log('\n🔐 Step 8: Session validation...');
            
            const activeSession = db.getSessionByToken(tokens.accessToken);
            if (activeSession) {
                console.log(`   ✅ Active session found for user: ${activeSession.username}`);
                console.log(`   ⏰ Session expires: ${activeSession.expires_at}`);
            }
            
            console.log('\n🎉 Demo completed successfully!');
            console.log('\n📋 Summary:');
            console.log(`   • User created: ${user.username}`);
            console.log(`   • Role: ${user.role}`);
            console.log(`   • Session ID: ${sessionId}`);
            console.log(`   • Permissions: ${hasReportsPermission && hasUsersPermission ? 'Full admin access' : 'Limited access'}`);
            console.log(`   • Authentication: ✅ Working`);
            
        } else {
            console.log('   ❌ Password verification failed');
        }
        
    } catch (error) {
        console.error('❌ Demo failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        db.close();
    }
}

/**
 * Demo: Permission system
 */
async function demonstratePermissions() {
    console.log('\n🛡️ Permission System Demo');
    console.log('=========================\n');
    
    const db = new KranosSQLite();
    
    try {
        db.connect();
        
        // Get all permissions for admin role
        console.log('📋 Admin role permissions:');
        const adminPermissions = db.prepare(`
            SELECT p.name, p.description, p.category
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role = 'admin'
            ORDER BY p.category, p.name
        `).all();
        
        const categories = {};
        adminPermissions.forEach(perm => {
            if (!categories[perm.category]) {
                categories[perm.category] = [];
            }
            categories[perm.category].push(perm);
        });
        
        for (const [category, perms] of Object.entries(categories)) {
            console.log(`\n   📁 ${category.toUpperCase()}:`);
            perms.forEach(perm => {
                console.log(`      • ${perm.name} - ${perm.description}`);
            });
        }
        
        console.log(`\n   📊 Total permissions for admin: ${adminPermissions.length}`);
        
        // Compare with trainer permissions
        const trainerPermissions = db.prepare(`
            SELECT COUNT(*) as count
            FROM role_permissions rp
            WHERE rp.role = 'trainer'
        `).get();
        
        console.log(`   📊 Total permissions for trainer: ${trainerPermissions.count}`);
        console.log(`   📊 Permission difference: ${adminPermissions.length - trainerPermissions.count} (admin has more)`);
        
    } catch (error) {
        console.error('❌ Permission demo failed:', error.message);
    } finally {
        db.close();
    }
}

// Run the demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        await demonstrateAuthentication();
        await demonstratePermissions();
    })();
}

export { demonstrateAuthentication, demonstratePermissions };