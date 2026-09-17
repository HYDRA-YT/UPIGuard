// Canonical Supabase seed data for UPIGuard (simulated demo history).
// Kept in JS so the backend's reset function can restore the exact same
// state that supabase/schema.sql seeds. The demo user ID is fixed.
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

const SEED_RECIPIENTS = [
  { name: 'Priya Sharma', upi_id: 'priya@okbank' },
  { name: 'Amit Patel', upi_id: 'amit@upi' },
  { name: 'Zomato', upi_id: 'payments@zomato' },
  { name: 'Swiggy', upi_id: 'swiggy@pay' },
  { name: 'Landlord - Rajesh', upi_id: 'rajesh.rent@okbank' },
  { name: 'College Fee Portal', upi_id: 'fees@college.edu' },
  { name: 'Neeraj Kumar', upi_id: 'neeraj@gpay' },
  { name: 'Electricity Board', upi_id: 'eb@billpay' },
];

// Simulated completed history matching supabase/schema.sql (relative days ago).
const SEED_TRANSACTIONS = [
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
];

module.exports = { DEMO_USER_ID, SEED_RECIPIENTS, SEED_TRANSACTIONS };
