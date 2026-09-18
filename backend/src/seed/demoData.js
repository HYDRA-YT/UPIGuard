// Canonical Supabase seed data for UPIGuard (simulated demo history).
// Kept in JS so the backend's reset function can restore the exact same
// state that supabase/schema.sql seeds. There are three demo UPI accounts
// (see also backend/src/auth/accounts.js which holds their PINs).
//
// PINS are intentionally NOT stored here (or in the database) — they only
// exist server-side in accounts.js. This file holds profile + history data.

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

const DEMO_USERS = [
  {
    id: DEMO_USER_ID,
    name: 'Demo User',
    upiId: 'demo@upiguard',
    recipients: [
      { name: 'Priya Sharma', upi_id: 'priya@okbank' },
      { name: 'Amit Patel', upi_id: 'amit@upi' },
      { name: 'Zomato', upi_id: 'payments@zomato' },
      { name: 'Swiggy', upi_id: 'swiggy@pay' },
      { name: 'Landlord - Rajesh', upi_id: 'rajesh.rent@okbank' },
      { name: 'College Fee Portal', upi_id: 'fees@college.edu' },
      { name: 'Neeraj Kumar', upi_id: 'neeraj@gpay' },
      { name: 'Electricity Board', upi_id: 'eb@billpay' },
    ],
    transactions: [
      { recipient_name: 'Priya Sharma', recipient_upi: 'priya@okbank', amount: 800, context: 'Friend', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 47 },
      { recipient_name: 'Priya Sharma', recipient_upi: 'priya@okbank', amount: 1200, context: 'Friend', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 43 },
      { recipient_name: 'Amit Patel', recipient_upi: 'amit@upi', amount: 500, context: 'Friend', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 41 },
      { recipient_name: 'Zomato', recipient_upi: 'payments@zomato', amount: 450, context: 'Food', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 38 },
      { recipient_name: 'Swiggy', recipient_upi: 'swiggy@pay', amount: 650, context: 'Food', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 36 },
      { recipient_name: 'Landlord - Rajesh', recipient_upi: 'rajesh.rent@okbank', amount: 15000, context: 'Rent', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 33 },
      { recipient_name: 'College Fee Portal', recipient_upi: 'fees@college.edu', amount: 25000, context: 'College fee', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 30 },
      { recipient_name: 'Priya Sharma', recipient_upi: 'priya@okbank', amount: 1500, context: 'Friend', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 28 },
      { recipient_name: 'Amit Patel', recipient_upi: 'amit@upi', amount: 750, context: 'Friend', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 26 },
      { recipient_name: 'Neeraj Kumar', recipient_upi: 'neeraj@gpay', amount: 200, context: 'Shopping', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 23 },
      { recipient_name: 'Zomato', recipient_upi: 'payments@zomato', amount: 380, context: 'Food', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 21 },
      { recipient_name: 'Electricity Board', recipient_upi: 'eb@billpay', amount: 1800, context: 'Bills', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 19 },
      { recipient_name: 'Priya Sharma', recipient_upi: 'priya@okbank', amount: 1000, context: 'Friend', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 16 },
      { recipient_name: 'Landlord - Rajesh', recipient_upi: 'rajesh.rent@okbank', amount: 15000, context: 'Rent', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 12 },
      { recipient_name: 'Swiggy', recipient_upi: 'swiggy@pay', amount: 550, context: 'Food', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 9 },
      { recipient_name: 'Amit Patel', recipient_upi: 'amit@upi', amount: 900, context: 'Friend', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 7 },
      { recipient_name: 'Neeraj Kumar', recipient_upi: 'neeraj@gpay', amount: 350, context: 'Shopping', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 5 },
      { recipient_name: 'Zomato', recipient_upi: 'payments@zomato', amount: 520, context: 'Food', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 3 },
    ],
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Asha Verma',
    upiId: 'asha@okbank',
    recipients: [
      { name: 'GroceryMart', upi_id: 'grocery@mart' },
      { name: 'Investment Desk', upi_id: 'invest@wealth' },
      { name: 'Sneha Mehra', upi_id: 'sneha@okbank' },
    ],
    // Two large payments TODAY (₹45,000 each) demonstrate the daily limit:
    // ₹90,000 of the ₹1,00,000 daily cap is already gone.
    transactions: [
      { recipient_name: 'Investment Desk', recipient_upi: 'invest@wealth', amount: 45000, context: 'Investment', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 0.05 },
      { recipient_name: 'GroceryMart', recipient_upi: 'grocery@mart', amount: 45000, context: 'Shopping', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 0.1 },
      { recipient_name: 'Investment Desk', recipient_upi: 'invest@wealth', amount: 30000, context: 'Investment', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 6 },
      { recipient_name: 'Sneha Mehra', recipient_upi: 'sneha@okbank', amount: 1200, context: 'Friend', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 20 },
      { recipient_name: 'GroceryMart', recipient_upi: 'grocery@mart', amount: 2500, context: 'Groceries', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 12 },
    ],
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Ravi Kumar',
    upiId: 'ravi@gpay',
    recipients: [
      { name: 'Kirana Store', upi_id: 'kirana@pay' },
      { name: 'Arjun Mehta', upi_id: 'arjun@paytm' },
      { name: 'CabWale', upi_id: 'ride@cabwale' },
      { name: 'Rent - Grover', upi_id: 'grover.rent@okbank' },
    ],
    transactions: [
      { recipient_name: 'Kirana Store', recipient_upi: 'kirana@pay', amount: 180, context: 'Groceries', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 1 },
      { recipient_name: 'CabWale', recipient_upi: 'ride@cabwale', amount: 450, context: 'Travel', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 4 },
      { recipient_name: 'Rent - Grover', recipient_upi: 'grover.rent@okbank', amount: 25000, context: 'Rent', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 3 },
      { recipient_name: 'Arjun Mehta', recipient_upi: 'arjun@paytm', amount: 650, context: 'Friend', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 8 },
      { recipient_name: 'Kirana Store', recipient_upi: 'kirana@pay', amount: 300, context: 'Groceries', risk_level: 'LOW_RISK', status: 'completed', daysAgo: 12 },
    ],
  },
];

module.exports = { DEMO_USER_ID, DEMO_USERS };