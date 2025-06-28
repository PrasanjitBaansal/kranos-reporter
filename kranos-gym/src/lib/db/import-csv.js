import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// Database path - same as migrate.js
const DB_PATH = 'kranos.db';

// Utility function to parse date strings (DD-MM-YYYY format)
function parseDate(dateString) {
    if (!dateString || dateString.trim() === '') {
        return new Date().toISOString().split('T')[0];
    }
    
    // Handle DD-MM-YYYY format specifically
    const trimmed = dateString.trim();
    const parts = trimmed.split(/[-\/]/);
    
    if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        // Validate date components
        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && 
            day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
            
            // Create date object to validate
            const date = new Date(year, month - 1, day);
            if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
                // Return YYYY-MM-DD format for database storage
                return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            }
        }
    }
    
    // Fallback to native Date parsing for other formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${dateString}. Expected DD-MM-YYYY or DD/MM/YYYY format.`);
    }
    
    return date.toISOString().split('T')[0];
}

// Simple CSV parser (no external dependencies)
function parseCSV(filePath) {
    console.log(`📖 Reading CSV file: ${filePath}`);
    
    if (!existsSync(filePath)) {
        throw new Error(`CSV file not found: ${filePath}`);
    }
    
    const csvContent = readFileSync(filePath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        throw new Error('CSV file is empty');
    }
    
    // Parse header
    const headers = lines[0].split(',').map(h => h.trim());
    console.log('📋 CSV headers:', headers);
    
    // Expected headers
    const expectedHeaders = ['name', 'phone', 'email', 'plan_name', 'duration_days', 'start_date', 'amount_paid', 'purchase_date'];
    
    // Validate headers
    for (const expected of expectedHeaders) {
        if (!headers.includes(expected)) {
            throw new Error(`Missing required header: ${expected}`);
        }
    }
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const row = {};
        const values = lines[i].split(',').map(v => v.trim());
        
        if (values.length !== headers.length) {
            console.warn(`⚠️  Row ${i + 1}: Column count mismatch, skipping`);
            continue;
        }
        
        headers.forEach((header, index) => {
            row[header] = values[index] === '' ? null : values[index];
        });
        
        data.push(row);
    }
    
    console.log(`✓ Parsed ${data.length} data rows`);
    return data;
}

// Validate individual row data
function validateRow(row, index) {
    const errors = [];
    
    // Required fields
    const requiredFields = ['name', 'phone', 'plan_name', 'duration_days', 'start_date', 'amount_paid'];
    
    for (const field of requiredFields) {
        if (!row[field] || row[field].toString().trim() === '') {
            errors.push(`Missing ${field}`);
        }
    }
    
    // Validate phone format (basic)
    if (row.phone && !/^\d{10}$/.test(row.phone.toString())) {
        errors.push('Phone must be 10 digits');
    }
    
    // Validate duration_days is a number
    if (row.duration_days && isNaN(parseInt(row.duration_days))) {
        errors.push('Duration days must be a number');
    }
    
    // Validate amount_paid is a number
    if (row.amount_paid && isNaN(parseFloat(row.amount_paid))) {
        errors.push('Amount paid must be a number');
    }
    
    // Validate dates
    try {
        if (row.start_date) parseDate(row.start_date);
        if (row.purchase_date) parseDate(row.purchase_date);
    } catch (error) {
        errors.push(error.message);
    }
    
    return errors;
}

// Validate and preprocess all data
function validateAndPreprocessData(csvData) {
    console.log('🔍 Validating and preprocessing data...');
    
    const validData = [];
    const errors = [];
    const warnings = [];
    
    csvData.forEach((row, index) => {
        const rowErrors = validateRow(row, index + 1);
        
        if (rowErrors.length > 0) {
            errors.push(`Row ${index + 2}: ${rowErrors.join(', ')}`);
        } else {
            // Preprocess valid row
            const processedRow = {
                name: row.name.trim(),
                phone: row.phone.toString().trim(),
                email: row.email ? row.email.trim() : null,
                plan_name: row.plan_name.trim(),
                duration_days: parseInt(row.duration_days),
                start_date: parseDate(row.start_date),
                amount_paid: parseFloat(row.amount_paid),
                purchase_date: row.purchase_date ? parseDate(row.purchase_date) : parseDate(row.start_date)
            };
            
            validData.push(processedRow);
        }
    });
    
    if (errors.length > 0) {
        console.log('❌ Validation errors:');
        errors.forEach(error => console.log(`   ${error}`));
        throw new Error(`Validation failed: ${errors.length} errors found`);
    }
    
    console.log(`✅ Validated ${validData.length} rows successfully`);
    return validData;
}

