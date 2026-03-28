const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const testSubmissions = [
  {
    id: 'sub_test_1',
    letterData: {
      client: {
        clientName: 'Jane Smith',
        clientEmail: 'jane@example.com',
        clientPhone: '+44 7123 456789',
        relationshipToDebtor: 'landlord',
        relationshipOther: '',
        bankName: 'Barclays Bank',
        sortCode: '20-12-34',
        accountNumber: '12345678'
      },
      debtorName: 'John Doe',
      debtorAddress: '123 High Street, London, SW1A 1AA',
      debtorEmail: 'john.doe@example.com',
      amountOwed: '2500.00',
      paymentDate: '2025-12-27',
      claimDescription: 'Unpaid rent for November and December 2024',
      tone: 'professional'
    },
    stripeSessionId: 'cs_test_123',
    status: 'pending',
    flaggedReasons: ['Contains multiple months of rent claim'],
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'sub_test_2',
    letterData: {
      client: {
        clientName: 'ABC Ltd',
        clientEmail: 'accounts@abcltd.com',
        clientPhone: '+44 20 1234 5678',
        relationshipToDebtor: 'company',
        relationshipOther: ''
      },
      debtorName: 'XYZ Services',
      debtorAddress: '456 Business Park, Manchester, M1 2AB',
      debtorEmail: 'payments@xyzservices.com',
      amountOwed: '15000.00',
      paymentDate: '2025-12-20',
      claimDescription: 'Outstanding invoice #1234 for services rendered in October 2024',
      tone: 'assertive'
    },
    stripeSessionId: 'cs_test_456',
    status: 'pending',
    flaggedReasons: ['Large amount (over £10,000)'],
    submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'sub_test_3',
    letterData: {
      client: {
        clientName: 'Robert Williams',
        clientEmail: 'robert.w@email.com',
        clientPhone: '',
        relationshipToDebtor: 'individual',
        relationshipOther: ''
      },
      debtorName: 'Sarah Johnson',
      debtorAddress: '789 Park Avenue, Birmingham, B2 4QA',
      debtorEmail: 'sarah.j@email.com',
      amountOwed: '450.00',
      paymentDate: '2025-12-25',
      claimDescription: 'Personal loan repayment',
      tone: 'friendly'
    },
    stripeSessionId: 'cs_test_789',
    status: 'approved',
    flaggedReasons: [],
    submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    reviewedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    reviewedBy: 'admin'
  }
];

// Write test data
fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(testSubmissions, null, 2));

console.log('✅ Test data added successfully!');
console.log(`📁 Location: ${SUBMISSIONS_FILE}`);
console.log(`📊 Added ${testSubmissions.length} test submissions`);
console.log('\nTest submissions:');
testSubmissions.forEach((sub, i) => {
  console.log(`  ${i + 1}. ${sub.letterData.client.clientName} → ${sub.letterData.debtorName} (${sub.status})`);
});
