const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../static/data/Kranos MMA Members.xlsx');
const workbook = XLSX.readFile(excelPath);

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

console.log('=== FIXING PT SHEET ===\n');

const ptData = XLSX.utils.sheet_to_json(workbook.Sheets['PT']);

// 1. Fix Manideep/Mannadeep name inconsistency
console.log('1. Fixing name inconsistency:\n');
const manideepPhone = 9579123530;
const manideepRecords = ptData.filter(r => r['Phone'] === manideepPhone);
console.log(`   Found ${manideepRecords.length} records with phone ${manideepPhone}`);

manideepRecords.forEach(r => {
  const oldName = r['Client Name'];
  if (oldName.toLowerCase() === 'mannadeep') {
    r['Client Name'] = 'Manideep';
    console.log(`   Changed "${oldName}" → "Manideep" (${r['Member ID']})`);
  }
});

// 2. Convert PT dates to SQL format
console.log('\n2. Converting PT dates to yyyy-MM-dd:\n');
let ptDatesConverted = 0;
ptData.forEach(record => {
  if (record['Start Date'] && typeof record['Start Date'] === 'number') {
    const oldDate = record['Start Date'];
    record['Start Date'] = excelDateToSQLDate(record['Start Date']);
    ptDatesConverted++;
    if (ptDatesConverted <= 3) {
      console.log(`   ${record['Member ID']}: ${oldDate} → ${record['Start Date']}`);
    }
  }
});
console.log(`   Total: ${ptDatesConverted} dates converted`);

// Save PT sheet
workbook.Sheets['PT'] = XLSX.utils.json_to_sheet(ptData);

console.log('\n=== FIXING GC SHEET ===\n');

const gcData = XLSX.utils.sheet_to_json(workbook.Sheets['GC']);

// 3. Update Aniket's phone in GC sheet to match PT sheet
console.log('3. Updating Aniket\'s phone number in GC sheet:\n');
const aniketPTPhone = 7406413647; // Phone from PT sheet
const aniketRecords = gcData.filter(r => r['Client Name'].trim().toLowerCase() === 'aniket');

console.log(`   Found ${aniketRecords.length} Aniket records in GC sheet`);
console.log(`   Current phone(s): ${[...new Set(aniketRecords.map(r => r['Phone']))].join(', ')}`);
console.log(`   Updating to PT phone: ${aniketPTPhone}`);

aniketRecords.forEach(r => {
  r['Phone'] = aniketPTPhone;
});

console.log(`   ✓ Updated ${aniketRecords.length} records`);

// Save GC sheet
workbook.Sheets['GC'] = XLSX.utils.json_to_sheet(gcData);

// Write back to Excel
console.log('\n=== SAVING UPDATED FILE ===\n');
XLSX.writeFile(workbook, excelPath);
console.log('✓ Excel file updated successfully!');
console.log(`  Path: ${excelPath}`);

// Summary
console.log('\n=== SUMMARY ===\n');
console.log('PT Sheet:');
console.log(`  - Fixed name: Mannadeep → Manideep (${manideepRecords.filter(r => r['Client Name'] === 'Manideep').length} records)`);
console.log(`  - Converted dates: ${ptDatesConverted} records`);
console.log('\nGC Sheet:');
console.log(`  - Updated Aniket's phone: ${aniketRecords.length} records → ${aniketPTPhone}`);

// Show samples
console.log('\n=== SAMPLE PT DATA ===\n');
ptData.slice(0, 3).forEach(r => {
  console.log(`${r['Member ID']}: ${r['Client Name']}, Phone: ${r['Phone']}, Start: ${r['Start Date']}`);
});

console.log('\n=== SAMPLE GC DATA (Aniket records) ===\n');
const aniketSample = gcData.filter(r => r['Client Name'].trim().toLowerCase() === 'aniket').slice(0, 3);
aniketSample.forEach(r => {
  console.log(`${r['Member ID']}: ${r['Client Name']}, Phone: ${r['Phone']}, Type: ${r['Membership Type']}`);
});