// Calculate member join dates (earliest membership start date)
function calculateMemberJoinDates(validData) {
    console.log('📅 Calculating member join dates...');
    
    const memberJoinDates = new Map();
    
    validData.forEach(row => {
        const phone = row.phone;
        const startDate = row.start_date;
        
        if (!memberJoinDates.has(phone) || startDate < memberJoinDates.get(phone)) {
            memberJoinDates.set(phone, startDate);
        }
    });
    
    console.log(`✓ Calculated join dates for ${memberJoinDates.size} unique members`);
    return memberJoinDates;
}

// Calculate plan default amounts (first amount encountered per plan)
function calculatePlanDefaultAmounts(validData) {
    console.log('💰 Calculating plan default amounts...');
    
    const planDefaultAmounts = new Map();
    
    // Process in order to get first amount for each plan
    validData.forEach(row => {
        const planKey = `${row.plan_name}-${row.duration_days}`;
        
        if (!planDefaultAmounts.has(planKey)) {
            planDefaultAmounts.set(planKey, row.amount_paid);
        }
    });
    
    console.log(`✓ Calculated default amounts for ${planDefaultAmounts.size} unique plans`);
    planDefaultAmounts.forEach((amount, planKey) => {
        console.log(`  ${planKey}: ₹${amount}`);
    });
    
    return planDefaultAmounts;
}

// Determine membership types (New vs Renewal)
function determineMembershipTypes(validData) {
    console.log('🔄 Determining membership types...');
    
    // Sort by phone and start date
    const sortedData = [...validData].sort((a, b) => {
        const phoneCompare = a.phone.localeCompare(b.phone);
        if (phoneCompare !== 0) return phoneCompare;
        return new Date(a.start_date) - new Date(b.start_date);
    });
    
    const memberHistory = new Map();
    const membershipTypes = new Map();
    
    sortedData.forEach(row => {
        const phone = row.phone;
        const key = `${phone}-${row.plan_name}-${row.start_date}`;
        
        // Check if member has any previous memberships
        const hasHistory = memberHistory.has(phone);
        const membershipType = hasHistory ? 'Renewal' : 'New';
        
        membershipTypes.set(key, membershipType);
        
        // Add to member history
        if (!memberHistory.has(phone)) {
            memberHistory.set(phone, []);
        }
        memberHistory.get(phone).push(row.start_date);
    });
    
    console.log(`✓ Determined membership types for ${membershipTypes.size} memberships`);
    return membershipTypes;
}

