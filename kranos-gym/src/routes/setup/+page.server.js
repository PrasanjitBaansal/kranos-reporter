import { redirect } from '@sveltejs/kit';
import Database from '$lib/db/database.js';
import bcrypt from 'bcrypt';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	const db = new Database();
	
	try {
		db.connect();
		
		// If there are already admin users, redirect to login
		if (!db.isFirstTimeSetup()) {
			throw redirect(302, '/login');
		}
		
		// If user is already authenticated (somehow), redirect to dashboard
		if (locals.user) {
			throw redirect(302, '/');
		}
		
		return {
			isFirstTime: true
		};
	} catch (error) {
		if (error?.status === 302) {
			throw error; // Re-throw redirect
		}
		console.error('Setup load error:', error);
		throw redirect(302, '/login');
	} finally {
		db.close();
	}
}

/** @type {import('./$types').Actions} */
export const actions = {
	create_admin: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username')?.toString().trim();
		const email = formData.get('email')?.toString().trim();
		const password = formData.get('password')?.toString();
		const confirmPassword = formData.get('confirmPassword')?.toString();
		const fullName = formData.get('fullName')?.toString().trim();
		
		// Validation
		const errors = {};
		
		if (!username || username.length < 3) {
			errors.username = 'Username must be at least 3 characters long';
		}
		
		if (!email || !email.includes('@')) {
			errors.email = 'Valid email address is required';
		}
		
		if (!password || password.length < 8) {
			errors.password = 'Password must be at least 8 characters long';
		}
		
		if (password !== confirmPassword) {
			errors.confirmPassword = 'Passwords do not match';
		}
		
		if (!fullName || fullName.length < 2) {
			errors.fullName = 'Full name must be at least 2 characters long';
		}
		
		if (Object.keys(errors).length > 0) {
			return {
				success: false,
				error: 'Please fix the validation errors',
				errors,
				data: { username, email, fullName }
			};
		}
		
		const db = new Database();
		
		try {
			db.connect();
			
			// Double-check that this is still first-time setup
			if (!db.isFirstTimeSetup()) {
				return {
					success: false,
					error: 'Admin user already exists. Please use the login page.'
				};
			}
			
			// Check for username/email conflicts (just in case)
			const existingUsername = db.getUserByUsername(username);
			const existingEmail = db.getUserByEmail(email);
			
			if (existingUsername) {
				errors.username = 'Username already exists';
			}
			
			if (existingEmail) {
				errors.email = 'Email already exists';
			}
			
			if (Object.keys(errors).length > 0) {
				return {
					success: false,
					error: 'Username or email already exists',
					errors,
					data: { username, email, fullName }
				};
			}
			
			// Hash password
			const saltRounds = 12;
			const password_hash = await bcrypt.hash(password, saltRounds);
			const salt = null; // bcrypt.hash() includes salt internally
			
			// Create the first admin user
			const adminUser = db.createUser({
				username,
				email,
				password_hash,
				salt,
				role: 'admin',
				full_name: fullName,
				member_id: null
			});
			
			console.log(`First-time admin user created: '${username}' (ID: ${adminUser.id})`);
			
			// Log the activity
			db.logActivity({
				user_id: adminUser.id,
				username: adminUser.username,
				action: 'first_admin_created',
				resource_type: 'user',
				resource_id: adminUser.id,
				ip_address: null,
				description: 'First admin user created during initial setup',
				severity: 'info'
			});
			
			return {
				success: true,
				message: 'Admin account created successfully! You can now log in.',
				redirect: '/login'
			};
			
		} catch (error) {
			console.error('Admin creation error:', error);
			return {
				success: false,
				error: 'An error occurred while creating the admin account. Please try again.',
				data: { username, email, fullName }
			};
		} finally {
			db.close();
		}
	}
};