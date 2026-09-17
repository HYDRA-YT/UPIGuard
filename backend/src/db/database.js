// Data layer: Supabase only. There is no in-memory fallback — the app
// requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in backend/.env
// (see backend/.env.example). supabaseData.js throws at startup if the
// credentials are missing, so misconfiguration is impossible to miss.
const supabaseData = require('./supabaseData');

module.exports = supabaseData;