// Main import function
export function importMembershipsFromCSV(csvFilePath) {
    try {
        console.log('🚀 Starting CSV membership import...');
        console.log(`CSV file: ${csvFilePath}`);
        
        // Initialize database
        const db = new Database(DB_PATH);
        
        // Parse CSV
        const csvData = parseCSV(csvFilePath);
        
        // Validate and preprocess
        const validData = validateAndPreprocessData(csvData);
        
        // Calculate derived data
        const memberJoinDates = calculateMemberJoinDates(validData);
        const planDefaultAmounts = calculatePlanDefaultAmounts(validData);
        const membershipTypes = determineMembershipTypes(validData);
        
        // Prepare database statements
        const insertMember = db.prepare(`
            INSERT OR IGNORE INTO members (name, phone, email, join_date, status)
            VALUES (?, ?, ?, ?, 'Inactive')
        `);
        
        const insertPlan = db.prepare(`
            INSERT OR IGNORE INTO group_plans (name, duration_days, default_amount, display_name, status)
            VALUES (?, ?, ?, ?, 'Active')
        `);
        
        const insertMembership = db.prepare(`
            INSERT OR IGNORE INTO group_class_memberships 
            (member_id, plan_id, start_date, end_date, amount_paid, purchase_date, membership_type, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')
        `);
        
        const getMemberId = db.prepare('SELECT id FROM members WHERE phone = ?');
        const getPlanId = db.prepare('SELECT id FROM group_plans WHERE name = ? AND duration_days = ?');
        
        console.log('👥 Processing members...');
        
        // Insert unique members
        const processedMembers = new Set();
        validData.forEach(row => {
            if (!processedMembers.has(row.phone)) {
                const joinDate = memberJoinDates.get(row.phone);
                insertMember.run(row.name, row.phone, row.email, joinDate);
                processedMembers.add(row.phone);
            }
        });
        
        console.log('📋 Processing plans...');
        
        // Insert unique plans
        const processedPlans = new Set();
        validData.forEach(row => {
            const planKey = `${row.plan_name}-${row.duration_days}`;
            if (!processedPlans.has(planKey)) {
                const defaultAmount = planDefaultAmounts.get(planKey);
                const displayName = `${row.plan_name} - ${row.duration_days} days`;
                
                insertPlan.run(row.plan_name, row.duration_days, defaultAmount, displayName);
                processedPlans.add(planKey);
            }
        });
        
        console.log('🏋️ Processing memberships...');
        
        // Insert memberships
        let membershipCount = 0;
        let skippedCount = 0;
        
        validData.forEach(row => {
            const member = getMemberId.get(row.phone);
            const plan = getPlanId.get(row.plan_name, row.duration_days);
            
            if (!member) {
                console.error(`❌ Member not found for phone: ${row.phone}`);
                skippedCount++;
                return;
            }
            
            if (!plan) {
                console.error(`❌ Plan not found: ${row.plan_name} - ${row.duration_days} days`);
                skippedCount++;
                return;
            }
            
            // Calculate end date
            const endDate = new Date(row.start_date);
            endDate.setDate(endDate.getDate() + row.duration_days);
            const calculatedEndDate = endDate.toISOString().split('T')[0];
            
            // Get membership type
            const membershipKey = `${row.phone}-${row.plan_name}-${row.start_date}`;
            const membershipType = membershipTypes.get(membershipKey) || 'New';
            
            try {
                insertMembership.run(
                    member.id,
                    plan.id,
                    row.start_date,
                    calculatedEndDate,
                    row.amount_paid,
                    row.purchase_date,
                    membershipType
                );
                membershipCount++;
            } catch (error) {
                if (error.message.includes('UNIQUE constraint failed')) {
                    console.warn(`⚠️  Membership already exists: ${row.name} - ${row.plan_name} - ${row.start_date}`);
                    skippedCount++;
                } else {
                    throw error;
                }
            }
        });
        
        // Generate summary
        const memberCount = db.prepare('SELECT COUNT(*) as count FROM members WHERE status != \'Deleted\'').get();
        const planCount = db.prepare('SELECT COUNT(*) as count FROM group_plans WHERE status != \'Deleted\'').get();
        const totalMembershipCount = db.prepare('SELECT COUNT(*) as count FROM group_class_memberships WHERE status != \'Deleted\'').get();
        
        console.log('\n🎉 Import completed successfully!');
        console.log(`📊 Summary:`);
        console.log(`   - ${membershipCount} memberships imported`);
        console.log(`   - ${skippedCount} memberships skipped (duplicates/errors)`);
        console.log(`   - ${memberCount.count} total members in database`);
        console.log(`   - ${planCount.count} total plans in database`);
        console.log(`   - ${totalMembershipCount.count} total memberships in database`);
        
        db.close();
        
        return {
            success: true,
            imported: membershipCount,
            skipped: skippedCount,
            totalMembers: memberCount.count,
            totalPlans: planCount.count,
            totalMemberships: totalMembershipCount.count
        };
        
    } catch (error) {
        console.error('❌ Import failed:', error.message);
        throw error;
    }
}

// Run import if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const csvPath = process.argv[2];
    if (!csvPath) {
        console.error('Usage: node import-csv.js <path-to-csv-file>');
        process.exit(1);
    }
    
    importMembershipsFromCSV(csvPath);
}