import Database from 'better-sqlite3';
import XLSX from 'xlsx';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import path from 'path';

// Convert Excel serial date to YYYY-MM-DD format
function excelDateToString(serial) {
    if (!serial || isNaN(serial)) return new Date().toISOString().split('T')[0];
    
    // Excel serial number 1 = January 1, 1900
    // But Excel incorrectly treats 1900 as a leap year, so we need to adjust
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
    const date = new Date(excelEpoch.getTime() + (serial * 24 * 60 * 60 * 1000));
    
    return date.toISOString().split('T')[0];
}

function initializeDefaultSettings(db) {
    try {
        console.log('Initializing default app settings...');
        
        const insertSetting = db.prepare(`
            INSERT OR IGNORE INTO app_settings (setting_key, setting_value, created_at, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);
        
        // Default settings
        const defaultSettings = [
            ['accent_color', '#f39407'],
            ['theme_mode', 'dark'],
            ['favicon_path', '/favicon.png'],
            ['logo_type', 'emoji'],
            ['logo_value', '🏋️']
        ];
        
        defaultSettings.forEach(([key, value]) => {
            insertSetting.run(key, value);
        });
        
        console.log('✓ Default app settings initialized');
    } catch (error) {
        console.error('Error initializing default settings:', error.message);
    }
}

export function initializeDatabase() {
    try {
        console.log('Initializing database...');
        const db = new Database('kranos.db');
        
        // Read and execute schema
        const schemaPath = path.join(process.cwd(), 'src/lib/db/schema.sql');
        console.log(`Reading schema from: ${schemaPath}`);
        const schema = readFileSync(schemaPath, 'utf8');
        
        // Split schema into individual statements and execute
        const statements = schema.split(';').filter(stmt => stmt.trim());
        console.log(`Executing ${statements.length} schema statements...`);
        statements.forEach((stmt, index) => {
            if (stmt.trim()) {
                try {
                    db.exec(stmt + ';');
                    console.log(`✓ Statement ${index + 1} executed`);
                } catch (error) {
                    console.error(`✗ Error executing statement ${index + 1}:`, error.message);
                    console.error('Statement:', stmt);
                }
            }
        });
        
        console.log('Database initialized successfully');
        
        // Initialize default app settings
        initializeDefaultSettings(db);
        
        return db;
    } catch (error) {
        console.error('Error initializing database:', error.message);
        throw error;
    }
}

function cleanSlateDatabase() {
    try {
        // Delete existing database file
        if (existsSync('kranos.db')) {
            unlinkSync('kranos.db');
            console.log('✓ Existing database deleted');
        }
    } catch (error) {
        console.log('No existing database to delete');
    }
}

function validateAndPreprocessData(gcData, ptData) {
    console.log('Validating and preprocessing data...');
    
    const errors = [];
    const warnings = [];
    
    // Validate GC data
    const validGCData = gcData.filter((row, index) => {
        if (!row['Client Name'] || !row['Phone']) {
            warnings.push(`GC Row ${index + 1}: Missing name or phone`);
            return false;
        }
        if (!row['Plan Start Date'] || !row['Plan Type'] || !row['Plan Duration']) {
            warnings.push(`GC Row ${index + 1}: Missing required plan data`);
            return false;
        }
        return true;
    });
    
    // Validate PT data
    const validPTData = ptData.filter((row, index) => {
        if (!row['Client Name'] || !row['Phone']) {
            warnings.push(`PT Row ${index + 1}: Missing name or phone`);
            return false;
        }
        if (!row['Start Date'] || !row['Session Count']) {
            warnings.push(`PT Row ${index + 1}: Missing required session data`);
            return false;
        }
        return true;
    });
    
    // Remove duplicates from GC data
    const gcDuplicates = new Map();
    const deduplicatedGCData = [];
    
    validGCData.forEach((row, index) => {
        const key = `${row['Phone']}-${row['Plan Type']}-${row['Plan Start Date']}`;
        if (gcDuplicates.has(key)) {
            warnings.push(`GC Row ${index + 1}: Duplicate membership removed`);
        } else {
            gcDuplicates.set(key, true);
            deduplicatedGCData.push(row);
        }
    });
    
    const finalValidGCData = deduplicatedGCData;
    
    if (warnings.length > 0) {
        console.log('⚠️  Data validation warnings:');
        warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    if (errors.length > 0) {
        console.log('❌ Data validation errors:');
        errors.forEach(error => console.log(`   ${error}`));
        throw new Error('Data validation failed');
    }
    
    console.log(`✓ Validated ${finalValidGCData.length} GC records and ${validPTData.length} PT records`);
    return { validGCData: finalValidGCData, validPTData };
}

function calculateMemberJoinDates(gcData, ptData) {
    console.log('Calculating member join dates...');
    
    const memberJoinDates = new Map();
    
    // Process GC memberships
    gcData.forEach(row => {
        const phone = String(row['Phone']);
        const startDate = excelDateToString(row['Plan Start Date']);
        
        if (!memberJoinDates.has(phone) || startDate < memberJoinDates.get(phone)) {
            memberJoinDates.set(phone, startDate);
        }
    });
    
    // Process PT memberships
    ptData.forEach(row => {
        const phone = String(row['Phone']);
        const startDate = excelDateToString(row['Start Date']);
        
        if (!memberJoinDates.has(phone) || startDate < memberJoinDates.get(phone)) {
            memberJoinDates.set(phone, startDate);
        }
    });
    
    console.log(`✓ Calculated join dates for ${memberJoinDates.size} unique members`);
    return memberJoinDates;
}

function determineMembershipTypes(gcData) {
    console.log('Determining membership types (New vs Renewal)...');
    
    // Sort by phone and start date to process chronologically
    const sortedData = [...gcData].sort((a, b) => {
        const phoneCompare = String(a['Phone']).localeCompare(String(b['Phone']));
        if (phoneCompare !== 0) return phoneCompare;
        return new Date(excelDateToString(a['Plan Start Date'])) - new Date(excelDateToString(b['Plan Start Date']));
    });
    
    const memberHistory = new Map();
    const membershipTypes = new Map();
    
    sortedData.forEach((row, index) => {
        const phone = String(row['Phone']);
        const startDate = excelDateToString(row['Plan Start Date']);
        const key = `${phone}-${row['Plan Type']}-${startDate}`;
        
        // Check if this member has any previous memberships
        const hasHistory = memberHistory.has(phone);
        const membershipType = hasHistory ? 'Renewal' : 'New';
        
        membershipTypes.set(key, membershipType);
        
        // Add to member history
        if (!memberHistory.has(phone)) {
            memberHistory.set(phone, []);
        }
        memberHistory.get(phone).push(startDate);
    });
    
    console.log(`✓ Determined membership types for ${membershipTypes.size} memberships`);
    return membershipTypes;
}

function calculatePlanDefaultAmounts(gcData) {
    console.log('Calculating plan default amounts (latest amount per plan)...');
    
    const planAmounts = new Map();
    
    // Sort by plan and date to get latest amounts
    const sortedData = [...gcData].sort((a, b) => {
        const planCompare = (a['Plan Type'] || '').localeCompare(b['Plan Type'] || '');
        if (planCompare !== 0) return planCompare;
        return new Date(excelDateToString(b['Plan Start Date'])) - new Date(excelDateToString(a['Plan Start Date']));
    });
    
    sortedData.forEach(row => {
        const planName = row['Plan Type'] || 'Unknown Plan';
        const durationDays = parseInt(row['Plan Duration']) || 30;
        const planKey = `${planName}-${durationDays}`;
        
        if (!planAmounts.has(planKey)) {
            planAmounts.set(planKey, parseFloat(row['Amount']) || 0);
        }
    });
    
    console.log(`✓ Calculated default amounts for ${planAmounts.size} unique plans`);
    return planAmounts;
}

export function migrateFromExcel(excelPath = '../static/data/Kranos MMA Members.xlsx') {
    try {
        console.log('🚀 Starting clean slate migration from Excel...');
        console.log(`Excel file path: ${excelPath}`);
        
        // Clean slate - delete existing database
        cleanSlateDatabase();
        
        // Initialize fresh database
        const db = initializeDatabase();
        
        // Read Excel file
        console.log('📖 Reading Excel file...');
        const workbook = XLSX.readFile(excelPath);
        console.log('Available sheets:', workbook.SheetNames);
    
        // Extract data
        const gcData = workbook.SheetNames.includes('GC') ? XLSX.utils.sheet_to_json(workbook.Sheets['GC']) : [];
        const ptData = workbook.SheetNames.includes('PT') ? XLSX.utils.sheet_to_json(workbook.Sheets['PT']) : [];
        
        console.log(`📊 Found ${gcData.length} GC records and ${ptData.length} PT records`);
        
        // Validate and preprocess data
        const { validGCData, validPTData } = validateAndPreprocessData(gcData, ptData);
        
        // Calculate member join dates (earliest membership date)
        const memberJoinDates = calculateMemberJoinDates(validGCData, validPTData);
        
        // Determine New vs Renewal for GC memberships
        const membershipTypes = determineMembershipTypes(validGCData);
        
        // Calculate plan default amounts (latest amount per plan)
        const planDefaultAmounts = calculatePlanDefaultAmounts(validGCData);
        
        // Prepare database statements
        const insertMember = db.prepare(`
            INSERT OR REPLACE INTO members (name, phone, email, join_date, status)
            VALUES (?, ?, ?, ?, 'Inactive')
        `);
        
        const insertPlan = db.prepare(`
            INSERT OR REPLACE INTO group_plans (name, duration_days, default_amount, display_name, status)
            VALUES (?, ?, ?, ?, 'Active')
        `);
        
        const insertGCMembership = db.prepare(`
            INSERT INTO group_class_memberships 
            (member_id, plan_id, start_date, end_date, amount_paid, purchase_date, membership_type, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')
        `);
        
        const insertPTMembership = db.prepare(`
            INSERT INTO pt_memberships 
            (member_id, purchase_date, amount_paid, sessions_total, sessions_remaining)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        const getMemberId = db.prepare('SELECT id FROM members WHERE phone = ?');
        const getPlanId = db.prepare('SELECT id FROM group_plans WHERE name = ? AND duration_days = ?');
        
        console.log('👥 Inserting members...');
        
        // Insert all unique members first
        const processedMembers = new Set();
        
        [...validGCData, ...validPTData].forEach(row => {
            const phone = String(row['Phone']);
            if (!processedMembers.has(phone)) {
                const joinDate = memberJoinDates.get(phone);
                insertMember.run(
                    row['Client Name'],
                    phone,
                    row['Email'] || null,
                    joinDate
                );
                processedMembers.add(phone);
            }
        });
        
        console.log('📋 Inserting group plans...');
        
        // Insert all unique plans
        const processedPlans = new Set();
        
        validGCData.forEach(row => {
            const planName = row['Plan Type'] || 'Unknown Plan';
            const durationDays = parseInt(row['Plan Duration']) || 30;
            const planKey = `${planName}-${durationDays}`;
            
            if (!processedPlans.has(planKey)) {
                const defaultAmount = planDefaultAmounts.get(planKey) || 0;
                const displayName = `${planName} - ${durationDays} days`;
                
                insertPlan.run(planName, durationDays, defaultAmount, displayName);
                processedPlans.add(planKey);
            }
        });
        
        console.log('🏋️ Inserting group class memberships...');
        
        // Insert GC memberships
        validGCData.forEach(row => {
            const phone = String(row['Phone']);
            const member = getMemberId.get(phone);
            if (!member) {
                console.error(`Member not found for phone: ${phone}`);
                return;
            }
            
            const planName = row['Plan Type'] || 'Unknown Plan';
            const durationDays = parseInt(row['Plan Duration']) || 30;
            const plan = getPlanId.get(planName, durationDays);
            if (!plan) {
                console.error(`Plan not found: ${planName} - ${durationDays} days`);
                return;
            }
            
            // Auto-calculate end date from start date + duration
            const startDate = excelDateToString(row['Plan Start Date']);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + durationDays);
            const calculatedEndDate = endDate.toISOString().split('T')[0];
            
            // Get membership type
            const membershipKey = `${phone}-${planName}-${startDate}`;
            const membershipType = membershipTypes.get(membershipKey) || 'New';
            
            insertGCMembership.run(
                member.id,
                plan.id,
                startDate,
                calculatedEndDate,
                parseFloat(row['Amount']) || 0,
                excelDateToString(row['Payment Date']),
                membershipType
            );
        });
        
        console.log('💪 Inserting PT memberships...');
        
        // Insert PT memberships
        validPTData.forEach(row => {
            const phone = String(row['Phone']);
            const member = getMemberId.get(phone);
            if (!member) {
                console.error(`Member not found for phone: ${phone}`);
                return;
            }
            
            const sessionsTotal = parseInt(row['Session Count']) || 0;
            insertPTMembership.run(
                member.id,
                excelDateToString(row['Start Date']),
                parseFloat(row['Amount Paid']) || 0,
                sessionsTotal,
                sessionsTotal
            );
        });
        
        // Log summary
        const memberCount = db.prepare('SELECT COUNT(*) as count FROM members').get();
        const planCount = db.prepare('SELECT COUNT(*) as count FROM group_plans').get();
        const gcCount = db.prepare('SELECT COUNT(*) as count FROM group_class_memberships').get();
        const ptCount = db.prepare('SELECT COUNT(*) as count FROM pt_memberships').get();
        
        console.log('\n🎉 Migration completed successfully!');
        console.log(`- ${memberCount.count} members`);
        console.log(`- ${planCount.count} group plans`);
        console.log(`- ${gcCount.count} group class memberships`);
        console.log(`- ${ptCount.count} PT memberships`);
        
        db.close();
        return {
            members: memberCount.count,
            plans: planCount.count,
            groupMemberships: gcCount.count,
            ptMemberships: ptCount.count
        };
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    migrateFromExcel();
}