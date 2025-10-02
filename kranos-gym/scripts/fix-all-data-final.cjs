const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../static/data/Kranos MMA Members.xlsx');
const workbook = XLSX.readFile(excelPath);

// Helper function to convert Excel serial date to yyyy-MM-dd
function excelDateToSQLDate(serial) {
  if (!serial || serial === 0 || typeof serial !== 'number') return serial;
  // Excel epoch is December 30, 1899
  const epoch = new Date(1899, 11, 30);
  const date = new Date(epoch.getTime() + serial * 24 * 60 * 60 * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

console.log('╔════════════════════════════════════════════╗');
console.log('║   KRANOS MMA MEMBERS - DATA CLEANUP        ║');
console.log('╚════════════════════════════════════════════╝\n');

// ========== GC SHEET PROCESSING ==========
console.log('═══ GC SHEET (Group Classes) ═══\n');

const gcData = XLSX.utils.sheet_to_json(workbook.Sheets['GC']);
console.log(`Total records: ${gcData.length}\n`);

// 1. Fix membership types and add previous membership IDs
console.log('[1/7] Fixing Membership Types and linking renewals...');
const phoneGroups = {};
gcData.forEach((record, index) => {
  const phone = record['Phone'];
  if (!phoneGroups[phone]) {
    phoneGroups[phone] = [];
  }
  phoneGroups[phone].push({ ...record, originalIndex: index });
});

// Sort by start date
Object.keys(phoneGroups).forEach(phone => {
  phoneGroups[phone].sort((a, b) => a['Plan Start Date'] - b['Plan Start Date']);
});

let membershipTypeFixed = 0;
Object.values(phoneGroups).forEach(records => {
  records.sort((a, b) => a['Plan Start Date'] - b['Plan Start Date']);

  // First membership is "Fresh" or "New"
  if (!records[0]['Membership Type'] || records[0]['Membership Type'] === 'undefined') {
    gcData[records[0].originalIndex]['Membership Type'] = 'Fresh';
    membershipTypeFixed++;
  }

  // Subsequent memberships are "Renewal"
  for (let i = 1; i < records.length; i++) {
    const currentRecord = records[i];
    const previousRecord = records[i - 1];

    if (!currentRecord['Membership Type'] || currentRecord['Membership Type'] === 'undefined') {
      gcData[currentRecord.originalIndex]['Membership Type'] = 'Renewal';
      membershipTypeFixed++;
    }

    gcData[currentRecord.originalIndex]['Previous Membership ID'] = previousRecord['Member ID'];
  }
});
console.log(`   ✓ Fixed ${membershipTypeFixed} membership types\n`);

// 2. Fix Nagesh's pending amount
console.log('[2/7] Fixing pending amounts...');
const nageshRecord = gcData.find(r => r['Member ID'] === 'GC-58');
let pendingFixed = 0;
if (nageshRecord && nageshRecord[' Amount Pending '] > 0) {
  nageshRecord[' Amount Pending '] = 0;
  pendingFixed++;
}
console.log(`   ✓ Fixed ${pendingFixed} pending amounts\n`);

// 3. Consolidate duplicate names
console.log('[3/7] Checking for duplicate names...');
const nameGroups = {};
gcData.forEach(record => {
  const name = record['Client Name'].trim().toLowerCase();
  if (!nameGroups[name]) {
    nameGroups[name] = new Set();
  }
  nameGroups[name].add(record['Phone']);
});

const duplicateNames = Object.entries(nameGroups)
  .filter(([name, phones]) => phones.size > 1)
  .map(([name, phones]) => ({ name, phones: Array.from(phones) }));

if (duplicateNames.length > 0) {
  console.log(`   Found ${duplicateNames.length} names with multiple phones - consolidating...`);
  duplicateNames.forEach(item => {
    const nameRecords = gcData.filter(r => r['Client Name'].trim().toLowerCase() === item.name);
    nameRecords.sort((a, b) => b['Plan Start Date'] - a['Plan Start Date']);
    const latestPhone = nameRecords[0]['Phone'];

    gcData.forEach(record => {
      if (record['Client Name'].trim().toLowerCase() === item.name) {
        record['Phone'] = latestPhone;
      }
    });
    console.log(`   - ${item.name}: consolidated to ${latestPhone}`);
  });
} else {
  console.log(`   ✓ No duplicate names found`);
}
console.log('');

// 4. Add Previous Membership ID column to all records
console.log('[4/7] Adding Previous Membership ID column...');
gcData.forEach(record => {
  if (!record['Previous Membership ID']) {
    record['Previous Membership ID'] = '';
  }
});
console.log(`   ✓ Column added\n`);

// ========== PT SHEET PROCESSING ==========
console.log('═══ PT SHEET (Personal Training) ═══\n');

const ptData = XLSX.utils.sheet_to_json(workbook.Sheets['PT']);
console.log(`Total records: ${ptData.length}\n`);

// 5. Fix missing Member IDs and name inconsistencies
console.log('[5/7] Fixing missing Member IDs and name inconsistencies...');

// Fix missing Member IDs
let missingIDsFixed = 0;
let nextPTNumber = 14; // PT-1 to PT-13 exist, start from PT-14
ptData.forEach(r => {
  if (!r['Member ID']) {
    r['Member ID'] = `PT-${nextPTNumber}`;
    nextPTNumber++;
    missingIDsFixed++;
  }
});

// Fix Manideep/Mannadeep name inconsistency
const manideepPhone = 9579123530;
const manideepRecords = ptData.filter(r => r['Phone'] === manideepPhone);
let nameFixed = 0;
manideepRecords.forEach(r => {
  if (r['Client Name'].toLowerCase() === 'mannadeep') {
    r['Client Name'] = 'Manideep';
    nameFixed++;
  }
});
console.log(`   ✓ Fixed ${missingIDsFixed} missing Member IDs`);
console.log(`   ✓ Fixed ${nameFixed} name inconsistencies (Mannadeep → Manideep)\n`);

// 6. Update Aniket's phone in GC to match PT
console.log('[6/7] Synchronizing Aniket phone number across sheets...');
const aniketPTPhone = 7406413647;
const aniketGCRecords = gcData.filter(r => r['Client Name'].trim().toLowerCase() === 'aniket');
aniketGCRecords.forEach(r => {
  r['Phone'] = aniketPTPhone;
});
console.log(`   ✓ Updated ${aniketGCRecords.length} GC records to phone: ${aniketPTPhone}\n`);

// 7. Convert all dates to SQL format
console.log('[7/7] Converting dates to yyyy-MM-dd format...');
let gcDatesConverted = 0;
gcData.forEach(record => {
  if (typeof record['Payment Date'] === 'number') {
    record['Payment Date'] = excelDateToSQLDate(record['Payment Date']);
    gcDatesConverted++;
  }
  if (typeof record['Plan Start Date'] === 'number') {
    record['Plan Start Date'] = excelDateToSQLDate(record['Plan Start Date']);
  }
  if (typeof record['Plan End Date'] === 'number') {
    record['Plan End Date'] = excelDateToSQLDate(record['Plan End Date']);
  }
});

let ptDatesConverted = 0;
ptData.forEach(record => {
  if (typeof record['Start Date'] === 'number') {
    record['Start Date'] = excelDateToSQLDate(record['Start Date']);
    ptDatesConverted++;
  }
});

console.log(`   ✓ GC: ${gcDatesConverted} records`);
console.log(`   ✓ PT: ${ptDatesConverted} records\n`);

// Save changes
console.log('═══ SAVING CHANGES ═══\n');
workbook.Sheets['GC'] = XLSX.utils.json_to_sheet(gcData);
workbook.Sheets['PT'] = XLSX.utils.json_to_sheet(ptData);
XLSX.writeFile(workbook, excelPath);
console.log(`✓ File saved: ${excelPath}\n`);

// Final summary
console.log('╔════════════════════════════════════════════╗');
console.log('║            SUMMARY OF CHANGES              ║');
console.log('╚════════════════════════════════════════════╝\n');
console.log('GC Sheet:');
console.log(`  ✓ ${membershipTypeFixed} membership types fixed`);
console.log(`  ✓ ${pendingFixed} pending amounts corrected`);
console.log(`  ✓ ${duplicateNames.length} duplicate names consolidated`);
console.log(`  ✓ ${aniketGCRecords.length} Aniket records updated to phone ${aniketPTPhone}`);
console.log(`  ✓ ${gcDatesConverted} date records converted`);
console.log(`  ✓ Previous Membership ID column added`);
console.log('\nPT Sheet:');
console.log(`  ✓ ${missingIDsFixed} missing Member IDs added`);
console.log(`  ✓ ${nameFixed} name inconsistencies fixed`);
console.log(`  ✓ ${ptDatesConverted} date records converted`);
console.log('\n✓ ALL DATA CLEANED SUCCESSFULLY!\n');
