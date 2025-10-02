const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../static/data/Kranos MMA Members.xlsx');
const workbook = XLSX.readFile(excelPath);
const ptData = XLSX.utils.sheet_to_json(workbook.Sheets['PT']);

console.log('=== PT SHEET ANALYSIS ===\n');

console.log(`Total PT records: ${ptData.length}`);
console.log('\nColumns:', Object.keys(ptData[0]));

console.log('\n=== DATA PATTERNS ===\n');

console.log('Plan Status values:', [...new Set(ptData.map(r => r['Plan Status']))]);
console.log('Session Counts:', [...new Set(ptData.map(r => r['Session Count']))].sort((a,b) => a-b));

// Check date format
console.log('\nSample Start Dates (first 5):');
ptData.slice(0, 5).forEach(r => {
  console.log(`  ${r['Member ID']}: ${r['Start Date']} (type: ${typeof r['Start Date']})`);
});

// Check for duplicates
console.log('\n=== CHECKING FOR DUPLICATES ===\n');

// Duplicate Member IDs
const memberIds = ptData.map(r => r['Member ID']);
const duplicateIds = memberIds.filter((id, i) => memberIds.indexOf(id) !== i);
console.log('Duplicate Member IDs:', duplicateIds.length > 0 ? [...new Set(duplicateIds)] : 'None');

// Duplicate phone numbers
const phones = ptData.map(r => r['Phone']);
const phoneCount = {};
phones.forEach(p => phoneCount[p] = (phoneCount[p] || 0) + 1);
const duplicatePhones = Object.entries(phoneCount).filter(([p, c]) => c > 1);
console.log(`Duplicate phones: ${duplicatePhones.length}`);
if (duplicatePhones.length > 0) {
  duplicatePhones.forEach(([phone, count]) => {
    console.log(`  Phone ${phone}: ${count} PT memberships`);
    const records = ptData.filter(r => r['Phone'] == phone);
    records.forEach(r => console.log(`    - ${r['Member ID']}: ${r['Client Name']}, ${r['Session Count']} sessions, ₹${r['Amount Paid']}`));
  });
}

// Duplicate names with different phones
const nameGroups = {};
ptData.forEach(record => {
  const name = record['Client Name'].trim().toLowerCase();
  if (!nameGroups[name]) {
    nameGroups[name] = new Set();
  }
  nameGroups[name].add(record['Phone']);
});

const duplicateNames = Object.entries(nameGroups)
  .filter(([name, phones]) => phones.size > 1);

console.log(`\nDuplicate names with different phones: ${duplicateNames.length}`);
if (duplicateNames.length > 0) {
  duplicateNames.forEach(([name, phones]) => {
    console.log(`  ${name}: phones ${Array.from(phones).join(', ')}`);
    const records = ptData.filter(r => r['Client Name'].trim().toLowerCase() === name);
    records.forEach(r => {
      console.log(`    - ${r['Member ID']}: ${r['Phone']}, ${r['Session Count']} sessions`);
    });
  });
}

// Check for missing data
console.log('\n=== MISSING DATA ===\n');
const missingName = ptData.filter(r => !r['Client Name'] || r['Client Name'].trim() === '');
const missingPhone = ptData.filter(r => !r['Phone']);
const missingAmount = ptData.filter(r => !r['Amount Paid'] || r['Amount Paid'] === 0);
const missingSessions = ptData.filter(r => !r['Session Count'] || r['Session Count'] === 0);
console.log(`Missing Client Name: ${missingName.length}`);
console.log(`Missing Phone: ${missingPhone.length}`);
console.log(`Missing/Zero Amount Paid: ${missingAmount.length}`);
console.log(`Missing/Zero Session Count: ${missingSessions.length}`);

console.log('\n=== SAMPLE RECORDS ===\n');
ptData.slice(0, 3).forEach(r => {
  console.log(JSON.stringify(r, null, 2));
});

// Check pricing pattern
console.log('\n=== PRICING ANALYSIS ===\n');
const pricePerSession = ptData.map(r => ({
  id: r['Member ID'],
  sessions: r['Session Count'],
  amount: r['Amount Paid'],
  perSession: (r['Amount Paid'] / r['Session Count']).toFixed(2)
}));

console.log('Price per session breakdown:');
pricePerSession.forEach(p => {
  console.log(`  ${p.id}: ${p.sessions} sessions @ ₹${p.amount} = ₹${p.perSession}/session`);
});

const uniquePrices = [...new Set(pricePerSession.map(p => p.perSession))];
console.log(`\nUnique price points: ${uniquePrices.join(', ')}`);
