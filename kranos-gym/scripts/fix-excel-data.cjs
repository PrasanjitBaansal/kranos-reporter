const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../static/data/Kranos MMA Members.xlsx');
const workbook = XLSX.readFile(excelPath);
const gcSheet = workbook.Sheets['GC'];
const gcData = XLSX.utils.sheet_to_json(gcSheet);

// Helper function to convert Excel serial date to yyyy-MM-dd
function excelDateToSQLDate(serial) {
  if (!serial || serial === 0) return null;
  // Excel epoch is December 30, 1899
  const epoch = new Date(1899, 11, 30);
  const date = new Date(epoch.getTime() + serial * 24 * 60 * 60 * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

console.log('=== ANALYZING MEMBERSHIP HISTORY ===\n');

// Group by phone to understand membership timeline
const phoneGroups = {};
gcData.forEach((record, index) => {
  const phone = record['Phone'];
  if (!phoneGroups[phone]) {
    phoneGroups[phone] = [];
  }
  phoneGroups[phone].push({ ...record, originalIndex: index });
});

// Sort each group by start date to get chronological order
Object.keys(phoneGroups).forEach(phone => {
  phoneGroups[phone].sort((a, b) => a['Plan Start Date'] - b['Plan Start Date']);
});

// Show phones with multiple memberships and their timeline
console.log('PHONES WITH MULTIPLE MEMBERSHIPS (showing timeline):\n');
const multipleMembers = Object.entries(phoneGroups).filter(([p, records]) => records.length > 1);

multipleMembers.slice(0, 5).forEach(([phone, records]) => {
  console.log(`${records[0]['Client Name']} (${phone}):`);
  records.forEach((r, idx) => {
    const type = r['Membership Type'] || 'UNDEFINED';
    console.log(`  ${idx + 1}. ${r['Member ID']} - Start: ${r['Plan Start Date']}, Type: ${type}, Status: ${r['Plan Status']}`);
  });
  console.log('');
});

console.log(`\nTotal phones with multiple memberships: ${multipleMembers.length}`);
console.log(`Total phones with single membership: ${Object.keys(phoneGroups).length - multipleMembers.length}`);

// Now fix the data
console.log('\n=== FIXING DATA ===\n');

let updatedCount = 0;
let membershipTypeFixed = 0;
let pendingFixed = 0;

// Process each phone group
Object.values(phoneGroups).forEach(records => {
  // Sort by start date (already done above, but ensuring)
  records.sort((a, b) => a['Plan Start Date'] - b['Plan Start Date']);

  // First membership is always "Fresh"
  if (!records[0]['Membership Type'] || records[0]['Membership Type'] === 'undefined') {
    gcData[records[0].originalIndex]['Membership Type'] = 'Fresh';
    membershipTypeFixed++;
  } else if (records[0]['Membership Type'] !== 'Fresh' && records[0]['Membership Type'] !== 'New') {
    // If it has a value but not Fresh/New, it might be wrong
    // We'll leave it as is for now
  }

  // Subsequent memberships are "Renewal" with previous membership ID
  for (let i = 1; i < records.length; i++) {
    const currentRecord = records[i];
    const previousRecord = records[i - 1];

    // Fix membership type
    if (!currentRecord['Membership Type'] || currentRecord['Membership Type'] === 'undefined') {
      gcData[currentRecord.originalIndex]['Membership Type'] = 'Renewal';
      membershipTypeFixed++;
    }

    // Add previous membership ID column if it doesn't exist
    gcData[currentRecord.originalIndex]['Previous Membership ID'] = previousRecord['Member ID'];
  }
});

// Fix Nagesh's pending amount
const nageshRecord = gcData.find(r => r['Member ID'] === 'GC-58');
if (nageshRecord && nageshRecord[' Amount Pending '] > 0) {
  nageshRecord[' Amount Pending '] = 0;
  pendingFixed++;
  console.log('Fixed GC-58 (Nagesh): Set pending amount to 0');
}

console.log(`\nMembership Type fixed: ${membershipTypeFixed} records`);
console.log(`Pending amount fixed: ${pendingFixed} records`);
console.log(`Total records processed: ${gcData.length}`);

// Check for same names with different phone numbers
console.log('\n=== CHECKING FOR DUPLICATE NAMES ===\n');
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
  .map(([name, phones]) => ({ name, phones: Array.from(phones), count: phones.size }));

if (duplicateNames.length > 0) {
  console.log(`⚠️  Found ${duplicateNames.length} names with multiple phone numbers - consolidating to latest:\n`);

  duplicateNames.forEach(item => {
    // Get all records for this name
    const nameRecords = gcData.filter(r => r['Client Name'].trim().toLowerCase() === item.name);

    // Find the latest record by sorting by start date
    nameRecords.sort((a, b) => {
      const dateA = new Date(a['Plan Start Date']);
      const dateB = new Date(b['Plan Start Date']);
      return dateB - dateA; // Descending order
    });

    const latestPhone = nameRecords[0]['Phone'];

    console.log(`  ${item.name}:`);
    console.log(`    Old phones: ${item.phones.filter(p => p !== latestPhone).join(', ')}`);
    console.log(`    Latest phone: ${latestPhone}`);
    console.log(`    Updating ${nameRecords.length} membership records`);

    // Update all records for this name to use the latest phone
    gcData.forEach(record => {
      if (record['Client Name'].trim().toLowerCase() === item.name) {
        record['Phone'] = latestPhone;
      }
    });
  });

  console.log('\n  ✓ All duplicate names consolidated to latest phone number');
} else {
  console.log('✓ No duplicate names with different phone numbers');
}

// Convert dates to SQL format
console.log('\n=== CONVERTING DATES TO SQL FORMAT ===\n');
let datesConverted = 0;
gcData.forEach(record => {
  // Convert Payment Date
  if (record['Payment Date']) {
    record['Payment Date'] = excelDateToSQLDate(record['Payment Date']);
    datesConverted++;
  }
  // Convert Plan Start Date
  if (record['Plan Start Date']) {
    record['Plan Start Date'] = excelDateToSQLDate(record['Plan Start Date']);
    datesConverted++;
  }
  // Convert Plan End Date
  if (record['Plan End Date']) {
    record['Plan End Date'] = excelDateToSQLDate(record['Plan End Date']);
    datesConverted++;
  }
});

console.log(`Converted ${datesConverted} date fields (${datesConverted / 3} records × 3 date fields)`);

// Show sample of fixed data
console.log('\n=== SAMPLE FIXED DATA ===\n');
const soumikRecords = gcData.filter(r => r['Phone'] === 8095822059);
soumikRecords.forEach(r => {
  console.log(`${r['Member ID']}: Type=${r['Membership Type']}, Previous=${r['Previous Membership ID'] || 'N/A'}, Status=${r['Plan Status']}`);
});

// Write back to Excel
console.log('\n=== SAVING UPDATED FILE ===\n');

// Add Previous Membership ID column to all records that don't have it
gcData.forEach(record => {
  if (!record['Previous Membership ID']) {
    record['Previous Membership ID'] = '';
  }
});

// Convert back to worksheet
const newGcSheet = XLSX.utils.json_to_sheet(gcData);
workbook.Sheets['GC'] = newGcSheet;

// Save
XLSX.writeFile(workbook, excelPath);
console.log('✓ Excel file updated successfully!');
console.log(`  Path: ${excelPath}`);
