// Demo UPI accounts used for the login screen.
//
// PINS ARE IN PLAINTEXT in this code config on purpose: this is a simulated
// hackathon demo, not a real payment app. There is no password hashing because
// these credentials never touch a real bank. The users table only stores
// profile data (name, upi_id) — the PINs live here, on the server side only,
// so they are never exposed to the frontend.

const DEMO_ACCOUNTS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Demo User',
    upiId: 'demo@upiguard',
    pin: '1234',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Asha Verma',
    upiId: 'asha@okbank',
    pin: '4321',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Ravi Kumar',
    upiId: 'ravi@gpay',
    pin: '2468',
  },
];

function findAccount(upiId, pin) {
  return DEMO_ACCOUNTS.find(
    a => a.upiId.toLowerCase() === String(upiId).toLowerCase() && a.pin === String(pin)
  ) || null;
}

function toPublic(account) {
  return { id: account.id, name: account.name, upiId: account.upiId };
}

module.exports = { DEMO_ACCOUNTS, findAccount, toPublic };