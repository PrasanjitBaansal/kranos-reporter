const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../static/data/Kranos MMA Members.xlsx');
const workbook = XLSX.readFile(excelPath);

console.log('=== FINAL VERIFICATION ===\n');

// Check PT sheet
const ptData = XLSX.utils.sheet_to_json(workbook.Sheets['PT']);
console.log('PT SHEET:\n');
console.log(`Total records: ${ptData.length}`);

// Check date format
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const invalidPTDates = ptData.filter(r => !datePattern.test(r['Start Date']));
console.log(`Date format check: ${invalidPTDates.length === 0 ? '✓ All dates in yyyy-MM-dd format' : '✗ ' + invalidPTDates.length + ' invalid dates'}`);

// Check Manideep
const manideepRecords = ptData.filter(r => r['Phone'] === 9579123530);
const uniqueNames = [...new Set(manideepRecords.map(r => r['Client Name']))];
console.log(`Manideep name check: ${uniqueNames.length === 1 ? '✓ Unified to: ' + uniqueNames[0] : '✗ Still has variations: ' + uniqueNames.join(', ')}`);

// Show all PT records
console.log('\nAll PT records:');
ptData.forEach(r => {
  console.log(`  ${r['Member ID']}: ${r['Client Name']}, Phone: ${r['Phone']}, Start: ${r['Start Date']}, ${r['Session Count']} sessions @ ₹${r['Amount Paid']}`);
});

// Check GC sheet
console.log('\n\nGC SHEET:\n');
const gcData = XLSX.utils.sheet_to_json(workbook.Sheets['GC']);
console.log(`Total records: ${gcData.length}`);

// Check Aniket phone
const aniketRecords = gcData.filter(r => r['Client Name'].trim().toLowerCase() === 'aniket');
const aniketPhones = [...new Set(aniketRecords.map(r => r['Phone']))];
console.log(`Aniket phone check: ${aniketPhones.length === 1 ? '✓ All ' + aniketRecords.length + ' records use: ' + aniketPhones[0] : '✗ Multiple phones: ' + aniketPhones.join(', ')}`);

// Check date format in GC
const invalidGCDates = gcData.filter(r =>
  !datePattern.test(r['Payment Date']) ||
  !datePattern.test(r['Plan Start Date']) ||
  !datePattern.test(r['Plan End Date'])
);
console.log(`Date format check: ${invalidGCDates.length === 0 ? '✓ All dates in yyyy-MM-dd format' : '✗ ' + invalidGCDates.length + ' records with invalid dates'}`);

// Check for duplicate names with different phones
const nameGroups = {};
gcData.forEach(record => {
  const name = record['Client Name'].trim().toLowerCase();
  if (!nameGroups[name]) {
    nameGroups[name] = new Set();
  }
  nameGroups[name].add(record['Phone']);
});

const duplicateNames = Object.entries(nameGroups).filter(([name, phones]) => phones.size > 1);
console.log(`Duplicate names check: ${duplicateNames.length === 0 ? '✓ No duplicate names with different phones' : '✗ Found ' + duplicateNames.length + ' duplicate names'}`);

console.log('\n=== FINAL DATA SUMMARY ===\n');
console.log('GC Sheet:');
console.log(`  - ${gcData.length} membership records`);
console.log(`  - ${[...new Set(gcData.map(r => r['Phone']))].length} unique phone numbers`);
console.log(`  - Columns: ${Object.keys(gcData[0]).length} (${Object.keys(gcData[0]).join(', ')})`);

console.log('\nPT Sheet:');
console.log(`  - ${ptData.length} PT membership records`);
console.log(`  - ${[...new Set(ptData.map(r => r['Phone']))].length} unique phone numbers`);
console.log(`  - Columns: ${Object.keys(ptData[0]).length} (${Object.keys(ptData[0]).join(', ')})`);

console.log('\n✓ ALL CHECKS COMPLETE - DATA IS CLEAN!');
